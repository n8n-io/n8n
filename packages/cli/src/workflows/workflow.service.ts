import Container, { Service } from 'typedi';
import type { INode, IPinData } from 'n8n-workflow';
import { NodeApiError, Workflow } from 'n8n-workflow';
import pick from 'lodash/pick';
import omit from 'lodash/omit';
import { v4 as uuid } from 'uuid';
import { ActiveWorkflowRunner } from '@/ActiveWorkflowRunner';
import * as WorkflowHelpers from '@/WorkflowHelpers';
import config from '@/config';
import type { User } from '@db/entities/User';
import type { WorkflowEntity } from '@db/entities/WorkflowEntity';
import { validateEntity } from '@/GenericHelpers';
import { ExternalHooks } from '@/ExternalHooks';
import { hasSharing, type ListQuery } from '@/requests';
import type { WorkflowRequest } from '@/workflows/workflow.request';
import { TagService } from '@/services/tag.service';
import type { IWorkflowDb, IWorkflowExecutionDataProcess } from '@/Interfaces';
import { NodeTypes } from '@/NodeTypes';
import { WorkflowRunner } from '@/WorkflowRunner';
import * as WorkflowExecuteAdditionalData from '@/WorkflowExecuteAdditionalData';
import { TestWebhooks } from '@/TestWebhooks';
import { InternalHooks } from '@/InternalHooks';
import { WorkflowRepository } from '@db/repositories/workflow.repository';
import { OwnershipService } from '@/services/ownership.service';
import { WorkflowHistoryService } from './workflowHistory/workflowHistory.service.ee';
import { BinaryDataService } from 'n8n-core';
import { Logger } from '@/Logger';
import { MultiMainSetup } from '@/services/orchestration/main/MultiMainSetup.ee';
import { SharedWorkflowRepository } from '@db/repositories/sharedWorkflow.repository';
import { WorkflowTagMappingRepository } from '@db/repositories/workflowTagMapping.repository';
import { ExecutionRepository } from '@db/repositories/execution.repository';
import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';

@Service()
export class WorkflowService {
	constructor(
		private readonly logger: Logger,
		private readonly executionRepository: ExecutionRepository,
		private readonly sharedWorkflowRepository: SharedWorkflowRepository,
		private readonly workflowRepository: WorkflowRepository,
		private readonly workflowTagMappingRepository: WorkflowTagMappingRepository,
		private readonly binaryDataService: BinaryDataService,
		private readonly ownershipService: OwnershipService,
		private readonly tagService: TagService,
		private readonly workflowHistoryService: WorkflowHistoryService,
		private readonly multiMainSetup: MultiMainSetup,
		private readonly nodeTypes: NodeTypes,
		private readonly testWebhooks: TestWebhooks,
		private readonly externalHooks: ExternalHooks,
		private readonly activeWorkflowRunner: ActiveWorkflowRunner,
	) {}

