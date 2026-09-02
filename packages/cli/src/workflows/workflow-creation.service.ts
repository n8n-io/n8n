import type { RedactionFloor } from '@n8n/api-types';
import { LicenseState, Logger } from '@n8n/backend-common';
import { GlobalConfig } from '@n8n/config';
import type { EntityManager, User, Project, Folder } from '@n8n/db';
import {
	ProjectRepository,
	SharedWorkflow,
	SharedWorkflowRepository,
	TagRepository,
	WorkflowEntity,
	WorkflowRepository,
} from '@n8n/db';
import { Service } from '@n8n/di';
import { PROJECT_ROOT } from 'n8n-workflow';
import { v4 as uuid } from 'uuid';

import { CredentialsFinderService } from '@/credentials/credentials-finder.service';
import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { ForbiddenError } from '@/errors/response-errors/forbidden.error';
import { InternalServerError } from '@/errors/response-errors/internal-server.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import { WorkflowValidationError } from '@/errors/response-errors/workflow-validation.error';
import { EventService } from '@/events/event.service';
import type { WorkflowActionSource } from '@/events/maps/relay.event-map';
import { ExternalHooks, toWorkflowLifecycleHookActor } from '@/external-hooks';
import { validateEntity } from '@/generic-helpers';
import { McpSettingsService } from '@/modules/mcp/mcp.settings.service';
import { InstanceRedactionEnforcementService } from '@/modules/redaction/instance-redaction-enforcement.service';
import { policyForFloor, policyMeetsFloor } from '@/modules/redaction/redaction-policy';
import { NodeTypes } from '@/node-types';
import { userHasScopes } from '@/permissions.ee/check-access';
import { PolicyEnforcementService } from '@/policy/policy-enforcement.service';
import { FolderService } from '@/services/folder.service';
import { ProjectService } from '@/services/project.service.ee';
import { TagService } from '@/services/tag.service';
import * as WorkflowHelpers from '@/workflow-helpers';
import { WorkflowHookContextService } from '@/workflow-hook-context.service';

import { dropRedactionPolicy } from './utils';
import { WorkflowFinderService } from './workflow-finder.service';
import { WorkflowHistoryService } from './workflow-history/workflow-history.service';
import { WorkflowValidationService } from './workflow-validation.service';
import { EnterpriseWorkflowService } from './workflow.service.ee';

export interface WorkflowCreateBatchContext {
	project: Project;
	allowedCredentialIds: Set<string>;
	checkedCredentialIds: Set<string>;
	credentialResolutionCache: WorkflowHelpers.ReplaceInvalidCredentialsCache;
	redactionFloor: RedactionFloor;
	autoExposeNewWorkflows: boolean;
}

@Service()
export class WorkflowCreationService {
	constructor(
		private readonly logger: Logger,
		private readonly sharedWorkflowRepository: SharedWorkflowRepository,
		private readonly tagService: TagService,
		private readonly workflowHistoryService: WorkflowHistoryService,
		private readonly externalHooks: ExternalHooks,
		private readonly projectService: ProjectService,
		private readonly eventService: EventService,
		private readonly globalConfig: GlobalConfig,
		private readonly workflowFinderService: WorkflowFinderService,
		private readonly licenseState: LicenseState,
		private readonly projectRepository: ProjectRepository,
		private readonly tagRepository: TagRepository,
		private readonly credentialsFinderService: CredentialsFinderService,
		private readonly folderService: FolderService,
		private readonly enterpriseWorkflowService: EnterpriseWorkflowService,
		private readonly nodeTypes: NodeTypes,
		private readonly workflowValidationService: WorkflowValidationService,
		private readonly instanceRedactionEnforcementService: InstanceRedactionEnforcementService,
		private readonly workflowHookContextService: WorkflowHookContextService,
		private readonly mcpSettingsService: McpSettingsService,
		private readonly policyEnforcementService: PolicyEnforcementService,
		private readonly workflowRepository: WorkflowRepository,
	) {}

