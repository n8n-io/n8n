import { Container } from '@n8n/di';

import { FolderNotFoundError } from '@/errors/folder-not-found.error';
import { ResponseError } from '@/errors/response-errors/abstract/response.error';
import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import { EventService } from '@/events/event.service';
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
	getWorkflowVersion: PublicAPIEndpoint<WorkflowRequest.GetVersion>;
	activateWorkflow: PublicAPIEndpoint<WorkflowRequest.Activate>;
	deactivateWorkflow: PublicAPIEndpoint<WorkflowRequest.Activate>;
};

// `/publish` and `/unpublish` are served by `WorkflowsPublicController`. These two tuples remain
// only as the bodies of the deprecated `/activate` and `/deactivate` aliases below.
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
	activateWorkflow: [deprecated({ since: new Date('2026-07-23T00:00:00Z') }), ...publishWorkflow],
	deactivateWorkflow: [
		deprecated({ since: new Date('2026-07-23T00:00:00Z') }),
		...unpublishWorkflow,
	],
};

export = workflowHandlers;
