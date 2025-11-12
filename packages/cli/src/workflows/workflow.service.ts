import { Logger } from '@n8n/backend-common';
import { GlobalConfig } from '@n8n/config';
import type { User, WorkflowEntity, ListQueryDb, WorkflowFolderUnionFull } from '@n8n/db';
import {
	SharedWorkflow,
	ExecutionRepository,
	FolderRepository,
	WorkflowTagMappingRepository,
	SharedWorkflowRepository,
	WorkflowRepository,
} from '@n8n/db';
import { Service } from '@n8n/di';
import type { Scope } from '@n8n/permissions';
// eslint-disable-next-line n8n-local-rules/misplaced-n8n-typeorm-import
import type { EntityManager } from '@n8n/typeorm';
// eslint-disable-next-line n8n-local-rules/misplaced-n8n-typeorm-import
import { In } from '@n8n/typeorm';
import type { QueryDeepPartialEntity } from '@n8n/typeorm/query-builder/QueryPartialEntity';
import omit from 'lodash/omit';
import pick from 'lodash/pick';
import { BinaryDataService } from 'n8n-core';
import { NodeApiError, PROJECT_ROOT } from 'n8n-workflow';
import { v4 as uuid } from 'uuid';

import { WorkflowFinderService } from './workflow-finder.service';
import { WorkflowHistoryService } from './workflow-history/workflow-history.service';
import { WorkflowSharingService } from './workflow-sharing.service';

import { ActiveWorkflowManager } from '@/active-workflow-manager';
import { FolderNotFoundError } from '@/errors/folder-not-found.error';
import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import { EventService } from '@/events/event.service';
import { ExternalHooks } from '@/external-hooks';
import { validateEntity } from '@/generic-helpers';
import type { ListQuery } from '@/requests';
import { hasSharing } from '@/requests';
import { OwnershipService } from '@/services/ownership.service';
import { ProjectService } from '@/services/project.service.ee';
import { RoleService } from '@/services/role.service';
import { TagService } from '@/services/tag.service';
import * as WorkflowHelpers from '@/workflow-helpers';

type HeatmapNodeBucket = {
	durationSum: number;
	durationCount: number;
	heapSum: number;
	rssSum: number;
	memCount: number;
	totalExecsAcrossRuns: number;
	presenceCount: number;
};

type ExecutionTaskLite = {
	executionTime?: number;
	metadata?: { memory?: { heapUsedDelta?: number; rssDelta?: number } };
};

export type WorkflowHeatmapResponse = {
	workflowId: string;
	consideredExecutions: number;
	limit: number;
	nodes: Record<
		string,
		{
			avgDurationMs: number;
			avgHeapUsedDeltaMB: number | null;
			avgRssDeltaMB: number | null;
			avgExecutionsPerRun: number;
			samples: { duration: number; memory: number };
		}
	>;
};

@Service()
export class WorkflowService {
	constructor(
		private readonly logger: Logger,
		private readonly sharedWorkflowRepository: SharedWorkflowRepository,
		private readonly workflowRepository: WorkflowRepository,
		private readonly workflowTagMappingRepository: WorkflowTagMappingRepository,
		private readonly binaryDataService: BinaryDataService,
		private readonly ownershipService: OwnershipService,
		private readonly tagService: TagService,
		private readonly workflowHistoryService: WorkflowHistoryService,
		private readonly externalHooks: ExternalHooks,
		private readonly activeWorkflowManager: ActiveWorkflowManager,
		private readonly roleService: RoleService,
		private readonly workflowSharingService: WorkflowSharingService,
		private readonly projectService: ProjectService,
		private readonly executionRepository: ExecutionRepository,
		private readonly eventService: EventService,
		private readonly globalConfig: GlobalConfig,
		private readonly folderRepository: FolderRepository,
		private readonly workflowFinderService: WorkflowFinderService,
	) {}