	async prepareBatchContext(
		user: User,
		projectId: string,
		parentFolderIds: string[],
		workflows: WorkflowEntity[],
		credentialBindings: ReadonlyMap<string, string>,
	): Promise<WorkflowCreateBatchContext> {
		const project = await this.projectService.getProjectWithScope(user, projectId, [
			'workflow:create',
		]);
		if (!project) {
			if (!(await this.projectRepository.exists({ where: { id: projectId } }))) {
				throw new NotFoundError('Project not found');
			}
			throw new ForbiddenError(
				"You don't have the permissions to save the workflow in this project.",
			);
		}

		const uniqueFolderIds = [...new Set(parentFolderIds)].filter((id) => id !== PROJECT_ROOT);
		const folders = await this.folderService.getFoldersByIds(uniqueFolderIds);
		const parentFolders = new Map(
			folders
				.filter((folder) => folder.homeProject.id === projectId)
				.map((folder) => [folder.id, folder]),
		);
		const missingFolderId = uniqueFolderIds.find((id) => !parentFolders.has(id));
		if (missingFolderId) {
			throw new NotFoundError(`Could not find the folder: ${missingFolderId}`);
		}

		const referencedCredentialIds = new Set<string>();
		for (const workflow of workflows) {
			const { ids } = this.enterpriseWorkflowService.collectCredentialReferences(workflow);
			for (const id of ids) referencedCredentialIds.add(credentialBindings.get(id) ?? id);
		}
		const validatedCredentialIds = new Set(credentialBindings.values());
		const credentialIdsToCheck = [...referencedCredentialIds].filter(
			(id) => !validatedCredentialIds.has(id),
		);

		const [redactionFloor, autoExposeNewWorkflows, accessibleCredentialIds] = await Promise.all([
			this.readActiveRedactionFloor(),
			this.readAutoExposeNewWorkflows(),
			this.credentialsFinderService.findCredentialIdsWithScopeForUser(credentialIdsToCheck, user, [
				'credential:read',
			]),
		]);
		const allowedCredentialIds = new Set([...validatedCredentialIds, ...accessibleCredentialIds]);

		return {
			project,
			allowedCredentialIds,
			checkedCredentialIds: new Set([...validatedCredentialIds, ...referencedCredentialIds]),
			credentialResolutionCache: new Map(),
			redactionFloor,
			autoExposeNewWorkflows,
		};
	}

