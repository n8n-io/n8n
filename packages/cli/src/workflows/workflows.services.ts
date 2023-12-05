import { Container } from 'typedi';
import type { IDataObject, INode, IPinData } from 'n8n-workflow';
import { NodeApiError, ErrorReporterProxy as ErrorReporter, Workflow } from 'n8n-workflow';
import type { FindManyOptions, FindOptionsSelect, FindOptionsWhere, UpdateResult } from 'typeorm';
import { In, Like } from 'typeorm';
import pick from 'lodash/pick';
import { v4 as uuid } from 'uuid';
import { ActiveWorkflowRunner } from '@/ActiveWorkflowRunner';
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
import { WorkflowRepository } from '@db/repositories/workflow.repository';
import { OwnershipService } from '@/services/ownership.service';
import { isStringArray, isWorkflowIdValid } from '@/utils';
import { WorkflowHistoryService } from './workflowHistory/workflowHistory.service.ee';
import { BinaryDataService } from 'n8n-core';
import type { Scope } from '@n8n/permissions';
import { Logger } from '@/Logger';
import { MultiMainSetup } from '@/services/orchestration/main/MultiMainSetup.ee';
import { SharedWorkflowRepository } from '@db/repositories/sharedWorkflow.repository';
import { WorkflowTagMappingRepository } from '@db/repositories/workflowTagMapping.repository';
import { ExecutionRepository } from '@db/repositories/execution.repository';
import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';

export type WorkflowsGetSharedOptions =
	| { allowGlobalScope: true; globalScope: Scope }
	| { allowGlobalScope: false };

export class WorkflowsService {
	static async getSharing(
		user: User,
		workflowId: string,
		options: WorkflowsGetSharedOptions,
		relations: string[] = ['workflow'],
	): Promise<SharedWorkflow | null> {
		const where: FindOptionsWhere<SharedWorkflow> = { workflowId };

		// Omit user from where if the requesting user has relevant
		// global workflow permissions. This allows the user to
		// access workflows they don't own.
		if (!options.allowGlobalScope || !(await user.hasGlobalScope(options.globalScope))) {
			where.userId = user.id;
		}

		return Container.get(SharedWorkflowRepository).findOne({ where, relations });
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
		return Container.get(WorkflowRepository).findOne({
			where: workflow,
			relations: options?.relations,
		});
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

		if (isOwnedByIncluded) relations.push('shared', 'shared.role', 'shared.user');

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

		return hasSharing(workflows)
			? {
					workflows: workflows.map((w) =>
						Container.get(OwnershipService).addOwnedByAndSharedWith(w),
					),
					count,
			  }
			: { workflows, count };
	}

	static async update(
		user: User,
		workflow: WorkflowEntity,
		workflowId: string,
		tagIds?: string[],
		forceSave?: boolean,
		roles?: string[],
	): Promise<WorkflowEntity> {
		const shared = await Container.get(SharedWorkflowRepository).findOne({
			relations: ['workflow', 'role'],
			where: await whereClause({
				user,
				globalScope: 'workflow:update',
				entityType: 'workflow',
				entityId: workflowId,
				roles,
			}),
		});

		const logger = Container.get(Logger);
		if (!shared) {
			logger.verbose('User attempted to update a workflow without permissions', {
				workflowId,
				userId: user.id,
			});
			throw new NotFoundError(
				'You do not have permission to update this workflow. Ask the owner to share it with you.',
			);
		}

		const oldState = shared.workflow.active;

		if (
			!forceSave &&
			workflow.versionId !== '' &&
			workflow.versionId !== shared.workflow.versionId
		) {
			throw new BadRequestError(
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
			logger.verbose(
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

		/**
		 * If the workflow being updated is stored as `active`, remove it from
		 * active workflows in memory, and re-add it after the update.
		 *
		 * If a trigger or poller in the workflow was updated, the new value
		 * will take effect only on removing and re-adding.
		 */
		if (shared.workflow.active) {
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

		await Container.get(WorkflowRepository).update(
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
			await Container.get(WorkflowTagMappingRepository).delete({ workflowId });
			await Container.get(WorkflowTagMappingRepository).insert(
				tagIds.map((tagId) => ({ tagId, workflowId })),
			);
		}

		if (!onlyActiveUpdate && workflow.versionId !== shared.workflow.versionId) {
			await Container.get(WorkflowHistoryService).saveVersion(user, workflow, workflowId);
		}

		const relations = config.getEnv('workflowTagsDisabled') ? [] : ['tags'];

		// We sadly get nothing back from "update". Neither if it updated a record
		// nor the new value. So query now the hopefully updated entry.
		const updatedWorkflow = await Container.get(WorkflowRepository).findOne({
			where: { id: workflowId },
			relations,
		});

		if (updatedWorkflow === null) {
			throw new BadRequestError(
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
				await Container.get(WorkflowRepository).update(workflowId, {
					active: false,
					versionId: shared.workflow.versionId,
				});

				// Also set it in the returned data
				updatedWorkflow.active = false;

				let message;
				if (error instanceof NodeApiError) message = error.description;
				message = message ?? (error as Error).message;

				// Now return the original error for UI to display
				throw new BadRequestError(message);
			}
		}

		const multiMainSetup = Container.get(MultiMainSetup);

		await multiMainSetup.init();

		if (multiMainSetup.isEnabled) {
			await Container.get(MultiMainSetup).broadcastWorkflowActiveStateChanged({
				workflowId,
				oldState,
				newState: updatedWorkflow.active,
				versionId: shared.workflow.versionId,
			});
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

		const sharedWorkflow = await Container.get(SharedWorkflowRepository).findOne({
			relations: ['workflow', 'role'],
			where: await whereClause({
				user,
				globalScope: 'workflow:delete',
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

		const idsForDeletion = await Container.get(ExecutionRepository)
			.find({
				select: ['id'],
				where: { workflowId },
			})
			.then((rows) => rows.map(({ id: executionId }) => ({ workflowId, executionId })));

		await Container.get(WorkflowRepository).delete(workflowId);
		await Container.get(BinaryDataService).deleteMany(idsForDeletion);

		void Container.get(InternalHooks).onWorkflowDeleted(user, workflowId, false);
		await Container.get(ExternalHooks).run('workflow.afterDelete', [workflowId]);

		return sharedWorkflow.workflow;
	}

	static async updateWorkflowTriggerCount(id: string, triggerCount: number): Promise<UpdateResult> {
		const qb = Container.get(WorkflowRepository).createQueryBuilder('workflow');
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
					await WorkflowsService.saveStaticDataById(workflow.id, workflow.staticData);
					workflow.staticData.__dataChanged = false;
				} catch (error) {
					ErrorReporter.error(error);
					Container.get(Logger).error(
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
		await Container.get(WorkflowRepository).update(workflowId, {
			staticData: newStaticData,
		});
	}
}