	async getMany(
		user: User,
		options?: ListQuery.Options,
		includeScopes?: boolean,
		includeFolders?: boolean,
		onlySharedWithMe?: boolean,
	) {
		let count;
		let workflows;
		let workflowsAndFolders: WorkflowFolderUnionFull[] = [];
		let sharedWorkflowIds: string[] = [];
		let isPersonalProject = false;

		if (options?.filter?.projectId) {
			const projects = await this.projectService.getProjectRelationsForUser(user);
			isPersonalProject = !!projects.find(
				(p) => p.project.id === options.filter?.projectId && p.project.type === 'personal',
			);
		}

		if (isPersonalProject) {
			sharedWorkflowIds =
				await this.workflowSharingService.getOwnedWorkflowsInPersonalProject(user);
		} else if (onlySharedWithMe) {
			sharedWorkflowIds = await this.workflowSharingService.getSharedWithMeIds(user);
		} else {
			sharedWorkflowIds = await this.workflowSharingService.getSharedWorkflowIds(user, {
				scopes: ['workflow:read'],
			});
		}

		if (includeFolders) {
			[workflowsAndFolders, count] = await this.workflowRepository.getWorkflowsAndFoldersWithCount(
				sharedWorkflowIds,
				options,
			);

			workflows = workflowsAndFolders.filter((wf) => wf.resource === 'workflow');
		} else {
			({ workflows, count } = await this.workflowRepository.getManyAndCount(
				sharedWorkflowIds,
				options,
			));
		}

		/*
			Since we're filtering using project ID as part of the relation,
			we end up filtering out all the other relations, meaning that if
			it's shared to a project, it won't be able to find the home project.
			To solve this, we have to get all the relation now, even though
			we're deleting them later.
		*/
		if (hasSharing(workflows)) {
			workflows = await this.processSharedWorkflows(workflows, options);
		}

		if (includeScopes) {
			workflows = await this.addUserScopes(workflows, user);
		}

		this.cleanupSharedField(workflows);

		if (includeFolders) {
			workflows = this.mergeProcessedWorkflows(workflowsAndFolders, workflows);
		}

		return {
			workflows,
			count,
		};
	}

	/**
	 * Aggregates per-node metrics across the last N finished executions of a workflow.
	 */
	async getHeatmap(user: User, workflowId: string, limit = 100): Promise<WorkflowHeatmapResponse> {
		// Access check: ensure user can read this workflow
		const wf = await this.workflowFinderService.findWorkflowForUser(workflowId, user, [
			'workflow:read',
		]);
		if (!wf) {
			throw new NotFoundError('Workflow not found');
		}

		// Only consider nodes present in the current workflow version; map name -> id
		const currentNameToId = this.getCurrentNameToIdMap(wf);

		// Clamp limit and fetch executions
		const clamped = this.clampLimit(limit);
		const executions = await this.fetchFinishedExecutionsWithData(workflowId, clamped);

		const consideredExecutions = executions.length;
		// Buckets keyed by nodeId
		const buckets: Record<string, HeatmapNodeBucket> = {};

		for (const exec of executions) {
			// Defensive
			const runData = exec.data?.resultData?.runData ?? {};
			this.updatePresenceCountsForExecution(buckets, currentNameToId, exec);

			this.aggregateRunDataForExecution(buckets, currentNameToId, runData);
		}

		return this.buildHeatmapResponse(buckets, workflowId, consideredExecutions, clamped);
	}

	private getCurrentNameToIdMap(wf: { nodes: Array<{ id: string; name: string }> }): Map<
		string,
		string
	> {
		const currentNameToId = new Map<string, string>();
		for (const n of wf.nodes) {
			if (n?.name && n?.id) currentNameToId.set(n.name, n.id);
		}
		return currentNameToId;
	}

	private clampLimit(limit?: number): number {
		if (!Number.isFinite(limit as number) || (limit as number) <= 0) return 100;
		const n = Math.trunc(limit as number);
		return Math.min(Math.max(n, 1), 1000);
	}

	private async fetchFinishedExecutionsWithData(workflowId: string, limit: number) {
		const finishedStatuses = ['success', 'error', 'canceled'] as const;
		return await this.executionRepository.findMultipleExecutions(
			{
				where: {
					workflowId,
					status: In(finishedStatuses),
				},
				order: { id: 'DESC' },
				take: limit,
			},
			{ includeData: true, unflattenData: true },
		);
	}

	private updatePresenceCountsForExecution(
		buckets: Record<string, HeatmapNodeBucket>,
		currentNameToId: Map<string, string>,
		exec: { workflowData?: { nodes?: Array<{ name: string }> } },
	) {
		const execNodes = exec.workflowData?.nodes ?? [];
		const presentNames = new Set(execNodes.map((n) => n.name));
		for (const name of presentNames) {
			const nodeId = currentNameToId.get(name);
			if (!nodeId) continue;
			if (!buckets[nodeId]) {
				buckets[nodeId] = {
					durationSum: 0,
					durationCount: 0,
					heapSum: 0,
					rssSum: 0,
					memCount: 0,
					totalExecsAcrossRuns: 0,
					presenceCount: 0,
				};
			}
			buckets[nodeId].presenceCount += 1;
		}
	}

