import { Logger } from '@n8n/backend-common';
import { GlobalConfig } from '@n8n/config';
import type {
	User,
	WorkflowEntity,
	ListQueryDb,
	WorkflowFolderUnionFull,
	WorkflowHistoryUpdate,
	WorkflowHistory,
} from '@n8n/db';
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
import { FileLocation, BinaryDataService } from 'n8n-core';
import { NodeApiError, PROJECT_ROOT } from 'n8n-workflow';
import { v4 as uuid } from 'uuid';

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
// eslint-disable-next-line import-x/no-cycle
import { ProjectService } from '@/services/project.service.ee';
import { RoleService } from '@/services/role.service';
import { TagService } from '@/services/tag.service';
import * as WorkflowHelpers from '@/workflow-helpers';

import { WorkflowFinderService } from './workflow-finder.service';
import { WorkflowHistoryService } from './workflow-history/workflow-history.service';
import { WorkflowSharingService } from './workflow-sharing.service';

type RollbackPayload = {
	active: boolean;
	activeVersionId: string | null;
	activeVersion: WorkflowHistory | null;
} & Partial<Omit<WorkflowEntity, 'active' | 'activeVersionId' | 'activeVersion'>>;

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
		const workflow = await this.workflowFinderService.findWorkflowForUser(
			workflowId,
			user,
			['workflow:update'],
			{ includeActiveVersion: true },
		);

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

		const isDraftPublishDisabled = !this.globalConfig.workflows.draftPublishEnabled;

		if (
			Object.keys(omit(workflowUpdateData, ['id', 'versionId', 'active', 'activeVersionId']))
				.length > 0
		) {
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

		// Convert 'active' boolean from frontend to 'activeVersionId' for backend
		// Forbid updating active fields with FF on
		if (isDraftPublishDisabled && 'active' in workflowUpdateData) {
			if (workflowUpdateData.active) {
				workflowUpdateData.activeVersionId = workflowUpdateData.versionId ?? workflow.versionId;
			} else {
				workflowUpdateData.activeVersionId = null;
			}
		}

		const versionChanged =
			workflowUpdateData.versionId && workflowUpdateData.versionId !== workflow.versionId;
		const wasActive = workflow.activeVersionId !== null;
		const isNowActive = workflowUpdateData.active ?? wasActive;
		const activationStatusChanged = isNowActive !== wasActive;
		const needsActiveVersionUpdate = activationStatusChanged || (versionChanged && isNowActive);

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
		if (isDraftPublishDisabled && wasActive) {
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

		const fieldsToUpdate = [
			'name',
			'nodes',
			'connections',
			'meta',
			'settings',
			'staticData',
			'pinData',
			'versionId',
			'description',
		];

		// Forbid updating active fields with FF on
		if (isDraftPublishDisabled) {
			fieldsToUpdate.push('activeVersionId', 'active');
		}

		const updatePayload: QueryDeepPartialEntity<WorkflowEntity> = pick(
			workflowUpdateData,
			fieldsToUpdate,
		);

		// Save the workflow to history first, so we can retrieve the complete version object for the update
		if (versionChanged) {
			await this.workflowHistoryService.saveVersion(user, workflowUpdateData, workflowId);
		}

		if (isDraftPublishDisabled && needsActiveVersionUpdate) {
			const versionIdToFetch = versionChanged ? workflowUpdateData.versionId : workflow.versionId;
			const version = await this.workflowHistoryService.getVersion(
				user,
				workflowId,
				versionIdToFetch,
			);

			updatePayload.activeVersion = WorkflowHelpers.getActiveVersionUpdateValue(
				workflow,
				version,
				isNowActive,
			);
		}

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

		// Skip activation/deactivation logic if draft/publish feature flag is enabled
		if (isDraftPublishDisabled) {
			if (activationStatusChanged && isNowActive) {
				// Workflow is being activated
				this.eventService.emit('workflow-activated', {
					user,
					workflowId,
					workflow: updatedWorkflow,
					publicApi: false,
				});
			} else if (activationStatusChanged && !isNowActive) {
				// Workflow is being deactivated
				this.eventService.emit('workflow-deactivated', {
					user,
					workflowId,
					workflow: updatedWorkflow,
					publicApi: false,
				});
			}

			if (isNowActive) {
				// When the workflow is supposed to be active add it again
				await this._addToActiveWorkflowManager(
					user,
					workflowId,
					updatedWorkflow,
					wasActive ? 'update' : 'activate',
					// If workflow could not be activated, set it again to inactive
					// and revert the versionId and activeVersionId change so UI remains consistent
					{
						versionId: workflow.versionId,
						active: false,
						activeVersionId: null,
						activeVersion: null,
					},
				);
			}
		}

		return updatedWorkflow;
	}

	/**
	 * Private helper to add a workflow to the active workflow manager
	 * @param rollBackOptions - Optional rollback options
	 */
	private async _addToActiveWorkflowManager(
		user: User,
		workflowId: string,
		workflow: WorkflowEntity,
		mode: 'activate' | 'update',
		rollbackPayload: RollbackPayload,
	): Promise<void> {
		try {
			await this.externalHooks.run('workflow.activate', [workflow]);
			await this.activeWorkflowManager.add(workflowId, mode);
		} catch (error) {
			await this.workflowRepository.update(workflowId, rollbackPayload);

			// Also set it in the returned data
			workflow.active = rollbackPayload.active;
			workflow.activeVersionId = rollbackPayload.activeVersionId;
			workflow.activeVersion = rollbackPayload.activeVersion;

			if (!workflow.activeVersionId) {
				// Emit deactivation event since activation failed
				this.eventService.emit('workflow-deactivated', {
					user,
					workflowId,
					workflow,
					publicApi: false,
				});
			}

			let message;
			if (error instanceof NodeApiError) message = error.description;
			message = message ?? (error as Error).message;

			// Now return the original error for UI to display
			throw new BadRequestError(message);
		}
	}

	/**
	 * Activates a workflow by setting its activeVersionId and adding it to the active workflow manager.
	 * @param user - The user activating the workflow
	 * @param workflowId - The ID of the workflow to activate
	 * @param versionId - The version ID to activate
	 * @returns The activated workflow
	 */
	async activateWorkflow(
		user: User,
		workflowId: string,
		versionId: string,
		options?: { name?: string; description?: string },
	): Promise<WorkflowEntity> {
		const workflow = await this.workflowFinderService.findWorkflowForUser(
			workflowId,
			user,
			['workflow:update'],
			{ includeActiveVersion: true },
		);

		if (!workflow) {
			this.logger.warn('User attempted to activate a workflow without permissions', {
				workflowId,
				userId: user.id,
			});
			throw new NotFoundError(
				'You do not have permission to activate this workflow. Ask the owner to share it with you.',
			);
		}

		if (workflow.activeVersionId === versionId) {
			return workflow;
		}

		const wasActive = workflow.activeVersionId !== null;
		const activationMode = wasActive ? 'update' : 'activate';

		await this.workflowRepository.update(workflowId, {
			activeVersionId: versionId,
			active: true,
		});

		if (options) {
			const updateFields: WorkflowHistoryUpdate = {};
			if (options.name !== undefined) updateFields.name = options.name;
			if (options.description !== undefined) updateFields.description = options.description;
			await this.workflowHistoryService.updateVersion(versionId, workflowId, updateFields);
		}

		const updatedWorkflow = await this.workflowRepository.findOne({
			where: { id: workflowId },
			relations: ['activeVersion'],
		});

		if (!updatedWorkflow) {
			throw new NotFoundError(`Workflow with ID "${workflowId}" could not be found.`);
		}

		this.eventService.emit('workflow-activated', {
			user,
			workflowId,
			workflow: updatedWorkflow,
			publicApi: false,
		});

		await this._addToActiveWorkflowManager(user, workflowId, updatedWorkflow, activationMode, {
			active: workflow.active,
			activeVersionId: workflow.activeVersionId,
			activeVersion: workflow.activeVersion,
		});

		return updatedWorkflow;
	}

	/**
	 * Deactivates a workflow by removing it from the active workflow manager and setting activeVersionId to null.
	 * @param user - The user deactivating the workflow
	 * @param workflowId - The ID of the workflow to deactivate
	 * @returns The deactivated workflow
	 */
	async deactivateWorkflow(user: User, workflowId: string): Promise<WorkflowEntity> {
		const workflow = await this.workflowFinderService.findWorkflowForUser(
			workflowId,
			user,
			['workflow:update'],
			{ includeActiveVersion: true },
		);

		if (!workflow) {
			this.logger.warn('User attempted to deactivate a workflow without permissions', {
				workflowId,
				userId: user.id,
			});
			throw new NotFoundError(
				'You do not have permission to deactivate this workflow. Ask the owner to share it with you.',
			);
		}

		if (workflow.activeVersionId === null) {
			return workflow;
		}

		// Remove from active workflow manager
		await this.activeWorkflowManager.remove(workflowId);

		await this.workflowRepository.update(workflowId, {
			active: false,
			activeVersionId: null,
		});

		// Update the workflow object for response
		workflow.active = false;
		workflow.activeVersionId = null;
		workflow.activeVersion = null;

		this.eventService.emit('workflow-deactivated', {
			user,
			workflowId,
			workflow,
			publicApi: false,
		});

		return workflow;
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
			.then((rows) =>
				rows.map(({ id: executionId }) => FileLocation.ofExecution(workflowId, executionId)),
			);

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

		if (workflow.activeVersionId !== null) {
			await this.activeWorkflowManager.remove(workflowId);
		}

		const versionId = uuid();
		workflow.versionId = versionId;
		workflow.isArchived = true;
		workflow.active = false;
		workflow.activeVersionId = null;
		workflow.activeVersion = null;

		await this.workflowRepository.update(workflowId, {
			isArchived: true,
			active: false,
			activeVersion: null,
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
