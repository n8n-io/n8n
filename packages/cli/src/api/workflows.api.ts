/* eslint-disable no-param-reassign */
/* eslint-disable import/no-cycle */

import express from 'express';
import { IDataObject, IPinData, LoggerProxy, Workflow } from 'n8n-workflow';

import axios from 'axios';
import { FindManyOptions, In } from 'typeorm';
import {
	ActiveWorkflowRunner,
	Db,
	GenericHelpers,
	NodeTypes,
	ResponseHelper,
	whereClause,
	WorkflowHelpers,
	WorkflowExecuteAdditionalData,
	IWorkflowResponse,
	IExecutionPushResponse,
	IWorkflowExecutionDataProcess,
	TestWebhooks,
	WorkflowRunner,
	IWorkflowDb,
} from '..';
import config from '../../config';
import * as TagHelpers from '../TagHelpers';
import { SharedWorkflow } from '../databases/entities/SharedWorkflow';
import { WorkflowEntity } from '../databases/entities/WorkflowEntity';
import { validateEntity } from '../GenericHelpers';
import { InternalHooksManager } from '../InternalHooksManager';
import { externalHooks } from '../Server';
import type { WorkflowRequest } from '../requests';
import { isBelowOnboardingThreshold } from '../WorkflowHelpers';

const activeWorkflowRunner = ActiveWorkflowRunner.getInstance();
export const workflowsController = express.Router();

const isTrigger = (nodeType: string) =>
	['trigger', 'webhook'].some((suffix) => nodeType.toLowerCase().includes(suffix));

function findFirstPinnedTrigger(workflow: IWorkflowDb, pinData?: IPinData) {
	if (!pinData) return;

	// eslint-disable-next-line consistent-return
	return workflow.nodes.find(
		(node) => !node.disabled && isTrigger(node.type) && pinData[node.name],
	);
}

/**
 * POST /workflows
 */
workflowsController.post(
	'/',
	ResponseHelper.send(async (req: WorkflowRequest.Create) => {
		delete req.body.id; // delete if sent

		const newWorkflow = new WorkflowEntity();

		Object.assign(newWorkflow, req.body);

		await validateEntity(newWorkflow);

		await externalHooks.run('workflow.create', [newWorkflow]);

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
			throw new ResponseHelper.ResponseError('Failed to save workflow');
		}

		if (tagIds && !config.getEnv('workflowTagsDisabled') && savedWorkflow.tags) {
			savedWorkflow.tags = TagHelpers.sortByRequestOrder(savedWorkflow.tags, {
				requestOrder: tagIds,
			});
		}

		await externalHooks.run('workflow.afterCreate', [savedWorkflow]);
		void InternalHooksManager.getInstance().onWorkflowCreated(req.user.id, newWorkflow, false);

		const { id, ...rest } = savedWorkflow;

		return {
			id: id.toString(),
			...rest,
		};
	}),
);

// Returns workflows
/**
 * GET /workflows
 */
workflowsController.get(
	`/`,
	ResponseHelper.send(async (req: WorkflowRequest.GetAll) => {
		let workflows: WorkflowEntity[] = [];

		let filter: IDataObject = {};
		if (req.query.filter) {
			try {
				filter = (JSON.parse(req.query.filter) as IDataObject) || {};
			} catch (error) {
				LoggerProxy.error('Failed to parse filter', {
					userId: req.user.id,
					filter: req.query.filter,
				});
				throw new ResponseHelper.ResponseError('Failed to parse filter');
			}
		}

		const query: FindManyOptions<WorkflowEntity> = {
			select: ['id', 'name', 'active', 'createdAt', 'updatedAt'],
			relations: ['tags'],
		};

		if (config.getEnv('workflowTagsDisabled')) {
			delete query.relations;
		}

		if (req.user.globalRole.name === 'owner') {
			workflows = await Db.collections.Workflow.find(
				Object.assign(query, {
					where: filter,
				}),
			);
		} else {
			const shared = await Db.collections.SharedWorkflow.find({
				relations: ['workflow'],
				where: whereClause({
					user: req.user,
					entityType: 'workflow',
				}),
			});

			if (!shared.length) return [];

			workflows = await Db.collections.Workflow.find(
				Object.assign(query, {
					where: {
						id: In(shared.map(({ workflow }) => workflow.id)),
						...filter,
					},
				}),
			);
		}

		return workflows.map((workflow) => {
			const { id, ...rest } = workflow;

			return {
				id: id.toString(),
				...rest,
			};
		});
	}),
);

/**
 * GET /workflows/new
 */