	private aggregateRunDataForExecution(
		buckets: Record<string, HeatmapNodeBucket>,
		currentNameToId: Map<string, string>,
		runData: Record<string, unknown>,
	) {
		for (const [nodeName, tasks] of Object.entries(runData)) {
			const nodeId = currentNameToId.get(nodeName);
			if (!nodeId) continue;
			if (!buckets[nodeId]) {
				buckets[nodeId] = {
					durationSum: 0,
					durationCount: 0,
					heapSum: 0,
					rssSum: 0,
					memCount: 0,
					totalExecsAcrossRuns: 0,
					presenceCount: 0,
				};
			}
			const bucket = buckets[nodeId];
			const arr = this.isExecutionTaskArray(tasks) ? tasks : [];
			bucket.totalExecsAcrossRuns += arr.length;
			for (const task of arr) {
				if (typeof task.executionTime === 'number') {
					bucket.durationSum += task.executionTime;
					bucket.durationCount += 1;
				}
				const mem = task.metadata?.memory;
				if (mem && typeof mem.heapUsedDelta === 'number' && typeof mem.rssDelta === 'number') {
					bucket.heapSum += mem.heapUsedDelta;
					bucket.rssSum += mem.rssDelta;
					bucket.memCount += 1;
				}
			}
		}
	}

	private isExecutionTaskArray(x: unknown): x is ExecutionTaskLite[] {
		return Array.isArray(x);
	}

	private buildHeatmapResponse(
		buckets: Record<string, HeatmapNodeBucket>,
		workflowId: string,
		consideredExecutions: number,
		limit: number,
	): WorkflowHeatmapResponse {
		const toMB = (bytes: number) => bytes / (1024 * 1024);
		const nodes: WorkflowHeatmapResponse['nodes'] = {};
		for (const [nodeId, b] of Object.entries(buckets)) {
			const avgDurationMs = b.durationCount ? b.durationSum / b.durationCount : 0;
			const avgHeapUsedDeltaMB = b.memCount ? toMB(b.heapSum / b.memCount) : null;
			const avgRssDeltaMB = b.memCount ? toMB(b.rssSum / b.memCount) : null;
			const avgExecutionsPerRun =
				b.presenceCount > 0 ? b.totalExecsAcrossRuns / b.presenceCount : 0;

			nodes[nodeId] = {
				avgDurationMs,
				avgHeapUsedDeltaMB,
				avgRssDeltaMB,
				avgExecutionsPerRun,
				samples: { duration: b.durationCount, memory: b.memCount },
			};
		}
		return { workflowId, consideredExecutions, limit, nodes };
	}

	private async processSharedWorkflows(
		workflows: ListQueryDb.Workflow.WithSharing[],
		options?: ListQuery.Options,
	) {
		const projectId = options?.filter?.projectId;

		const shouldAddProjectRelations = typeof projectId === 'string' && projectId !== '';

		if (shouldAddProjectRelations) {
			await this.addSharedRelation(workflows);
		}

		return workflows.map((workflow) => this.ownershipService.addOwnedByAndSharedWith(workflow));
	}

	private async addSharedRelation(workflows: ListQueryDb.Workflow.WithSharing[]): Promise<void> {
		const workflowIds = workflows.map((workflow) => workflow.id);
		const relations = await this.sharedWorkflowRepository.getAllRelationsForWorkflows(workflowIds);

		workflows.forEach((workflow) => {
			workflow.shared = relations.filter((relation) => relation.workflowId === workflow.id);
		});
	}

	private async addUserScopes(
		workflows: ListQueryDb.Workflow.Plain[] | ListQueryDb.Workflow.WithSharing[],
		user: User,
	) {
		const projectRelations = await this.projectService.getProjectRelationsForUser(user);

		return workflows.map((workflow) =>
			this.roleService.addScopes(workflow, user, projectRelations),
		);
	}

	private cleanupSharedField(
		workflows: ListQueryDb.Workflow.Plain[] | ListQueryDb.Workflow.WithSharing[],
	): void {
		/*
			This is to emulate the old behavior of removing the shared field as
			part of `addOwnedByAndSharedWith`. We need this field in `addScopes`
			though. So to avoid leaking the information we just delete it.
		*/
		workflows.forEach((workflow) => {
			delete workflow.shared;
		});
	}

