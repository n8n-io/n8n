import { UpdateWorkflowHistoryVersionDto } from '@n8n/api-types';
import type { WorkflowListPublicationStatus } from '@n8n/api-types';
import { LicenseState, Logger } from '@n8n/backend-common';
import { GlobalConfig } from '@n8n/config';
import type { User, ListQueryDb, Project, WorkflowFolderUnionFull, WorkflowHistory } from '@n8n/db';
import {
	SharedWorkflow,
	WorkflowEntity,
	FolderRepository,
	WorkflowTagMappingRepository,
	SharedWorkflowRepository,
	WorkflowRepository,
	WorkflowPublishHistoryRepository,
	WorkflowPublicationOutboxRepository,
	WorkflowPublicationReason,
	WorkflowPublishedVersionRepository,
	ProjectRepository,
} from '@n8n/db';
import { Container, Service } from '@n8n/di';
import type { ApiKeyScope, Scope } from '@n8n/permissions';
import { hasGlobalScope } from '@n8n/permissions';
import type { EntityManager } from '@n8n/typeorm';
import { In, QueryFailedError } from '@n8n/typeorm';
import type { QueryDeepPartialEntity } from '@n8n/typeorm/query-builder/QueryPartialEntity';
import { ensureError } from '@n8n/utils/errors/ensure-error';
import isEqual from 'lodash/isEqual';
import pick from 'lodash/pick';
import type { INode, INodes, IWorkflowSettings, JsonValue, IConnections } from 'n8n-workflow';
import { PROJECT_ROOT, Workflow, assert, calculateWorkflowChecksum } from 'n8n-workflow';
import { v4 as uuid } from 'uuid';

import { WorkflowPublicationNotifier } from './publication/workflow-publication-notifier';
import { WorkflowPublicationStatusService } from './publication/workflow-publication-status.service';
import { getEnabledTriggerNodes } from './triggers/enabled-trigger-nodes';
import { getErrorDescription, getErrorNodeId, getRequiredRedactionScopes } from './utils';
import { WorkflowFinderService } from './workflow-finder.service';
import { WorkflowHistoryService } from './workflow-history/workflow-history.service';
import { WorkflowMutationHooksProxy } from './workflow-mutation-hooks-proxy.service';
import { WorkflowPublishGuardProxy } from './workflow-publish-guard-proxy.service';
import { WorkflowValidationService } from './workflow-validation.service';

import { ActiveWorkflowManager } from '@/active-workflow-manager';
import { FolderNotFoundError } from '@/errors/folder-not-found.error';
import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { ConflictError } from '@/errors/response-errors/conflict.error';
import { ForbiddenError } from '@/errors/response-errors/forbidden.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import { WorkflowActivationBadRequestError } from '@/errors/response-errors/workflow-activation-bad-request.error';
import { WorkflowDeactivationBadRequestError } from '@/errors/response-errors/workflow-deactivation-bad-request.error';
import { WorkflowPublishForbiddenError } from '@/errors/response-errors/workflow-publish-forbidden.error';
import { WorkflowValidationError } from '@/errors/response-errors/workflow-validation.error';
import { WorkflowHistoryVersionNotFoundError } from '@/errors/workflow-history-version-not-found.error';
import { EventService } from '@/events/event.service';
import type { WorkflowActionSource } from '@/events/maps/relay.event-map';
import { ExecutionPersistence } from '@/executions/execution-persistence';
import { ExternalHooks, toWorkflowLifecycleHookActor } from '@/external-hooks';
import { validateEntity } from '@/generic-helpers';
import { RedactionEnforcementService } from '@/modules/redaction/redaction-enforcement.service';
import { NodeTypes } from '@/node-types';
import { userHasScopes } from '@/permissions.ee/check-access';
import { PolicyEnforcementService } from '@/policy/policy-enforcement.service';
import type { ListQuery } from '@/requests';
import { hasSharing } from '@/requests';
import { DurableJobProvisioner } from '@/scheduling/durable-job-provisioner';
import { PollTriggerJobRegistrar } from '@/scheduling/poll-trigger-node/poll-trigger-job-registrar';
import { ScheduleTriggerJobRegistrar } from '@/scheduling/schedule-trigger-node/schedule-trigger-job-registrar';
import { WorkflowScheduledJobOwner } from '@/scheduling/workflow-scheduled-job-owner';
import { OwnershipService } from '@/services/ownership.service';
import { ProjectService } from '@/services/project.service.ee';
import { RoleService } from '@/services/role.service';
import { TagService } from '@/services/tag.service';
import { WEBHOOK_CONFLICT_MESSAGE } from '@/webhooks/constants';
import { WebhookService } from '@/webhooks/webhook.service';
import { getBase as getWorkflowExecutionData } from '@/workflow-execute-additional-data';
import * as WorkflowHelpers from '@/workflow-helpers';
import { WorkflowHookContextService } from '@/workflow-hook-context.service';

/** Internal rollback vehicle for `publishAsSystem`'s guarded transaction; never escapes it. */
class SystemPublishSupersededError extends Error {}

/** The API-key scope a caller needs to put a version live, whether directly or by saving. */
const PUBLISH_API_KEY_SCOPE: ApiKeyScope = 'workflow:activate';

/** What `getMany` should enrich or scope beyond the plain list query. */
export type GetManyOptions = {
	includeScopes?: boolean;
	includeFolders?: boolean;
	onlySharedWithMe?: boolean;
	/** Attach the list publication badge; only the workflow list UI wants this. */
	includePublicationStatus?: boolean;
	requiredScopes?: Scope[];
};

@Service()
export class WorkflowService {
	constructor(
		private readonly logger: Logger,
		private readonly sharedWorkflowRepository: SharedWorkflowRepository,
		private readonly workflowRepository: WorkflowRepository,
		private readonly workflowTagMappingRepository: WorkflowTagMappingRepository,
		private readonly ownershipService: OwnershipService,
		private readonly tagService: TagService,
		private readonly workflowHistoryService: WorkflowHistoryService,
		private readonly externalHooks: ExternalHooks,
		private readonly activeWorkflowManager: ActiveWorkflowManager,
		private readonly roleService: RoleService,
		private readonly projectService: ProjectService,
		private readonly executionPersistence: ExecutionPersistence,
		private readonly eventService: EventService,
		private readonly globalConfig: GlobalConfig,
		private readonly folderRepository: FolderRepository,
		private readonly workflowFinderService: WorkflowFinderService,
		private readonly workflowPublishHistoryRepository: WorkflowPublishHistoryRepository,
		private readonly outboxRepository: WorkflowPublicationOutboxRepository,
		private readonly workflowValidationService: WorkflowValidationService,
		private readonly nodeTypes: NodeTypes,
		private readonly webhookService: WebhookService,
		private readonly licenseState: LicenseState,
		private readonly projectRepository: ProjectRepository,
		private readonly redactionEnforcementService: RedactionEnforcementService,
		private readonly workflowPublicationNotifier: WorkflowPublicationNotifier,
		private readonly scheduleTriggerJobRegistrar: ScheduleTriggerJobRegistrar,
		private readonly pollTriggerJobRegistrar: PollTriggerJobRegistrar,
		private readonly workflowScheduledJobOwner: WorkflowScheduledJobOwner,
		private readonly durableJobProvisioner: DurableJobProvisioner,
		private readonly workflowPublishedVersionRepository: WorkflowPublishedVersionRepository,
		private readonly workflowHookContextService: WorkflowHookContextService,
		private readonly workflowPublishGuard: WorkflowPublishGuardProxy,
		private readonly workflowMutationHooks: WorkflowMutationHooksProxy,
		private readonly policyEnforcementService: PolicyEnforcementService,
		private readonly workflowPublicationStatusService: WorkflowPublicationStatusService,
	) {}