workflowsController.get(
	`/new`,
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
	`/from-url`,
	ResponseHelper.send(async (req: express.Request): Promise<IWorkflowResponse> => {
		if (req.query.url === undefined) {
			throw new ResponseHelper.ResponseError(`The parameter "url" is missing!`, undefined, 400);
		}
		if (!/^http[s]?:\/\/.*\.json$/i.exec(req.query.url as string)) {
			throw new ResponseHelper.ResponseError(
				`The parameter "url" is not valid! It does not seem to be a URL pointing to a n8n workflow JSON file.`,
				undefined,
				400,
			);
		}
		let workflowData: IWorkflowResponse | undefined;
		try {
			const { data } = await axios.get<IWorkflowResponse>(req.query.url as string);
			workflowData = data;
		} catch (error) {
			throw new ResponseHelper.ResponseError(
				`The URL does not point to valid JSON file!`,
				undefined,
				400,
			);
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
			throw new ResponseHelper.ResponseError(
				`The data in the file does not seem to be a n8n workflow JSON file!`,
				undefined,
				400,
			);
		}

		return workflowData;
	}),
);

/**
 * GET /workflows/:id
 */
workflowsController.get(
	'/:id',
	ResponseHelper.send(async (req: WorkflowRequest.Get) => {
		const { id: workflowId } = req.params;

		let relations = ['workflow', 'workflow.tags'];

		if (config.getEnv('workflowTagsDisabled')) {
			relations = relations.filter((relation) => relation !== 'workflow.tags');
		}

		const shared = await Db.collections.SharedWorkflow.findOne({
			relations,
			where: whereClause({
				user: req.user,
				entityType: 'workflow',
				entityId: workflowId,
			}),
		});

		if (!shared) {
			LoggerProxy.info('User attempted to access a workflow without permissions', {
				workflowId,
				userId: req.user.id,
			});
			throw new ResponseHelper.ResponseError(
				`Workflow with ID "${workflowId}" could not be found.`,
				undefined,
				404,
			);
		}

		const {
			workflow: { id, ...rest },
		} = shared;

		return {
			id: id.toString(),
			...rest,
		};
	}),
);

// Updates an existing workflow
/**
 * PATCH /workflows/:id
 */
workflowsController.patch(
	`/:id`,
	ResponseHelper.send(async (req: WorkflowRequest.Update) => {
		const { id: workflowId } = req.params;

		const updateData = new WorkflowEntity();
		const { tags, ...rest } = req.body;
		Object.assign(updateData, rest);

		const shared = await Db.collections.SharedWorkflow.findOne({
			relations: ['workflow'],
			where: whereClause({
				user: req.user,
				entityType: 'workflow',
				entityId: workflowId,
			}),
		});

		if (!shared) {
			LoggerProxy.info('User attempted to update a workflow without permissions', {
				workflowId,
				userId: req.user.id,
			});
			throw new ResponseHelper.ResponseError(
				`Workflow with ID "${workflowId}" could not be found to be updated.`,
				undefined,
				404,
			);
		}

		// check credentials for old format
		await WorkflowHelpers.replaceInvalidCredentials(updateData);

		WorkflowHelpers.addNodeIds(updateData);

		await externalHooks.run('workflow.update', [updateData]);

		if (shared.workflow.active) {
			// When workflow gets saved always remove it as the triggers could have been
			// changed and so the changes would not take effect
			await activeWorkflowRunner.remove(workflowId);
		}

		if (updateData.settings) {
			if (updateData.settings.timezone === 'DEFAULT') {
				// Do not save the default timezone
				delete updateData.settings.timezone;
			}
			if (updateData.settings.saveDataErrorExecution === 'DEFAULT') {
				// Do not save when default got set
				delete updateData.settings.saveDataErrorExecution;
			}
			if (updateData.settings.saveDataSuccessExecution === 'DEFAULT') {
				// Do not save when default got set
				delete updateData.settings.saveDataSuccessExecution;
			}
			if (updateData.settings.saveManualExecutions === 'DEFAULT') {
				// Do not save when default got set
				delete updateData.settings.saveManualExecutions;
			}
			if (
				parseInt(updateData.settings.executionTimeout as string, 10) ===
				config.get('executions.timeout')
			) {
				// Do not save when default got set
				delete updateData.settings.executionTimeout;
			}
		}

		if (updateData.name) {
			updateData.updatedAt = new Date(); // required due to atomic update
			await validateEntity(updateData);
		}

		await Db.collections.Workflow.update(workflowId, updateData);

		if (tags && !config.getEnv('workflowTagsDisabled')) {
			const tablePrefix = config.getEnv('database.tablePrefix');
			await TagHelpers.removeRelations(workflowId, tablePrefix);

			if (tags.length) {
				await TagHelpers.createRelations(workflowId, tags, tablePrefix);
			}
		}

		const options: FindManyOptions<WorkflowEntity> = {
			relations: ['tags'],
		};

		if (config.getEnv('workflowTagsDisabled')) {
			delete options.relations;
		}

		// We sadly get nothing back from "update". Neither if it updated a record
		// nor the new value. So query now the hopefully updated entry.
		const updatedWorkflow = await Db.collections.Workflow.findOne(workflowId, options);

		if (updatedWorkflow === undefined) {
			throw new ResponseHelper.ResponseError(
				`Workflow with ID "${workflowId}" could not be found to be updated.`,
				undefined,
				400,
			);
		}

		if (updatedWorkflow.tags?.length && tags?.length) {
			updatedWorkflow.tags = TagHelpers.sortByRequestOrder(updatedWorkflow.tags, {
				requestOrder: tags,
			});
		}

		await externalHooks.run('workflow.afterUpdate', [updatedWorkflow]);
		void InternalHooksManager.getInstance().onWorkflowSaved(req.user.id, updatedWorkflow, false);

		if (updatedWorkflow.active) {
			// When the workflow is supposed to be active add it again
			try {
				await externalHooks.run('workflow.activate', [updatedWorkflow]);
				await activeWorkflowRunner.add(workflowId, shared.workflow.active ? 'update' : 'activate');
			} catch (error) {
				// If workflow could not be activated set it again to inactive
				updateData.active = false;
				await Db.collections.Workflow.update(workflowId, updateData);

				// Also set it in the returned data
				updatedWorkflow.active = false;

				// Now return the original error for UI to display
				throw error;
			}
		}

		const { id, ...remainder } = updatedWorkflow;

		return {
			id: id.toString(),
			...remainder,
		};
	}),
);