	private mergeProcessedWorkflows(
		workflowsAndFolders: WorkflowFolderUnionFull[],
		processedWorkflows: ListQueryDb.Workflow.Plain[] | ListQueryDb.Workflow.WithSharing[],
	) {
		const workflowMap = new Map(processedWorkflows.map((workflow) => [workflow.id, workflow]));

		return workflowsAndFolders.map((item) =>
			item.resource === 'workflow' ? (workflowMap.get(item.id) ?? item) : item,
		);
	}

	// eslint-disable-next-line complexity
	async update(
		user: User,
		workflowUpdateData: WorkflowEntity,
		workflowId: string,
		tagIds?: string[],
		parentFolderId?: string,
		forceSave?: boolean,
	): Promise<WorkflowEntity> {
		const workflow = await this.workflowFinderService.findWorkflowForUser(workflowId, user, [
			'workflow:update',
		]);

		if (!workflow) {
			this.logger.warn('User attempted to update a workflow without permissions', {
				workflowId,
				userId: user.id,
			});
			throw new NotFoundError(
				'You do not have permission to update this workflow. Ask the owner to share it with you.',
			);
		}

		if (
			!forceSave &&
			workflowUpdateData.versionId !== '' &&
			workflowUpdateData.versionId !== workflow.versionId
		) {
			throw new BadRequestError(
				'Your most recent changes may be lost, because someone else just updated this workflow. Open this workflow in a new tab to see those new updates.',
				100,
			);
		}

		if (Object.keys(omit(workflowUpdateData, ['id', 'versionId', 'active'])).length > 0) {
			// Update the workflow's version when changing properties such as
			// `name`, `pinData`, `nodes`, `connections`, `settings` or `tags`
			// This is necessary for collaboration to work properly - even when only name or settings
			// change, we need to update the version to detect conflicts when multiple users are editing.

			workflowUpdateData.versionId = uuid();
			this.logger.debug(
				`Updating versionId for workflow ${workflowId} for user ${user.id} after saving`,
				{
					previousVersionId: workflow.versionId,
					newVersionId: workflowUpdateData.versionId,
				},
			);
		}

		const versionChanged =
			workflowUpdateData.versionId && workflowUpdateData.versionId !== workflow.versionId;
		if (versionChanged) {
			// To save a version, we need both nodes and connections
			workflowUpdateData.nodes = workflowUpdateData.nodes ?? workflow.nodes;
			workflowUpdateData.connections = workflowUpdateData.connections ?? workflow.connections;
		}

		// check credentials for old format
		await WorkflowHelpers.replaceInvalidCredentials(workflowUpdateData);

		WorkflowHelpers.addNodeIds(workflowUpdateData);

		await this.externalHooks.run('workflow.update', [workflowUpdateData]);

		/**
		 * If the workflow being updated is stored as `active`, remove it from
		 * active workflows in memory, and re-add it after the update.
		 *
		 * If a trigger or poller in the workflow was updated, the new value
		 * will take effect only on removing and re-adding.
		 */
		if (workflow.active) {
			await this.activeWorkflowManager.remove(workflowId);
		}

		const workflowSettings = workflowUpdateData.settings ?? {};

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

		if (workflowSettings.executionTimeout === this.globalConfig.executions.timeout) {
			// Do not save when default got set
			delete workflowSettings.executionTimeout;
		}

		if (workflowUpdateData.name) {
			workflowUpdateData.updatedAt = new Date(); // required due to atomic update
			await validateEntity(workflowUpdateData);
		}

		const updatePayload: QueryDeepPartialEntity<WorkflowEntity> = pick(workflowUpdateData, [
			'name',
			'active',
			'nodes',
			'connections',
			'meta',
			'settings',
			'staticData',
			'pinData',
			'versionId',
			'description',
		]);

		if (parentFolderId) {
			const project = await this.sharedWorkflowRepository.getWorkflowOwningProject(workflow.id);
			if (parentFolderId !== PROJECT_ROOT) {
				try {
					await this.folderRepository.findOneOrFailFolderInProject(
						parentFolderId,
						project?.id ?? '',
					);
				} catch (e) {
					throw new FolderNotFoundError(parentFolderId);
				}
			}
			updatePayload.parentFolder = parentFolderId === PROJECT_ROOT ? null : { id: parentFolderId };
		}

		await this.workflowRepository.update(workflowId, updatePayload);

		const tagsDisabled = this.globalConfig.tags.disabled;

		if (tagIds && !tagsDisabled) {
			await this.workflowTagMappingRepository.overwriteTaggings(workflowId, tagIds);
		}

		if (versionChanged) {
			await this.workflowHistoryService.saveVersion(user, workflowUpdateData, workflowId);
		}

		const relations = tagsDisabled ? [] : ['tags'];

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
		this.eventService.emit('workflow-saved', {
			user,
			workflow: updatedWorkflow,
			publicApi: false,
		});

		// Check if workflow activation status changed
		const wasActive = workflow.active;
		const isNowActive = updatedWorkflow.active;

		if (isNowActive && !wasActive) {
			// Workflow is being activated
			this.eventService.emit('workflow-activated', {
				user,
				workflowId,
				workflow: updatedWorkflow,
				publicApi: false,
			});
		} else if (!isNowActive && wasActive) {
			// Workflow is being deactivated
			this.eventService.emit('workflow-deactivated', {
				user,
				workflowId,
				workflow: updatedWorkflow,
				publicApi: false,
			});
		}

		if (updatedWorkflow.active) {
			// When the workflow is supposed to be active add it again
			try {
				await this.externalHooks.run('workflow.activate', [updatedWorkflow]);
				await this.activeWorkflowManager.add(workflowId, workflow.active ? 'update' : 'activate');
			} catch (error) {
				// If workflow could not be activated set it again to inactive
				// and revert the versionId change so UI remains consistent
				await this.workflowRepository.update(workflowId, {
					active: false,
					versionId: workflow.versionId,
				});

				// Also set it in the returned data
				updatedWorkflow.active = false;

				// Emit deactivation event since activation failed
				this.eventService.emit('workflow-deactivated', {
					user,
					workflowId,
					workflow: updatedWorkflow,
					publicApi: false,
				});

				let message;
				if (error instanceof NodeApiError) message = error.description;
				message = message ?? (error as Error).message;

				// Now return the original error for UI to display
				throw new BadRequestError(message);
			}
		}

		return updatedWorkflow;
	}