	async createWorkflow(
		user: User,
		newWorkflow: WorkflowEntity,
		options: {
			tagIds?: string[];
			parentFolderId?: string;
			projectId?: string;
			sourceWorkflowId?: string;
			autosaved?: boolean;
			uiContext?: string;
			publicApi?: boolean;
			source?: WorkflowActionSource;
			versionName?: string;
			versionDescription?: string;
			batchContext?: WorkflowCreateBatchContext;
		} = {},
	): Promise<WorkflowEntity> {
		const {
			tagIds,
			parentFolderId,
			projectId,
			sourceWorkflowId,
			autosaved = false,
			uiContext,
			publicApi = false,
			source = 'ui',
			versionName,
			versionDescription,
			batchContext,
		} = options;

		// Ensure workflow is created as inactive
		newWorkflow.active = false;
		newWorkflow.versionId = uuid();
		newWorkflow.parentFolder = null;

		newWorkflow.sourceWorkflowId = sourceWorkflowId ?? null;

		await validateEntity(newWorkflow);

		if (tagIds?.length && !this.globalConfig.tags.disabled) {
			newWorkflow.tags = await this.tagRepository.findMany(tagIds);
		}

		// Resolve target project and require workflow:create before credential checks
		const effectiveProjectId =
			batchContext?.project.id ??
			projectId ??
			(await this.projectRepository.getPersonalProjectForUserOrFail(user.id)).id;

		let project: Project | null =
			batchContext?.project ??
			(await this.projectService.getProjectWithScope(user, effectiveProjectId, [
				'workflow:create',
			]));
		if (!project) {
			if (!(await this.projectRepository.exists({ where: { id: effectiveProjectId } }))) {
				throw new NotFoundError('Project not found');
			}
			const message = "You don't have the permissions to save the workflow in this project.";
			if (publicApi) {
				throw new ForbiddenError(message);
			}
			throw new BadRequestError(message);
		}

		await WorkflowHelpers.replaceInvalidCredentials(
			newWorkflow,
			effectiveProjectId,
			batchContext?.credentialResolutionCache,
		);

		WorkflowHelpers.addNodeIds(newWorkflow);
		WorkflowHelpers.resolveNodeWebhookIds(newWorkflow, this.nodeTypes);
		WorkflowHelpers.validateWorkflowStructure(newWorkflow);
		WorkflowHelpers.validateWorkflowNodeGroups(
			newWorkflow,
			WorkflowHelpers.makeGetNodeTypeForGrouping(this.nodeTypes),
		);

		if (parentFolderId && parentFolderId !== PROJECT_ROOT) {
			if (!batchContext) {
				await this.findParentFolderInProjectOrFail(parentFolderId, effectiveProjectId);
			}
		}

		if ('pinData' in newWorkflow) {
			WorkflowHelpers.validatePinDataSize(newWorkflow);
		}

		if (this.licenseState.isSharingLicensed()) {
			// This is a new workflow, so we simply check if the user has access to
			// all used credentials
			const { ids: credentialIds, hasUnresolved } =
				this.enterpriseWorkflowService.collectCredentialReferences(newWorkflow);
			if (batchContext) {
				const uncheckedIds = [...credentialIds].filter(
					(id) => !batchContext.checkedCredentialIds.has(id),
				);
				if (uncheckedIds.length > 0) {
					const accessibleIds =
						await this.credentialsFinderService.findCredentialIdsWithScopeForUser(
							uncheckedIds,
							user,
							['credential:read'],
						);
					for (const id of uncheckedIds) batchContext.checkedCredentialIds.add(id);
					for (const id of accessibleIds) batchContext.allowedCredentialIds.add(id);
				}
			}
			const accessibleCredentialIds =
				batchContext?.allowedCredentialIds ??
				(credentialIds.size === 0
					? new Set<string>()
					: await this.credentialsFinderService.findCredentialIdsWithScopeForUser(
							[...credentialIds],
							user,
							['credential:read'],
						));

			try {
				this.enterpriseWorkflowService.validateCredentialPermissionsToUser(
					newWorkflow,
					hasUnresolved ? new Set() : accessibleCredentialIds,
				);
			} catch (error) {
				throw new BadRequestError(
					'The workflow you are trying to save contains credentials that are not shared with you',
				);
			}
		}

		// Reject illegal credential-to-node bindings before persisting
		const restrictionValidation = this.workflowValidationService.validateCredentialNodeRestrictions(
			newWorkflow.nodes,
		);
		if (!restrictionValidation.isValid) {
			throw new WorkflowValidationError(
				restrictionValidation.error ?? 'Credential binding is not allowed.',
			);
		}

		// Run external hook after all validation has passed, right before persisting
		await this.externalHooks.run('workflow.create', [
			newWorkflow,
			this.workflowHookContextService,
			toWorkflowLifecycleHookActor(user),
		]);

		// Gate the save on policy before persisting, so the author learns about a violation
		// while editing rather than at runtime. No stored workflow: this one is new.
		// The clearance binds to the node hash while the row has no id, so nothing below
		// may touch `newWorkflow.nodes` — the sealed write would reject it.
		const cleared = await this.policyEnforcementService.enforceWorkflowSave({
			workflow: { id: newWorkflow.id ?? null, name: newWorkflow.name, nodes: newWorkflow.nodes },
			storedWorkflow: null,
			projectId: effectiveProjectId,
		});

		const floor = batchContext?.redactionFloor ?? (await this.readActiveRedactionFloor());

		const savedWorkflow = await this.workflowRepository.runInTransaction(
			{ policyCleared: cleared },
			async (transactionManager, ctx) => {
				project = await this.projectService.getProjectWithScope(
					user,
					effectiveProjectId,
					['workflow:create'],
					transactionManager,
				);

				if (project === null) {
					const message = "You don't have the permissions to save the workflow in this project.";
					if (publicApi) {
						throw new ForbiddenError(message);
					}
					throw new BadRequestError(message);
				}

				await this.resolveRedactionPolicyOnCreate(
					newWorkflow,
					user,
					effectiveProjectId,
					transactionManager,
					floor,
				);

				await this.resolveMcpExposureOnCreate(
					newWorkflow,
					transactionManager,
					batchContext?.autoExposeNewWorkflows,
				);

				if (parentFolderId && parentFolderId !== PROJECT_ROOT) {
					newWorkflow.parentFolder = await this.findParentFolderInProjectOrFail(
						parentFolderId,
						project.id,
						transactionManager,
					);
				}

				const workflow = await this.workflowRepository.createContent(newWorkflow, ctx);

				const newSharedWorkflow = this.sharedWorkflowRepository.create({
					role: 'workflow:owner',
					projectId: project.id,
					workflow,
				});

				await transactionManager.save<SharedWorkflow>(newSharedWorkflow);

				await this.workflowHistoryService.saveVersion(
					user,
					workflow,
					workflow.id,
					autosaved,
					source,
					transactionManager,
					versionName || versionDescription
						? { name: versionName, description: versionDescription }
						: undefined,
				);

				return await this.workflowFinderService.findWorkflowForUser(
					workflow.id,
					user,
					['workflow:read'],
					{
						em: transactionManager,
						includeTags: true,
						includeParentFolder: true,
						includeActiveVersion: true,
					},
				);
			},
		);

		if (!savedWorkflow) {
			this.logger.error('Failed to create workflow', { userId: user.id });
			throw new InternalServerError('Failed to save workflow');
		}

		if (tagIds && !this.globalConfig.tags.disabled && savedWorkflow.tags) {
			savedWorkflow.tags = this.tagService.sortByRequestOrder(savedWorkflow.tags, {
				requestOrder: tagIds,
			});
		}

		await this.externalHooks.run('workflow.afterCreate', [
			savedWorkflow,
			this.workflowHookContextService,
			toWorkflowLifecycleHookActor(user),
		]);
		this.eventService.emit('workflow-created', {
			user,
			workflow: newWorkflow,
			publicApi,
			projectId: project.id,
			projectType: project.type,
			uiContext,
			source,
		});

		return savedWorkflow;
	}

