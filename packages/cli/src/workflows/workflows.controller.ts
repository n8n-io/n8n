/* eslint-disable no-param-reassign */

import express from 'express';
import { v4 as uuid } from 'uuid';
import { LoggerProxy } from 'n8n-workflow';

import axios from 'axios';
import * as ActiveWorkflowRunner from '@/ActiveWorkflowRunner';
import * as Db from '@/Db';
import * as GenericHelpers from '@/GenericHelpers';
import * as ResponseHelper from '@/ResponseHelper';
import * as WorkflowHelpers from '@/WorkflowHelpers';
import { IWorkflowResponse, IExecutionPushResponse } from '@/Interfaces';
import config from '@/config';
import * as TagHelpers from '@/TagHelpers';
import { SharedWorkflow } from '@db/entities/SharedWorkflow';
import { WorkflowEntity } from '@db/entities/WorkflowEntity';
import { validateEntity } from '@/GenericHelpers';
import { InternalHooksManager } from '@/InternalHooksManager';
import { ExternalHooks } from '@/ExternalHooks';
import { getLogger } from '@/Logger';
import type { WorkflowRequest } from '@/requests';
import { isBelowOnboardingThreshold } from '@/WorkflowHelpers';
import { EEWorkflowController } from './workflows.controller.ee';
import { WorkflowsService } from './workflows.services';
import { whereClause } from '@/UserManagement/UserManagementHelper';

export const workflowsController = express.Router();

/**
 * Initialize Logger if needed
 */
workflowsController.use((req, res, next) => {
	try {
		LoggerProxy.getInstance();
	} catch (error) {
		LoggerProxy.init(getLogger());
	}
	next();
});

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

		await ExternalHooks().run('workflow.create', [newWorkflow]);

		const { tags: tagIds } = req.body;

		if (tagIds?.length && !config.getEnv('workflowTagsDisabled')) {
			newWorkflow.tags = await Db.collections.Tag.findByIds(tagIds, {
				select: ['id', 'name'],
			});
		}

		await WorkflowHelpers.replaceInvalidCredentials(newWorkflow);

		WorkflowHelpers.addNodeIds(newWorkflow);

		let savedWorkflow: undefined | WorkflowEntity;

		await Db.transaction(async (transactionManager) => {
			savedWorkflow = await transactionManager.save<WorkflowEntity>(newWorkflow);

			const role = await Db.collections.Role.findOneOrFail({
				name: 'owner',
				scope: 'workflow',
			});

			const newSharedWorkflow = new SharedWorkflow();

			Object.assign(newSharedWorkflow, {
				role,
				user: req.user,
				workflow: savedWorkflow,
			});

			await transactionManager.save<SharedWorkflow>(newSharedWorkflow);
		});

		if (!savedWorkflow) {
			LoggerProxy.error('Failed to create workflow', { userId: req.user.id });
			throw new ResponseHelper.InternalServerError('Failed to save workflow');
		}

		if (tagIds && !config.getEnv('workflowTagsDisabled') && savedWorkflow.tags) {
			savedWorkflow.tags = TagHelpers.sortByRequestOrder(savedWorkflow.tags, {
				requestOrder: tagIds,
			});
		}

		await ExternalHooks().run('workflow.afterCreate', [savedWorkflow]);
		void InternalHooksManager.getInstance().onWorkflowCreated(req.user.id, newWorkflow, false);

		return savedWorkflow;
	}),
);

/**
 * GET /workflows
 */
workflowsController.get(
	'/',
	ResponseHelper.send(async (req: WorkflowRequest.GetAll) => {
		return WorkflowsService.getMany(req.user, req.query.filter);
	}),
);

/**
 * GET /workflows/new
 */
workflowsController.get(
	'/new',
	ResponseHelper.send(async (req: WorkflowRequest.NewName) => {
		const requestedName =
			req.query.name && req.query.name !== ''
				? req.query.name
				: config.getEnv('workflows.defaultName');

		const name = await GenericHelpers.generateUniqueName(requestedName, 'workflow');

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
			throw new ResponseHelper.BadRequestError('The parameter "url" is missing!');
		}
		if (!/^http[s]?:\/\/.*\.json$/i.exec(req.query.url as string)) {
			throw new ResponseHelper.BadRequestError(
				'The parameter "url" is not valid! It does not seem to be a URL pointing to a n8n workflow JSON file.',
			);
		}
		let workflowData: IWorkflowResponse | undefined;
		try {
			const { data } = await axios.get<IWorkflowResponse>(req.query.url as string);
			workflowData = data;
		} catch (error) {
			throw new ResponseHelper.BadRequestError('The URL does not point to valid JSON file!');
		}

		// Do a very basic check if it is really a n8n-workflow-json
		if (
			workflowData === undefined ||
			workflowData.nodes === undefined ||
			!Array.isArray(workflowData.nodes) ||
			workflowData.connections === undefined ||
			typeof workflowData.connections !== 'object' ||
			Array.isArray(workflowData.connections)
		) {
			throw new ResponseHelper.BadRequestError(
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
	'/:id(\\d+)',
	ResponseHelper.send(async (req: WorkflowRequest.Get) => {
		const { id: workflowId } = req.params;

		let relations = ['workflow', 'workflow.tags', 'role'];

		if (config.getEnv('workflowTagsDisabled')) {
			relations = relations.filter((relation) => relation !== 'workflow.tags');
		}

		const shared = await Db.collections.SharedWorkflow.findOne({
			relations,
			where: whereClause({
				user: req.user,
				entityType: 'workflow',
				entityId: workflowId,
				roles: ['owner'],
			}),
		});

		if (!shared) {
			LoggerProxy.verbose('User attempted to access a workflow without permissions', {
				workflowId,
				userId: req.user.id,
			});
			throw new ResponseHelper.NotFoundError(
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
	'/:id',
	ResponseHelper.send(async (req: WorkflowRequest.Update) => {
		const { id: workflowId } = req.params;

		const updateData = new WorkflowEntity();
		const { tags, ...rest } = req.body;
		Object.assign(updateData, rest);

		const updatedWorkflow = await WorkflowsService.update(
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
	'/:id',
	ResponseHelper.send(async (req: WorkflowRequest.Delete) => {
		const { id: workflowId } = req.params;

		await ExternalHooks().run('workflow.delete', [workflowId]);

		const shared = await Db.collections.SharedWorkflow.findOne({
			relations: ['workflow', 'role'],
			where: whereClause({
				user: req.user,
				entityType: 'workflow',
				entityId: workflowId,
				roles: ['owner'],
			}),
		});

		if (!shared) {
			LoggerProxy.verbose('User attempted to delete a workflow without permissions', {
				workflowId,
				userId: req.user.id,
			});
			throw new ResponseHelper.BadRequestError(
				'Could not delete the workflow - you can only remove workflows owned by you',
			);
		}

		if (shared.workflow.active) {
			// deactivate before deleting
			await ActiveWorkflowRunner.getInstance().remove(workflowId);
		}

		await Db.collections.Workflow.delete(workflowId);

		void InternalHooksManager.getInstance().onWorkflowDeleted(req.user.id, workflowId, false);
		await ExternalHooks().run('workflow.afterDelete', [workflowId]);

		return true;
	}),
);

/**
 * POST /workflows/run
 */
workflowsController.post(
	'/run',
	ResponseHelper.send(async (req: WorkflowRequest.ManualRun): Promise<IExecutionPushResponse> => {
		return WorkflowsService.runManually(req.body, req.user, GenericHelpers.getSessionId(req));
	}),
);
