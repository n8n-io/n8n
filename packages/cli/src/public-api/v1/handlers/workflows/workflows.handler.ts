import { WorkflowEntity } from '@n8n/db';
import { Container } from '@n8n/di';
import { PROJECT_ROOT } from 'n8n-workflow';

import { FolderNotFoundError } from '@/errors/folder-not-found.error';
import { ResponseError } from '@/errors/response-errors/abstract/response.error';
import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import { EventService } from '@/events/event.service';
import { RedactionEnforcementService } from '@/modules/redaction/redaction-enforcement.service';
import { WorkflowCreationService } from '@/workflows/workflow-creation.service';
import { createWorkflowEntityFromPayload } from '@/workflows/workflow-entity-mapper';
import { WorkflowHistoryService } from '@/workflows/workflow-history/workflow-history.service';
import { WorkflowService } from '@/workflows/workflow.service';

import type { WorkflowRequest } from '../../../types';
import type { PublicAPIEndpoint } from '../../shared/handler.types';
import {
	publicApiScope,
	projectScope,
	deprecated,
} from '../../shared/middlewares/global.middleware';

const handleError = (error: unknown) => {
	if (error instanceof FolderNotFoundError) {
		throw new NotFoundError(error.message);
	}
	if (error instanceof ResponseError) {
		throw error;
	}
	if (error instanceof Error) {
		throw new BadRequestError(error.message);
	}
	throw error;
};

type WorkflowHandlers = {
	createWorkflow: PublicAPIEndpoint<WorkflowRequest.Create>;
	deleteWorkflow: PublicAPIEndpoint<WorkflowRequest.Get>;
	getWorkflowVersion: PublicAPIEndpoint<WorkflowRequest.GetVersion>;
	updateWorkflow: PublicAPIEndpoint<WorkflowRequest.Update>;
	publishWorkflow: PublicAPIEndpoint<WorkflowRequest.Activate>;
	unpublishWorkflow: PublicAPIEndpoint<WorkflowRequest.Activate>;
	activateWorkflow: PublicAPIEndpoint<WorkflowRequest.Activate>;
	deactivateWorkflow: PublicAPIEndpoint<WorkflowRequest.Activate>;
};

const publishWorkflow: PublicAPIEndpoint<WorkflowRequest.Activate> = [
	publicApiScope('workflow:activate'),
	projectScope('workflow:publish', 'workflow'),
	async (req, res) => {
		const { id } = req.params;
		const { versionId, name, description } = req.body;

		try {
			const workflow = await Container.get(WorkflowService).activateWorkflow(req.user, id, {
				versionId,
				name,
				description,
				source: 'api',
			});

			return res.json(workflow);
		} catch (error) {
			return handleError(error);
		}
	},
];

const unpublishWorkflow: PublicAPIEndpoint<WorkflowRequest.Activate> = [
	publicApiScope('workflow:deactivate'),
	projectScope('workflow:unpublish', 'workflow'),
	async (req, res) => {
		const { id } = req.params;

		try {
			const workflow = await Container.get(WorkflowService).deactivateWorkflow(req.user, id, {
				source: 'api',
			});

			return res.json(workflow);
		} catch (error) {
			return handleError(error);
		}
	},
];

const workflowHandlers: WorkflowHandlers = {
	createWorkflow: [
		publicApiScope('workflow:create'),
		async (req, res) => {
			const { projectId, parentFolderId, ...rest } = req.body;

			if (rest.settings?.binaryMode !== undefined) {
				delete rest.settings.binaryMode;
			}
			if (rest.settings?.credentialResolverId !== undefined) {
				delete rest.settings.credentialResolverId;
			}

			const workflow = createWorkflowEntityFromPayload(rest);

			await Container.get(RedactionEnforcementService).assertNewPolicyAllowed(
				workflow.settings?.redactionPolicy,
			);

			const createdWorkflow = await Container.get(WorkflowCreationService).createWorkflow(
				req.user,
				workflow,
				{
					projectId,
					parentFolderId: parentFolderId ?? undefined,
					publicApi: true,
					source: 'api',
				},
			);
			return res.json(createdWorkflow);
		},
	],
	deleteWorkflow: [
		publicApiScope('workflow:delete'),
		projectScope('workflow:delete', 'workflow'),
		async (req, res) => {
			const { id: workflowId } = req.params;

			const workflow = await Container.get(WorkflowService).delete(req.user, workflowId, true);
			if (!workflow) {
				// user trying to access a workflow they do not own
				// or workflow does not exist
				throw new NotFoundError('Not Found');
			}

			return res.json(workflow);
		},
	],
	getWorkflowVersion: [
		publicApiScope('workflow:read'),
		projectScope('workflow:read', 'workflow'),
		async (req, res) => {
			const { id: workflowId, versionId } = req.params;

			try {
				const version = await Container.get(WorkflowHistoryService).getVersion(
					req.user,
					workflowId,
					versionId,
					{ includePublishHistory: false },
				);

				Container.get(EventService).emit('user-retrieved-workflow-version', {
					userId: req.user.id,
					publicApi: true,
				});

				const { autosaved, ...versionWithoutInternalFields } = version;

				return res.json(versionWithoutInternalFields);
			} catch {
				throw new NotFoundError('Version not found');
			}
		},
	],
	updateWorkflow: [
		publicApiScope('workflow:update'),
		projectScope('workflow:update', 'workflow'),
		async (req, res) => {
			const { id } = req.params;
			const { parentFolderId, ...rest } = req.body;
			const updateData = new WorkflowEntity();
			Object.assign(updateData, rest);

			// null moves the workflow to the project root, (undefined) leaves the current folder untouched
			const resolvedParentFolderId = parentFolderId === null ? PROJECT_ROOT : parentFolderId;

			// Defaults to true so existing integrations keep publishing on save; callers that want
			// to stage a change on an already-published workflow can opt out explicitly.
			const { publishIfActive = true } = req.query;

			// binaryMode and credentialResolverId are derived, internal settings
			// rather than something users are expected to control programmatically;
			// strip them so the settings merge in WorkflowService.update preserves
			// whatever is already stored.
			if (updateData.settings?.binaryMode !== undefined) {
				delete updateData.settings.binaryMode;
			}
			if (updateData.settings?.credentialResolverId !== undefined) {
				delete updateData.settings.credentialResolverId;
			}

			try {
				// Credential tamper protection is enforced centrally in WorkflowService.update
				const updatedWorkflow = await Container.get(WorkflowService).update(
					req.user,
					updateData,
					id,
					{
						parentFolderId: resolvedParentFolderId,
						forceSave: true, // Skip version conflict check for public API
						publicApi: true,
						publishIfActive,
						source: 'api',
					},
				);

				return res.json(updatedWorkflow);
			} catch (error) {
				return handleError(error);
			}
		},
	],
	publishWorkflow,
	unpublishWorkflow,
	activateWorkflow: [deprecated({ since: new Date('2026-07-23T00:00:00Z') }), ...publishWorkflow],
	deactivateWorkflow: [
		deprecated({ since: new Date('2026-07-23T00:00:00Z') }),
		...unpublishWorkflow,
	],
};

export = workflowHandlers;