	private async findParentFolderInProjectOrFail(
		parentFolderId: string,
		projectId: string,
		em?: EntityManager,
	): Promise<Folder> {
		try {
			return await this.folderService.findFolderInProjectOrFail(parentFolderId, projectId, em);
		} catch {
			throw new NotFoundError(`Could not find the folder: ${parentFolderId}`);
		}
	}

	private async readActiveRedactionFloor(): Promise<RedactionFloor> {
		if (!this.licenseState.isDataRedactionLicensed()) return 'off';
		return await this.instanceRedactionEnforcementService.get();
	}

	private async readAutoExposeNewWorkflows(): Promise<boolean> {
		try {
			return await this.mcpSettingsService.getAutoExposeNewWorkflows();
		} catch (error) {
			this.logger.warn('Failed to resolve auto-expose setting for new workflow', {
				cause: error instanceof Error ? error.message : String(error),
			});
			return false;
		}
	}

	private async resolveRedactionPolicyOnCreate(
		newWorkflow: WorkflowEntity,
		user: User,
		effectiveProjectId: string,
		transactionManager: EntityManager,
		floor: RedactionFloor,
	): Promise<void> {
		// No license — the field is meaningless, drop any incoming value.
		if (!this.licenseState.isDataRedactionLicensed()) {
			dropRedactionPolicy(newWorkflow);
			return;
		}

		const incomingPolicy = newWorkflow.settings?.redactionPolicy;
		const hasIncoming = incomingPolicy !== undefined && incomingPolicy !== 'none';

		// Nothing to validate, nothing to clamp — skip the scope check entirely.
		if (!hasIncoming && floor === 'off') return;

		const canUpdateRedaction = await userHasScopes(
			user,
			['workflow:enableRedaction'],
			false,
			{ projectId: effectiveProjectId },
			transactionManager,
		);

		// User can't update the policy, drop any incoming value.
		if (!canUpdateRedaction && hasIncoming) {
			dropRedactionPolicy(newWorkflow);
		}

		if (floor === 'off' || !canUpdateRedaction) return;

		const current = newWorkflow.settings?.redactionPolicy;
		if (current !== undefined && policyMeetsFloor(current, floor)) return;

		const seed = policyForFloor(floor);
		if (seed === undefined) return;

		newWorkflow.settings = { ...(newWorkflow.settings ?? {}), redactionPolicy: seed };
	}

	private async resolveMcpExposureOnCreate(
		newWorkflow: WorkflowEntity,
		transactionManager: EntityManager,
		autoExposeNewWorkflows?: boolean,
	): Promise<void> {
		if (newWorkflow.settings?.availableInMCP !== undefined) return;

		if (autoExposeNewWorkflows !== undefined) {
			if (!autoExposeNewWorkflows) return;
			newWorkflow.settings = { ...(newWorkflow.settings ?? {}), availableInMCP: true };
			return;
		}

		try {
			// Read through the create transaction's connection: a settings read on a
			// separate pool connection would deadlock small pools (the transaction
			// holds one, the read waits for another that never frees).
			if (!(await this.mcpSettingsService.getAutoExposeNewWorkflows(transactionManager))) return;
		} catch (error) {
			this.logger.warn('Failed to resolve auto-expose setting for new workflow', {
				cause: error instanceof Error ? error.message : String(error),
			});
			return;
		}

		newWorkflow.settings = { ...(newWorkflow.settings ?? {}), availableInMCP: true };
	}
}
