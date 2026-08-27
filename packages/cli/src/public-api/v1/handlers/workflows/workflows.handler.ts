import { WorkflowEntity } from '@n8n/db';
import { Container } from '@n8n/di';
import { PROJECT_ROOT } from 'n8n-workflow';

import { FolderNotFoundError } from '@/errors/folder-not-found.error';
import { ResponseError } from '@/errors/response-errors/abstract/response.error';
import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import { EventService } from '@/events/event.service';
import { WorkflowHistoryService } from '@/workflows/workflow-history/workflow-history.service';
import { WorkflowService } from '@/workflows/workflow.service';

import type { WorkflowRequest } from '../../../types';
import type { PublicAPIEndpoint } from '../../shared/handler.types';
import { publicApiScope, projectScope } from '../../shared/middlewares/global.middleware';

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
	deleteWorkflow: PublicAPIEndpoint<WorkflowRequest.Get>;
	getWorkflowVersion: PublicAPIEndpoint<WorkflowRequest.GetVersion>;
	updateWorkflow: PublicAPIEndpoint<WorkflowRequest.Update>;
};

const workflowHandlers: WorkflowHandlers = {
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
};

export = workflowHandlers;
