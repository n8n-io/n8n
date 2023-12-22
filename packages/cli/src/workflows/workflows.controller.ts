import express from 'express';
import { v4 as uuid } from 'uuid';

import axios from 'axios';
import * as Db from '@/Db';
import * as GenericHelpers from '@/GenericHelpers';
import * as ResponseHelper from '@/ResponseHelper';
import * as WorkflowHelpers from '@/WorkflowHelpers';
import type { IWorkflowResponse, IExecutionPushResponse } from '@/Interfaces';
import config from '@/config';
import { SharedWorkflow } from '@db/entities/SharedWorkflow';
import { WorkflowEntity } from '@db/entities/WorkflowEntity';
import { validateEntity } from '@/GenericHelpers';
import { ExternalHooks } from '@/ExternalHooks';
import type { ListQuery, WorkflowRequest } from '@/requests';
import { isBelowOnboardingThreshold } from '@/WorkflowHelpers';
import { EEWorkflowController } from './workflows.controller.ee';
import { WorkflowService } from './workflow.service';
import { whereClause } from '@/UserManagement/UserManagementHelper';
import { Container } from 'typedi';
import { InternalHooks } from '@/InternalHooks';
import { RoleService } from '@/services/role.service';
import * as utils from '@/utils';
import { listQueryMiddleware } from '@/middlewares';
import { TagService } from '@/services/tag.service';
import { WorkflowHistoryService } from './workflowHistory/workflowHistory.service.ee';
import { Logger } from '@/Logger';
import { SharedWorkflowRepository } from '@db/repositories/sharedWorkflow.repository';
import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import { InternalServerError } from '@/errors/response-errors/internal-server.error';
import { NamingService } from '@/services/naming.service';
import { TagRepository } from '@/databases/repositories/tag.repository';

export const workflowsController = express.Router();
workflowsController.use('/', EEWorkflowController);

/**
 * POST /workflows
 */
workflowsController.post(
	'/',
	ResponseHelper.send(async (req: WorkflowRequest.Create) => {
		delete req.body.id; // delete if sent

		const newWorkflow = new WorkflowEntity();

		Object.assign(newWorkflow, req.body);

		newWorkflow.versionId = uuid();

		await validateEntity(newWorkflow);

		await Container.get(ExternalHooks).run('workflow.create', [newWorkflow]);

		const { tags: tagIds } = req.body;

		if (tagIds?.length && !config.getEnv('workflowTagsDisabled')) {
			newWorkflow.tags = await Container.get(TagRepository).findMany(tagIds);
		}

		await WorkflowHelpers.replaceInvalidCredentials(newWorkflow);

		WorkflowHelpers.addNodeIds(newWorkflow);

		let savedWorkflow: undefined | WorkflowEntity;

		await Db.transaction(async (transactionManager) => {
			savedWorkflow = await transactionManager.save<WorkflowEntity>(newWorkflow);

			const role = await Container.get(RoleService).findWorkflowOwnerRole();

			const newSharedWorkflow = new SharedWorkflow();

			Object.assign(newSharedWorkflow, {
				role,
				user: req.user,
				workflow: savedWorkflow,
			});

			await transactionManager.save<SharedWorkflow>(newSharedWorkflow);
		});

		if (!savedWorkflow) {
			Container.get(Logger).error('Failed to create workflow', { userId: req.user.id });
			throw new InternalServerError('Failed to save workflow');
		}

		await Container.get(WorkflowHistoryService).saveVersion(
			req.user,
			savedWorkflow,
			savedWorkflow.id,
		);

		if (tagIds && !config.getEnv('workflowTagsDisabled') && savedWorkflow.tags) {
			savedWorkflow.tags = Container.get(TagService).sortByRequestOrder(savedWorkflow.tags, {
				requestOrder: tagIds,
			});
		}

		await Container.get(ExternalHooks).run('workflow.afterCreate', [savedWorkflow]);
		void Container.get(InternalHooks).onWorkflowCreated(req.user, newWorkflow, false);

		return savedWorkflow;
	}),
);

/**
 * GET /workflows
 */
workflowsController.get(
	'/',
	listQueryMiddleware,
	async (req: ListQuery.Request, res: express.Response) => {
		try {
			const sharedWorkflowIds = await WorkflowHelpers.getSharedWorkflowIds(req.user, ['owner']);

			const { workflows: data, count } = await Container.get(WorkflowService).getMany(
				sharedWorkflowIds,
				req.listQueryOptions,
			);

			res.json({ count, data });
		} catch (maybeError) {
			const error = utils.toError(maybeError);
			ResponseHelper.reportError(error);
			ResponseHelper.sendErrorResponse(res, error);
		}
	},
);

