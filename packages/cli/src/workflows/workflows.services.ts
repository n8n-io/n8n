import { Container } from 'typedi';
import type { IDataObject, INode, IPinData } from 'n8n-workflow';
import {
	NodeApiError,
	ErrorReporterProxy as ErrorReporter,
	LoggerProxy,
	Workflow,
} from 'n8n-workflow';
import type { FindManyOptions, FindOptionsSelect, FindOptionsWhere, UpdateResult } from 'typeorm';
import { In, Like } from 'typeorm';
import pick from 'lodash/pick';
import { v4 as uuid } from 'uuid';
import { ActiveWorkflowRunner } from '@/ActiveWorkflowRunner';
import * as Db from '@/Db';
import * as ResponseHelper from '@/ResponseHelper';
import * as WorkflowHelpers from '@/WorkflowHelpers';
import config from '@/config';
import type { SharedWorkflow } from '@db/entities/SharedWorkflow';
import type { User } from '@db/entities/User';
import type { WorkflowEntity } from '@db/entities/WorkflowEntity';
import { validateEntity } from '@/GenericHelpers';
import { ExternalHooks } from '@/ExternalHooks';
import { type WorkflowRequest, type ListQuery, hasSharing } from '@/requests';
import { TagService } from '@/services/tag.service';
import type { IWorkflowDb, IWorkflowExecutionDataProcess } from '@/Interfaces';
import { NodeTypes } from '@/NodeTypes';
import { WorkflowRunner } from '@/WorkflowRunner';
import * as WorkflowExecuteAdditionalData from '@/WorkflowExecuteAdditionalData';
import { TestWebhooks } from '@/TestWebhooks';
import { whereClause } from '@/UserManagement/UserManagementHelper';
import { InternalHooks } from '@/InternalHooks';
import { WorkflowRepository } from '@/databases/repositories';
import { RoleService } from '@/services/role.service';
import { OwnershipService } from '@/services/ownership.service';
import { isStringArray, isWorkflowIdValid } from '@/utils';
import { WorkflowHistoryService } from './workflowHistory/workflowHistory.service.ee';
import { BinaryDataService } from 'n8n-core';

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
			nodeTypes: Container.get(NodeTypes),
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

	static async getMany(sharedWorkflowIds: string[], options?: ListQuery.Options) {
		if (sharedWorkflowIds.length === 0) return { workflows: [], count: 0 };

		const where: FindOptionsWhere<WorkflowEntity> = {
			...options?.filter,
			id: In(sharedWorkflowIds),
		};

		const reqTags = options?.filter?.tags;

		if (isStringArray(reqTags)) {
			where.tags = reqTags.map((tag) => ({ name: tag }));
		}

		type Select = FindOptionsSelect<WorkflowEntity> & { ownedBy?: true };

		const select: Select = options?.select
			? { ...options.select } // copy to enable field removal without affecting original
			: {
					name: true,
					active: true,
					createdAt: true,
					updatedAt: true,
					versionId: true,
					shared: { userId: true, roleId: true },
			  };

		delete select?.ownedBy; // remove non-entity field, handled after query

		const relations: string[] = [];

		const areTagsEnabled = !config.getEnv('workflowTagsDisabled');
		const isDefaultSelect = options?.select === undefined;
		const areTagsRequested = isDefaultSelect || options?.select?.tags === true;
		const isOwnedByIncluded = isDefaultSelect || options?.select?.ownedBy === true;

		if (areTagsEnabled && areTagsRequested) {
			relations.push('tags');
			select.tags = { id: true, name: true };
		}

		if (isOwnedByIncluded) relations.push('shared');

		if (typeof where.name === 'string' && where.name !== '') {
			where.name = Like(`%${where.name}%`);
		}

		const findManyOptions: FindManyOptions<WorkflowEntity> = {
			select: { ...select, id: true },
			where,
		};

		if (isDefaultSelect || options?.select?.updatedAt === true) {
			findManyOptions.order = { updatedAt: 'ASC' };
		}

		if (relations.length > 0) {
			findManyOptions.relations = relations;
		}

		if (options?.take) {
			findManyOptions.skip = options.skip;
			findManyOptions.take = options.take;
		}

		const [workflows, count] = (await Container.get(WorkflowRepository).findAndCount(
			findManyOptions,
		)) as [ListQuery.Workflow.Plain[] | ListQuery.Workflow.WithSharing[], number];

		if (!hasSharing(workflows)) return { workflows, count };

		const workflowOwnerRole = await Container.get(RoleService).findWorkflowOwnerRole();

		return {
			workflows: workflows.map((w) =>
				Container.get(OwnershipService).addOwnedBy(w, workflowOwnerRole),
			),
			count,
		};
	}

	static async update(
		user: User,
		workflow: WorkflowEntity,
		workflowId: string,
		tagIds?: string[],
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

		let onlyActiveUpdate = false;

		if (
			(Object.keys(workflow).length === 3 &&
				workflow.id !== undefined &&
				workflow.versionId !== undefined &&
				workflow.active !== undefined) ||
			(Object.keys(workflow).length === 2 &&
				workflow.versionId !== undefined &&
				workflow.active !== undefined)
		) {
			// we're just updating the active status of the workflow, don't update the versionId
			onlyActiveUpdate = true;
		} else {
			// Update the workflow's version
			workflow.versionId = uuid();
			LoggerProxy.verbose(
				`Updating versionId for workflow ${workflowId} for user ${user.id} after saving`,
				{
					previousVersionId: shared.workflow.versionId,
					newVersionId: workflow.versionId,
				},
			);
		}

		// check credentials for old format
		await WorkflowHelpers.replaceInvalidCredentials(workflow);

		WorkflowHelpers.addNodeIds(workflow);

		await Container.get(ExternalHooks).run('workflow.update', [workflow]);

		if (shared.workflow.active) {
			// When workflow gets saved always remove it as the triggers could have been
			// changed and so the changes would not take effect
			await Container.get(ActiveWorkflowRunner).remove(workflowId);
		}

		const workflowSettings = workflow.settings ?? {};

		const keysAllowingDefault = [
			'timezone',
			'saveDataErrorExecution',
			'saveDataSuccessExecution',
			'saveManualExecutions',
			'saveExecutionProgress',
		] as const;
		for (const key of keysAllowingDefault) {
			// Do not save the default value
			if (workflowSettings[key] === 'DEFAULT') {
				delete workflowSettings[key];
			}
		}

		if (workflowSettings.executionTimeout === config.get('executions.timeout')) {
			// Do not save when default got set
			delete workflowSettings.executionTimeout;
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

		if (tagIds && !config.getEnv('workflowTagsDisabled')) {
			await Db.collections.WorkflowTagMapping.delete({ workflowId });
			await Db.collections.WorkflowTagMapping.insert(
				tagIds.map((tagId) => ({ tagId, workflowId })),
			);
		}

		if (!onlyActiveUpdate && workflow.versionId !== shared.workflow.versionId) {
			await Container.get(WorkflowHistoryService).saveVersion(user, workflow, workflowId);
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

		if (updatedWorkflow.tags?.length && tagIds?.length) {
			updatedWorkflow.tags = Container.get(TagService).sortByRequestOrder(updatedWorkflow.tags, {
				requestOrder: tagIds,
			});
		}

		await Container.get(ExternalHooks).run('workflow.afterUpdate', [updatedWorkflow]);
		void Container.get(InternalHooks).onWorkflowSaved(user, updatedWorkflow, false);

		if (updatedWorkflow.active) {
			// When the workflow is supposed to be active add it again
			try {
				await Container.get(ExternalHooks).run('workflow.activate', [updatedWorkflow]);
				await Container.get(ActiveWorkflowRunner).add(
					workflowId,
					shared.workflow.active ? 'update' : 'activate',
				);
			} catch (error) {
				// If workflow could not be activated set it again to inactive
				// and revert the versionId change so UI remains consistent
				await Db.collections.Workflow.update(workflowId, {
					active: false,
					versionId: shared.workflow.versionId,
				});

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
				nodeTypes: Container.get(NodeTypes),
				staticData: undefined,
				settings: workflowData.settings,
			});

			const additionalData = await WorkflowExecuteAdditionalData.getBase(user.id);

			const needsWebhook = await Container.get(TestWebhooks).needsWebhookData(
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
		await Container.get(ExternalHooks).run('workflow.delete', [workflowId]);

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
			await Container.get(ActiveWorkflowRunner).remove(workflowId);
		}

		const idsForDeletion = await Db.collections.Execution.find({
			select: ['id'],
			where: { workflowId },
		}).then((rows) => rows.map(({ id: executionId }) => ({ workflowId, executionId })));

		await Db.collections.Workflow.delete(workflowId);
		await Container.get(BinaryDataService).deleteMany(idsForDeletion);

		void Container.get(InternalHooks).onWorkflowDeleted(user, workflowId, false);
		await Container.get(ExternalHooks).run('workflow.afterDelete', [workflowId]);

		return sharedWorkflow.workflow;
	}

	static async updateWorkflowTriggerCount(id: string, triggerCount: number): Promise<UpdateResult> {
		const qb = Db.collections.Workflow.createQueryBuilder('workflow');
		return qb
			.update()
			.set({
				triggerCount,
				updatedAt: () => {
					if (['mysqldb', 'mariadb'].includes(config.getEnv('database.type'))) {
						return 'updatedAt';
					}
					return '"updatedAt"';
				},
			})
			.where('id = :id', { id })
			.execute();
	}

	/**
	 * Saves the static data if it changed
	 */
	static async saveStaticData(workflow: Workflow): Promise<void> {
		if (workflow.staticData.__dataChanged === true) {
			// Static data of workflow changed and so has to be saved
			if (isWorkflowIdValid(workflow.id)) {
				// Workflow is saved so update in database
				try {
					// eslint-disable-next-line @typescript-eslint/no-use-before-define
					await WorkflowsService.saveStaticDataById(workflow.id, workflow.staticData);
					workflow.staticData.__dataChanged = false;
				} catch (error) {
					ErrorReporter.error(error);
					LoggerProxy.error(
						// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
						`There was a problem saving the workflow with id "${workflow.id}" to save changed staticData: "${error.message}"`,
						{ workflowId: workflow.id },
					);
				}
			}
		}
	}

	/**
	 * Saves the given static data on workflow
	 *
	 * @param {(string)} workflowId The id of the workflow to save data on
	 * @param {IDataObject} newStaticData The static data to save
	 */
	static async saveStaticDataById(workflowId: string, newStaticData: IDataObject): Promise<void> {
		await Db.collections.Workflow.update(workflowId, {
			staticData: newStaticData,
		});
	}
}
