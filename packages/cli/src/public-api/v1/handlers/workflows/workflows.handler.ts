import { GlobalConfig } from '@n8n/config';
import { WorkflowEntity } from '@n8n/db';
import { Container } from '@n8n/di';
import { PROJECT_ROOT } from 'n8n-workflow';
import { z } from 'zod';

import { FolderNotFoundError } from '@/errors/folder-not-found.error';
import { ResponseError } from '@/errors/response-errors/abstract/response.error';
import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import { EventService } from '@/events/event.service';
import { RedactionEnforcementService } from '@/modules/redaction/redaction-enforcement.service';
import { TagService } from '@/services/tag.service';
import { WorkflowCreationService } from '@/workflows/workflow-creation.service';
import { createWorkflowEntityFromPayload } from '@/workflows/workflow-entity-mapper';
import { WorkflowFinderService } from '@/workflows/workflow-finder.service';
import { WorkflowHistoryService } from '@/workflows/workflow-history/workflow-history.service';
import { WorkflowService } from '@/workflows/workflow.service';
import { EnterpriseWorkflowService } from '@/workflows/workflow.service.ee';

import type { WorkflowRequest } from '../../../types';
import type { PublicAPIEndpoint } from '../../shared/handler.types';
import {
	publicApiScope,
	projectScope,
	validCursor,
	deprecated,
} from '../../shared/middlewares/global.middleware';
import { encodeNextCursor } from '../../shared/services/pagination.service';

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

function parseTagNames(tags: string): string[] {
	return tags.split(',').map((tag) => tag.trim());
}

function areWorkflowTagsEnabled(): boolean {
	return !Container.get(GlobalConfig).tags.disabled;
}

type WorkflowHandlers = {
	createWorkflow: PublicAPIEndpoint<WorkflowRequest.Create>;
	transferWorkflow: PublicAPIEndpoint<WorkflowRequest.Transfer>;
	deleteWorkflow: PublicAPIEndpoint<WorkflowRequest.Get>;
	getWorkflow: PublicAPIEndpoint<WorkflowRequest.Get>;
	getWorkflowVersion: PublicAPIEndpoint<WorkflowRequest.GetVersion>;
	getWorkflows: PublicAPIEndpoint<WorkflowRequest.GetAll>;
	updateWorkflow: PublicAPIEndpoint<WorkflowRequest.Update>;
	publishWorkflow: PublicAPIEndpoint<WorkflowRequest.Activate>;
	unpublishWorkflow: PublicAPIEndpoint<WorkflowRequest.Activate>;
	activateWorkflow: PublicAPIEndpoint<WorkflowRequest.Activate>;
	deactivateWorkflow: PublicAPIEndpoint<WorkflowRequest.Activate>;
	getWorkflowTags: PublicAPIEndpoint<WorkflowRequest.GetTags>;
	updateWorkflowTags: PublicAPIEndpoint<WorkflowRequest.UpdateTags>;
	archiveWorkflow: PublicAPIEndpoint<WorkflowRequest.Get>;
	unarchiveWorkflow: PublicAPIEndpoint<WorkflowRequest.Get>;
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
	transferWorkflow: [
		publicApiScope('workflow:move'),
		projectScope('workflow:move', 'workflow'),
		async (req, res) => {
			const { id: workflowId } = req.params;

			const body = z.object({ destinationProjectId: z.string() }).parse(req.body);

			await Container.get(EnterpriseWorkflowService).transferWorkflow(
				req.user,
				workflowId,
				body.destinationProjectId,
			);

			return res.status(204).send();
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
	getWorkflow: [
		publicApiScope('workflow:read'),
		projectScope('workflow:read', 'workflow'),
		async (req, res) => {
			const { id } = req.params;
			const { excludePinnedData = false } = req.query;

			const workflow = await Container.get(WorkflowFinderService).findWorkflowForUser(
				id,
				req.user,
				['workflow:read'],
				{
					includeTags: areWorkflowTagsEnabled(),
					includeActiveVersion: true,
				},
			);

			if (!workflow) {
				// user trying to access a workflow they do not own
				// and was not shared to them
				// Or does not exist.
				throw new NotFoundError('Not Found');
			}

			if (excludePinnedData) {
				delete workflow.pinData;
			}

			Container.get(EventService).emit('user-retrieved-workflow', {
				userId: req.user.id,
				publicApi: true,
			});

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
	getWorkflows: [
		publicApiScope('workflow:list'),
		validCursor,
		async (req, res) => {
			const {
				offset = 0,
				limit = 100,
				excludePinnedData = false,
				active,
				tags,
				name,
				projectId,
			} = req.query;

			const { workflows, count } = await Container.get(WorkflowFinderService).findWorkflowsForUser(
				req.user,
				['workflow:read'],
				{
					filters: {
						name,
						active,
						tagNames: tags ? parseTagNames(tags) : undefined,
						projectId,
					},
					offset,
					limit,
					includePinnedData: !excludePinnedData,
					includeTags: areWorkflowTagsEnabled(),
					includeActiveVersion: true,
				},
			);

			Container.get(EventService).emit('user-retrieved-all-workflows', {
				userId: req.user.id,
				publicApi: true,
			});

			return res.json({
				data: workflows,
				nextCursor: encodeNextCursor({
					offset,
					limit,
					numberOfTotalRecords: count,
				}),
			});
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
						publishIfActive: true,
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
	getWorkflowTags: [
		publicApiScope('workflowTags:list'),
		projectScope('workflow:read', 'workflow'),
		async (req, res) => {
			const { id } = req.params;

			if (!areWorkflowTagsEnabled()) {
				throw new BadRequestError('Workflow Tags Disabled');
			}

			const workflow = await Container.get(WorkflowFinderService).findWorkflowForUser(
				id,
				req.user,
				['workflow:read'],
			);

			if (!workflow) {
				// user trying to access a workflow he does not own
				// or workflow does not exist
				throw new NotFoundError('Not Found');
			}

			const tags = await Container.get(TagService).getAllByWorkflowId(id);

			return res.json(tags);
		},
	],
	updateWorkflowTags: [
		publicApiScope('workflowTags:update'),
		projectScope('workflow:update', 'workflow'),
		async (req, res) => {
			const { id } = req.params;
			const newTags = req.body.map((newTag) => newTag.id);

			if (!areWorkflowTagsEnabled()) {
				throw new BadRequestError('Workflow Tags Disabled');
			}

			try {
				const tags = await Container.get(WorkflowService).updateWorkflowTags(req.user, id, newTags);
				return res.json(tags);
			} catch (error) {
				return handleError(error);
			}
		},
	],
	archiveWorkflow: [
		publicApiScope('workflow:delete'),
		projectScope('workflow:delete', 'workflow'),
		async (req, res) => {
			const { id } = req.params;
			try {
				const workflow = await Container.get(WorkflowService).archiveForPublicApi(req.user, id);
				if (!workflow) {
					throw new NotFoundError('Workflow not found');
				}
				return res.json(workflow);
			} catch (error) {
				return handleError(error);
			}
		},
	],
	unarchiveWorkflow: [
		publicApiScope('workflow:delete'),
		projectScope('workflow:delete', 'workflow'),
		async (req, res) => {
			const { id } = req.params;
			try {
				const workflow = await Container.get(WorkflowService).unarchiveForPublicApi(req.user, id);
				if (!workflow) {
					throw new NotFoundError('Workflow not found');
				}
				return res.json(workflow);
			} catch (error) {
				return handleError(error);
			}
		},
	],
};

export = workflowHandlers;