	/**
	 * Find the pinned trigger to execute the workflow from, if any.
	 *
	 * - In a full execution, select the _first_ pinned trigger.
	 * - In a partial execution,
	 *   - select the _first_ pinned trigger that leads to the executed node,
	 *   - else select the executed pinned trigger.
	 */
	findPinnedTrigger(workflow: IWorkflowDb, startNodes?: string[], pinData?: IPinData) {
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
			nodeTypes: this.nodeTypes,
		}).getParentNodes(startNodeName);

		let checkNodeName = '';

		if (parentNames.length === 0) {
			checkNodeName = startNodeName;
		} else {
			checkNodeName = parentNames.find((pn) => pn === pinnedTriggers[0].name) as string;
		}

		return pinnedTriggers.find((pt) => pt.name === checkNodeName) ?? null; // partial execution
	}

	async getMany(sharedWorkflowIds: string[], options?: ListQuery.Options) {
		const { workflows, count } = await this.workflowRepository.getMany(sharedWorkflowIds, options);

		return hasSharing(workflows)
			? {
					workflows: workflows.map((w) => this.ownershipService.addOwnedByAndSharedWith(w)),
					count,
			  }
			: { workflows, count };
	}

	async update(
		user: User,
		workflow: WorkflowEntity,
		workflowId: string,
		tagIds?: string[],
		forceSave?: boolean,
		roles?: string[],
	): Promise<WorkflowEntity> {
		const shared = await this.sharedWorkflowRepository.findSharing(
			workflowId,
			user,
			'workflow:update',
			{ roles },
		);

		if (!shared) {
			this.logger.verbose('User attempted to update a workflow without permissions', {
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

		if (Object.keys(omit(workflow, ['id', 'versionId', 'active'])).length > 0) {
			// Update the workflow's version when changing properties such as
			// `name`, `pinData`, `nodes`, `connections`, `settings` or `tags`
			workflow.versionId = uuid();
			this.logger.verbose(
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

		await this.externalHooks.run('workflow.update', [workflow]);

		/**
		 * If the workflow being updated is stored as `active`, remove it from
		 * active workflows in memory, and re-add it after the update.
		 *
		 * If a trigger or poller in the workflow was updated, the new value
		 * will take effect only on removing and re-adding.
		 */
		if (shared.workflow.active) {
			await this.activeWorkflowRunner.remove(workflowId);
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

		await this.workflowRepository.update(
			workflowId,
			pick(workflow, [
				'name',
				'active',
				'nodes',
				'connections',
				'meta',
				'settings',
				'staticData',
				'pinData',
				'versionId',
			]),
		);

		if (tagIds && !config.getEnv('workflowTagsDisabled')) {
			await this.workflowTagMappingRepository.delete({ workflowId });
			await this.workflowTagMappingRepository.insert(
				tagIds.map((tagId) => ({ tagId, workflowId })),
			);
		}

		if (workflow.versionId !== shared.workflow.versionId) {
			await this.workflowHistoryService.saveVersion(user, workflow, workflowId);
		}

		const relations = config.getEnv('workflowTagsDisabled') ? [] : ['tags'];

		// We sadly get nothing back from "update". Neither if it updated a record
		// nor the new value. So query now the hopefully updated entry.
		const updatedWorkflow = await this.workflowRepository.findOne({
			where: { id: workflowId },
			relations,
		});

		if (updatedWorkflow === null) {
			throw new BadRequestError(
				`Workflow with ID "${workflowId}" could not be found to be updated.`,
			);
		}

		if (updatedWorkflow.tags?.length && tagIds?.length) {
			updatedWorkflow.tags = this.tagService.sortByRequestOrder(updatedWorkflow.tags, {
				requestOrder: tagIds,
			});
		}

		await this.externalHooks.run('workflow.afterUpdate', [updatedWorkflow]);
		void Container.get(InternalHooks).onWorkflowSaved(user, updatedWorkflow, false);

		if (updatedWorkflow.active) {
			// When the workflow is supposed to be active add it again
			try {
				await this.externalHooks.run('workflow.activate', [updatedWorkflow]);
				await this.activeWorkflowRunner.add(
					workflowId,
					shared.workflow.active ? 'update' : 'activate',
				);
			} catch (error) {
				// If workflow could not be activated set it again to inactive
				// and revert the versionId change so UI remains consistent
				await this.workflowRepository.update(workflowId, {
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

		await this.multiMainSetup.init();

		const newState = updatedWorkflow.active;

		if (this.multiMainSetup.isEnabled && oldState !== newState) {
			await this.multiMainSetup.broadcastWorkflowActiveStateChanged({
				workflowId,
				oldState,
				newState,
				versionId: shared.workflow.versionId,
			});
		}

		return updatedWorkflow;
	}

	async runManually(
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
		const pinnedTrigger = this.findPinnedTrigger(workflowData, startNodes, pinData);

		// If webhooks nodes exist and are active we have to wait for till we receive a call
		if (
			pinnedTrigger === null &&
			(runData === undefined ||
				startNodes === undefined ||
				startNodes.length === 0 ||
				destinationNode === undefined)
		) {
			const additionalData = await WorkflowExecuteAdditionalData.getBase(user.id);

			const needsWebhook = await this.testWebhooks.needsWebhook(
				user.id,
				workflowData,
				additionalData,
				sessionId,
				destinationNode,
			);

			if (needsWebhook) return { waitingForWebhook: true };
		}

		// For manual testing always set to not active
		workflowData.active = false;

		// Start the workflow
		const data: IWorkflowExecutionDataProcess = {
			destinationNode,
			executionMode: 'manual',
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

	async delete(user: User, workflowId: string): Promise<WorkflowEntity | undefined> {
		await this.externalHooks.run('workflow.delete', [workflowId]);

		const sharedWorkflow = await this.sharedWorkflowRepository.findSharing(
			workflowId,
			user,
			'workflow:delete',
			{ roles: ['owner'] },
		);

		if (!sharedWorkflow) {
			return;
		}

		if (sharedWorkflow.workflow.active) {
			// deactivate before deleting
			await this.activeWorkflowRunner.remove(workflowId);
		}

		const idsForDeletion = await this.executionRepository
			.find({
				select: ['id'],
				where: { workflowId },
			})
			.then((rows) => rows.map(({ id: executionId }) => ({ workflowId, executionId })));

		await this.workflowRepository.delete(workflowId);
		await this.binaryDataService.deleteMany(idsForDeletion);

		void Container.get(InternalHooks).onWorkflowDeleted(user, workflowId, false);
		await this.externalHooks.run('workflow.afterDelete', [workflowId]);

		return sharedWorkflow.workflow;
	}
}
