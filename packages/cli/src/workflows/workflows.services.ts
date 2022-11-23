import { validate as jsonSchemaValidate } from 'jsonschema';
import { INode, IPinData, JsonObject, jsonParse, LoggerProxy, Workflow } from 'n8n-workflow';
import { FindManyOptions, FindOneOptions, In, ObjectLiteral } from 'typeorm';
import pick from 'lodash.pick';
import * as ActiveWorkflowRunner from '@/ActiveWorkflowRunner';
import * as Db from '@/Db';
import { InternalHooksManager } from '@/InternalHooksManager';
import * as ResponseHelper from '@/ResponseHelper';
import * as WorkflowHelpers from '@/WorkflowHelpers';
import config from '@/config';
import { SharedWorkflow } from '@db/entities/SharedWorkflow';
import { User } from '@db/entities/User';
import { WorkflowEntity } from '@db/entities/WorkflowEntity';
import { validateEntity } from '@/GenericHelpers';
import { externalHooks } from '@/Server';
import * as TagHelpers from '@/TagHelpers';
import { WorkflowRequest } from '@/requests';
import { IWorkflowDb, IWorkflowExecutionDataProcess } from '@/Interfaces';
import { NodeTypes } from '@/NodeTypes';
import { WorkflowRunner } from '@/WorkflowRunner';
import * as WorkflowExecuteAdditionalData from '@/WorkflowExecuteAdditionalData';
import * as TestWebhooks from '@/TestWebhooks';
import { getSharedWorkflowIds } from '@/WorkflowHelpers';
import { whereClause } from '@/UserManagement/UserManagementHelper';

export interface IGetWorkflowsQueryFilter {
	id?: number | string;
	name?: string;
	active?: boolean;
}

const schemaGetWorkflowsQueryFilter = {
	$id: '/IGetWorkflowsQueryFilter',
	type: 'object',
	properties: {
		id: { anyOf: [{ type: 'integer' }, { type: 'string' }] },
		name: { type: 'string' },
		active: { type: 'boolean' },
	},
};

const allowedWorkflowsQueryFilterFields = Object.keys(schemaGetWorkflowsQueryFilter.properties);

export class WorkflowsService {
	static async getSharing(
		user: User,
		workflowId: number | string,
		relations: string[] = ['workflow'],
		{ allowGlobalOwner } = { allowGlobalOwner: true },
	): Promise<SharedWorkflow | undefined> {
		const options: FindOneOptions<SharedWorkflow> & { where: ObjectLiteral } = {
			where: {
				workflow: { id: workflowId },
			},
		};

		// Omit user from where if the requesting user is the global
		// owner. This allows the global owner to view and delete
		// workflows they don't own.
		if (!allowGlobalOwner || user.globalRole.name !== 'owner') {
			options.where.user = { id: user.id };
		}

		if (relations?.length) {
			options.relations = relations;
		}

		return Db.collections.SharedWorkflow.findOne(options);
	}

	/**
	 * Find the pinned trigger to execute the workflow from, if any.
	 */
	static findPinnedTrigger(workflow: IWorkflowDb, startNodes?: string[], pinData?: IPinData) {
		if (!pinData || !startNodes) return null;

		const isTrigger = (nodeTypeName: string) =>
			['trigger', 'webhook'].some((suffix) => nodeTypeName.toLowerCase().includes(suffix));

		const pinnedTriggers = workflow.nodes.filter(
			(node) => !node.disabled && pinData[node.name] && isTrigger(node.type),
		);

		if (pinnedTriggers.length === 0) return null;

		if (startNodes?.length === 0) return pinnedTriggers[0]; // full execution

		const [startNodeName] = startNodes;

		return pinnedTriggers.find((pt) => pt.name === startNodeName) ?? null; // partial execution
	}

	static async get(workflow: Partial<WorkflowEntity>, options?: { relations: string[] }) {
		return Db.collections.Workflow.findOne(workflow, options);
	}

