import { validate as jsonSchemaValidate } from 'jsonschema';
import type { INode, IPinData, JsonObject } from 'n8n-workflow';
import { NodeApiError, jsonParse, LoggerProxy, Workflow } from 'n8n-workflow';
import type { FindOptionsWhere } from 'typeorm';
import { In } from 'typeorm';
import pick from 'lodash.pick';
import { v4 as uuid } from 'uuid';
import * as ActiveWorkflowRunner from '@/ActiveWorkflowRunner';
import * as Db from '@/Db';
import { InternalHooksManager } from '@/InternalHooksManager';
import * as ResponseHelper from '@/ResponseHelper';
import * as WorkflowHelpers from '@/WorkflowHelpers';
import config from '@/config';
import type { SharedWorkflow } from '@db/entities/SharedWorkflow';
import type { User } from '@db/entities/User';
import type { WorkflowEntity } from '@db/entities/WorkflowEntity';
import { validateEntity } from '@/GenericHelpers';
import { ExternalHooks } from '@/ExternalHooks';
import * as TagHelpers from '@/TagHelpers';
import type { WorkflowRequest } from '@/requests';
import type { IWorkflowDb, IWorkflowExecutionDataProcess } from '@/Interfaces';
import { NodeTypes } from '@/NodeTypes';
import { WorkflowRunner } from '@/WorkflowRunner';
import * as WorkflowExecuteAdditionalData from '@/WorkflowExecuteAdditionalData';
import * as TestWebhooks from '@/TestWebhooks';
import { getSharedWorkflowIds } from '@/WorkflowHelpers';
import { isSharingEnabled, whereClause } from '@/UserManagement/UserManagementHelper';