/**
 * GET /workflows/new
 */
workflowsController.get(
	'/new',
	ResponseHelper.send(async (req: WorkflowRequest.NewName) => {
		const requestedName = req.query.name ?? config.getEnv('workflows.defaultName');

		const name = await Container.get(NamingService).getUniqueWorkflowName(requestedName);

		const onboardingFlowEnabled =
			!config.getEnv('workflows.onboardingFlowDisabled') &&
			!req.user.settings?.isOnboarded &&
			(await isBelowOnboardingThreshold(req.user));

		return { name, onboardingFlowEnabled };
	}),
);

// Reads and returns workflow data from an URL
/**
 * GET /workflows/from-url
 */
workflowsController.get(
	'/from-url',
	ResponseHelper.send(async (req: express.Request): Promise<IWorkflowResponse> => {
		if (req.query.url === undefined) {
			throw new BadRequestError('The parameter "url" is missing!');
		}
		if (!/^http[s]?:\/\/.*\.json$/i.exec(req.query.url as string)) {
			throw new BadRequestError(
				'The parameter "url" is not valid! It does not seem to be a URL pointing to a n8n workflow JSON file.',
			);
		}
		let workflowData: IWorkflowResponse | undefined;
		try {
			const { data } = await axios.get<IWorkflowResponse>(req.query.url as string);
			workflowData = data;
		} catch (error) {
			throw new BadRequestError('The URL does not point to valid JSON file!');
		}

		// Do a very basic check if it is really a n8n-workflow-json
		if (
			workflowData?.nodes === undefined ||
			!Array.isArray(workflowData.nodes) ||
			workflowData.connections === undefined ||
			typeof workflowData.connections !== 'object' ||
			Array.isArray(workflowData.connections)
		) {
			throw new BadRequestError(
				'The data in the file does not seem to be a n8n workflow JSON file!',
			);
		}

		return workflowData;
	}),
);

/**
 * GET /workflows/:id
 */
workflowsController.get(
	'/:id(\\w+)',
	ResponseHelper.send(async (req: WorkflowRequest.Get) => {
		const { id: workflowId } = req.params;

		let relations = ['workflow', 'workflow.tags', 'role'];

		if (config.getEnv('workflowTagsDisabled')) {
			relations = relations.filter((relation) => relation !== 'workflow.tags');
		}

		const shared = await Container.get(SharedWorkflowRepository).findOne({
			relations,
			where: whereClause({
				user: req.user,
				entityType: 'workflow',
				globalScope: 'workflow:read',
				entityId: workflowId,
				roles: ['owner'],
			}),
		});

		if (!shared) {
			Container.get(Logger).verbose('User attempted to access a workflow without permissions', {
				workflowId,
				userId: req.user.id,
			});
			throw new NotFoundError(
				'Could not load the workflow - you can only access workflows owned by you',
			);
		}

		return shared.workflow;
	}),
);

// Updates an existing workflow
/**
 * PATCH /workflows/:id
 */
workflowsController.patch(
	'/:id(\\w+)',
	ResponseHelper.send(async (req: WorkflowRequest.Update) => {
		const { id: workflowId } = req.params;

		const updateData = new WorkflowEntity();
		const { tags, ...rest } = req.body;
		Object.assign(updateData, rest);

		const updatedWorkflow = await Container.get(WorkflowService).update(
			req.user,
			updateData,
			workflowId,
			tags,
			true,
			['owner'],
		);

		return updatedWorkflow;
	}),
);

// Deletes a specific workflow
/**
 * DELETE /workflows/:id
 */
workflowsController.delete(
	'/:id(\\w+)',
	ResponseHelper.send(async (req: WorkflowRequest.Delete) => {
		const { id: workflowId } = req.params;

		const workflow = await Container.get(WorkflowService).delete(req.user, workflowId);
		if (!workflow) {
			Container.get(Logger).verbose('User attempted to delete a workflow without permissions', {
				workflowId,
				userId: req.user.id,
			});
			throw new BadRequestError(
				'Could not delete the workflow - you can only remove workflows owned by you',
			);
		}

		return true;
	}),
);

/**
 * POST /workflows/run
 */
workflowsController.post(
	'/run',
	ResponseHelper.send(async (req: WorkflowRequest.ManualRun): Promise<IExecutionPushResponse> => {
		return Container.get(WorkflowService).runManually(
			req.body,
			req.user,
			GenericHelpers.getSessionId(req),
		);
	}),
);