	// Warning: this function is overriden by EE to disregard role list.
	static async getWorkflowIdsForUser(user: User, roles?: string[]) {
		return getSharedWorkflowIds(user, roles);
	}

	static async getMany(user: User, rawFilter: string) {
		const sharedWorkflowIds = await this.getWorkflowIdsForUser(user, ['owner']);
		if (sharedWorkflowIds.length === 0) {
			// return early since without shared workflows there can be no hits
			// (note: getSharedWorkflowIds() returns _all_ workflow ids for global owners)
			return [];
		}

		let filter: IGetWorkflowsQueryFilter | undefined = undefined;
		if (rawFilter) {
			try {
				const filterJson: JsonObject = jsonParse(rawFilter);
				if (filterJson) {
					Object.keys(filterJson).map((key) => {
						if (!allowedWorkflowsQueryFilterFields.includes(key)) delete filterJson[key];
					});
					if (jsonSchemaValidate(filterJson, schemaGetWorkflowsQueryFilter).valid) {
						filter = filterJson as IGetWorkflowsQueryFilter;
					}
				}
			} catch (error) {
				LoggerProxy.error('Failed to parse filter', {
					userId: user.id,
					filter,
				});
				throw new ResponseHelper.InternalServerError(
					`Parameter "filter" contained invalid JSON string.`,
				);
			}
		}

		// safeguard against querying ids not shared with the user
		if (filter?.id !== undefined) {
			const workflowId = parseInt(filter.id.toString());
			if (workflowId && !sharedWorkflowIds.includes(workflowId)) {
				LoggerProxy.verbose(`User ${user.id} attempted to query non-shared workflow ${workflowId}`);
				return [];
			}
		}

		const fields: Array<keyof WorkflowEntity> = ['id', 'name', 'active', 'createdAt', 'updatedAt'];

		const query: FindManyOptions<WorkflowEntity> = {
			select: config.get('enterprise.features.sharing') ? [...fields, 'nodes'] : fields,
			relations: config.get('enterprise.features.sharing')
				? ['tags', 'shared', 'shared.user', 'shared.role']
				: ['tags'],
		};

		if (config.getEnv('workflowTagsDisabled')) {
			delete query.relations;
		}

		const workflows = await Db.collections.Workflow.find(
			Object.assign(query, {
				where: {
					id: In(sharedWorkflowIds),
					...filter,
				},
			}),
		);

		return workflows.map((workflow) => {
			const { id, ...rest } = workflow;

			return {
				id: id.toString(),
				...rest,
			};
		});
	}

	static async update(
		user: User,
		workflow: WorkflowEntity,
		workflowId: string,
		tags?: string[],
		forceSave?: boolean,
		roles?: string[],
	): Promise<WorkflowEntity> {
		const shared = await Db.collections.SharedWorkflow.findOne({
			relations: ['workflow', 'role'],
			where: whereClause({
				user,
				entityType: 'workflow',
				entityId: workflowId,
				roles,
			}),
		});

		if (!shared) {
			LoggerProxy.info('User attempted to update a workflow without permissions', {
				workflowId,
				userId: user.id,
			});
			throw new ResponseHelper.NotFoundError(
				'You do not have permission to update this workflow. Ask the owner to share it with you.',
			);
		}

		if (!forceSave && workflow.hash !== '' && workflow.hash !== shared.workflow.hash) {
			throw new ResponseHelper.BadRequestError(
				'We are sorry, but the workflow has been changed in the meantime. Please reload the workflow and try again.',
			);
		}

		// check credentials for old format
		await WorkflowHelpers.replaceInvalidCredentials(workflow);

		WorkflowHelpers.addNodeIds(workflow);

		await externalHooks.run('workflow.update', [workflow]);

		if (shared.workflow.active) {
			// When workflow gets saved always remove it as the triggers could have been
			// changed and so the changes would not take effect
			await ActiveWorkflowRunner.getInstance().remove(workflowId);
		}

		if (workflow.settings) {
			if (workflow.settings.timezone === 'DEFAULT') {
				// Do not save the default timezone
				delete workflow.settings.timezone;
			}
			if (workflow.settings.saveDataErrorExecution === 'DEFAULT') {
				// Do not save when default got set
				delete workflow.settings.saveDataErrorExecution;
			}
			if (workflow.settings.saveDataSuccessExecution === 'DEFAULT') {
				// Do not save when default got set
				delete workflow.settings.saveDataSuccessExecution;
			}
			if (workflow.settings.saveManualExecutions === 'DEFAULT') {
				// Do not save when default got set
				delete workflow.settings.saveManualExecutions;
			}
			if (
				parseInt(workflow.settings.executionTimeout as string, 10) ===
				config.get('executions.timeout')
			) {
				// Do not save when default got set
				delete workflow.settings.executionTimeout;
			}
		}

		if (workflow.name) {
			workflow.updatedAt = new Date(); // required due to atomic update
			await validateEntity(workflow);
		}

		await Db.collections.Workflow.update(
			workflowId,
			pick(workflow, [
				'name',
				'active',
				'nodes',
				'connections',
				'settings',
				'staticData',
				'pinData',
			]),
		);

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
			throw new ResponseHelper.BadRequestError(
				`Workflow with ID "${workflowId}" could not be found to be updated.`,
			);
		}