export interface IGetWorkflowsQueryFilter {
	id?: string;
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
		workflowId: string,
		relations: string[] = ['workflow'],
		{ allowGlobalOwner } = { allowGlobalOwner: true },
	): Promise<SharedWorkflow | null> {
		const where: FindOptionsWhere<SharedWorkflow> = { workflowId };

		// Omit user from where if the requesting user is the global
		// owner. This allows the global owner to view and delete
		// workflows they don't own.
		if (!allowGlobalOwner || user.globalRole.name !== 'owner') {
			where.userId = user.id;
		}

		return Db.collections.SharedWorkflow.findOne({ where, relations });
	}

	/**
	 * Find the pinned trigger to execute the workflow from, if any.
	 *
	 * - In a full execution, select the _first_ pinned trigger.
	 * - In a partial execution,
	 *   - select the _first_ pinned trigger that leads to the executed node,
	 *   - else select the executed pinned trigger.
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

		const parentNames = new Workflow({
			nodes: workflow.nodes,
			connections: workflow.connections,
			active: workflow.active,
			nodeTypes: NodeTypes(),
		}).getParentNodes(startNodeName);

		let checkNodeName = '';

		if (parentNames.length === 0) {
			checkNodeName = startNodeName;
		} else {
			checkNodeName = parentNames.find((pn) => pn === pinnedTriggers[0].name) as string;
		}

		return pinnedTriggers.find((pt) => pt.name === checkNodeName) ?? null; // partial execution
	}

	static async get(workflow: FindOptionsWhere<WorkflowEntity>, options?: { relations: string[] }) {
		return Db.collections.Workflow.findOne({ where: workflow, relations: options?.relations });
	}

	// Warning: this function is overridden by EE to disregard role list.
	static async getWorkflowIdsForUser(user: User, roles?: string[]): Promise<string[]> {
		return getSharedWorkflowIds(user, roles);
	}

	static async getMany(user: User, rawFilter: string): Promise<WorkflowEntity[]> {
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
					'Parameter "filter" contained invalid JSON string.',
				);
			}
		}

		// safeguard against querying ids not shared with the user
		const workflowId = filter?.id?.toString();
		if (workflowId !== undefined && !sharedWorkflowIds.includes(workflowId)) {
			LoggerProxy.verbose(`User ${user.id} attempted to query non-shared workflow ${workflowId}`);
			return [];
		}

		const fields: Array<keyof WorkflowEntity> = [
			'id',
			'name',
			'active',
			'createdAt',
			'updatedAt',
			'nodes',
		];
		const relations: string[] = [];

		if (!config.getEnv('workflowTagsDisabled')) {
			relations.push('tags');
		}

		if (isSharingEnabled()) {
			relations.push('shared', 'shared.user', 'shared.role');
		}

		return Db.collections.Workflow.find({
			select: isSharingEnabled() ? [...fields, 'versionId'] : fields,
			relations,
			where: {
				id: In(sharedWorkflowIds),
				...filter,
			},
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
			LoggerProxy.verbose('User attempted to update a workflow without permissions', {
				workflowId,
				userId: user.id,
			});
			throw new ResponseHelper.NotFoundError(
				'You do not have permission to update this workflow. Ask the owner to share it with you.',
			);
		}

		if (
			!forceSave &&
			workflow.versionId !== '' &&
			workflow.versionId !== shared.workflow.versionId
		) {
			throw new ResponseHelper.BadRequestError(
				'Your most recent changes may be lost, because someone else just updated this workflow. Open this workflow in a new tab to see those new updates.',
				100,
			);
		}

		// Update the workflow's version
		workflow.versionId = uuid();

		LoggerProxy.verbose(
			`Updating versionId for workflow ${workflowId} for user ${user.id} after saving`,
			{
				previousVersionId: shared.workflow.versionId,
				newVersionId: workflow.versionId,
			},
		);

		// check credentials for old format
		await WorkflowHelpers.replaceInvalidCredentials(workflow);

		WorkflowHelpers.addNodeIds(workflow);

		await ExternalHooks().run('workflow.update', [workflow]);

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
				'versionId',
			]),
		);

		if (tags && !config.getEnv('workflowTagsDisabled')) {
			const tablePrefix = config.getEnv('database.tablePrefix');
			await TagHelpers.removeRelations(workflowId, tablePrefix);

			if (tags.length) {
				await TagHelpers.createRelations(workflowId, tags, tablePrefix);
			}
		}

		const relations = config.getEnv('workflowTagsDisabled') ? [] : ['tags'];

		// We sadly get nothing back from "update". Neither if it updated a record
		// nor the new value. So query now the hopefully updated entry.
		const updatedWorkflow = await Db.collections.Workflow.findOne({
			where: { id: workflowId },
			relations,
		});

		if (updatedWorkflow === null) {
			throw new ResponseHelper.BadRequestError(
				`Workflow with ID "${workflowId}" could not be found to be updated.`,
			);
		}

		if (updatedWorkflow.tags?.length && tags?.length) {
			updatedWorkflow.tags = TagHelpers.sortByRequestOrder(updatedWorkflow.tags, {
				requestOrder: tags,
			});
		}

		await ExternalHooks().run('workflow.afterUpdate', [updatedWorkflow]);
		void InternalHooksManager.getInstance().onWorkflowSaved(user, updatedWorkflow, false);

		if (updatedWorkflow.active) {
			// When the workflow is supposed to be active add it again
			try {
				await ExternalHooks().run('workflow.activate', [updatedWorkflow]);
				await ActiveWorkflowRunner.getInstance().add(
					workflowId,
					shared.workflow.active ? 'update' : 'activate',
				);
			} catch (error) {
				// If workflow could not be activated set it again to inactive
				await Db.collections.Workflow.update(workflowId, { active: false });

				// Also set it in the returned data
				updatedWorkflow.active = false;

				let message;
				if (error instanceof NodeApiError) message = error.description;
				message = message ?? (error as Error).message;

				// Now return the original error for UI to display
				throw new ResponseHelper.BadRequestError(message);
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

	static async delete(user: User, workflowId: string): Promise<WorkflowEntity | undefined> {
		await ExternalHooks().run('workflow.delete', [workflowId]);

		const sharedWorkflow = await Db.collections.SharedWorkflow.findOne({
			relations: ['workflow', 'role'],
			where: whereClause({
				user,
				entityType: 'workflow',
				entityId: workflowId,
				roles: ['owner'],
			}),
		});

		if (!sharedWorkflow) {
			return;
		}

		if (sharedWorkflow.workflow.active) {
			// deactivate before deleting
			await ActiveWorkflowRunner.getInstance().remove(workflowId);
		}

		await Db.collections.Workflow.delete(workflowId);

		void InternalHooksManager.getInstance().onWorkflowDeleted(user, workflowId, false);
		await ExternalHooks().run('workflow.afterDelete', [workflowId]);

		return sharedWorkflow.workflow;
	}
}