// Deletes a specific workflow
/**
 * DELETE /workflows/:id
 */
workflowsController.delete(
	`/:id`,
	ResponseHelper.send(async (req: WorkflowRequest.Delete) => {
		const { id: workflowId } = req.params;

		await externalHooks.run('workflow.delete', [workflowId]);

		const shared = await Db.collections.SharedWorkflow.findOne({
			relations: ['workflow'],
			where: whereClause({
				user: req.user,
				entityType: 'workflow',
				entityId: workflowId,
			}),
		});

		if (!shared) {
			LoggerProxy.info('User attempted to delete a workflow without permissions', {
				workflowId,
				userId: req.user.id,
			});
			throw new ResponseHelper.ResponseError(
				`Workflow with ID "${workflowId}" could not be found to be deleted.`,
				undefined,
				400,
			);
		}

		if (shared.workflow.active) {
			// deactivate before deleting
			await activeWorkflowRunner.remove(workflowId);
		}

		await Db.collections.Workflow.delete(workflowId);

		void InternalHooksManager.getInstance().onWorkflowDeleted(req.user.id, workflowId, false);
		await externalHooks.run('workflow.afterDelete', [workflowId]);

		return true;
	}),
);

/**
 * POST /workflows/run
 */
workflowsController.post(
	`/run`,
	ResponseHelper.send(async (req: WorkflowRequest.ManualRun): Promise<IExecutionPushResponse> => {
		const { workflowData } = req.body;
		const { runData } = req.body;
		const { pinData } = req.body;
		const { startNodes } = req.body;
		const { destinationNode } = req.body;
		const executionMode = 'manual';
		const activationMode = 'manual';

		const sessionId = GenericHelpers.getSessionId(req);

		const pinnedTrigger = findFirstPinnedTrigger(workflowData, pinData);

		// If webhooks nodes exist and are active we have to wait for till we receive a call
		if (
			pinnedTrigger === undefined &&
			(runData === undefined ||
				startNodes === undefined ||
				startNodes.length === 0 ||
				destinationNode === undefined)
		) {
			const additionalData = await WorkflowExecuteAdditionalData.getBase(req.user.id);
			const nodeTypes = NodeTypes();
			const workflowInstance = new Workflow({
				id: workflowData.id?.toString(),
				name: workflowData.name,
				nodes: workflowData.nodes,
				connections: workflowData.connections,
				active: false,
				nodeTypes,
				staticData: undefined,
				settings: workflowData.settings,
			});
			const needsWebhook = await TestWebhooks.getInstance().needsWebhookData(
				workflowData,
				workflowInstance,
				additionalData,
				executionMode,
				activationMode,
				sessionId,
				destinationNode,
			);
			if (needsWebhook) {
				return {
					waitingForWebhook: true,
				};
			}
		}

		// For manual testing always set to not active
		workflowData.active = false;

		// Start the workflow
		const data: IWorkflowExecutionDataProcess = {
			destinationNode,
			executionMode,
			runData,
			pinData,
			sessionId,
			startNodes,
			workflowData,
			userId: req.user.id,
		};

		if (pinnedTrigger) {
			data.startNodes = [pinnedTrigger.name];
		}

		const workflowRunner = new WorkflowRunner();
		const executionId = await workflowRunner.run(data);

		return {
			executionId,
		};
	}),
);
