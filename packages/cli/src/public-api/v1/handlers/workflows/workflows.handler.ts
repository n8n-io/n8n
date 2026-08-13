import { GlobalConfig } from '@n8n/config';
import { Container } from '@n8n/di';
import { z } from 'zod';

import { FolderNotFoundError } from '@/errors/folder-not-found.error';
import { ResponseError } from '@/errors/response-errors/abstract/response.error';
import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import { EventService } from '@/events/event.service';
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
	transferWorkflow: PublicAPIEndpoint<WorkflowRequest.Transfer>;
	getWorkflowVersion: PublicAPIEndpoint<WorkflowRequest.GetVersion>;
	getWorkflows: PublicAPIEndpoint<WorkflowRequest.GetAll>;
	publishWorkflow: PublicAPIEndpoint<WorkflowRequest.Activate>;
	unpublishWorkflow: PublicAPIEndpoint<WorkflowRequest.Activate>;
	activateWorkflow: PublicAPIEndpoint<WorkflowRequest.Activate>;
	deactivateWorkflow: PublicAPIEndpoint<WorkflowRequest.Activate>;
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
	publishWorkflow,
	unpublishWorkflow,
	activateWorkflow: [deprecated({ since: new Date('2026-07-23T00:00:00Z') }), ...publishWorkflow],
	deactivateWorkflow: [
		deprecated({ since: new Date('2026-07-23T00:00:00Z') }),
		...unpublishWorkflow,
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