	/**
	 * Deletes a workflow and returns it.
	 *
	 * If the workflow is active this will deactivate the workflow.
	 * If the user does not have the permissions to delete the workflow this does
	 * nothing and returns void.
	 */
	async delete(user: User, workflowId: string, force = false): Promise<WorkflowEntity | undefined> {
		await this.externalHooks.run('workflow.delete', [workflowId]);

		const workflow = await this.workflowFinderService.findWorkflowForUser(workflowId, user, [
			'workflow:delete',
		]);

		if (!workflow) {
			return;
		}

		if (!workflow.isArchived && !force) {
			throw new BadRequestError('Workflow must be archived before it can be deleted.');
		}

		if (workflow.active) {
			// deactivate before deleting
			await this.activeWorkflowManager.remove(workflowId);
		}

		const idsForDeletion = await this.executionRepository
			.find({
				select: ['id'],
				where: { workflowId },
			})
			.then((rows) => rows.map(({ id: executionId }) => ({ workflowId, executionId })));

		await this.workflowRepository.delete(workflowId);
		await this.binaryDataService.deleteMany(idsForDeletion);

		this.eventService.emit('workflow-deleted', { user, workflowId, publicApi: false });
		await this.externalHooks.run('workflow.afterDelete', [workflowId]);

		return workflow;
	}

	async archive(
		user: User,
		workflowId: string,
		skipArchived: boolean = false,
	): Promise<WorkflowEntity | undefined> {
		const workflow = await this.workflowFinderService.findWorkflowForUser(workflowId, user, [
			'workflow:delete',
		]);

		if (!workflow) {
			return;
		}

		if (workflow.isArchived) {
			if (skipArchived) {
				return workflow;
			}

			throw new BadRequestError('Workflow is already archived.');
		}

		if (workflow.active) {
			await this.activeWorkflowManager.remove(workflowId);
		}

		const versionId = uuid();
		workflow.versionId = versionId;
		workflow.isArchived = true;
		workflow.active = false;

		await this.workflowRepository.update(workflowId, {
			isArchived: true,
			active: false,
			versionId,
		});

		await this.workflowHistoryService.saveVersion(user, workflow, workflowId);

		this.eventService.emit('workflow-archived', { user, workflowId, publicApi: false });
		await this.externalHooks.run('workflow.afterArchive', [workflowId]);

		return workflow;
	}

