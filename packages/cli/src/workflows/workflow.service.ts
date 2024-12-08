import type { Scope } from '@n8n/permissions';
// eslint-disable-next-line n8n-local-rules/misplaced-n8n-typeorm-import
import type { EntityManager } from '@n8n/typeorm';
// eslint-disable-next-line n8n-local-rules/misplaced-n8n-typeorm-import
import { In } from '@n8n/typeorm';
import omit from 'lodash/omit';
import pick from 'lodash/pick';
import { BinaryDataService } from 'n8n-core';
import { NodeApiError } from 'n8n-workflow';
import { Service } from 'typedi';
import { v4 as uuid } from 'uuid';

import { ActiveWorkflowManager } from '@/active-workflow-manager';
import config from '@/config';
import { SharedWorkflow } from '@/databases/entities/shared-workflow';
import type { User } from '@/databases/entities/user';
import type { WorkflowEntity } from '@/databases/entities/workflow-entity';
import { ExecutionRepository } from '@/databases/repositories/execution.repository';
import { SharedWorkflowRepository } from '@/databases/repositories/shared-workflow.repository';
import { WorkflowTagMappingRepository } from '@/databases/repositories/workflow-tag-mapping.repository';
import { WorkflowRepository } from '@/databases/repositories/workflow.repository';
import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import { EventService } from '@/events/event.service';
import { ExternalHooks } from '@/external-hooks';
import { validateEntity } from '@/generic-helpers';
import { Logger } from '@/logging/logger.service';
import { hasSharing, type ListQuery } from '@/requests';
import { OrchestrationService } from '@/services/orchestration.service';
import { OwnershipService } from '@/services/ownership.service';
import { ProjectService } from '@/services/project.service';
import { RoleService } from '@/services/role.service';
import { TagService } from '@/services/tag.service';
import * as WorkflowHelpers from '@/workflow-helpers';

import { WorkflowHistoryService } from './workflow-history/workflow-history.service.ee';
import { WorkflowSharingService } from './workflow-sharing.service';

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
		private readonly orchestrationService: OrchestrationService,
		private readonly externalHooks: ExternalHooks,
		private readonly activeWorkflowManager: ActiveWorkflowManager,
		private readonly roleService: RoleService,
		private readonly workflowSharingService: WorkflowSharingService,
		private readonly projectService: ProjectService,
		private readonly executionRepository: ExecutionRepository,
		private readonly eventService: EventService,
	) {}

	async getMany(user: User, options?: ListQuery.Options, includeScopes?: boolean) {
		const sharedWorkflowIds = await this.workflowSharingService.getSharedWorkflowIds(user, {
			scopes: ['workflow:read'],
		});

		// eslint-disable-next-line prefer-const
		let { workflows, count } = await this.workflowRepository.getMany(sharedWorkflowIds, options);

		if (hasSharing(workflows)) {
			// Since we're filtering using project ID as part of the relation,
			// we end up filtering out all the other relations, meaning that if
			// it's shared to a project, it won't be able to find the home project.
			// To solve this, we have to get all the relation now, even though
			// we're deleting them later.
			if (typeof options?.filter?.projectId === 'string' && options.filter.projectId !== '') {
				const relations = await this.sharedWorkflowRepository.getAllRelationsForWorkflows(
					workflows.map((c) => c.id),
				);
				workflows.forEach((c) => {
					c.shared = relations.filter((r) => r.workflowId === c.id);
				});
			}

			workflows = workflows.map((w) => this.ownershipService.addOwnedByAndSharedWith(w));
		}

		if (includeScopes) {
			const projectRelations = await this.projectService.getProjectRelationsForUser(user);
			workflows = workflows.map((w) => this.roleService.addScopes(w, user, projectRelations));
		}

		workflows.forEach((w) => {
			// This is to emulate the old behaviour of removing the shared field as
			// part of `addOwnedByAndSharedWith`. We need this field in `addScopes`
			// though. So to avoid leaking the information we just delete it.
			delete w.shared;
		});

		return { workflows, count };
	}

	// eslint-disable-next-line complexity
	async update(
		user: User,
		workflowUpdateData: WorkflowEntity,
		workflowId: string,
		tagIds?: string[],
		forceSave?: boolean,
	): Promise<WorkflowEntity> {
		const workflow = await this.sharedWorkflowRepository.findWorkflowForUser(workflowId, user, [
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
			workflowUpdateData.versionId = uuid();
			this.logger.debug(
				`Updating versionId for workflow ${workflowId} for user ${user.id} after saving`,
				{
					previousVersionId: workflow.versionId,
					newVersionId: workflowUpdateData.versionId,
				},
			);
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

		if (workflowSettings.executionTimeout === config.get('executions.timeout')) {
			// Do not save when default got set
			delete workflowSettings.executionTimeout;
		}

		if (workflowUpdateData.name) {
			workflowUpdateData.updatedAt = new Date(); // required due to atomic update
			await validateEntity(workflowUpdateData);
		}

		await this.workflowRepository.update(
			workflowId,
			pick(workflowUpdateData, [
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
			await this.workflowTagMappingRepository.overwriteTaggings(workflowId, tagIds);
		}

		if (workflowUpdateData.versionId !== workflow.versionId) {
			await this.workflowHistoryService.saveVersion(user, workflowUpdateData, workflowId);
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
		this.eventService.emit('workflow-saved', {
			user,
			workflow: updatedWorkflow,
			publicApi: false,
		});

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

				let message;
				if (error instanceof NodeApiError) message = error.description;
				message = message ?? (error as Error).message;

				// Now return the original error for UI to display
				throw new BadRequestError(message);
			}
		}

		await this.orchestrationService.init();

		return updatedWorkflow;
	}

	async delete(user: User, workflowId: string): Promise<WorkflowEntity | undefined> {
		await this.externalHooks.run('workflow.delete', [workflowId]);

		const workflow = await this.sharedWorkflowRepository.findWorkflowForUser(workflowId, user, [
			'workflow:delete',
		]);

		if (!workflow) {
			return;
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
}