	async getMany(
		user: User,
		options?: ListQuery.Options,
		{
			includeScopes = false,
			includeFolders = false,
			onlySharedWithMe = false,
			includePublicationStatus = false,
			requiredScopes = ['workflow:read'],
		}: GetManyOptions = {},
	) {
		let count;
		let workflows;
		let workflowsAndFolders: WorkflowFolderUnionFull[] = [];
		let isPersonalProject = false;
		let personalProjectOwnerId: string | null = null;

		if (options?.filter?.projectId) {
			const project = await this.projectRepository.findOneBy({
				id: options.filter.projectId as string,
			});
			if (!project) {
				return { workflows: [], count: 0 };
			}
			isPersonalProject = project.type === 'personal';
			personalProjectOwnerId = project.creatorId;
		}

		// Prepare sharing options for the subquery
		const sharingOptions: {
			scopes?: Scope[];
			projectRoles?: string[];
			workflowRoles?: string[];
			isPersonalProject?: boolean;
			personalProjectOwnerId?: string;
			onlySharedWithMe?: boolean;
		} = {};

		if (isPersonalProject && personalProjectOwnerId) {
			if (personalProjectOwnerId !== user.id && !hasGlobalScope(user, 'workflow:read')) {
				return { workflows: [], count: 0 };
			}
			sharingOptions.isPersonalProject = true;
			sharingOptions.personalProjectOwnerId = personalProjectOwnerId;
		} else if (onlySharedWithMe) {
			sharingOptions.onlySharedWithMe = true;
		} else {
			// Get roles from scopes
			const projectRoles = await this.roleService.rolesWithScope('project', requiredScopes);
			const workflowRoles = await this.roleService.rolesWithScope('workflow', requiredScopes);
			sharingOptions.scopes = requiredScopes;
			sharingOptions.projectRoles = projectRoles;
			sharingOptions.workflowRoles = workflowRoles;
		}

		const callableForParentWorkflowId = await this.resolveCallableForParentWorkflowId(
			user,
			options,
		);

		// Use the new subquery-based repository methods
		if (includeFolders) {
			[workflowsAndFolders, count] =
				await this.workflowRepository.getWorkflowsAndFoldersWithCountWithSharingSubquery(
					user,
					sharingOptions,
					options,
					callableForParentWorkflowId,
				);

			workflows = workflowsAndFolders.filter((wf) => wf.resource === 'workflow');
		} else {
			({ workflows, count } = await this.workflowRepository.getManyAndCountWithSharingSubquery(
				user,
				sharingOptions,
				options,
				callableForParentWorkflowId,
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

		// Kicked off before the folder merge — `workflows` holds only workflow rows
		// here — and awaited last, so it overlaps the resolvable-credentials lookup.
		const publicationStatuses =
			includePublicationStatus && this.globalConfig.workflows.useWorkflowPublicationService
				? this.getListPublicationStatuses(workflows.map((w) => w.id))
				: null;

		if (includeFolders) {
			workflows = this.mergeProcessedWorkflows(workflowsAndFolders, workflows);
		}

		// Add hasResolvableCredentials if dynamic credentials feature is licensed
		if (this.licenseState.isDynamicCredentialsLicensed()) {
			workflows = await this.addResolvableCredentialsFlag(workflows);
		}

		if (publicationStatuses) {
			const statuses = await publicationStatuses;
			// Only attach when set: workflows with no trigger rows (and folder rows,
			// whose ids never match) keep the legacy card indicator.
			workflows = workflows.map((workflow) => {
				const publicationStatus = statuses.get(workflow.id);
				return publicationStatus ? { ...workflow, publicationStatus } : workflow;
			});
		}

		return {
			workflows,
			count,
		};
	}

	private async resolveCallableForParentWorkflowId(
		user: User,
		options?: ListQuery.Options,
	): Promise<string | undefined> {
		if (options?.filter?.includeCallableSubworkflows !== true) return undefined;

		const parentWorkflowId =
			typeof options.filter.parentWorkflowId === 'string'
				? options.filter.parentWorkflowId
				: undefined;
		if (!parentWorkflowId) return undefined;

		const parentWorkflow = await this.workflowFinderService.findWorkflowForUser(
			parentWorkflowId,
			user,
			['workflow:read'],
		);

		return parentWorkflow ? parentWorkflowId : undefined;
	}

	/**
	 * The badge is decorative, so a failure of the aggregate must degrade to an
	 * unbadged list instead of failing the whole request.
	 */
	private async getListPublicationStatuses(
		workflowIds: string[],
	): Promise<Map<string, WorkflowListPublicationStatus>> {
		try {
			return await this.workflowPublicationStatusService.getListStatusesByWorkflowIds(workflowIds);
		} catch (error) {
			this.logger.warn('Failed to resolve publication statuses for the workflow list', {
				error: ensureError(error),
			});
			return new Map();
		}
	}

	private async addResolvableCredentialsFlag<
		T extends ListQueryDb.Workflow.Plain | ListQueryDb.Workflow.WithSharing,
	>(workflows: T[]): Promise<Array<T & { hasResolvableCredentials: boolean }>> {
		// Use lazy import to avoid circular dependency
		const { EnterpriseWorkflowService } = await import('./workflow.service.ee.js');
		const enterpriseWorkflowService = Container.get(EnterpriseWorkflowService);

		const workflowIds = workflows.map((w) => w.id);
		const workflowIdsWithResolvable =
			await enterpriseWorkflowService.getWorkflowIdsWithResolvableCredentials(workflowIds);

		return workflows.map((workflow) => ({
			...workflow,
			hasResolvableCredentials: workflowIdsWithResolvable.has(workflow.id),
		}));
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

	private isWorkflowWithSharing(
		workflow: ListQueryDb.Workflow.Plain,
	): workflow is ListQueryDb.Workflow.WithSharing {
		return 'shared' in workflow;
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
			if (this.isWorkflowWithSharing(workflow)) {
				delete workflow.shared;
			}
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

	/**
	 * Updates the workflow content (such as name, nodes, connections, settings, etc.).
	 *
	 * This method never updates the workflow's active fields (active, activeVersionId) directly.
	 * However, if settings change and the workflow has an active version, the workflow will be
	 * automatically reactivated to ensure the ActiveWorkflowManager uses the updated settings.
	 * For explicit activation or deactivation, use the activate/deactivate methods.
	 */

	// eslint-disable-next-line complexity
	async update(
		user: User,
		workflowUpdateData: WorkflowEntity,
		workflowId: string,
		options: {
			tagIds?: string[];
			parentFolderId?: string;
			forceSave?: boolean;
			publicApi?: boolean;
			publishIfActive?: boolean;
			/** Scopes of the API key behind this call; omitted when the caller is not key-authenticated. */
			apiKeyScopes?: readonly string[];
			aiBuilderAssisted?: boolean;
			expectedChecksum?: string;
			autosaved?: boolean;
			source?: WorkflowActionSource;
			versionName?: string;
			versionDescription?: string;
		} = {},
	): Promise<WorkflowEntity> {
		const {
			expectedChecksum,
			tagIds,
			parentFolderId,
			forceSave = false,
			publicApi = false,
			publishIfActive = false,
			apiKeyScopes,
			aiBuilderAssisted = false,
			autosaved = false,
			source = 'ui',
			versionName,
			versionDescription,
		} = options;
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

		if (workflow.isArchived) {
			throw new BadRequestError('Cannot update an archived workflow.');
		}

		await this.redactionEnforcementService.assertPolicyChangeAllowed(
			workflow.settings?.redactionPolicy,
			workflowUpdateData.settings?.redactionPolicy,
		);

		if (!forceSave && expectedChecksum) {
			await this._detectConflicts(workflow, expectedChecksum);
		}

		// check credentials for old format - scope to the workflow's owner project
		const ownerProject = await this.ownershipService.getWorkflowProjectCached(workflowId);
		await WorkflowHelpers.replaceInvalidCredentials(workflowUpdateData, ownerProject.id);

		// Central credential guard for every workflow write path. With sharing
		// enabled, reject new nodes that reference credentials the acting user
		// cannot access and revert edits to existing read-only credential nodes.
		// Runs after replaceInvalidCredentials so old-format/name references are
		// already resolved to IDs before the check.
		// Loaded lazily to avoid a circular import (workflow.service.ee pulls in
		// folder/project services which import this module).
		if (this.licenseState.isSharingLicensed()) {
			const { EnterpriseWorkflowService } = await import('./workflow.service.ee.js');
			await Container.get(EnterpriseWorkflowService).preventTampering(
				workflowUpdateData,
				workflowId,
				user,
			);
		}

		// Update the workflow's version when changing nodes, connections, or nodeGroups
		const hasNodesKey = 'nodes' in workflowUpdateData;
		const hasConnectionsKey = 'connections' in workflowUpdateData;
		const hasNodeGroupsKey = 'nodeGroups' in workflowUpdateData;
		const nodesChanged = hasNodesKey && !isEqual(workflowUpdateData.nodes, workflow.nodes);
		const connectionsChanged =
			hasConnectionsKey && !isEqual(workflowUpdateData.connections, workflow.connections);
		const nodeGroupsChanged =
			hasNodeGroupsKey && !isEqual(workflowUpdateData.nodeGroups, workflow.nodeGroups);
		const saveNewVersion = nodesChanged || connectionsChanged || nodeGroupsChanged;

		if (saveNewVersion) {
			workflowUpdateData.versionId = uuid();
			this.logger.debug(
				`Updating versionId for workflow ${workflowId} for user ${user.id} after saving`,
				{
					previousVersionId: workflow.versionId,
					newVersionId: workflowUpdateData.versionId,
				},
			);

			// A saved version needs nodes, connections, and node groups; backfill any the update
			// omitted from the persisted workflow so the history row records the effective state.
			workflowUpdateData.nodes = workflowUpdateData.nodes ?? workflow.nodes;
			workflowUpdateData.connections = workflowUpdateData.connections ?? workflow.connections;
			workflowUpdateData.nodeGroups = workflowUpdateData.nodeGroups ?? workflow.nodeGroups;
		} else {
			// Do not let users change versionId directly
			workflowUpdateData.versionId = workflow.versionId;
		}

		WorkflowHelpers.addNodeIds(workflowUpdateData);
		WorkflowHelpers.resolveNodeWebhookIds(workflowUpdateData, this.nodeTypes);
		// Validate structure and node groups only for structural changes; a metadata-only edit
		// re-persists an already-validated graph, so re-checking is redundant and could block on
		// legacy data. Both are safe to read off workflowUpdateData: it was backfilled above.
		if (saveNewVersion) {
			WorkflowHelpers.validateWorkflowStructure({
				nodes: workflowUpdateData.nodes,
				connections: workflowUpdateData.connections,
			});
			WorkflowHelpers.validateWorkflowNodeGroups(
				{
					nodes: workflowUpdateData.nodes,
					nodeGroups: workflowUpdateData.nodeGroups,
					connections: workflowUpdateData.connections,
				},
				WorkflowHelpers.makeGetNodeTypeForGrouping(this.nodeTypes),
			);
		}

		// Strip redactionPolicy if instance lacks data-redaction license
		if (
			workflowUpdateData.settings?.redactionPolicy !== undefined &&
			workflowUpdateData.settings.redactionPolicy !== workflow.settings?.redactionPolicy &&
			!this.licenseState.isDataRedactionLicensed()
		) {
			delete workflowUpdateData.settings.redactionPolicy;
		}

		// Strip redactionPolicy if user lacks the required directional scope
		if (
			workflowUpdateData.settings?.redactionPolicy !== undefined &&
			workflowUpdateData.settings.redactionPolicy !== workflow.settings?.redactionPolicy
		) {
			const requiredScopes = getRequiredRedactionScopes(
				workflow.settings?.redactionPolicy,
				workflowUpdateData.settings.redactionPolicy,
			);

			const canUpdate = await userHasScopes(user, requiredScopes, false, {
				projectId: ownerProject.id,
			});
			if (!canUpdate) {
				delete workflowUpdateData.settings.redactionPolicy;
			}
		}

		// Merge settings to support partial updates
		if (workflowUpdateData.settings && workflow.settings) {
			workflowUpdateData.settings = {
				...workflow.settings,
				...workflowUpdateData.settings,
			};
		}

		if (workflowUpdateData.settings) {
			workflowUpdateData.settings = WorkflowHelpers.removeDefaultValues(
				workflowUpdateData.settings,
				this.globalConfig.executions.timeout,
			);
		}

		// Check if settings actually changed
		const settingsChanged =
			workflowUpdateData.settings !== undefined &&
			!isEqual(workflow.settings, workflowUpdateData.settings);

		// Always set updatedAt to get millisecond precision
		workflowUpdateData.updatedAt = new Date();

		if (workflowUpdateData.name) {
			await validateEntity(workflowUpdateData);
		}

		// Validate pinData size after all mutations are applied
		if ('pinData' in workflowUpdateData) {
			WorkflowHelpers.validatePinDataSize({ ...workflow, ...workflowUpdateData });
		}

		// Reject illegal credential-to-node bindings before persisting
		const restrictionValidation = this.workflowValidationService.validateCredentialNodeRestrictions(
			workflowUpdateData.nodes ?? workflow.nodes,
		);
		if (!restrictionValidation.isValid) {
			throw new WorkflowValidationError(
				restrictionValidation.error ?? 'Credential binding is not allowed.',
			);
		}

		// Run external hook after all validation has passed, right before persisting
		await this.externalHooks.run('workflow.update', [
			workflowUpdateData,
			this.workflowHookContextService,
			toWorkflowLifecycleHookActor(user),
		]);

		// Gate the save on policy before persisting, so the author learns about a violation
		// while editing rather than at runtime. Carries the stored workflow alongside the
		// submitted one so a check can restrict its verdict to what this save adds.
		const cleared = await this.policyEnforcementService.enforceWorkflowSave({
			workflow: {
				id: workflow.id,
				name: workflowUpdateData.name ?? workflow.name,
				nodes: workflowUpdateData.nodes ?? workflow.nodes,
			},
			storedWorkflow: { id: workflow.id, name: workflow.name, nodes: workflow.nodes },
			projectId: ownerProject.id,
		});

		const fieldsToUpdate = [
			'name',
			'nodes',
			'connections',
			'nodeGroups',
			'meta',
			'settings',
			'staticData',
			'pinData',
			'versionId',
			'description',
			'updatedAt',
			// do not update active fields
		];

		const updatePayload = pick(
			workflowUpdateData,
			fieldsToUpdate,
		) as QueryDeepPartialEntity<WorkflowEntity>;

		// Save the workflow to history first, so we can retrieve the complete version object for the update
		if (saveNewVersion) {
			await this.workflowHistoryService.saveVersion(
				user,
				workflowUpdateData,
				workflowId,
				autosaved,
				source,
				undefined,
				versionName || versionDescription
					? { name: versionName, description: versionDescription }
					: undefined,
			);
		}

		const versionIdToPublish =
			workflow.activeVersionId && publishIfActive ? workflowUpdateData.versionId : null;

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
		await this.workflowRepository.updateContent(workflowId, updatePayload, {
			policyCleared: cleared,
		});
		const tagsDisabled = this.globalConfig.tags.disabled;

		if (tagIds && !tagsDisabled) {
			await this.workflowTagMappingRepository.overwriteTaggings(workflowId, tagIds);
		}

		const relations = tagsDisabled ? ['activeVersion'] : ['tags', 'activeVersion'];

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
		await this.externalHooks.run('workflow.afterUpdate', [
			updatedWorkflow,
			this.workflowHookContextService,
			toWorkflowLifecycleHookActor(user),
		]);

		const settingsChangesDetail = this.calculateSettingsChanges(
			workflow.settings,
			updatedWorkflow.settings,
		);

		this.eventService.emit('workflow-saved', {
			user,
			workflow: updatedWorkflow,
			publicApi,
			previousWorkflow: workflow,
			aiBuilderAssisted,
			...(settingsChangesDetail && { settingsChanged: settingsChangesDetail }),
			source,
		});

		if (versionIdToPublish) {
			// Putting a different version live is a publication, so it has to clear the same bars as an
			// explicit publish. A caller who may write but not publish keeps the draft they just saved,
			// and the refusal names it. Re-applying the version that is already live publishes nothing
			// new, so it stays a plain update.
			if (versionIdToPublish !== workflow.activeVersionId) {
				await this.assertMayPublishOnSave(user, workflowId, apiKeyScopes, versionIdToPublish);
			}

			const publishedWorkflow = await this.activateWorkflow(user, workflowId, {
				versionId: versionIdToPublish,
				source,
			});
			updatedWorkflow.active = publishedWorkflow.active;
			updatedWorkflow.activeVersionId = publishedWorkflow.activeVersionId;
			updatedWorkflow.activeVersion = publishedWorkflow.activeVersion;
		} else if (settingsChanged && workflow.activeVersionId) {
			await this.activateWorkflow(user, workflowId, {
				versionId: workflow.activeVersionId,
				source,
			});
		}
		return updatedWorkflow;
	}

	/**
	 * Both bars a save-triggered publication has to clear: the API key's own publish scope (a key can
	 * be scoped more narrowly than its owner) and the caller's publish permission on the project.
	 * Refused rather than rolled back: the draft the caller was allowed to write stays saved, and the
	 * error carries its version so the caller does not have to read it back.
	 */
	private async assertMayPublishOnSave(
		user: User,
		workflowId: string,
		apiKeyScopes: readonly string[] | undefined,
		savedVersionId: string,
	): Promise<void> {
		if (apiKeyScopes && !apiKeyScopes.includes(PUBLISH_API_KEY_SCOPE)) {
			throw new WorkflowPublishForbiddenError({
				reason: 'insufficient_api_key_scope',
				versionId: savedVersionId,
			});
		}

		// Scoped to the workflow rather than its project, so a role granted by sharing the workflow
		// counts the same way it does on the publish endpoint.
		const canPublish = await userHasScopes(user, ['workflow:publish'], false, { workflowId });

		if (!canPublish) {
			this.logger.warn('User saved a draft but may not publish it', {
				workflowId,
				userId: user.id,
			});
			throw new WorkflowPublishForbiddenError({
				reason: 'insufficient_permissions',
				versionId: savedVersionId,
			});
		}
	}

	private async _addToActiveWorkflowManager(
		user: User,
		workflowId: string,
		workflow: WorkflowEntity,
		mode: 'activate' | 'update',
		options: { source: WorkflowActionSource } = { source: 'ui' },
	): Promise<void> {
		let didPublish = false;
		try {
			await this.activeWorkflowManager.add(workflowId, mode);
			didPublish = true;
		} catch (error) {
			// Activation failed partway through. It may already have registered triggers
			// e.g. a Schedule Trigger before throwing; this ensures they get deregistered,
			// which otherwise may cause them to start unintended executions.
			// Done before the rollback below so the active version is still
			// resolvable by `clearWebhooks`.
			try {
				await this.activeWorkflowManager.remove(workflowId);

				this.logger.warn(
					`Rolled back partial activation of workflow "${workflowId}"; triggers deregistered`,
					{ workflowId },
				);
			} catch (cleanupError) {
				this.logger.error(`Failed to roll back partial activation of workflow "${workflowId}"`, {
					workflowId,
					error: cleanupError,
				});
			}

			const rollbackPayload = {
				active: false,
				activeVersionId: null,
				activeVersion: null,
			};
			await this.workflowRepository.update(workflowId, rollbackPayload);

			// Also set it in the returned data
			workflow.active = rollbackPayload.active;
			workflow.activeVersionId = rollbackPayload.activeVersionId;
			workflow.activeVersion = rollbackPayload.activeVersion;

			const message = (error as Error).message;
			const description = getErrorDescription(error);

			throw new WorkflowActivationBadRequestError(message, {
				nodeId: getErrorNodeId(error),
				description,
			});
		} finally {
			if (didPublish) {
				assert(workflow.activeVersionId !== null);

				await this.workflowPublishHistoryRepository.addRecord({
					workflowId,
					versionId: workflow.activeVersionId,
					event: 'activated',
					userId: user.id,
				});

				this.eventService.emit('workflow-activated', {
					user,
					workflowId,
					workflow,
					publicApi: options.source === 'api',
					source: options.source,
				});
			}
		}
	}

	private async _findConflictingWebhooks(
		workflowEntity: WorkflowEntity,
		versionToActivate: WorkflowHistory,
	) {
		const workflow = new Workflow({
			id: workflowEntity.id,
			nodes: versionToActivate.nodes,
			connections: versionToActivate.connections,
			active: !!workflowEntity.activeVersion,
			settings: workflowEntity.settings,
			nodeTypes: this.nodeTypes,
		});
		const additionalData = await getWorkflowExecutionData({
			workflowId: workflow.id,
		});

		await workflow.expression.acquireIsolate();
		try {
			return await this.webhookService.findWebhookConflicts(workflow, additionalData);
		} finally {
			await workflow.expression.releaseIsolate();
		}
	}

	private async _detectWebhookConflicts(
		workflowEntity: WorkflowEntity,
		versionToActivate: WorkflowHistory,
	) {
		const conflicts = await this._findConflictingWebhooks(workflowEntity, versionToActivate);

		if (conflicts.length > 0) {
			throw new ConflictError(
				WEBHOOK_CONFLICT_MESSAGE,
				JSON.stringify(
					conflicts.map(({ trigger, conflict }) => ({
						trigger,
						conflict,
					})),
				),
			);
		}
	}

	/**
	 * Activates a workflow by setting its activeVersionId and adding it to the active workflow manager.
	 * @param user - The user activating the workflow
	 * @param workflowId - The ID of the workflow to activate
	 * @param options - Optional versionId, name and description updates
	 * @param publicApi - Whether this is called from the public API (affects event emission)
	 * @returns The activated workflow
	 */
	// eslint-disable-next-line complexity
	async activateWorkflow(
		user: User,
		workflowId: string,
		options?: {
			versionId?: string;
			name?: string;
			description?: string;
			expectedChecksum?: string;
			source?: WorkflowActionSource;
		},
	): Promise<WorkflowEntity> {
		const source = options?.source ?? 'ui';
		const publicApi = source === 'api';

		let workflow = await this.workflowFinderService.findWorkflowForUser(workflowId, user, [
			'workflow:publish',
		]);

		// Re-applying the version that is already live publishes nothing new. It only re-registers the
		// triggers so a settings change takes effect, so an editor's own scopes are enough. Resolved as
		// a fallback, leaving the publish path above untouched. `workflow:read` joins the update scope
		// because this path reads the live version back out of history below.
		const resolvedWithEditorScopes = workflow === null;
		if (resolvedWithEditorScopes) {
			workflow = await this.workflowFinderService.findWorkflowForUser(workflowId, user, [
				'workflow:read',
				'workflow:update',
			]);
		}

		if (!workflow) {
			this.logger.warn('User attempted to activate a workflow without permissions', {
				workflowId,
				userId: user.id,
			});
			throw new NotFoundError(
				'You do not have permission to activate this workflow. Ask the owner to share it with you.',
			);
		}

		if (workflow.isArchived) {
			throw new BadRequestError('Cannot activate an archived workflow.');
		}

		const versionIdToActivate = options?.versionId ?? workflow.versionId;
		const previousActiveVersionId = workflow.activeVersionId;

		// Reached with access to the workflow but not the right to release a version, so there is no
		// existence to hide behind a 404 here.
		if (resolvedWithEditorScopes && versionIdToActivate !== previousActiveVersionId) {
			this.logger.warn('User attempted to publish a workflow without permissions', {
				workflowId,
				userId: user.id,
			});
			throw new ForbiddenError(
				'You do not have permission to publish this workflow. Ask the owner to publish it for you.',
			);
		}

		let versionToActivate: WorkflowHistory;
		try {
			versionToActivate = await this.workflowHistoryService.getVersion(
				user,
				workflow.id,
				versionIdToActivate,
				{
					includePublishHistory: false,
				},
			);
		} catch (error) {
			if (error instanceof WorkflowHistoryVersionNotFoundError) {
				throw new NotFoundError('Version not found');
			}
			throw error;
		}

		if (options?.expectedChecksum) {
			await this._detectConflicts(workflow, options.expectedChecksum);
		}

		await this._detectWebhookConflicts(workflow, versionToActivate);

		this._validateNodes(workflowId, versionToActivate.nodes, versionToActivate.connections);
		await this._validateDynamicCredentials(workflowId, versionToActivate.nodes, workflow.settings);
		await this._validateSubWorkflowReferences(workflowId, versionToActivate.nodes);
		if (this.globalConfig.workflows.useWorkflowPublicationService) {
			this._validateTriggerNodeIds(workflowId, versionToActivate);
		}

		// The candidate below shares this array with the version row, and the hook may
		// mutate it in place, so snapshot what will actually be registered.
		const nodesToPublish = structuredClone(versionToActivate.nodes);

		// Run hook before destructive state changes so a rejection leaves
		// the previous active version running instead of deactivating it.
		const candidateWorkflow = this.workflowRepository.create({
			...workflow,
			active: true,
			activeVersionId: versionIdToActivate,
			activeVersion: versionToActivate,
			nodes: versionToActivate.nodes,
			connections: versionToActivate.connections,
		});

		try {
			await this.externalHooks.run('workflow.activate', [
				candidateWorkflow,
				this.workflowHookContextService,
				toWorkflowLifecycleHookActor(user),
			]);
		} catch (error) {
			throw new WorkflowActivationBadRequestError(ensureError(error).message, {
				nodeId: getErrorNodeId(error),
				description: getErrorDescription(error),
			});
		}

		// Polices what gets registered — the version row, not the hook's candidate.
		// Enforced on a same-version republish too.
		if (this.policyEnforcementService.hasChecksFor('workflowPublish')) {
			// Unguarded, as in `PolicyLifecycleHandler`: an unevaluated project rule is
			// not a passed one, so a failed lookup fails the publish.
			const project = await this.ownershipService.getWorkflowProjectCached(workflowId);

			await this.policyEnforcementService.enforceWorkflowPublish({
				workflow: {
					id: workflowId,
					name: workflow.name,
					nodes: nodesToPublish,
				},
				projectId: project.id,
			});
		}

		// re-applying the already-published version (e.g. a settings-only update)
		// publishes no new version, so the review gate must not block it.
		//
		// This check is deliberately not serialized with review mutations: putting
		// publishing behind the review feature's global lock would slow down a core
		// workflow operation for every instance. A review opened just after this
		// passes, or just before an approval's auto-publish reaches it, therefore
		// races — accepted, because both outcomes degrade gracefully (the approval
		// stands and auto-publish reports `failed`).`.
		if (versionIdToActivate !== previousActiveVersionId) {
			await this.workflowPublishGuard.assertCanPublish(workflowId);
		}

		if (this.globalConfig.workflows.useWorkflowPublicationService) {
			await this._publishViaOutbox(
				user.id,
				workflowId,
				versionIdToActivate,
				previousActiveVersionId,
				workflow.updatedAt,
			);

			if (previousActiveVersionId) {
				this.eventService.emit('workflow-deactivated', {
					user,
					workflowId,
					workflow,
					publicApi,
					deactivatedVersionId: previousActiveVersionId,
					source,
				});
			}

			const activatedWorkflow = this.workflowRepository.create({
				...workflow,
				active: true,
				activeVersionId: versionIdToActivate,
				activeVersion: versionToActivate,
				nodes: versionToActivate.nodes,
				connections: versionToActivate.connections,
			});

			this.eventService.emit('workflow-activated', {
				user,
				workflowId,
				workflow: activatedWorkflow,
				publicApi,
				source,
			});
		} else {
			if (previousActiveVersionId) {
				await this.activeWorkflowManager.remove(workflowId);

				this.eventService.emit('workflow-deactivated', {
					user,
					workflowId,
					workflow,
					publicApi,
					deactivatedVersionId: previousActiveVersionId,
					source,
				});
				await this.workflowPublishHistoryRepository.addRecord({
					workflowId,
					versionId: previousActiveVersionId,
					event: 'deactivated',
					userId: user.id,
				});
			}

			const activationMode = previousActiveVersionId ? 'update' : 'activate';

			await this.workflowRepository.update(workflowId, {
				activeVersionId: versionIdToActivate,
				active: true,
				// workflow content did not change, so we keep updatedAt as is
				updatedAt: workflow.updatedAt,
			});

			const workflowForActivation = await this.workflowRepository.findOne({
				where: { id: workflowId },
				relations: ['activeVersion'],
			});

			if (!workflowForActivation) {
				throw new NotFoundError(`Workflow with ID "${workflowId}" could not be found.`);
			}

			await this._addToActiveWorkflowManager(
				user,
				workflowId,
				workflowForActivation,
				activationMode,
				{ source },
			);
		}

		// The publication commit boundary: both branches above have durably published the
		// version (outbox record committed / triggers registered and history recorded). The
		// metadata update and re-fetch below can still fail, but the publication — and this
		// record of it — stand. The hook must not throw.
		await this.workflowMutationHooks.afterWorkflowPublished({
			workflowId,
			versionId: versionIdToActivate,
			userId: user.id,
		});

		if (options?.name !== undefined || options?.description !== undefined) {
			const updateFields: UpdateWorkflowHistoryVersionDto = {};
			if (options.name !== undefined) updateFields.name = options.name;
			if (options.description !== undefined) updateFields.description = options.description;
			await this.workflowHistoryService.updateVersion(
				workflowId,
				versionIdToActivate,
				updateFields,
			);
		}

		// Fetch workflow again with workflowPublishHistory after activation to include the new entry
		const updatedWorkflow = await this.workflowRepository.findOne({
			where: { id: workflowId },
			relations: {
				activeVersion: {
					workflowPublishHistory: true,
				},
			},
		});

		if (!updatedWorkflow) {
			throw new NotFoundError(`Workflow with ID "${workflowId}" could not be found.`);
		}

		return updatedWorkflow;
	}

	/**
	 * Deactivates a workflow by removing it from the active workflow manager and setting activeVersionId to null.
	 * @param user - The user deactivating the workflow
	 * @param workflowId - The ID of the workflow to deactivate
	 * @param options - Optional settings including expectedChecksum for conflict detection and publicApi flag
	 * @returns The deactivated workflow
	 */
	async deactivateWorkflow(
		user: User,
		workflowId: string,
		options?: {
			expectedChecksum?: string;
			source?: WorkflowActionSource;
		},
	): Promise<WorkflowEntity> {
		const source = options?.source ?? 'ui';
		const publicApi = source === 'api';
		const workflow = await this.workflowFinderService.findWorkflowForUser(
			workflowId,
			user,
			['workflow:unpublish'],
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

		const deactivatedVersionId = workflow.activeVersionId;
		if (deactivatedVersionId === null) {
			return workflow;
		}

		if (options?.expectedChecksum) {
			await this._detectConflicts(workflow, options.expectedChecksum);
		}

		// `active` is still true here: the hook sees the pre-deactivation state so it can veto.
		const deactivatedWorkflow = this.workflowRepository.create({
			...workflow,
			versionId: deactivatedVersionId,
			activeVersion: null,
			nodes: workflow.activeVersion?.nodes ?? workflow.nodes,
			connections: workflow.activeVersion?.connections ?? workflow.connections,
		});

		try {
			await this.externalHooks.run('workflow.deactivate', [
				deactivatedWorkflow,
				this.workflowHookContextService,
				toWorkflowLifecycleHookActor(user),
			]);
		} catch (error) {
			throw new WorkflowDeactivationBadRequestError(ensureError(error).message, {
				description: getErrorDescription(error),
			});
		}

		await this._teardownActiveVersion(workflow, deactivatedVersionId, user.id);

		// Update the workflow object for response
		workflow.active = false;
		workflow.activeVersionId = null;
		workflow.activeVersion = null;

		this.eventService.emit('workflow-deactivated', {
			user,
			workflowId,
			workflow,
			publicApi,
			deactivatedVersionId,
			source,
		});

		return workflow;
	}

	/**
	 * Deactivates a workflow without a user context (system-initiated, e.g.
	 * crash-loop auto-deactivation). Skips permission and checksum checks and
	 * does not emit `workflow-deactivated`; publish history records a null user.
	 */
	async deactivateWorkflowAsSystem(workflowId: string): Promise<void> {
		const workflow = await this.workflowRepository.findOne({
			where: { id: workflowId },
			relations: { activeVersion: true },
		});
		if (!workflow) return;

		const deactivatedVersionId = workflow.activeVersionId;
		if (deactivatedVersionId === null) return;

		// `active` is still true here: the hook sees the pre-deactivation state.
		const deactivatedWorkflow = this.workflowRepository.create({
			...workflow,
			versionId: deactivatedVersionId,
			activeVersion: null,
			nodes: workflow.activeVersion?.nodes ?? workflow.nodes,
			connections: workflow.activeVersion?.connections ?? workflow.connections,
		});

		try {
			await this.externalHooks.run('workflow.deactivate', [
				deactivatedWorkflow,
				this.workflowHookContextService,
			]);
		} catch (error) {
			// A failing hook must not leave a crash-looping workflow published
			this.logger.warn('workflow.deactivate hook failed during system deactivation, proceeding', {
				workflowId,
				error: ensureError(error).message,
			});
		}

		await this._teardownActiveVersion(workflow, deactivatedVersionId, null);
	}

	/**
	 * Publishes a new system-authored version of an already-active workflow,
	 * without a user: inserts the `workflow_history` row (author `'n8n'`),
	 * advances `activeVersionId`, records publish history with a null user, and
	 * enqueues the outbox record. The draft plane — `workflow_entity.nodes`,
	 * `versionId`, `updatedAt` — stays untouched.
	 *
	 * Publication-service plane only; the caller owns flag and leader concerns.
	 * Skips user-facing activation validation and lifecycle hooks: the workflow
	 * is already active, and the content comes from internal correction code,
	 * which may legitimately fail user-facing checks (e.g. duplicate node
	 * names).
	 *
	 * The write only lands if the active version is still
	 * `expectedActiveVersionId` — the version the corrected copy was derived
	 * from, supplied by the caller so the guard spans the caller's whole
	 * read-correct-publish window, not just this method's own read
	 * (compare-and-swap). Any move past that baseline — a newer user publish,
	 * an unpublish, a deletion — wins, and this method returns
	 * `{ published: false, reason: 'superseded' }` having written nothing: the
	 * version row, publish history, and outbox record all live in one
	 * transaction that a guard miss rolls back. The caller must not retry —
	 * whatever superseded the baseline enqueued its own outbox record, and the
	 * next activation pass covers it. Two accepted residuals: a concurrent draft save's
	 * `updatedAt` bump can be rolled back to the value read here (the guard
	 * deliberately excludes `updatedAt` — a datetime-equality quirk would make
	 * the heal silently never land, a worse failure direction than a bounded
	 * timestamp clobber; draft content is untouched either way), and the *user*
	 * path's unguarded update can still record a stale `deactivated` version
	 * when the user wins the gap — a pre-existing property of
	 * `activateWorkflow`, not of this method.
	 */
	async publishAsSystem(
		workflowId: string,
		versionData: {
			nodes: WorkflowEntity['nodes'];
			connections: WorkflowEntity['connections'];
			nodeGroups?: WorkflowEntity['nodeGroups'];
		},
		expectedActiveVersionId: string,
	): Promise<{ published: true; versionId: string } | { published: false; reason: 'superseded' }> {
		const workflow = await this.workflowRepository.findOne({ where: { id: workflowId } });
		// A missing or inactive workflow, or an active version that already moved
		// past the caller's baseline, is the same benign race as losing the guard
		// below — whatever moved the version owns the state now. The transaction
		// guard re-checks the same condition atomically; this early return just
		// skips the doomed version-row insert.
		if (
			!workflow?.active ||
			workflow.activeVersionId === null ||
			workflow.activeVersionId !== expectedActiveVersionId
		) {
			return { published: false, reason: 'superseded' };
		}

		const versionId = uuid();
		try {
			await this.workflowRepository.manager.transaction(async (trx) => {
				// The version row must precede the guarded update: `activeVersionId`'s
				// foreign key requires it. `saveVersion` swallows insert errors; a
				// missing row surfaces as a foreign-key violation on the update, which
				// rolls the transaction back.
				await this.workflowHistoryService.saveVersion(
					'n8n',
					{ versionId, ...versionData },
					workflowId,
					false,
					undefined,
					trx,
				);

				// Re-publication of the same version id in the gap (unpublish +
				// publish of the version read above) passes the guard; same id means
				// same content, so the heal is still a valid heal of the current
				// active version.
				const recorded = await this._recordPublishInTransaction(
					trx,
					null,
					workflowId,
					versionId,
					expectedActiveVersionId,
					workflow.updatedAt,
					{ onlyIfActiveVersionIs: expectedActiveVersionId },
				);
				// Roll back the version row too — a lost race must leave no trace.
				if (!recorded) throw new SystemPublishSupersededError();
			});
		} catch (error) {
			if (error instanceof SystemPublishSupersededError) {
				return { published: false, reason: 'superseded' };
			}
			throw error;
		}

		// Wake the leader now that the record is committed, so it drains without
		// waiting for the next poll cycle.
		this.workflowPublicationNotifier.requestDrain();

		return { published: true, versionId };
	}

	/**
	 * Flag-branched teardown shared by user- and system-initiated deactivation.
	 * Keeping it in one place prevents the two paths from drifting apart, which
	 * is how system deactivation ended up skipping unpublishing (CAT-3814).
	 */
	private async _teardownActiveVersion(
		workflow: WorkflowEntity,
		deactivatedVersionId: string,
		userId: string | null,
	): Promise<void> {
		const workflowId = workflow.id;

		if (this.globalConfig.workflows.useWorkflowPublicationService) {
			await this._unpublishViaOutbox(userId, workflowId, deactivatedVersionId, workflow.updatedAt);
		} else {
			await this.activeWorkflowManager.remove(workflowId);

			await this.workflowRepository.update(workflowId, {
				active: false,
				activeVersionId: null,
				// workflow content did not change, so we keep updatedAt as is
				updatedAt: workflow.updatedAt,
			});

			await this.workflowPublishHistoryRepository.addRecord({
				workflowId,
				versionId: deactivatedVersionId,
				event: 'deactivated',
				userId,
			});
		}
	}

	/**
	 * Deletes a workflow and returns it.
	 *
	 * If the workflow is active this will deactivate the workflow.
	 * If the user does not have the permissions to delete the workflow this does
	 * nothing and returns void.
	 */
	async delete(
		user: User,
		workflowId: string,
		force = false,
		options?: { publicApi?: boolean },
	): Promise<WorkflowEntity | undefined> {
		await this.externalHooks.run('workflow.delete', [
			workflowId,
			toWorkflowLifecycleHookActor(user),
		]);

		const workflow = await this.workflowFinderService.findWorkflowForUser(workflowId, user, [
			'workflow:delete',
		]);

		if (!workflow) {
			return;
		}

		if (this.globalConfig.workflows.useWorkflowPublicationService) {
			if (workflow.activeVersionId !== null) {
				throw new ConflictError(
					'Cannot delete a published workflow. Unpublish it before deleting.',
				);
			}

			// Unpublishing clears `activeVersionId` synchronously but defers trigger
			// teardown to the outbox consumer, which removes the published-version
			// mapping only once teardown succeeds. That mapping's FK to the workflow
			// is RESTRICT, so deleting before it is gone would fail at the DB level.
			const pendingPublishedVersionId =
				await this.workflowPublishedVersionRepository.getPublishedVersionId(workflowId);
			if (pendingPublishedVersionId !== null) {
				throw new ConflictError(
					'Workflow is still being unpublished. Please try again in a few moments.',
				);
			}
		}

		if (!workflow.isArchived && !force) {
			throw new BadRequestError('Workflow must be archived before it can be deleted.');
		}

		// Resolved here for the same reason the hook below runs here: after the cascade the
		// `shared_workflow` rows that name the project are gone. It only attributes the activity
		// entry, so neither a missing owner row nor a failed query may fail the delete — hence the
		// non-throwing lookup, and the catch for everything it does not cover.
		let owningProject: Project | undefined;
		try {
			owningProject = await this.sharedWorkflowRepository.getWorkflowOwningProject(workflowId);
		} catch (error) {
			this.logger.warn('Failed to resolve the project owning a workflow', { workflowId, error });
		}

		// Ahead of every destructive step: the hook captures rows the delete is about
		// to cascade away, so `afterWorkflowsDeleted` can still explain what happened.
		await this.workflowMutationHooks.beforeWorkflowDeleted(workflowId, user.id);

		if (workflow.active) {
			// deactivate before deleting
			await this.activeWorkflowManager.remove(workflowId);
		}

		// Delete executions (incl. their binary and blob data) in batches before
		// the workflow row, so the FK cascade on the workflow row stays too small
		// to hit a DB statement timeout, however large the execution history.
		await this.executionPersistence.hardDeleteByWorkflowId(workflowId);

		// The workflow stops owning scheduled jobs here, and nothing in the database
		// removes them with it. Normally there are none left, since a published
		// workflow cannot be deleted and unpublishing deprovisions them. This covers
		// the paths that never published and anything an interrupted unpublish left.
		//
		// Both writes commit together. A deprovision of its own would leave a workflow
		// whose delete then failed alive with its schedules stripped.
		await this.workflowRepository.runInTransaction({}, async (trx) => {
			await this.durableJobProvisioner.deprovisionOwnerInTransaction(
				trx,
				this.workflowScheduledJobOwner.ref(workflowId),
			);

			await trx.delete(WorkflowEntity, { id: workflowId });
		});

		await this.ownershipService.invalidateWorkflowProjectCacheByIds([workflowId]);

		// After the cascade, so it can see the rows the delete orphaned. Observes a
		// committed delete, so it must not throw — the module swallows its own errors.
		await this.workflowMutationHooks.afterWorkflowsDeleted([workflowId]);

		this.eventService.emit('workflow-deleted', {
			user,
			workflowId,
			workflowName: workflow.name,
			projectId: owningProject?.id,
			publicApi: options?.publicApi ?? false,
		});
		await this.externalHooks.run('workflow.afterDelete', [
			workflowId,
			toWorkflowLifecycleHookActor(user),
		]);

		return workflow;
	}

	async archive(
		user: User,
		workflowId: string,
		options?: { skipArchived?: boolean; expectedChecksum?: string; publicApi?: boolean },
	): Promise<WorkflowEntity | undefined> {
		const workflow = await this.workflowFinderService.findWorkflowForUser(workflowId, user, [
			'workflow:delete',
		]);

		if (!workflow) {
			return;
		}

		if (workflow.isArchived) {
			if (options?.skipArchived) {
				return workflow;
			}

			throw new BadRequestError('Workflow is already archived.');
		}

		if (options?.expectedChecksum) {
			await this._detectConflicts(workflow, options.expectedChecksum);
		}

		const activeVersionId = workflow.activeVersionId;
		if (activeVersionId !== null) {
			if (this.globalConfig.workflows.useWorkflowPublicationService) {
				await this._unpublishViaOutbox(user.id, workflowId, activeVersionId, workflow.updatedAt);
			} else {
				await this.activeWorkflowManager.remove(workflowId);

				await this.workflowPublishHistoryRepository.addRecord({
					workflowId,
					versionId: activeVersionId,
					event: 'deactivated',
					userId: user.id,
				});
			}
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

		await this.workflowMutationHooks.afterWorkflowArchived(workflowId, user.id);

		this.eventService.emit('workflow-archived', {
			user,
			workflowId,
			publicApi: options?.publicApi ?? false,
		});
		await this.externalHooks.run('workflow.afterArchive', [
			workflowId,
			toWorkflowLifecycleHookActor(user),
		]);

		return workflow;
	}

	async unarchive(
		user: User,
		workflowId: string,
		options?: { publicApi?: boolean },
	): Promise<WorkflowEntity | undefined> {
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

		this.eventService.emit('workflow-unarchived', {
			user,
			workflowId,
			publicApi: options?.publicApi ?? false,
		});
		await this.externalHooks.run('workflow.afterUnarchive', [
			workflowId,
			toWorkflowLifecycleHookActor(user),
		]);

		return workflow;
	}

	async archiveForPublicApi(user: User, workflowId: string): Promise<WorkflowEntity | undefined> {
		return await this.archive(user, workflowId, { skipArchived: true, publicApi: true });
	}

	async unarchiveForPublicApi(user: User, workflowId: string): Promise<WorkflowEntity | undefined> {
		return await this.unarchive(user, workflowId, { publicApi: true });
	}

	async deleteForPublicApi(user: User, workflowId: string): Promise<WorkflowEntity | undefined> {
		// The public API deletes without requiring the workflow to be archived first.
		return await this.delete(user, workflowId, true, { publicApi: true });
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

		// Caller must invalidate the workflow-project cache for these IDs after the
		// surrounding transaction commits, since their owner project has changed.
		return ownedWorkflowIds;
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

	async _detectConflicts(dbWorkflow: WorkflowEntity, expectedChecksum: string) {
		const currentChecksum = await calculateWorkflowChecksum(dbWorkflow);

		if (expectedChecksum !== currentChecksum) {
			throw new ConflictError(
				'Your most recent changes may be lost, because someone else just updated this workflow. Open this workflow in a new tab to see those new updates.',
			);
		}
	}

	_validateNodes(workflowId: string, nodes: INode[], connections: IConnections) {
		const nodesToValidate = nodes.reduce<INodes>((acc, node) => {
			acc[node.name] = node;
			return acc;
		}, {});

		const validation = this.workflowValidationService.validateForActivation(
			nodesToValidate,
			connections,
			this.nodeTypes,
		);

		if (!validation.isValid) {
			this.logger.warn('Workflow activation failed validation', {
				workflowId,
				error: validation.error,
			});
			throw new WorkflowValidationError(validation.error ?? 'Workflow validation failed');
		}
	}

	private _validateTriggerNodeIds(workflowId: string, version: WorkflowHistory) {
		const validation = this.workflowValidationService.validateTriggerNodeIds(
			getEnabledTriggerNodes(version, this.nodeTypes),
		);

		if (!validation.isValid) {
			this.logger.warn('Workflow activation failed trigger node id validation', {
				workflowId,
				error: validation.error,
			});
			throw new WorkflowValidationError(validation.error ?? 'Trigger node id validation failed');
		}
	}

	private async _validateDynamicCredentials(
		workflowId: string,
		nodes: INode[],
		workflowSettings?: IWorkflowSettings,
	) {
		const validation = await this.workflowValidationService.validateDynamicCredentials(
			nodes,
			this.nodeTypes,
			workflowSettings,
		);

		if (!validation.isValid) {
			this.logger.warn('Workflow activation failed dynamic credentials validation', {
				workflowId,
				error: validation.error,
			});
			throw new WorkflowValidationError(
				validation.error ?? 'Dynamic credentials validation failed',
			);
		}
	}

	/**
	 * Calculates which workflow settings changed between two versions.
	 * Returns an object with { settingKey: { from, to } } for each changed setting,
	 * or undefined if no settings changed.
	 */
	private calculateSettingsChanges(
		previousSettings: IWorkflowSettings | undefined,
		newSettings: IWorkflowSettings | undefined,
	): Record<string, { from: JsonValue; to: JsonValue }> | undefined {
		const changes: Record<string, { from: JsonValue; to: JsonValue }> = {};

		const prev = previousSettings ?? {};
		const next = newSettings ?? {};

		// Get all unique keys from both previous and new settings
		const allKeys = new Set([...Object.keys(prev), ...Object.keys(next)]);

		for (const key of allKeys) {
			const prevValue = prev[key as keyof IWorkflowSettings];
			const nextValue = next[key as keyof IWorkflowSettings];

			if (!isEqual(prevValue, nextValue)) {
				const from: JsonValue = prevValue ?? null;
				const to: JsonValue = nextValue ?? null;
				changes[key] = { from, to };
			}
		}

		return Object.keys(changes).length > 0 ? changes : undefined;
	}

	/**
	 * Validates that all sub-workflow references in a workflow are published.
	 * Prevents publishing a parent workflow that references draft-only sub-workflows.
	 *
	 * Note: A published workflow could still end up referencing draft-only sub-workflows if:
	 * - A referenced sub-workflow gets unpublished after the parent workflow was published
	 * - The workflow ID is provided via an expression (e.g., ={{ $json.workflowId }})
	 * - The workflow source is not 'database' (e.g., URL, parameter, localFile)
	 *
	 * In these cases, the invariant is enforced at execution time, where the workflow will
	 * fail with a clear error message if the sub-workflow is not published (for production
	 * executions) or not found.
	 */
	private async _validateSubWorkflowReferences(workflowId: string, nodes: INode[]) {
		const validation = await this.workflowValidationService.validateSubWorkflowReferences(
			workflowId,
			nodes,
		);

		if (!validation.isValid) {
			this.logger.warn('Workflow activation failed sub-workflow validation', {
				workflowId,
				error: validation.error,
				invalidReferences: validation.invalidReferences,
			});
			throw new WorkflowValidationError(validation.error ?? 'Sub-workflow validation failed');
		}
	}

	/**
	 * Atomically records the requested version and enqueues an outbox record.
	 * The publication outbox consumer reapplies the triggers and advances the
	 * published version asynchronously, so we do not touch the active workflow
	 * manager here.
	 */
	private async _publishViaOutbox(
		userId: string | null,
		workflowId: string,
		versionIdToActivate: string,
		previousActiveVersionId: string | null,
		updatedAt: Date,
	): Promise<void> {
		await this.workflowRepository.manager.transaction(async (trx) => {
			await this._recordPublishInTransaction(
				trx,
				userId,
				workflowId,
				versionIdToActivate,
				previousActiveVersionId,
				updatedAt,
			);
		});

		// Wake the leader now that the record is committed, so it drains without
		// waiting for the next poll cycle.
		this.workflowPublicationNotifier.requestDrain();
	}

	/**
	 * Writes one publish into an open transaction: the workflow-row update, the
	 * publish-history records, and the outbox record. With
	 * `onlyIfActiveVersionIs`, the row update — this method's first write — is
	 * guarded on the active version still being that value; a miss returns
	 * `false` without writing anything further, and the caller owns rolling
	 * back whatever it wrote earlier in the same transaction.
	 */
	private async _recordPublishInTransaction(
		trx: EntityManager,
		userId: string | null,
		workflowId: string,
		versionIdToActivate: string,
		previousActiveVersionId: string | null,
		updatedAt: Date,
		options?: { onlyIfActiveVersionIs: string },
	): Promise<boolean> {
		const result = await trx.update(
			WorkflowEntity,
			options === undefined
				? { id: workflowId }
				: { id: workflowId, activeVersionId: options.onlyIfActiveVersionIs },
			{
				activeVersionId: versionIdToActivate,
				active: true,
				// workflow content did not change, so we keep updatedAt as is
				updatedAt,
			},
		);

		// A miss means a concurrent publish or unpublish moved the active version
		// since the caller's read.
		if (options !== undefined && (result.affected ?? 0) === 0) {
			return false;
		}

		if (previousActiveVersionId) {
			await this.workflowPublishHistoryRepository.addRecord(
				{
					workflowId,
					versionId: previousActiveVersionId,
					event: 'deactivated',
					userId,
				},
				trx,
			);
		}

		await this.workflowPublishHistoryRepository.addRecord(
			{
				workflowId,
				versionId: versionIdToActivate,
				event: 'activated',
				userId,
			},
			trx,
		);

		await this.outboxRepository.enqueue(
			workflowId,
			versionIdToActivate,
			WorkflowPublicationReason.Publish,
			trx,
		);

		return true;
	}

	/**
	 * Nulls the active version and enqueues an unpublish outbox record in a single
	 * transaction. They must commit together: otherwise the consumer could claim
	 * the record while the workflow still looks active and handle it as a publish.
	 */
	private async _unpublishViaOutbox(
		userId: string | null,
		workflowId: string,
		deactivatedVersionId: string,
		updatedAt: Date,
	): Promise<void> {
		await this.workflowRepository.manager.transaction(async (trx) => {
			await trx.update(
				WorkflowEntity,
				{ id: workflowId },
				{
					active: false,
					activeVersionId: null,
					// workflow content did not change, so we keep updatedAt as is
					updatedAt,
				},
			);

			await this.workflowPublishHistoryRepository.addRecord(
				{
					workflowId,
					versionId: deactivatedVersionId,
					event: 'deactivated',
					userId,
				},
				trx,
			);

			await this.outboxRepository.enqueue(
				workflowId,
				deactivatedVersionId,
				WorkflowPublicationReason.Publish,
				trx,
			);

			// Durable jobs are DB state, so their removal commits here rather than
			// waiting on the leader's outbox handler: a lost hand-off would otherwise
			// leave them firing a workflow already marked inactive.
			await this.scheduleTriggerJobRegistrar.removeWorkflowInTransaction(trx, workflowId);
			await this.pollTriggerJobRegistrar.removeWorkflowInTransaction(trx, workflowId);
		});

		// Wake the leader now that the record is committed, so it drains without
		// waiting for the next poll cycle.
		this.workflowPublicationNotifier.requestDrain();
	}

	/**
	 * Replace all tag mappings on a workflow. Missing tag IDs surface as NotFoundError.
	 */
	async updateWorkflowTags(user: User, workflowId: string, tagIds: string[]) {
		const workflow = await this.workflowFinderService.findWorkflowForUser(workflowId, user, [
			'workflow:update',
		]);

		if (!workflow) {
			throw new NotFoundError('Not Found');
		}

		try {
			await this.workflowTagMappingRepository.overwriteTaggings(workflowId, tagIds);
		} catch (error) {
			if (error instanceof QueryFailedError) {
				throw new NotFoundError('Some tags not found');
			}
			throw error;
		}

		return await this.tagService.getAllByWorkflowId(workflowId);
	}
}