		if (updatedWorkflow.tags?.length && tags?.length) {
			updatedWorkflow.tags = TagHelpers.sortByRequestOrder(updatedWorkflow.tags, {
				requestOrder: tags,
			});
		}

		await externalHooks.run('workflow.afterUpdate', [updatedWorkflow]);
		void InternalHooksManager.getInstance().onWorkflowSaved(user.id, updatedWorkflow, false);

		if (updatedWorkflow.active) {
			// When the workflow is supposed to be active add it again
			try {
				await externalHooks.run('workflow.activate', [updatedWorkflow]);
				await ActiveWorkflowRunner.getInstance().add(
					workflowId,
					shared.workflow.active ? 'update' : 'activate',
				);
			} catch (error) {
				// If workflow could not be activated set it again to inactive
				await Db.collections.Workflow.update(workflowId, { active: false });

				// Also set it in the returned data
				updatedWorkflow.active = false;

				// Now return the original error for UI to display
				throw error;
			}
		}

		return updatedWorkflow;
	}

	static async runManually(
		{
			workflowData,
			runData,
			pinData,
			startNodes,
			destinationNode,
		}: WorkflowRequest.ManualRunPayload,
		user: User,
		sessionId?: string,
	) {
		const EXECUTION_MODE = 'manual';
		const ACTIVATION_MODE = 'manual';

		const pinnedTrigger = WorkflowsService.findPinnedTrigger(workflowData, startNodes, pinData);

		// If webhooks nodes exist and are active we have to wait for till we receive a call
		if (
			pinnedTrigger === null &&
			(runData === undefined ||
				startNodes === undefined ||
				startNodes.length === 0 ||
				destinationNode === undefined)
		) {
			const workflow = new Workflow({
				id: workflowData.id?.toString(),
				name: workflowData.name,
				nodes: workflowData.nodes,
				connections: workflowData.connections,
				active: false,
				nodeTypes: NodeTypes(),
				staticData: undefined,
				settings: workflowData.settings,
			});

			const additionalData = await WorkflowExecuteAdditionalData.getBase(user.id);

			const needsWebhook = await TestWebhooks.getInstance().needsWebhookData(
				workflowData,
				workflow,
				additionalData,
				EXECUTION_MODE,
				ACTIVATION_MODE,
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
			executionMode: EXECUTION_MODE,
			runData,
			pinData,
			sessionId,
			startNodes,
			workflowData,
			userId: user.id,
		};

		const hasRunData = (node: INode) => runData !== undefined && !!runData[node.name];

		if (pinnedTrigger && !hasRunData(pinnedTrigger)) {
			data.startNodes = [pinnedTrigger.name];
		}

		const workflowRunner = new WorkflowRunner();
		const executionId = await workflowRunner.run(data);

		return {
			executionId,
		};
	}
}