	async unarchive(user: User, workflowId: string): Promise<WorkflowEntity | undefined> {
		const workflow = await this.workflowFinderService.findWorkflowForUser(workflowId, user, [
			'workflow:delete',
		]);

		if (!workflow) {
			return;
		}

		if (!workflow.isArchived) {
			throw new BadRequestError('Workflow is not archived.');
		}

		const versionId = uuid();
		workflow.versionId = versionId;
		workflow.isArchived = false;

		await this.workflowRepository.update(workflowId, { isArchived: false, versionId });

		await this.workflowHistoryService.saveVersion(user, workflow, workflowId);

		this.eventService.emit('workflow-unarchived', { user, workflowId, publicApi: false });
		await this.externalHooks.run('workflow.afterUnarchive', [workflowId]);

		return workflow;
	}

	async getWorkflowScopes(user: User, workflowId: string): Promise<Scope[]> {
		const userProjectRelations = await this.projectService.getProjectRelationsForUser(user);
		const shared = await this.sharedWorkflowRepository.find({
			where: {
				projectId: In([...new Set(userProjectRelations.map((pr) => pr.projectId))]),
				workflowId,
			},
		});
		return this.roleService.combineResourceScopes('workflow', user, shared, userProjectRelations);
	}

	/**
	 * Transfers all workflows owned by a project to another one.
	 * This has only been tested for personal projects. It may need to be amended
	 * for team projects.
	 **/
	async transferAll(fromProjectId: string, toProjectId: string, trx?: EntityManager) {
		trx = trx ?? this.workflowRepository.manager;

		// Get all shared workflows for both projects.
		const allSharedWorkflows = await trx.findBy(SharedWorkflow, {
			projectId: In([fromProjectId, toProjectId]),
		});
		const sharedWorkflowsOfFromProject = allSharedWorkflows.filter(
			(sw) => sw.projectId === fromProjectId,
		);

		// For all workflows that the from-project owns transfer the ownership to
		// the to-project.
		// This will override whatever relationship the to-project already has to
		// the resources at the moment.

		const ownedWorkflowIds = sharedWorkflowsOfFromProject
			.filter((sw) => sw.role === 'workflow:owner')
			.map((sw) => sw.workflowId);

		await this.sharedWorkflowRepository.makeOwner(ownedWorkflowIds, toProjectId, trx);

		// Delete the relationship to the from-project.
		await this.sharedWorkflowRepository.deleteByIds(ownedWorkflowIds, fromProjectId, trx);

		// Transfer relationships that are not `workflow:owner`.
		// This will NOT override whatever relationship the from-project already
		// has to the resource at the moment.
		const sharedWorkflowIdsOfTransferee = allSharedWorkflows
			.filter((sw) => sw.projectId === toProjectId)
			.map((sw) => sw.workflowId);

		// All resources that are shared with the from-project, but not with the
		// to-project.
		const sharedWorkflowsToTransfer = sharedWorkflowsOfFromProject.filter(
			(sw) =>
				sw.role !== 'workflow:owner' && !sharedWorkflowIdsOfTransferee.includes(sw.workflowId),
		);

		await trx.insert(
			SharedWorkflow,
			sharedWorkflowsToTransfer.map((sw) => ({
				workflowId: sw.workflowId,
				projectId: toProjectId,
				role: sw.role,
			})),
		);
	}

	async getWorkflowsWithNodesIncluded(user: User, nodeTypes: string[], includeNodes = false) {
		const foundWorkflows = await this.workflowRepository.findWorkflowsWithNodeType(
			nodeTypes,
			includeNodes,
		);

		let { workflows } = await this.workflowRepository.getManyAndCount(
			foundWorkflows.map((w) => w.id),
		);

		if (hasSharing(workflows)) {
			workflows = await this.processSharedWorkflows(workflows);
		}

		const withScopes = await this.addUserScopes(workflows, user);

		this.cleanupSharedField(withScopes);

		return withScopes.map((workflow) => {
			const nodes = includeNodes
				? (foundWorkflows.find((w) => w.id === workflow.id)?.nodes ?? [])
				: undefined;

			return { resourceType: 'workflow', ...workflow, ...(includeNodes ? { nodes } : {}) };
		});
	}
}
