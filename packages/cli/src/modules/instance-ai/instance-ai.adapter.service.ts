import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import type {
	InstanceAiContext,
	InstanceAiWorkflowService,
	InstanceAiExecutionService,
	InstanceAiCredentialService,
	InstanceAiNodeService,
	InstanceAiDataTableService,
	InstanceAiWebResearchService,
	FetchedPage,
	DataTableSummary,
	DataTableColumnInfo,
	WorkflowSummary,
	WorkflowDetail,
	WorkflowNode,
	WorkflowVersionSummary,
	WorkflowVersionDetail,
	ExecutionResult,
	ExecutionDebugInfo,
	NodeOutputResult,
	ResolvedNodeParametersResult,
	ExecutionSummary as InstanceAiExecutionSummary,
	CredentialSummary,
	CredentialDetail,
	NodeSummary,
	NodeDescription,
	SearchableNodeDescription,
	ExploreResourcesParams,
	ExploreResourcesResult,
	InstanceAiWorkspaceService,
	ProjectSummary,
	FolderSummary,
	ServiceProxyConfig,
	CredentialTypeSearchResult,
	CredentialHostInfo,
} from '@n8n/instance-ai';
import { braveSearch, searxngSearch, type WebSearchResponse } from '@n8n/ai-utilities';
import {
	BuilderTemplatesService,
	builderTemplatesOptionsFromEnv,
	wrapUntrustedData,
	deriveCredentialHosts,
} from '@n8n/instance-ai';
import type { WorkflowJSON } from '@n8n/workflow-sdk';
import { GlobalConfig } from '@n8n/config';
import { Time } from '@n8n/constants';
import type { User, ExecutionSummaries } from '@n8n/db';

import { extractResolvedNodeParameters } from './extract-resolved-node-parameters';
import { InstanceAiSettingsService } from './instance-ai-settings.service';
import {
	buildInstanceAiRunPinDataPlan,
	pruneUnreachedVerificationPinData,
	sdkPinDataToRuntime,
} from './instance-ai-run-pin-data';
import {
	resolveBuiltinNodeDefinitionDirs,
	listNodeDiscriminators,
} from './node-definition-resolver';
import { fetchAndExtract, maybeSummarize, LRUCache } from './web-research';
import {
	AiBuilderTemporaryWorkflowRepository,
	ExecutionRepository,
	ProjectRepository,
	SharedWorkflowRepository,
	WorkflowEntity,
	WorkflowRepository,
} from '@n8n/db';
import { Logger, ModuleRegistry } from '@n8n/backend-common';
import { OutboundHttp, SsrfProtectionService } from '@n8n/backend-network';
import { Container, Service } from '@n8n/di';
import { hasGlobalScope, PROJECT_OWNER_ROLE_SLUG, type Scope } from '@n8n/permissions';
// eslint-disable-next-line n8n-local-rules/misplaced-n8n-typeorm-import
import { LessThan } from '@n8n/typeorm';
import {
	type ICredentialsDecrypted,
	type INode,
	type INodeParameters,
	type INodeProperties,
	type INodeTypeDescription,
	type IConnections,
	type IWorkflowSettings,
	type IWorkflowExecutionDataProcess,
	type DataTableFilter,
	type DataTableRow,
	type DataTableRows,
	type WorkflowExecuteMode,
	type ExecutionError,
	type IRunData,
	type ITaskData,
	NodeHelpers,
	Workflow,
	CHAT_TRIGGER_NODE_TYPE,
	FORM_TRIGGER_NODE_TYPE,
	WEBHOOK_NODE_TYPE,
	SCHEDULE_TRIGGER_NODE_TYPE,
	TimeoutExecutionCancelledError,
	UnexpectedError,
	jsonParse,
	createRunExecutionData,
} from 'n8n-workflow';

import { ActiveExecutions } from '@/active-executions';
import { CredentialsFinderService } from '@/credentials/credentials-finder.service';
import { CredentialsService } from '@/credentials/credentials.service';
import { EventService } from '@/events/event.service';
import { ExecutionPersistence } from '@/executions/execution-persistence';
import { License } from '@/license';
import { LoadNodesAndCredentials } from '@/load-nodes-and-credentials';
import { NodeTypes } from '@/node-types';
import { InstanceAiAgentBuilderAdapterService } from '@/modules/agents/instance-ai-agent-builder.adapter';
import { NodeCatalogService } from '@/node-catalog';
import { DataTableRepository } from '@/modules/data-table/data-table.repository';
import { DataTableService } from '@/modules/data-table/data-table.service';
import { MCP_REGISTRY_PACKAGE_NAME } from '@/modules/mcp-registry/node-description-transform';
import { SourceControlPreferencesService } from '@/modules/source-control.ee/source-control-preferences.service.ee';
import { userHasScopes } from '@/permissions.ee/check-access';
import { AiGatewayService } from '@/services/ai-gateway.service';
import { FolderService } from '@/services/folder.service';
import { NodeResourceExplorerService } from '@/services/node-resource-explorer.service';
import { ProjectService } from '@/services/project.service.ee';
import { RoleService } from '@/services/role.service';
import { InstanceSettings } from 'n8n-core';
import { TagService } from '@/services/tag.service';
import { WorkflowFinderService } from '@/workflows/workflow-finder.service';
import { WorkflowHistoryService } from '@/workflows/workflow-history/workflow-history.service';
import { WorkflowService } from '@/workflows/workflow.service';
import { getRequiredRedactionScopes } from '@/workflows/utils';
import { EnterpriseWorkflowService } from '@/workflows/workflow.service.ee';
import { Telemetry } from '@/telemetry';
import { WorkflowRunner } from '@/workflow-runner';

type BuilderTemplatesServiceInstance = InstanceType<typeof BuilderTemplatesService>;

/**
 * Fill in defaults for properties whose visibility depends on sibling values
 * (e.g. OpenAI v2's per-resource `operation`). A naive single-pass loop picks
 * the first variant of a duplicated property name, which leaves dependent
 * properties (like `modelId` for `text`/`response`) out of view of the issue
 * and credential checkers. `getNodeParameters` walks the dependency graph and
 * fills only displayed properties.
 */
function resolveDisplayedDefaults(
	nodeProperties: INodeProperties[],
	parameters: Record<string, unknown>,
	nodeType: string,
	typeVersion: number,
	desc: INodeTypeDescription,
): INodeParameters {
	const stubNode: INode = {
		id: '',
		name: '',
		type: nodeType,
		typeVersion,
		parameters: parameters as INodeParameters,
		position: [0, 0],
	};
	const resolved = NodeHelpers.getNodeParameters(
		nodeProperties,
		parameters as INodeParameters,
		true,
		false,
		stubNode,
		desc,
	);
	return resolved ?? (parameters as INodeParameters);
}

// Credential types are loaded once at boot, so the derived host index is
// process-global and safe to memoize across users.
let httpCredentialHostsCache: CredentialHostInfo[] | undefined;

@Service()
export class InstanceAiAdapterService {
	private readonly logger: Logger;

	private readonly allowSendingParameterValues: boolean;

	/**
	 * Service-level cache for node type descriptions. Reads from the static JSON
	 * file that FrontendService writes at startup, avoiding the expensive
	 * collectTypes() → postProcessLoaders() rebuild cycle. Expires after
	 * 5 minutes so hot-reloaded nodes are picked up without a restart.
	 */
	private nodesCache: {
		promise: Promise<INodeTypeDescription[]>;
		expiresAt: number;
	} | null = null;

	private readonly NODES_CACHE_TTL_MS = 5 * 60 * 1000;

	private templatesService: BuilderTemplatesServiceInstance | undefined;

	private async getNodesFromCache(): Promise<INodeTypeDescription[]> {
		if (this.nodesCache && Date.now() < this.nodesCache.expiresAt) {
			return await this.nodesCache.promise;
		}
		const filePath = path.join(this.instanceSettings.staticCacheDir, 'types/nodes.json');
		const promise = readFile(filePath, 'utf-8').then((json) =>
			jsonParse<INodeTypeDescription[]>(json),
		);
		this.nodesCache = { promise, expiresAt: Date.now() + this.NODES_CACHE_TTL_MS };
		promise.catch(() => {
			this.nodesCache = null;
		});
		return await promise;
	}

	constructor(
		logger: Logger,
		private readonly globalConfig: GlobalConfig,
		private readonly workflowService: WorkflowService,
		private readonly workflowFinderService: WorkflowFinderService,
		private readonly workflowRepository: WorkflowRepository,
		private readonly sharedWorkflowRepository: SharedWorkflowRepository,
		private readonly projectRepository: ProjectRepository,
		private readonly executionRepository: ExecutionRepository,
		private readonly credentialsService: CredentialsService,
		private readonly credentialsFinderService: CredentialsFinderService,
		private readonly activeExecutions: ActiveExecutions,
		private readonly workflowRunner: WorkflowRunner,
		private readonly loadNodesAndCredentials: LoadNodesAndCredentials,
		private readonly nodeTypes: NodeTypes,
		private readonly instanceSettings: InstanceSettings,
		private readonly dataTableService: DataTableService,
		private readonly dataTableRepository: DataTableRepository,
		private readonly nodeResourceExplorerService: NodeResourceExplorerService,
		private readonly folderService: FolderService,
		private readonly projectService: ProjectService,
		private readonly tagService: TagService,
		private readonly sourceControlPreferencesService: SourceControlPreferencesService,
		private readonly settingsService: InstanceAiSettingsService,
		private readonly workflowHistoryService: WorkflowHistoryService,
		private readonly enterpriseWorkflowService: EnterpriseWorkflowService,
		private readonly license: License,
		private readonly executionPersistence: ExecutionPersistence,
		private readonly eventService: EventService,
		private readonly roleService: RoleService,
		private readonly telemetry: Telemetry,
		private readonly aiBuilderTemporaryWorkflowRepository: AiBuilderTemporaryWorkflowRepository,
		private readonly ssrfProtectionService: SsrfProtectionService,
		private readonly outboundHttp: OutboundHttp,
		private readonly aiGatewayService: AiGatewayService,
		private readonly nodeCatalogService?: NodeCatalogService,
	) {
		this.logger = logger.scoped('instance-ai');
		this.allowSendingParameterValues = globalConfig.ai.allowSendingParameterValues;
		this.loadNodesAndCredentials.addPostProcessor?.(async () => {
			this.nodesCache = null;
		});
	}

	createContext(
		user: User,
		options?: {
			searchProxyConfig?: ServiceProxyConfig;
			pushRef?: string;
			threadId?: string;
			projectId?: string;
			/** Eval-only: restrict the credential `list()` view to these IDs. */
			credentialIdAllowlist?: string[];
			/** Pre-bound agent for the build-existing-agent flow. When omitted, the
			 *  assistant can create one via the create_agent tool. */
			agentId?: string;
		},
	): InstanceAiContext {
		const { searchProxyConfig, pushRef, threadId, projectId, credentialIdAllowlist, agentId } =
			options ?? {};
		const agentBuilderAdapter = this.getAgentBuilderAdapter();
		return {
			userId: user.id,
			projectId,
			workflowService: this.createWorkflowAdapter(user, threadId, projectId),
			executionService: this.createExecutionAdapter(user, pushRef, threadId),
			credentialService: this.createCredentialAdapter(user, projectId, credentialIdAllowlist),
			nodeService: this.createNodeAdapter(user),
			dataTableService: this.createDataTableAdapter(user, projectId),
			webResearchService: this.createWebResearchAdapter(user, searchProxyConfig),
			workspaceService: this.createWorkspaceAdapter(user),
			templatesService: this.getTemplatesService(),
			licenseHints: this.buildLicenseHints(),
			logger: this.logger,
			nodeTypesProvider: this.nodeTypes,
			allowSendingParameterValues: this.allowSendingParameterValues,
			...(agentBuilderAdapter
				? { agentBuilderService: agentBuilderAdapter.createAdapter(user, projectId) }
				: {}),
			...(agentBuilderAdapter && agentId && projectId
				? { agentBuilderTarget: { agentId, projectId } }
				: {}),
		};
	}

	/**
	 * Resolve the agent-builder adapter only when the `agents` module is active.
	 * The adapter class is statically imported (so its `@Service` is always
	 * registered), so the module-enabled check is what gates
	 * agent-building. Returns null when the module is off, so the tools are simply
	 * absent.
	 */
	private getAgentBuilderAdapter(): InstanceAiAgentBuilderAdapterService | null {
		if (!Container.get(ModuleRegistry).isActive('agents')) return null;
		try {
			return Container.get(InstanceAiAgentBuilderAdapterService);
		} catch {
			return null;
		}
	}

	private getTemplatesService(): BuilderTemplatesServiceInstance {
		if (!this.templatesService) {
			this.templatesService = new BuilderTemplatesService({
				...builderTemplatesOptionsFromEnv({ logger: this.logger }),
				cacheDir: path.join(this.instanceSettings.n8nFolder, 'n8n-sdk-templates'),
				logger: this.logger,
			});
		}
		return this.templatesService;
	}

	private buildLicenseHints(): string[] {
		const hints: string[] = [];
		if (!this.license.isLicensed('feat:namedVersions')) {
			hints.push(
				'**Named workflow versions** — naming and describing workflow versions (update-workflow-version) is available on the Pro plan and above.',
			);
		}
		if (!this.license.isLicensed('feat:folders')) {
			hints.push(
				'**Folders** — organizing workflows into folders (list-folders, create-folder, delete-folder, move-workflow-to-folder) is available on registered Community Edition or paid plans.',
			);
		}
		return hints;
	}

	private assertInstanceNotReadOnly(resourceType: string) {
		if (this.sourceControlPreferencesService.getPreferences().branchReadOnly) {
			throw new Error(
				`Cannot modify ${resourceType} on a protected instance. This instance is in read-only mode.`,
			);
		}
	}

	private createProjectScopeHelpers(user: User, boundProjectId?: string) {
		const { projectRepository } = this;
		let personalProjectIdPromise: Promise<string> | null = null;

		const getPersonalProjectId = async () => {
			personalProjectIdPromise ??= projectRepository
				.getPersonalProjectForUserOrFail(user.id)
				.then((p) => p.id);
			return await personalProjectIdPromise;
		};

		const assertProjectScope = async (scopes: Scope[], projectId: string) => {
			const allowed = await userHasScopes(user, scopes, false, { projectId });
			if (!allowed) {
				throw new Error('User does not have the required permissions in this project');
			}
		};

		const resolveProjectId = async (scopes: Scope[], providedProjectId?: string) => {
			const projectId = providedProjectId ?? boundProjectId ?? (await getPersonalProjectId());
			await assertProjectScope(scopes, projectId);
			return projectId;
		};

		const resolveBoundProjectId = async (scopes: Scope[]) => {
			if (!boundProjectId) {
				throw new UnexpectedError(
					'Cannot create a resource: this Instance AI run has no bound project.',
				);
			}
			await assertProjectScope(scopes, boundProjectId);
			return boundProjectId;
		};

		return { getPersonalProjectId, assertProjectScope, resolveProjectId, resolveBoundProjectId };
	}

	private createWorkflowAdapter(
		user: User,
		threadId?: string,
		boundProjectId?: string,
	): InstanceAiWorkflowService {
		const {
			workflowService,
			workflowFinderService,
			workflowRepository,
			sharedWorkflowRepository,
			aiBuilderTemporaryWorkflowRepository,
			workflowHistoryService,
			enterpriseWorkflowService,
			executionRepository,
			executionPersistence,
			license,
			allowSendingParameterValues,
			telemetry,
		} = this;
		const logger = this.logger;
		const assertNotReadOnly = () => this.assertInstanceNotReadOnly('workflows');
		const { resolveBoundProjectId } = this.createProjectScopeHelpers(user, boundProjectId);
		const redactParameters = !allowSendingParameterValues;

		return {
			async list(options) {
				const filter = {
					...(options?.status === 'all' ? {} : { isArchived: options?.status === 'archived' }),
					...(options?.query ? { query: options.query } : {}),
					...(options?.scope !== 'instance' && boundProjectId ? { projectId: boundProjectId } : {}),
				};

				const { workflows } = await workflowService.getMany(user, {
					take: options?.limit ?? 50,
					filter,
				});

				return workflows
					.filter((wf): wf is WorkflowEntity => 'versionId' in wf)
					.map(
						(wf): WorkflowSummary => ({
							id: wf.id,
							name: wf.name,
							versionId: wf.versionId,
							activeVersionId: wf.activeVersionId ?? null,
							isArchived: wf.isArchived,
							createdAt: wf.createdAt.toISOString(),
							updatedAt: wf.updatedAt.toISOString(),
						}),
					);
			},

			async get(workflowId: string) {
				const workflow = await workflowFinderService.findWorkflowForUser(workflowId, user, [
					'workflow:read',
				]);

				if (!workflow) {
					throw new Error(`Workflow ${workflowId} not found or not accessible`);
				}

				return toWorkflowDetail(workflow, { redactParameters });
			},

			async archive(workflowId: string) {
				assertNotReadOnly();
				const result = await workflowService.archive(user, workflowId, { skipArchived: true });
				if (!result) {
					throw new Error(`Workflow ${workflowId} not found or not accessible`);
				}
			},

			async unarchive(workflowId: string) {
				assertNotReadOnly();
				const result = await workflowService.unarchive(user, workflowId);
				if (!result) {
					throw new Error(`Workflow ${workflowId} not found or not accessible`);
				}
			},

			async clearAiTemporary(workflowId: string) {
				assertNotReadOnly();
				const workflow = await workflowFinderService.findWorkflowForUser(workflowId, user, [
					'workflow:update',
				]);
				if (!workflow) return;
				if (!(await aiBuilderTemporaryWorkflowRepository.existsForWorkflow(workflowId))) return;

				await aiBuilderTemporaryWorkflowRepository.unmark(workflowId);
			},

			async archiveIfAiTemporary(workflowId: string) {
				assertNotReadOnly();
				const workflow = await workflowFinderService.findWorkflowForUser(workflowId, user, [
					'workflow:update',
				]);
				if (!workflow) return false;
				if (!(await aiBuilderTemporaryWorkflowRepository.existsForWorkflow(workflowId))) {
					return false;
				}
				if (workflow.isArchived) {
					await aiBuilderTemporaryWorkflowRepository.unmark(workflowId);
					return false;
				}

				await workflowService.archive(user, workflowId, { skipArchived: true });
				await aiBuilderTemporaryWorkflowRepository.unmark(workflowId);
				return true;
			},

			async publish(
				workflowId: string,
				options?: { versionId?: string; name?: string; description?: string },
			) {
				const wf = await workflowService.activateWorkflow(user, workflowId, {
					versionId: options?.versionId,
					name: options?.name,
					description: options?.description,
					source: 'n8n-ai',
				});
				if (!wf.activeVersionId) {
					throw new Error(`Workflow ${workflowId} was not activated — no active version set`);
				}

				if (threadId) {
					telemetry.track('Builder published workflow', {
						thread_id: threadId,
						workflow_id: workflowId,
						executed_by: 'ai',
					});
				}

				return { activeVersionId: wf.activeVersionId };
			},

			async unpublish(workflowId: string) {
				await workflowService.deactivateWorkflow(user, workflowId, {
					source: 'n8n-ai',
				});
			},

			async getAsWorkflowJSON(workflowId: string, versionId?: string) {
				const wf = await workflowFinderService.findWorkflowForUser(workflowId, user, [
					'workflow:read',
				]);
				if (!wf) throw new Error(`Workflow ${workflowId} not found or not accessible`);
				if (!versionId) return toWorkflowJSON(wf, { redactParameters });
				const version = await workflowHistoryService.getVersion(user, workflowId, versionId);
				return toWorkflowJSON(wf, { redactParameters, graph: version });
			},

			async getWorkflowHead(workflowId: string) {
				const head = await workflowFinderService.findWorkflowHeadForUser(workflowId, user, [
					'workflow:read',
				]);
				if (!head) throw new Error(`Workflow ${workflowId} not found or not accessible`);
				return { versionId: head.versionId, updatedAt: head.updatedAt.getTime() };
			},

			async getWorkflowSnapshot(workflowId: string) {
				const wf = await workflowFinderService.findWorkflowForUser(workflowId, user, [
					'workflow:read',
				]);
				if (!wf) throw new Error(`Workflow ${workflowId} not found or not accessible`);
				return {
					json: toWorkflowJSON(wf, { redactParameters }),
					versionId: wf.versionId,
					updatedAt: wf.updatedAt.getTime(),
				};
			},

			async getLatestRunData(workflowId: string) {
				// Caller must be able to read the workflow to see its execution history.
				// Silent null on no-access keeps validation usable even when access was
				// revoked between fetches — validation degrades gracefully instead of
				// throwing in the middle of a per-node loop.
				const accessible = await workflowFinderService.findWorkflowForUser(workflowId, user, [
					'workflow:read',
				]);
				if (!accessible) return null;

				const [latest] = await executionRepository.find({
					select: ['id'],
					where: { workflowId },
					order: { startedAt: 'DESC' },
					take: 1,
				});
				if (!latest) return null;

				const execution = await executionPersistence.findSingleExecution(latest.id, {
					includeData: true,
					unflattenData: true,
				});
				return execution?.data?.resultData?.runData ?? null;
			},

			async createFromWorkflowJSON(
				json: WorkflowJSON,
				options?: { projectId?: string; markAsAiTemporary?: boolean },
			) {
				assertNotReadOnly();
				const projectId = await resolveBoundProjectId(['workflow:create']);

				// Strip redactionPolicy if the user lacks the required scope —
				// mirrors the check in WorkflowCreationService.createWorkflow().
				const settings = (json.settings ?? {}) as IWorkflowSettings;
				if (settings.redactionPolicy !== undefined && settings.redactionPolicy !== 'none') {
					const canUpdateRedaction = await userHasScopes(
						user,
						['workflow:enableRedaction'],
						false,
						{ projectId },
					);
					if (!canUpdateRedaction) {
						delete settings.redactionPolicy;
					}
				}

				// Create the workflow shell WITHOUT nodes — so that the subsequent
				// update() detects a real change and creates a WorkflowHistory entry.
				// Without a history entry, activateWorkflow() fails with "Version not found"
				// because it looks up workflow.versionId in WorkflowHistory.
				const newWorkflow = workflowRepository.create({
					name: json.name,
					nodes: [] as INode[],
					connections: {} as IConnections,
					settings,
					active: false,
					versionId: randomUUID(),
				} as Partial<WorkflowEntity>);

				const saved = await workflowRepository.manager.transaction(async (transactionManager) => {
					const workflow = await transactionManager.save(WorkflowEntity, newWorkflow);
					await sharedWorkflowRepository.makeOwner([workflow.id], projectId, transactionManager);
					if (options?.markAsAiTemporary) {
						if (!threadId) {
							throw new UnexpectedError(
								'Cannot mark AI-builder temporary workflow without a thread ID',
							);
						}
						await aiBuilderTemporaryWorkflowRepository.mark(
							workflow.id,
							threadId,
							transactionManager,
						);
					}
					return workflow;
				});

				// Now update with actual nodes — this creates the WorkflowHistory entry
				// needed for activation and publishing.
				const nodes = sanitizeCredentialReferencesForSave(json.nodes);
				let updateData = workflowRepository.create({
					name: json.name,
					nodes: nodes as unknown as INode[],
					connections: json.connections as unknown as IConnections,
					settings,
					pinData: sdkPinDataToRuntime(json.pinData),
					nodeGroups: sdkNodeGroupsToRuntime(json.nodeGroups),
				} as Partial<WorkflowEntity>);

				let updated: WorkflowEntity;
				try {
					// Enforce credential tamper protection — same guard as the
					// REST controller (workflows.controller PATCH /:workflowId).
					if (license.isSharingEnabled()) {
						updateData = await enterpriseWorkflowService.preventTampering(
							updateData,
							saved.id,
							user,
						);
					}

					updated = await workflowService.update(user, updateData, saved.id, {
						source: 'n8n-ai',
					});
				} catch (error) {
					logger.warn('AI-builder workflow save failed', {
						threadId,
						workflowId: saved.id,
						error: error instanceof Error ? error.message : String(error),
					});
					try {
						const archived = await workflowService.archive(user, saved.id, { skipArchived: true });
						if (archived && options?.markAsAiTemporary) {
							await aiBuilderTemporaryWorkflowRepository.unmark(saved.id);
						}
					} catch (cleanupError) {
						logger.warn('Failed to clean up AI-builder workflow shell after create failure', {
							threadId,
							workflowId: saved.id,
							error: cleanupError instanceof Error ? cleanupError.message : String(cleanupError),
						});
					}
					throw error;
				}

				if (threadId) {
					telemetry.track('Builder created workflow', {
						thread_id: threadId,
						workflow_id: updated.id,
					});
				}

				return toWorkflowDetail(updated, { redactParameters });
			},

			async updateFromWorkflowJSON(
				workflowId: string,
				json: WorkflowJSON,
				_options?: { projectId?: string },
			) {
				assertNotReadOnly();
				// Strip redactionPolicy if the user lacks the required directional scope —
				// mirrors the check in WorkflowService.update().
				const settings = (json.settings ?? {}) as IWorkflowSettings;
				if (settings.redactionPolicy !== undefined) {
					const [existingWorkflow, ownerProject] = await Promise.all([
						workflowRepository.findOne({ where: { id: workflowId } }),
						sharedWorkflowRepository.getWorkflowOwningProject(workflowId),
					]);

					const currentPolicy = existingWorkflow?.settings?.redactionPolicy;

					if (settings.redactionPolicy !== currentPolicy) {
						const requiredScopes = getRequiredRedactionScopes(
							currentPolicy,
							settings.redactionPolicy,
						);

						const canUpdateRedaction =
							ownerProject &&
							(await userHasScopes(user, requiredScopes, false, { projectId: ownerProject.id }));

						if (!canUpdateRedaction) {
							delete settings.redactionPolicy;
						}
					}
				}

				const nodes = sanitizeCredentialReferencesForSave(json.nodes);
				let updateData = workflowRepository.create({
					name: json.name,
					nodes: nodes as unknown as INode[],
					connections: json.connections as unknown as IConnections,
					settings,
					pinData: sdkPinDataToRuntime(json.pinData),
					nodeGroups: sdkNodeGroupsToRuntime(json.nodeGroups),
				} as Partial<WorkflowEntity>);

				let updated: WorkflowEntity;
				try {
					// Enforce credential tamper protection — same guard as the
					// REST controller (workflows.controller PATCH /:workflowId).
					if (license.isSharingEnabled()) {
						updateData = await enterpriseWorkflowService.preventTampering(
							updateData,
							workflowId,
							user,
						);
					}

					updated = await workflowService.update(user, updateData, workflowId, {
						source: 'n8n-ai',
					});
				} catch (error) {
					logger.warn('AI-builder workflow save failed', {
						threadId,
						workflowId,
						error: error instanceof Error ? error.message : String(error),
					});
					throw error;
				}

				if (threadId) {
					telemetry.track('Builder modified workflow', {
						thread_id: threadId,
						workflow_id: workflowId,
					});
				}

				return toWorkflowDetail(updated, { redactParameters });
			},

			async listVersions(workflowId, options) {
				const take = options?.limit ?? 20;
				const skip = options?.skip ?? 0;
				const versions = await workflowHistoryService.getList(user, workflowId, take, skip);

				// Fetch the workflow to determine active/draft version IDs
				const workflow = await workflowFinderService.findWorkflowForUser(workflowId, user, [
					'workflow:read',
				]);
				const activeVersionId = workflow?.activeVersionId ?? null;
				const currentDraftVersionId = workflow?.versionId ?? null;

				return versions.map(
					(v): WorkflowVersionSummary => ({
						versionId: v.versionId,
						name: v.name ?? null,
						description: v.description ?? null,
						authors: v.authors,
						createdAt: v.createdAt.toISOString(),
						autosaved: v.autosaved ?? false,
						isActive: v.versionId === activeVersionId,
						isCurrentDraft: v.versionId === currentDraftVersionId,
					}),
				);
			},

			async getVersion(workflowId, versionId) {
				const version = await workflowHistoryService.getVersion(user, workflowId, versionId);

				// Fetch the workflow to determine active/draft version IDs
				const workflow = await workflowFinderService.findWorkflowForUser(workflowId, user, [
					'workflow:read',
				]);
				const activeVersionId = workflow?.activeVersionId ?? null;
				const currentDraftVersionId = workflow?.versionId ?? null;

				return {
					versionId: version.versionId,
					name: version.name ?? null,
					description: version.description ?? null,
					authors: version.authors,
					createdAt: version.createdAt.toISOString(),
					autosaved: version.autosaved ?? false,
					isActive: version.versionId === activeVersionId,
					isCurrentDraft: version.versionId === currentDraftVersionId,
					nodes: (version.nodes ?? []).map(
						(n): WorkflowNode => ({
							name: n.name,
							type: n.type,
							typeVersion: n.typeVersion,
							parameters: redactParameters ? undefined : (n.parameters as Record<string, unknown>),
							position: n.position,
						}),
					),
					connections: version.connections as Record<string, unknown>,
				} satisfies WorkflowVersionDetail;
			},

			async restoreVersion(workflowId, versionId) {
				const version = await workflowHistoryService.getVersion(user, workflowId, versionId);

				const updateData = workflowRepository.create({
					nodes: version.nodes,
					connections: version.connections,
					// Restore the group state from the same snapshot so groups stay consistent
					// with the restored graph (history rows always carry nodeGroups).
					nodeGroups: version.nodeGroups,
				} as Partial<WorkflowEntity>);

				await workflowService.update(user, updateData, workflowId, {
					source: 'n8n-ai',
				});
			},

			...(this.license.isLicensed('feat:namedVersions')
				? {
						async updateVersion(
							workflowId: string,
							versionId: string,
							data: { name?: string | null; description?: string | null },
						) {
							await workflowHistoryService.updateVersionForUser(user, workflowId, versionId, data);
						},
					}
				: {}),
		};
	}

	private createExecutionAdapter(
		user: User,
		pushRef?: string,
		threadId?: string,
	): InstanceAiExecutionService {
		const {
			workflowFinderService,
			workflowRunner,
			activeExecutions,
			executionRepository,
			nodeTypes,
			allowSendingParameterValues,
			license,
			roleService,
			telemetry,
			logger,
			globalConfig,
		} = this;
		const assertNotReadOnly = () => this.assertInstanceNotReadOnly('executions');

		const DEFAULT_TIMEOUT_MS = 5 * Time.minutes.toMilliseconds;
		const MAX_TIMEOUT_MS = 10 * Time.minutes.toMilliseconds;

		/**
		 * Verify that the user has access to the workflow that owns this execution.
		 * Returns the execution or throws "not found" if unauthorized/missing.
		 */
		const assertExecutionAccess = async (
			executionId: string,
			scopes: Scope[] = ['workflow:read'],
		) => {
			const execution = await executionRepository.findSingleExecution(executionId, {
				includeData: false,
			});
			if (!execution) {
				throw new Error(`Execution ${executionId} not found`);
			}
			const workflow = await workflowFinderService.findWorkflowForUser(
				execution.workflowId,
				user,
				scopes,
			);
			if (!workflow) {
				throw new Error(`Execution ${executionId} not found`);
			}
			return execution;
		};

		return {
			async list(options) {
				const scope: Scope = 'workflow:read';

				let sharingOptions: ExecutionSummaries.RangeQuery['sharingOptions'];
				if (license.isSharingEnabled()) {
					const projectRoles = await roleService.rolesWithScope('project', [scope]);
					const workflowRoles = await roleService.rolesWithScope('workflow', [scope]);
					sharingOptions = { scopes: [scope], projectRoles, workflowRoles };
				} else {
					sharingOptions = {
						workflowRoles: ['workflow:owner'],
						projectRoles: [PROJECT_OWNER_ROLE_SLUG],
					};
				}

				const query: ExecutionSummaries.RangeQuery = {
					kind: 'range' as const,
					range: { limit: options?.limit ?? 20, lastId: undefined, firstId: undefined },
					order: { startedAt: 'DESC' as const },
					user,
					sharingOptions,
					...(options?.workflowId ? { workflowId: options.workflowId } : {}),
					...(options?.status
						? {
								status: [options.status] as Array<
									| 'running'
									| 'success'
									| 'error'
									| 'waiting'
									| 'unknown'
									| 'canceled'
									| 'crashed'
									| 'new'
								>,
							}
						: {}),
				};

				const executions = await executionRepository.findManyByRangeQuery(query);

				return executions.map(
					(e): InstanceAiExecutionSummary => ({
						id: e.id,
						workflowId: e.workflowId,
						workflowName: e.workflowName ?? '',
						status: e.status,
						startedAt: String(e.startedAt ?? ''),
						finishedAt: e.stoppedAt ? String(e.stoppedAt) : undefined,
						mode: e.mode,
					}),
				);
			},

			async run(workflowId: string, inputData, options) {
				assertNotReadOnly();
				const workflow = await workflowFinderService.findWorkflowForUser(workflowId, user, [
					'workflow:execute',
				]);

				if (!workflow) {
					throw new Error(`Workflow ${workflowId} not found or not accessible`);
				}

				const nodes = workflow.nodes ?? [];

				// Use the explicitly requested trigger node when provided,
				// otherwise auto-detect using known trigger type constants
				// then fall back to naive string matching for unknown trigger types
				const triggerNode = options?.triggerNodeName
					? (nodes.find((n) => n.name === options.triggerNodeName) ?? findTriggerNode(nodes))
					: findTriggerNode(nodes);

				// Force-save AI-initiated executions so that follow-up
				// `executions(list/get/debug)` calls can read the result, regardless of
				// instance-wide or per-workflow save settings. Manual mode is gated by
				// `saveManualExecutions`; trigger modes (webhook, chat, trigger) are
				// gated by the success/error settings — override all three.
				const runData: IWorkflowExecutionDataProcess = {
					executionMode: triggerNode
						? getExecutionModeForTrigger(triggerNode)
						: ('manual' as WorkflowExecuteMode),
					workflowData: {
						...workflow,
						settings: {
							...workflow.settings,
							saveManualExecutions: true,
							saveDataSuccessExecution: 'all',
							saveDataErrorExecution: 'all',
						},
					},
					userId: user.id,
					pushRef,
				};

				const pinDataPlan = buildInstanceAiRunPinDataPlan({
					workflowPinData: workflow.pinData ?? {},
					verificationPinData: options?.verificationPinData,
					inputData,
					triggerNode,
				});
				if (pinDataPlan.startNodeName) {
					runData.startNodes = [{ name: pinDataPlan.startNodeName, sourceData: null }];
				} else if (triggerNode) {
					// No inputData but we have a trigger node (e.g. test-trigger from
					// setup-workflow). Tell the execution engine which node to start from
					// so it doesn't fail to auto-detect webhook-only triggers like ChatTrigger.
					runData.triggerToStartFrom = { name: triggerNode.name };
				}
				if (pinDataPlan.runPinData) {
					runData.pinData = pinDataPlan.runPinData;
				}
				if (pinDataPlan.triggerExecutionData) {
					// Persist pin data in executionData so queued workers can hydrate
					// verification fixtures while starting from the trigger node.
					runData.executionData = pinDataPlan.triggerExecutionData;
				}

				runData.source = 'instance_ai';
				runData.telemetryMetadata = {
					mockDataSources: pinDataPlan.mockDataSources,
				};

				// When manual executions are offloaded to workers (queue mode), the worker
				// rebuilds the run from the persisted `execution.data`. The adapter's manual
				// run details otherwise live in transient top-level fields that don't survive
				// serialization, so wrap them into `executionData` — mirroring
				// `workflow-execution.service`. A trigger run already carries its stack in
				// `executionData`, so only wrap when it's absent.
				const offloadingManualExecutionsInQueueMode =
					globalConfig.executions?.mode === 'queue' &&
					process.env.OFFLOAD_MANUAL_EXECUTIONS_TO_WORKERS === 'true';
				if (
					runData.executionMode === 'manual' &&
					offloadingManualExecutionsInQueueMode &&
					!runData.executionData
				) {
					runData.executionData = createRunExecutionData({
						startData: { startNodes: runData.startNodes },
						resultData: { pinData: runData.pinData, runData: null },
						manualData: {
							userId: runData.userId,
							triggerToStartFrom: runData.triggerToStartFrom,
						},
						executionData: null,
					});
				}

				const trackBuilderExecutedWorkflow = (
					status: ExecutionResult['status'],
					error?: string,
				) => {
					if (!threadId) return;

					telemetry.track('Builder executed workflow', {
						thread_id: threadId,
						workflow_id: workflowId,
						executed_by: 'ai',
						pinned_node_count: Object.keys(runData.pinData ?? {}).length,
						exec_type: runData.executionMode,
						status,
						...(error ? { error } : {}),
					});
				};

				try {
					const executionId = await workflowRunner.run(runData);
					const pruneVerificationPins = async (executedNodeNames?: string[]) => {
						try {
							await pruneUnreachedVerificationPinData({
								executionId,
								verificationPinData: pinDataPlan.verificationPinData,
								nonVerificationPinData: pinDataPlan.nonVerificationPinData,
								executedNodeNames,
							});
						} catch (error) {
							logger.warn('Failed to prune verification pin data from execution', {
								executionId,
								error: error instanceof Error ? error.message : String(error),
							});
						}
					};

					// Wait for completion with timeout protection
					const timeoutMs = Math.min(options?.timeout ?? DEFAULT_TIMEOUT_MS, MAX_TIMEOUT_MS);

					if (activeExecutions.has(executionId)) {
						let timeoutId: NodeJS.Timeout | undefined;
						const timeoutPromise = new Promise<never>((_, reject) => {
							timeoutId = setTimeout(() => {
								reject(new Error(`Execution timed out after ${timeoutMs}ms`));
							}, timeoutMs);
						});

						try {
							await Promise.race([
								activeExecutions.getPostExecutePromise(executionId),
								timeoutPromise,
							]);
							clearTimeout(timeoutId);
						} catch (error) {
							clearTimeout(timeoutId);
							// On timeout, cancel the execution
							if (error instanceof Error && error.message.includes('timed out')) {
								try {
									activeExecutions.stopExecution(
										executionId,
										new TimeoutExecutionCancelledError(executionId),
									);
								} catch {
									// Execution may have completed between timeout and cancel
								}
								const result = {
									executionId,
									status: 'error',
									error: `Execution timed out after ${timeoutMs}ms and was cancelled`,
								} satisfies ExecutionResult;
								await pruneVerificationPins();
								trackBuilderExecutedWorkflow(result.status, result.error);
								return result;
							}
							throw error;
						}
					}

					const result = await extractExecutionResult(executionId, allowSendingParameterValues);
					await pruneVerificationPins(result.executedNodeNames);
					trackBuilderExecutedWorkflow(result.status, result.error);
					return result;
				} catch (error) {
					// A failure to launch (or any other unsettled error) is still an
					// errored builder run — track it before rethrowing so it isn't
					// silently dropped from telemetry.
					trackBuilderExecutedWorkflow(
						'error',
						error instanceof Error ? error.message : String(error),
					);
					throw error;
				}
			},

			async getStatus(executionId: string) {
				await assertExecutionAccess(executionId);
				const isRunning = activeExecutions.has(executionId);
				if (isRunning) {
					return { executionId, status: 'running' } satisfies ExecutionResult;
				}
				return await extractExecutionResult(executionId, allowSendingParameterValues);
			},

			async getResult(executionId: string) {
				await assertExecutionAccess(executionId);
				// If still running, wait for it to complete
				if (activeExecutions.has(executionId)) {
					await activeExecutions.getPostExecutePromise(executionId);
				}
				return await extractExecutionResult(executionId, allowSendingParameterValues);
			},

			async stop(executionId: string) {
				assertNotReadOnly();
				await assertExecutionAccess(executionId, ['workflow:execute']);
				if (!activeExecutions.has(executionId)) {
					return {
						success: false,
						message: `Execution ${executionId} is not currently running`,
					};
				}

				try {
					activeExecutions.stopExecution(
						executionId,
						new TimeoutExecutionCancelledError(executionId),
					);
					return { success: true, message: `Execution ${executionId} cancelled` };
				} catch {
					return {
						success: false,
						message: `Failed to cancel execution ${executionId}`,
					};
				}
			},

			async getDebugInfo(executionId: string) {
				await assertExecutionAccess(executionId);
				return await extractExecutionDebugInfo(executionId, allowSendingParameterValues, nodeTypes);
			},

			async getNodeOutput(executionId, nodeName, options) {
				await assertExecutionAccess(executionId);

				if (!allowSendingParameterValues) {
					return {
						nodeName,
						items: [],
						totalItems: 0,
						returned: { from: 0, to: 0 },
					} satisfies NodeOutputResult;
				}

				return await extractNodeOutput(executionId, nodeName, options);
			},

			getResolvedNodeParameters: async (
				executionId: string,
				nodeName: string,
				options?: { itemIndex?: number; runIndex?: number },
			): Promise<ResolvedNodeParametersResult> => {
				await assertExecutionAccess(executionId);

				if (!allowSendingParameterValues) {
					return {
						nodeName,
						runIndex: options?.runIndex ?? 0,
						itemIndex: options?.itemIndex ?? 0,
						parameters: null,
						resolved: null,
						failedExpressions: [],
						emptyResolutions: [],
						suppressed: 'parameter-values-disabled',
					} satisfies ResolvedNodeParametersResult;
				}

				return await extractResolvedNodeParameters(nodeTypes, executionId, nodeName, options);
			},
		};
	}

	private createCredentialAdapter(
		user: User,
		boundProjectId?: string,
		credentialIdAllowlist?: string[],
	): InstanceAiCredentialService {
		const {
			credentialsService,
			credentialsFinderService,
			loadNodesAndCredentials,
			aiGatewayService,
		} = this;

		const adapter: InstanceAiCredentialService = {
			async list(options) {
				// In a project-bound thread the credential list is always the bound
				// project's usable set (project-shared + global) — the same intersection
				// `preventTampering` (workflow.service.ee.ts) accepts. A caller-supplied
				// workflowId/projectId must not broaden it.
				if (boundProjectId) {
					const scoped = await credentialsService.getCredentialsAUserCanUseInAWorkflow(user, {
						projectId: boundProjectId,
					});
					const filtered = options?.type ? scoped.filter((c) => c.type === options.type) : scoped;
					return filtered.map((c): CredentialSummary => ({ id: c.id, name: c.name, type: c.type }));
				}

				// Unbound runs (temporary-workflow archiving, the only caller without a
				// bound project) scope to the caller-supplied workflow or project so the
				// candidates still match what the save path will accept.
				if (options?.workflowId || options?.projectId) {
					const scoped = options.workflowId
						? await credentialsService.getCredentialsAUserCanUseInAWorkflow(user, {
								workflowId: options.workflowId,
							})
						: await credentialsService.getCredentialsAUserCanUseInAWorkflow(user, {
								projectId: options.projectId!,
							});

					const filtered = options.type ? scoped.filter((c) => c.type === options.type) : scoped;

					return filtered.map(
						(c): CredentialSummary => ({
							id: c.id,
							name: c.name,
							type: c.type,
						}),
					);
				}

				const credentials = await credentialsService.getMany(user, {
					listQueryOptions: {
						filter: options?.type ? { type: options.type } : undefined,
					},
					includeGlobal: true,
				});

				return credentials.map(
					(c): CredentialSummary => ({
						id: c.id,
						name: c.name,
						type: c.type,
					}),
				);
			},

			async get(credentialId: string) {
				const credential = await credentialsService.getOne(user, credentialId, false);
				return {
					id: credential.id,
					name: credential.name,
					type: credential.type,
				} satisfies CredentialDetail;
			},

			async delete(credentialId: string) {
				await credentialsService.delete(user, credentialId);
			},

			async test(credentialId: string) {
				// Mirror browser endpoint behavior: resolve credential access by scope and
				// test using raw decrypted data from storage.
				const credential = await credentialsFinderService.findCredentialForUser(
					credentialId,
					user,
					['credential:read'],
				);

				if (!credential) {
					throw new Error(`Credential ${credentialId} not found or not accessible`);
				}

				const credentialsToTest: ICredentialsDecrypted = {
					id: credential.id,
					name: credential.name,
					type: credential.type,
					data: await credentialsService.decrypt(credential, true),
				};

				const result = await credentialsService.test(user.id, credentialsToTest);
				return {
					success: result.status === 'OK',
					message: result.message,
				};
			},

			async isTestable(credentialType: string) {
				try {
					const credClass = loadNodesAndCredentials.getCredential(credentialType);
					if (credClass.type.test) return true;

					const known = loadNodesAndCredentials.knownCredentials;
					const supportedNodes = known[credentialType]?.supportedNodes ?? [];
					for (const nodeName of supportedNodes) {
						try {
							const loaded = loadNodesAndCredentials.getNode(nodeName);
							const nodeInstance = loaded.type;
							const nodeDesc =
								'nodeVersions' in nodeInstance
									? Object.values(nodeInstance.nodeVersions).pop()?.description
									: nodeInstance.description;
							const hasTestedBy = nodeDesc?.credentials?.some(
								(cred: { name: string; testedBy?: unknown }) =>
									cred.name === credentialType && cred.testedBy,
							);
							if (hasTestedBy) return true;
						} catch {
							continue;
						}
					}
					return false;
				} catch {
					return false;
				}
			},

			async getDocumentationUrl(credentialType: string) {
				try {
					const credClass = loadNodesAndCredentials.getCredential(credentialType);
					const slug = credClass.type.documentationUrl;
					if (!slug) return null;
					if (slug.startsWith('http')) return slug;
					return `https://docs.n8n.io/integrations/builtin/credentials/${slug}/`;
				} catch {
					return null;
				}
			},

			getCredentialFields(credentialType: string) {
				try {
					// Walk the extends chain to collect all properties
					const allTypes = [credentialType];
					const known = loadNodesAndCredentials.knownCredentials;
					for (const typeName of allTypes) {
						const extendsArr = known[typeName]?.extends ?? [];
						allTypes.push(...extendsArr);
					}

					const fields: Array<{
						name: string;
						displayName: string;
						type: string;
						required: boolean;
						description?: string;
					}> = [];
					const seen = new Set<string>();

					for (const typeName of allTypes) {
						try {
							const credClass = loadNodesAndCredentials.getCredential(typeName);
							for (const prop of credClass.type.properties) {
								// Skip hidden fields and already-seen fields (child overrides parent)
								if (prop.type === 'hidden' || seen.has(prop.name)) continue;
								seen.add(prop.name);
								fields.push({
									name: prop.name,
									displayName: prop.displayName,
									type: prop.type,
									required: prop.required ?? false,
									description: prop.description,
								});
							}
						} catch {
							// Type not loadable — skip
						}
					}

					return fields;
				} catch {
					return [];
				}
			},

			async searchCredentialTypes(query: string): Promise<CredentialTypeSearchResult[]> {
				const q = query.toLowerCase().trim();
				if (!q) return [];

				const known = loadNodesAndCredentials.knownCredentials;
				const results: CredentialTypeSearchResult[] = [];

				for (const typeName of Object.keys(known)) {
					// Match against the type key name
					if (typeName.toLowerCase().includes(q)) {
						try {
							const credClass = loadNodesAndCredentials.getCredential(typeName);
							results.push({
								type: typeName,
								displayName: credClass.type.displayName,
							});
						} catch {
							// Type not loadable — include with type name as display name
							results.push({ type: typeName, displayName: typeName });
						}
						continue;
					}

					// Match against display name (requires loading the credential class)
					try {
						const credClass = loadNodesAndCredentials.getCredential(typeName);
						if (credClass.type.displayName.toLowerCase().includes(q)) {
							results.push({
								type: typeName,
								displayName: credClass.type.displayName,
							});
						}
					} catch {
						// Type not loadable — skip
					}
				}

				return results;
			},

			async listHttpCredentialHosts(): Promise<CredentialHostInfo[]> {
				if (httpCredentialHostsCache) return httpCredentialHostsCache;

				const { knownCredentials } = loadNodesAndCredentials;
				const result: CredentialHostInfo[] = [];

				for (const typeName of Object.keys(knownCredentials)) {
					let credType;
					try {
						credType = loadNodesAndCredentials.getCredential(typeName).type;
					} catch {
						// Type not loadable — skip.
						continue;
					}

					// Only credentials selectable in the HTTP node (authenticate / OAuth).
					const usableInHttpNode =
						Boolean(credType.authenticate) ||
						(knownCredentials[typeName]?.extends ?? []).some(
							(parent) => parent === 'oAuth2Api' || parent === 'oAuth1Api',
						);
					if (!usableInHttpNode) continue;

					const hosts = deriveCredentialHosts(credType);
					if (hosts.length === 0) continue;

					result.push({ type: typeName, displayName: credType.displayName, hosts });
				}

				httpCredentialHostsCache = result;
				return result;
			},

			async getAccountContext(credentialId: string) {
				const credential = await credentialsFinderService.findCredentialForUser(
					credentialId,
					user,
					['credential:read'],
				);

				if (!credential) {
					return { accountIdentifier: undefined };
				}

				const mask = (id: string): string => {
					const atIdx = id.indexOf('@');
					if (atIdx > 0) {
						const local = id.slice(0, atIdx);
						const domain = id.slice(atIdx);
						const keep = Math.min(2, local.length);
						return local.slice(0, keep) + '***' + domain;
					}
					if (id.length <= 3) return id;
					return id.slice(0, 2) + '***' + id.slice(-1);
				};

				try {
					// Use redacted decryption first — accountIdentifier is not a
					// password field so it survives redaction. This avoids exposing
					// the full secret payload (tokens, keys) in memory.
					const redacted = await credentialsService.decrypt(credential, false);

					if (typeof redacted.accountIdentifier === 'string' && redacted.accountIdentifier) {
						return { accountIdentifier: mask(redacted.accountIdentifier) };
					}

					for (const key of ['email', 'user', 'username', 'account', 'serviceAccountEmail']) {
						const value = redacted[key];
						if (typeof value === 'string' && value) {
							return { accountIdentifier: mask(value) };
						}
					}

					// Fallback for legacy credentials: oauthTokenData is blanked by
					// redaction, so we need unredacted access here only.
					const raw = await credentialsService.decrypt(credential, true);
					const tokenData = raw.oauthTokenData;
					if (tokenData && typeof tokenData === 'object') {
						const { OauthService } = await import('@/oauth/oauth.service');
						const identifier = OauthService.extractAccountIdentifier(
							tokenData as Record<string, unknown>,
						);
						if (identifier) {
							return { accountIdentifier: mask(identifier) };
						}
					}

					return { accountIdentifier: undefined };
				} catch {
					return { accountIdentifier: undefined };
				}
			},

			async isAiGatewayCredentialType(credType: string): Promise<boolean> {
				try {
					const config = await aiGatewayService.getGatewayConfig();
					return config.credentialTypes.includes(credType);
				} catch {
					// Fail open if the gateway config is unavailable — the credential
					// type check is a best-effort validation, not a security gate.
					return false;
				}
			},
		};

		if (!credentialIdAllowlist) return adapter;

		// Eval runs pin each build thread to a declared credential set so
		// concurrent test cases can't observe each other's credentials. Discovery
		// only: get/test/delete still resolve explicit IDs the caller already has.
		const allowed = new Set(credentialIdAllowlist);
		return {
			...adapter,
			list: async (options) =>
				allowed.size === 0 ? [] : (await adapter.list(options)).filter((c) => allowed.has(c.id)),
		};
	}

	private createDataTableAdapter(user: User, boundProjectId?: string): InstanceAiDataTableService {
		const { dataTableService, dataTableRepository } = this;
		const assertNotReadOnly = () => this.assertInstanceNotReadOnly('data tables');

		const { resolveProjectId, resolveBoundProjectId } = this.createProjectScopeHelpers(
			user,
			boundProjectId,
		);

		const logger = this.logger;

		/**
		 * Resolve a data-table identifier (UUID or name) to a concrete row the
		 * caller can access. Returns the resolved `id`, `name`, and `projectId`.
		 * Throws on not-found, ambiguous-name (when multiple accessible projects
		 * share the name and no `projectId` disambiguator was given), or
		 * UUID+projectId mismatch (when both are provided but the UUID's actual
		 * project differs from the one passed).
		 */
		const resolveAccessibleTable = async (
			scopes: Scope[],
			dataTableId: string,
			disambiguator?: { projectId?: string },
		): Promise<DataTableRecord> => {
			const projectIdFilter = disambiguator?.projectId;
			const result = await resolveDataTableByIdOrName(dataTableRepository, logger, dataTableId, {
				projectIdFilter,
				accessFilter: async (id) => await userHasScopes(user, scopes, false, { dataTableId: id }),
			});
			if (result.kind === 'miss') {
				throw new Error(`Data table "${dataTableId}" not found`);
			}
			if (result.kind === 'ambiguous') {
				const projectIds = result.candidates.map((c) => c.projectId).join(', ');
				throw new Error(
					`Data table name "${dataTableId}" is ambiguous across accessible projects ` +
						`(${projectIds}); pass the UUID or include a \`projectId\` to disambiguate.`,
				);
			}
			// UUID + projectId mismatch: the id hit resolved, but the caller's
			// disambiguator points at a different project. Never silently drop
			// the projectId — return mismatch so the caller fixes the call.
			if (projectIdFilter && result.table.projectId !== projectIdFilter) {
				throw new Error(
					`Data table "${dataTableId}" does not belong to project "${projectIdFilter}".`,
				);
			}
			return result.table;
		};

		// Check scope and return projectId + resolved UUID for downstream service calls
		const resolveProjectIdForTable = async (
			scopes: Scope[],
			dataTableId: string,
			disambiguator?: { projectId?: string },
		) => {
			const table = await resolveAccessibleTable(scopes, dataTableId, disambiguator);
			return { projectId: table.projectId, resolvedId: table.id };
		};

		// Like resolveProjectIdForTable but also returns the table name
		const resolveTableMeta = async (
			scopes: Scope[],
			dataTableId: string,
			disambiguator?: { projectId?: string },
		) => {
			const table = await resolveAccessibleTable(scopes, dataTableId, disambiguator);
			return { projectId: table.projectId, tableName: table.name, resolvedId: table.id };
		};

		const referenceScopes = {
			read: ['dataTable:read'],
			readRow: ['dataTable:readRow'],
			writeRow: ['dataTable:writeRow'],
			update: ['dataTable:update'],
			delete: ['dataTable:delete'],
		} satisfies Record<DataTableReferencePermission, Scope[]>;

		return {
			async list(options) {
				const projectId = await resolveProjectId(['dataTable:listProject'], options?.projectId);
				const { data: tables } = await dataTableService.getManyAndCount({
					filter: { projectId },
				});

				return tables.map(
					(t): DataTableSummary => ({
						id: t.id,
						name: t.name,
						projectId,
						columns: t.columns.map((c) => ({ id: c.id, name: c.name, type: c.type })),
						createdAt: t.createdAt.toISOString(),
						updatedAt: t.updatedAt.toISOString(),
					}),
				);
			},

			async create(name, columns) {
				assertNotReadOnly();
				const projectId = await resolveBoundProjectId(['dataTable:create']);
				const result = await dataTableService.createDataTable(projectId, { name, columns });

				return {
					id: result.id,
					name: result.name,
					projectId,
					columns: result.columns.map((c) => ({ id: c.id, name: c.name, type: c.type })),
					createdAt: result.createdAt.toISOString(),
					updatedAt: result.updatedAt.toISOString(),
				};
			},

			async delete(dataTableId, options) {
				assertNotReadOnly();
				const { projectId, resolvedId } = await resolveProjectIdForTable(
					['dataTable:delete'],
					dataTableId,
					options,
				);
				await dataTableService.deleteDataTable(resolvedId, projectId);
			},

			async resolveTableReference(dataTableId: string, options?: DataTableReferenceOptions) {
				const { projectId, tableName, resolvedId } = await resolveTableMeta(
					referenceScopes[options?.permission ?? 'read'],
					dataTableId,
					options,
				);
				return { id: resolvedId, name: tableName, projectId };
			},

			async getSchema(dataTableId, options) {
				const { projectId, resolvedId } = await resolveProjectIdForTable(
					['dataTable:read'],
					dataTableId,
					options,
				);
				const columns = await dataTableService.getColumns(resolvedId, projectId);
				return columns.map(
					(c, index): DataTableColumnInfo => ({
						id: c.id,
						name: c.name,
						type: c.type,
						index,
					}),
				);
			},

			async addColumn(dataTableId, column, options) {
				assertNotReadOnly();
				const { projectId, resolvedId } = await resolveProjectIdForTable(
					['dataTable:update'],
					dataTableId,
					options,
				);
				const result = await dataTableService.addColumn(resolvedId, projectId, column);
				return {
					id: result.id,
					name: result.name,
					type: result.type,
					index: result.index,
				};
			},

			async deleteColumn(dataTableId, columnId, options) {
				assertNotReadOnly();
				const { projectId, resolvedId } = await resolveProjectIdForTable(
					['dataTable:update'],
					dataTableId,
					options,
				);
				await dataTableService.deleteColumn(resolvedId, projectId, columnId);
			},

			async renameColumn(dataTableId, columnId, newName, options) {
				assertNotReadOnly();
				const { projectId, resolvedId } = await resolveProjectIdForTable(
					['dataTable:update'],
					dataTableId,
					options,
				);
				await dataTableService.renameColumn(resolvedId, projectId, columnId, {
					name: newName,
				});
			},

			async queryRows(dataTableId, options) {
				const { projectId, resolvedId } = await resolveProjectIdForTable(
					['dataTable:readRow'],
					dataTableId,
					options,
				);
				return await dataTableService.getManyRowsAndCount(resolvedId, projectId, {
					take: options?.limit ?? 50,
					skip: options?.offset ?? 0,
					filter: options?.filter as DataTableFilter | undefined,
				});
			},

			async insertRows(dataTableId, rows, options) {
				assertNotReadOnly();
				const { projectId, tableName, resolvedId } = await resolveTableMeta(
					['dataTable:writeRow'],
					dataTableId,
					options,
				);
				const result = await dataTableService.insertRows(
					resolvedId,
					projectId,
					rows as DataTableRows,
					'count',
				);
				return {
					insertedCount: typeof result === 'number' ? result : rows.length,
					dataTableId: resolvedId,
					tableName,
					projectId,
				};
			},

			async updateRows(dataTableId, filter, data, options) {
				assertNotReadOnly();
				const { projectId, tableName, resolvedId } = await resolveTableMeta(
					['dataTable:writeRow'],
					dataTableId,
					options,
				);
				const result = await dataTableService.updateRows(
					resolvedId,
					projectId,
					{ filter: filter as DataTableFilter, data: data as DataTableRow },
					true,
				);
				return {
					updatedCount: Array.isArray(result) ? result.length : 0,
					dataTableId: resolvedId,
					tableName,
					projectId,
				};
			},

			async deleteRows(dataTableId, filter, options) {
				assertNotReadOnly();
				const { projectId, tableName, resolvedId } = await resolveTableMeta(
					['dataTable:writeRow'],
					dataTableId,
					options,
				);
				const result = await dataTableService.deleteRows(
					resolvedId,
					projectId,
					{ filter: filter as DataTableFilter },
					true,
				);
				return {
					deletedCount: Array.isArray(result) ? result.length : 0,
					dataTableId: resolvedId,
					tableName,
					projectId,
				};
			},
		};
	}

	/** Cache for web research results, keyed per user to prevent cross-user data leaks. */
	private readonly webResearchCache = new LRUCache<FetchedPage>({
		maxEntries: 100,
		ttlMs: 15 * 60 * 1000,
	});

	/** Cache for web search results, keyed per user to prevent cross-user data leaks. */
	private readonly searchCache = new LRUCache<WebSearchResponse>({
		maxEntries: 100,
		ttlMs: 15 * 60 * 1000,
	});

	private createWebResearchAdapter(
		user: User,
		searchProxyConfig?: ServiceProxyConfig,
	): InstanceAiWebResearchService {
		const fetchCache = this.webResearchCache;
		const searchCacheRef = this.searchCache;
		const settingsService = this.settingsService;

		const { outboundHttp, ssrfProtectionService } = this;
		const sharedTransport = outboundHttp.transport({
			ssrf: this.ssrfProtectionService, // LLM/user-chosen URLs
		});
		const userId = user.id;

		// Lazy search method that resolves credentials on first call
		let resolvedSearchMethod: ReturnType<typeof this.buildSearchMethod>;
		let searchResolved = false;
		const lazySearch: InstanceAiWebResearchService['search'] = async (query, options) => {
			if (!searchResolved) {
				const config = await settingsService.resolveSearchConfig(user);
				resolvedSearchMethod = this.buildSearchMethod(
					config.braveApiKey ?? '',
					config.searxngUrl ?? '',
					searchCacheRef,
					searchProxyConfig,
					userId,
				);
				searchResolved = true;
			}
			if (!resolvedSearchMethod) return { query, results: [] };
			return await resolvedSearchMethod(query, options);
		};

		return {
			search: lazySearch,

			async fetchUrl(
				url: string,
				options?: {
					maxContentLength?: number;
					maxResponseBytes?: number;
					timeoutMs?: number;
					authorizeUrl?: (targetUrl: string) => Promise<void>;
				},
			) {
				const cacheKey = `${userId}:${url}`;

				// Check cache first
				const cached = fetchCache.get(cacheKey);
				if (cached) {
					// If cached result redirected to a different host, authorize it
					if (options?.authorizeUrl && cached.finalUrl) {
						const origHost = new URL(url).hostname;
						const finalHost = new URL(cached.finalUrl).hostname;
						if (origHost !== finalHost) {
							// Throws when the caller's domain tracker hasn't approved the
							// redirect target — let it propagate so the tool suspends for
							// HITL approval instead of leaking cached cross-host content.
							await options.authorizeUrl(cached.finalUrl);
						}
					}
					return cached;
				}

				const authorizeUrl = options?.authorizeUrl;
				const transport = authorizeUrl
					? outboundHttp.transport({
							ssrf: ssrfProtectionService,
							authorize: async (target: URL) => await authorizeUrl(target.href),
						})
					: sharedTransport;

				const page = await fetchAndExtract(url, {
					maxContentLength: options?.maxContentLength,
					maxResponseBytes: options?.maxResponseBytes,
					timeoutMs: options?.timeoutMs,
					transport,
				});

				// Attempt summarization (truncation fallback — no model injection yet)
				const result = await maybeSummarize(page);

				// Cache the result
				fetchCache.set(cacheKey, result);

				return result;
			},
		};
	}

	/**
	 * Build a cached search function based on provider priority:
	 *   1. Brave Search (if API key is set)
	 *   2. SearXNG (if URL is set)
	 *   3. Disabled (returns undefined)
	 */
	private buildSearchMethod(
		apiKey: string,
		searxngUrl: string,
		cache: LRUCache<WebSearchResponse>,
		searchProxyConfig?: ServiceProxyConfig,
		userId?: string,
	) {
		type SearchOptions = {
			maxResults?: number;
			includeDomains?: string[];
			excludeDomains?: string[];
		};

		const keyPrefix = userId ? `${userId}:` : '';

		// When the AI service proxy is enabled (licensed instance), search always goes
		// through the proxy which provides managed Brave Search with credit tracking.
		// This intentionally takes priority over local SearXNG or API key configuration.
		if (searchProxyConfig) {
			return async (query: string, options?: SearchOptions) => {
				const cacheKey = `${keyPrefix}${JSON.stringify([query, options ?? {}])}`;
				const cached = cache.get(cacheKey);
				if (cached) return cached;

				const result = await braveSearch('', query, {
					...options,
					proxyConfig: searchProxyConfig,
				});
				cache.set(cacheKey, result);
				return result;
			};
		}

		if (apiKey) {
			return async (query: string, options?: SearchOptions) => {
				const cacheKey = `${keyPrefix}${JSON.stringify([query, options ?? {}])}`;
				const cached = cache.get(cacheKey);
				if (cached) return cached;

				const result = await braveSearch(apiKey, query, options ?? {});
				cache.set(cacheKey, result);
				return result;
			};
		}

		if (searxngUrl) {
			return async (query: string, options?: SearchOptions) => {
				const cacheKey = `${keyPrefix}${JSON.stringify([query, options ?? {}])}`;
				const cached = cache.get(cacheKey);
				if (cached) return cached;

				const result = await searxngSearch(searxngUrl, query, options ?? {});
				cache.set(cacheKey, result);
				return result;
			};
		}

		return undefined;
	}

	/** Lazy-resolved node definition directories. */
	private _nodeDefinitionDirs?: string[];

	getNodeDefinitionDirs(): string[] {
		const catalogDirs = this.nodeCatalogService?.getNodeDefinitionDirs();
		if (catalogDirs?.length) return catalogDirs;

		if (!this._nodeDefinitionDirs) {
			this._nodeDefinitionDirs = resolveBuiltinNodeDefinitionDirs();
		}
		return this._nodeDefinitionDirs;
	}

	private getNodeCatalogService(): NodeCatalogService {
		return this.nodeCatalogService ?? Container.get(NodeCatalogService);
	}

	private createNodeAdapter(user: User): InstanceAiNodeService {
		// Use the service-level cache instead of a per-adapter closure.
		// This avoids each run retaining its own ~31 MB copy of node descriptions.
		const getNodes = async () => await this.getNodesFromCache();

		/** Find a node description matching type and optionally version. Falls back to any version. */
		const findNodeByVersion = (
			nodes: Awaited<ReturnType<typeof getNodes>>,
			nodeType: string,
			version?: number,
		) => {
			if (version !== undefined) {
				const exact = nodes.find((n) => {
					if (n.name !== nodeType) return false;
					if (Array.isArray(n.version)) return n.version.includes(version);
					return n.version === version;
				});
				if (exact) return exact;
			}
			return nodes.find((n) => n.name === nodeType);
		};

		return {
			async listAvailable(options) {
				const nodes = await getNodes();
				let filtered = nodes;

				if (options?.query) {
					const q = options.query.toLowerCase();
					filtered = nodes.filter(
						(n) =>
							n.displayName.toLowerCase().includes(q) ||
							n.name.toLowerCase().includes(q) ||
							n.description?.toLowerCase().includes(q),
					);
				}

				return filtered.map(
					(n): NodeSummary => ({
						name: n.name,
						displayName: n.displayName,
						description: n.description ?? '',
						group: n.group ?? [],
						version: Array.isArray(n.version) ? n.version[n.version.length - 1] : n.version,
					}),
				);
			},

			async listSearchable() {
				const nodes = await getNodes();

				const toStringArray = (
					value: (typeof nodes)[number]['inputs'] | (typeof nodes)[number]['outputs'],
				): string[] | string => {
					if (typeof value === 'string') return value;
					return value.map((v) => (typeof v === 'string' ? v : v.type));
				};

				return nodes.map((n): SearchableNodeDescription => {
					const result: SearchableNodeDescription = {
						name: n.name,
						displayName: n.displayName,
						description: n.description ?? '',
						version: n.version,
						inputs: toStringArray(n.inputs),
						outputs: toStringArray(n.outputs),
					};
					if (n.codex?.alias) {
						result.codex = { alias: n.codex.alias };
					}
					if (n.builderHint) {
						result.builderHint = {};
						if (n.builderHint.searchHint) {
							result.builderHint.message = n.builderHint.searchHint;
						}
						if (n.builderHint.inputs) {
							const inputs: Record<
								string,
								{ required: boolean; displayOptions?: Record<string, unknown> }
							> = {};
							for (const [key, config] of Object.entries(n.builderHint.inputs)) {
								inputs[key] = {
									required: config.required,
									...(config.displayOptions
										? { displayOptions: config.displayOptions as Record<string, unknown> }
										: {}),
								};
							}
							result.builderHint.inputs = inputs;
						}
						if (n.builderHint.outputs) {
							const outputs: Record<
								string,
								{ required?: boolean; displayOptions?: Record<string, unknown> }
							> = {};
							for (const [key, config] of Object.entries(n.builderHint.outputs)) {
								outputs[key] = {
									...(config.required !== undefined ? { required: config.required } : {}),
									...(config.displayOptions
										? { displayOptions: config.displayOptions as Record<string, unknown> }
										: {}),
								};
							}
							result.builderHint.outputs = outputs;
						}
					}
					return result;
				});
			},

			async getDescription(nodeType: string, version?: number) {
				const nodes = await getNodes();
				let desc =
					version !== undefined
						? nodes.find((n) => {
								if (n.name !== nodeType) return false;
								if (Array.isArray(n.version)) return n.version.includes(version);
								return n.version === version;
							})
						: undefined;
				// Fallback to any version if exact match not found
				if (!desc) {
					desc = nodes.find((n) => n.name === nodeType);
				}

				if (!desc) {
					throw new Error(`Node type ${nodeType} not found`);
				}

				return {
					name: desc.name,
					displayName: desc.displayName,
					description: desc.description ?? '',
					group: desc.group ?? [],
					version: Array.isArray(desc.version)
						? desc.version[desc.version.length - 1]
						: desc.version,
					properties: desc.properties.map((p) => ({
						displayName: p.displayName,
						name: p.name,
						type: p.type,
						required: p.required,
						description: p.description,
						default: p.default,
						options: p.options
							?.filter(
								(o): o is Extract<(typeof p.options)[number], { name: string; value: unknown }> =>
									typeof o === 'object' && o !== null && 'name' in o && 'value' in o,
							)
							.map((o) => ({
								name: String(o.name),
								value: o.value,
							})),
					})),
					credentials: desc.credentials?.map((c) => ({
						name: c.name,
						required: c.required,
						...(c.displayOptions
							? { displayOptions: c.displayOptions as Record<string, unknown> }
							: {}),
					})),
					inputs: Array.isArray(desc.inputs) ? desc.inputs.map(String) : [],
					outputs: Array.isArray(desc.outputs) ? desc.outputs.map(String) : [],
					...(desc.webhooks ? { webhooks: desc.webhooks as unknown[] } : {}),
					...(desc.polling ? { polling: desc.polling } : {}),
					...(desc.triggerPanel !== undefined ? { triggerPanel: desc.triggerPanel } : {}),
				} satisfies NodeDescription;
			},

			getNodeTypeDefinition: async (nodeType, options) => {
				const nodeCatalogService = this.getNodeCatalogService();
				await nodeCatalogService.initialize();

				const { version, resource, operation, mode } = options ?? {};
				const getDefinition = async (nodeId: string) =>
					await nodeCatalogService.getNodeTypeDefinition({
						nodeId,
						...(version ? { version } : {}),
						...(resource ? { resource } : {}),
						...(operation ? { operation } : {}),
						...(mode ? { mode } : {}),
					});

				const result = await getDefinition(nodeType);
				if (!result.error || nodeType.includes('.')) return result;

				return await getDefinition(`${MCP_REGISTRY_PACKAGE_NAME}.${nodeType}`);
			},

			listDiscriminators: async (nodeType) => {
				const nodeCatalogService = this.getNodeCatalogService();
				await nodeCatalogService.initialize();
				return listNodeDiscriminators(nodeType, nodeCatalogService.getNodeDefinitionDirs());
			},

			getParameterIssues: async (nodeType, typeVersion, parameters) => {
				const nodes = await getNodes();
				const desc = findNodeByVersion(nodes, nodeType, typeVersion);
				if (!desc) return {};

				const nodeProperties = desc.properties;
				const paramsWithDefaults = resolveDisplayedDefaults(
					nodeProperties,
					parameters,
					nodeType,
					typeVersion,
					desc as unknown as INodeTypeDescription,
				);

				const minimalNode: INode = {
					id: '',
					name: '',
					type: nodeType,
					typeVersion,
					parameters: paramsWithDefaults,
					position: [0, 0],
				};

				const issues = NodeHelpers.getNodeParametersIssues(
					nodeProperties,
					minimalNode,
					desc as unknown as INodeTypeDescription,
				);
				const allIssues = issues?.parameters ?? {};

				// Filter to top-level visible parameters only (mirrors setupPanel.utils.ts logic)
				const topLevelPropsByName = new Map<string, typeof nodeProperties>();
				for (const prop of nodeProperties) {
					const existing = topLevelPropsByName.get(prop.name);
					if (existing) {
						existing.push(prop);
					} else {
						topLevelPropsByName.set(prop.name, [prop]);
					}
				}

				const filteredIssues: Record<string, string[]> = {};
				for (const [key, value] of Object.entries(allIssues)) {
					const props = topLevelPropsByName.get(key);
					if (!props) continue;

					const isDisplayed = props.some((prop) => {
						if (prop.type === 'hidden') return false;
						if (
							prop.displayOptions &&
							!NodeHelpers.displayParameter(
								paramsWithDefaults,
								prop,
								minimalNode,
								desc as unknown as INodeTypeDescription,
							)
						) {
							return false;
						}
						return true;
					});
					if (!isDisplayed) continue;

					filteredIssues[key] = value;
				}
				return filteredIssues;
			},

			getNodeCredentialTypes: async (nodeType, typeVersion, parameters, _existingCredentials) => {
				const nodes = await getNodes();
				const desc = findNodeByVersion(nodes, nodeType, typeVersion);
				if (!desc) return [];

				const credentialTypes = new Set<string>();

				const paramsWithDefaults = resolveDisplayedDefaults(
					desc.properties,
					parameters,
					nodeType,
					typeVersion,
					desc as unknown as INodeTypeDescription,
				);
				const minimalNode: INode = {
					id: '',
					name: '',
					type: nodeType,
					typeVersion,
					parameters: paramsWithDefaults,
					position: [0, 0],
				};

				// 1. Displayable credentials from node type description
				const nodeCredentials = desc.credentials ?? [];
				for (const cred of nodeCredentials) {
					// Check if credential is displayable given current parameters
					if (cred.displayOptions) {
						if (
							!NodeHelpers.displayParameter(
								paramsWithDefaults,
								cred,
								minimalNode,
								desc as unknown as INodeTypeDescription,
							)
						) {
							continue;
						}
					}
					credentialTypes.add(cred.name);
				}

				// 2. Node issues for dynamic credentials (e.g. HTTP Request missing auth)
				const issues = NodeHelpers.getNodeParametersIssues(
					desc.properties,
					minimalNode,
					desc as unknown as INodeTypeDescription,
				);
				const credentialIssues = issues?.credentials ?? {};
				for (const credType of Object.keys(credentialIssues)) {
					credentialTypes.add(credType);
				}

				// 3. Dynamic credential resolution for nodes that use genericCredentialType
				// or predefinedCredentialType (e.g. HTTP Request). The credential type name
				// is stored in the node parameters rather than the description's credentials array.
				if (parameters.authentication === 'genericCredentialType' && parameters.genericAuthType) {
					credentialTypes.add(parameters.genericAuthType as string);
				} else if (
					parameters.authentication === 'predefinedCredentialType' &&
					parameters.nodeCredentialType
				) {
					credentialTypes.add(parameters.nodeCredentialType as string);
				}

				return Array.from(credentialTypes);
			},

			getResolvedNodeInputs: async (workflowJson, nodeName) => {
				const nodeJson = workflowJson.nodes.find((n) => n.name === nodeName);
				if (!nodeJson) return [];

				const nodeType = this.nodeTypes.getByNameAndVersion(
					nodeJson.type,
					nodeJson.typeVersion ?? 1,
				);
				if (!nodeType) return [];

				// Construct a transient Workflow so dynamic `inputs` expressions can be
				// evaluated against the node's current parameters and the surrounding
				// workflow graph. Not persisted; lives only for this call.
				const workflow = new Workflow({
					nodes: workflowJson.nodes as unknown as INode[],
					connections: workflowJson.connections as unknown as IConnections,
					active: false,
					nodeTypes: this.nodeTypes,
				});

				const workflowNode = workflow.getNode(nodeName);
				if (!workflowNode) return [];

				// Dynamic `inputs` expressions resolve via workflow.expression, which
				// needs a V8 isolate acquired for this workflow when
				// N8N_EXPRESSION_ENGINE=vm — otherwise the VM bridge throws "No bridge
				// acquired" and getNodeInputs silently returns []. No-op in legacy mode.
				await workflow.expression.acquireIsolate();
				try {
					return NodeHelpers.getNodeInputs(workflow, workflowNode, nodeType.description);
				} finally {
					await workflow.expression.releaseIsolate();
				}
			},

			exploreResources: async (params: ExploreResourcesParams): Promise<ExploreResourcesResult> =>
				await this.nodeResourceExplorerService.exploreResources(user, params),
		};
	}

	private createWorkspaceAdapter(user: User): InstanceAiWorkspaceService {
		const {
			projectService,
			folderService,
			tagService,
			workflowFinderService,
			workflowService,
			executionRepository,
			executionPersistence,
			eventService,
		} = this;
		const assertNotReadOnly = (resource: string) => this.assertInstanceNotReadOnly(resource);
		const { assertProjectScope } = this.createProjectScopeHelpers(user);

		const adapter: InstanceAiWorkspaceService = {
			async getProject(projectId: string): Promise<ProjectSummary | null> {
				const project = await projectService.getProjectWithScope(user, projectId, ['project:read']);
				if (!project) return null;
				return { id: project.id, name: project.name, type: project.type };
			},

			async listProjects(): Promise<ProjectSummary[]> {
				const projects = await projectService.getAccessibleProjects(user);
				return projects.map((p) => ({
					id: p.id,
					name: p.name,
					type: p.type,
				}));
			},

			...(this.license.isLicensed('feat:folders')
				? {
						async listFolders(projectId: string): Promise<FolderSummary[]> {
							await assertProjectScope(['folder:list'], projectId);
							const [folders] = await folderService.getManyAndCount(projectId, { take: 100 });
							return (
								folders as Array<{ id: string; name: string; parentFolderId: string | null }>
							).map((f) => ({
								id: f.id,
								name: f.name,
								parentFolderId: f.parentFolderId,
							}));
						},

						async createFolder(
							name: string,
							projectId: string,
							parentFolderId?: string,
						): Promise<FolderSummary> {
							assertNotReadOnly('folders');
							await assertProjectScope(['folder:create'], projectId);
							const folder = await folderService.createFolder(
								{ name, parentFolderId: parentFolderId ?? undefined },
								projectId,
							);
							return {
								id: folder.id,
								name: folder.name,
								parentFolderId: folder.parentFolderId ?? null,
							};
						},

						async deleteFolder(
							folderId: string,
							projectId: string,
							transferToFolderId?: string,
						): Promise<void> {
							assertNotReadOnly('folders');
							await assertProjectScope(['folder:delete'], projectId);
							await folderService.deleteFolder(user, folderId, projectId, {
								transferToFolderId: transferToFolderId ?? undefined,
							});
						},

						async moveWorkflowToFolder(workflowId: string, folderId: string): Promise<void> {
							assertNotReadOnly('workflows');
							const workflow = await workflowFinderService.findWorkflowForUser(workflowId, user, [
								'workflow:update',
							]);
							if (!workflow) {
								throw new Error(`Workflow ${workflowId} not found or not accessible`);
							}
							await workflowService.update(user, workflow, workflowId, {
								parentFolderId: folderId,
								source: 'n8n-ai',
							});
						},
					}
				: {}),

			async tagWorkflow(workflowId: string, tagNames: string[]): Promise<string[]> {
				assertNotReadOnly('workflows');
				const workflow = await workflowFinderService.findWorkflowForUser(workflowId, user, [
					'workflow:update',
				]);
				if (!workflow) {
					throw new Error(`Workflow ${workflowId} not found or not accessible`);
				}

				// Resolve tag names to IDs, creating missing tags
				if (!hasGlobalScope(user, 'tag:list')) {
					throw new Error('User does not have permission to list tags');
				}
				const existingTags = await tagService.getAll();
				const tagMap = new Map(existingTags.map((t) => [t.name.toLowerCase(), t]));
				const tagIds: string[] = [];

				for (const tagName of tagNames) {
					const existing = tagMap.get(tagName.toLowerCase());
					if (existing) {
						tagIds.push(existing.id);
					} else {
						if (!hasGlobalScope(user, 'tag:create')) {
							throw new Error('User does not have permission to create tags');
						}
						const entity = tagService.toEntity({ name: tagName });
						const saved = await tagService.save(entity, 'create');
						tagIds.push(saved.id);
					}
				}

				await workflowService.update(user, workflow, workflowId, { tagIds, source: 'n8n-ai' });
				return tagNames;
			},

			async listTags(): Promise<Array<{ id: string; name: string }>> {
				if (!hasGlobalScope(user, 'tag:list')) {
					throw new Error('User does not have permission to list tags');
				}
				const tags = await tagService.getAll();
				return tags.map((t) => ({ id: t.id, name: t.name }));
			},

			async createTag(name: string): Promise<{ id: string; name: string }> {
				if (!hasGlobalScope(user, 'tag:create')) {
					throw new Error('User does not have permission to create tags');
				}
				const entity = tagService.toEntity({ name });
				const saved = await tagService.save(entity, 'create');
				return { id: saved.id, name: saved.name };
			},

			async cleanupTestExecutions(
				workflowId: string,
				options?: { olderThanHours?: number },
			): Promise<{ deletedCount: number }> {
				assertNotReadOnly('executions');
				// Access-check the workflow with execute scope (matches controller behavior)
				const workflow = await workflowFinderService.findWorkflowForUser(workflowId, user, [
					'workflow:execute',
				]);
				if (!workflow) {
					throw new Error(`Workflow ${workflowId} not found or not accessible`);
				}

				const olderThanHours = options?.olderThanHours ?? 1;
				const cutoff = new Date(Date.now() - olderThanHours * 60 * 60 * 1000);

				// Count executions before deletion (hardDeleteBy returns void)
				const executions = await executionRepository.find({
					select: ['id'],
					where: {
						workflowId,
						mode: 'manual' as WorkflowExecuteMode,
						startedAt: LessThan(cutoff),
					},
				});

				if (executions.length === 0) {
					return { deletedCount: 0 };
				}

				const ids = executions.map((e) => e.id);

				// Use the canonical deletion pipeline (handles binary data and fs blobs)
				await executionPersistence.hardDeleteBy({
					filters: { workflowId, mode: 'manual' },
					accessibleWorkflowIds: [workflowId],
					deleteConditions: { deleteBefore: cutoff },
				});

				// Emit audit event (matches controller behavior)
				eventService.emit('execution-deleted', {
					user: {
						id: user.id,
						email: user.email,
						firstName: user.firstName,
						lastName: user.lastName,
						role: user.role,
					},
					executionIds: ids,
					deleteBefore: cutoff,
				});

				return { deletedCount: ids.length };
			},
		};
		return adapter;
	}
}

/** Maximum total size (in characters) for execution result data across all nodes. */
const MAX_RESULT_CHARS = 20_000;

/** Maximum characters for a single node's output preview when truncating. */
const MAX_NODE_OUTPUT_CHARS = 1_000;

/**
 * Minimal DataTable shape the resolver needs. Kept narrow so tests can mock
 * the repository without depending on the full TypeORM entity.
 */
interface DataTableRecord {
	id: string;
	name: string;
	projectId: string;
}

type DataTableReferencePermission = 'read' | 'readRow' | 'writeRow' | 'update' | 'delete';

type DataTableReferenceOptions = {
	projectId?: string;
	permission?: DataTableReferencePermission;
};

interface DataTableIdOrNameRepository {
	findOneBy: (where: { id: string }) => Promise<DataTableRecord | null>;
	findBy: (where: { name: string; projectId?: string }) => Promise<DataTableRecord[]>;
}

interface DataTableResolverLogger {
	warn: (message: string, meta?: Record<string, unknown>) => void;
}

export type ResolveDataTableResult =
	| { kind: 'hit'; table: DataTableRecord }
	| { kind: 'miss' }
	| { kind: 'ambiguous'; candidates: DataTableRecord[] };

/**
 * Look up a data table by the orchestrator-supplied identifier. Tries `id`
 * first; if that misses, tries `name`. The name fallback exists because the
 * orchestrator occasionally passes the human-readable table name it saw in a
 * `data-tables list` response instead of the numeric id.
 *
 * When the caller provides an `accessFilter`, candidates the user cannot
 * access are filtered out BEFORE the ambiguity check — so a collision across
 * projects the caller can't see still resolves cleanly to the one they can.
 * `projectIdFilter` narrows the name lookup at the database level when the
 * caller already knows the target project (table names are unique per
 * project).
 */
export async function resolveDataTableByIdOrName(
	repository: DataTableIdOrNameRepository,
	logger: DataTableResolverLogger,
	idOrName: string,
	options?: {
		projectIdFilter?: string;
		accessFilter?: (id: string) => Promise<boolean>;
	},
): Promise<ResolveDataTableResult> {
	const byId = await repository.findOneBy({ id: idOrName });
	if (byId) {
		if (options?.accessFilter && !(await options.accessFilter(byId.id))) {
			return { kind: 'miss' };
		}
		return { kind: 'hit', table: byId };
	}

	const candidates = await repository.findBy({
		name: idOrName,
		...(options?.projectIdFilter ? { projectId: options.projectIdFilter } : {}),
	});
	let filtered = candidates;
	if (options?.accessFilter) {
		filtered = [];
		for (const c of candidates) {
			if (await options.accessFilter(c.id)) filtered.push(c);
		}
	}
	if (filtered.length === 0) return { kind: 'miss' };
	if (filtered.length > 1) return { kind: 'ambiguous', candidates: filtered };

	const hit = filtered[0];
	logger.warn('data-tables tool called with table name instead of id — resolved by name fallback', {
		passedValue: idOrName,
		resolvedId: hit.id,
		projectId: hit.projectId,
	});
	return { kind: 'hit', table: hit };
}

/**
 * Truncate execution result data to stay within context budget.
 * Keeps first item per node as a preview; replaces arrays with summary objects.
 */
export function truncateResultData(resultData: Record<string, unknown>): Record<string, unknown> {
	const serialized = JSON.stringify(resultData);
	if (serialized.length <= MAX_RESULT_CHARS) return resultData;

	const truncated: Record<string, unknown> = {};
	for (const [nodeName, items] of Object.entries(resultData)) {
		if (!Array.isArray(items) || items.length === 0) {
			truncated[nodeName] = items;
			continue;
		}

		const itemStr = JSON.stringify(items[0]);
		const preview =
			itemStr.length > MAX_NODE_OUTPUT_CHARS
				? `${itemStr.slice(0, MAX_NODE_OUTPUT_CHARS)}…`
				: items[0];

		truncated[nodeName] = {
			_itemCount: items.length,
			_truncated: true,
			_firstItemPreview: preview,
		};
	}
	return truncated;
}

/**
 * Wraps each entry in truncated result data with untrusted-data boundary tags.
 * Applied after truncation so that `truncateResultData` can still inspect raw arrays.
 */
function wrapResultDataEntries(data: Record<string, unknown>): Record<string, unknown> {
	const wrapped: Record<string, unknown> = {};
	for (const [nodeName, value] of Object.entries(data)) {
		wrapped[nodeName] = wrapUntrustedData(
			JSON.stringify(value, null, 2),
			'execution-output',
			`node:${nodeName}`,
		);
	}
	return wrapped;
}

const MAX_NODE_ERRORS = 10;

function isFailedNodeRun(nodeRun: ITaskData): boolean {
	return (
		nodeRun.executionStatus === 'error' ||
		nodeRun.error !== undefined ||
		nodeRun.redactedError !== undefined
	);
}

function nodeContinuesOnError(node: INode | undefined): boolean {
	return (
		node?.continueOnFail === true ||
		node?.onError === 'continueRegularOutput' ||
		node?.onError === 'continueErrorOutput'
	);
}

function extractNodeErrors(
	runData: IRunData | undefined,
	includeUpstreamDetails: boolean,
	workflowNodes: INode[] = [],
): NonNullable<ExecutionResult['nodeErrors']> {
	if (!runData) return [];

	const nodesByName = new Map(workflowNodes.map((node) => [node.name, node]));
	const nodeErrors: NonNullable<ExecutionResult['nodeErrors']> = [];
	for (const [nodeName, nodeRuns] of Object.entries(runData)) {
		if (nodeErrors.length >= MAX_NODE_ERRORS) break;
		if (nodeContinuesOnError(nodesByName.get(nodeName))) continue;

		const failedRun = nodeRuns.find(isFailedNodeRun);
		if (!failedRun) continue;

		const message = failedRun.error
			? formatExecutionError(failedRun.error, includeUpstreamDetails)
			: failedRun.redactedError
				? `${failedRun.redactedError.type} error${
						failedRun.redactedError.httpCode ? ` (${failedRun.redactedError.httpCode})` : ''
					}`
				: undefined;
		nodeErrors.push({
			nodeName,
			...(message ? { message } : {}),
		});
	}

	return nodeErrors;
}

export async function extractExecutionResult(
	executionId: string,
	includeOutputData = true,
): Promise<ExecutionResult> {
	const execution = await Container.get(ExecutionPersistence).findSingleExecution(executionId, {
		includeData: true,
		unflattenData: true,
	});

	if (!execution) {
		return { executionId, status: 'unknown' };
	}

	const status =
		execution.status === 'error' || execution.status === 'crashed'
			? 'error'
			: execution.status === 'running' || execution.status === 'new'
				? 'running'
				: execution.status === 'waiting'
					? 'waiting'
					: 'success';

	// When N8N_AI_ALLOW_SENDING_PARAMETER_VALUES is disabled, only return
	// status + error — no full node output data flows to the LLM provider
	const resultData: Record<string, unknown> = {};
	// All nodes that ran — including zero-output ones, which `resultData`
	// omits. Verification uses this to tell "ran and returned nothing" apart
	// from "never reached". Node names only, so it is safe regardless of the
	// parameter-values privacy setting.
	const runData = execution.data?.resultData?.runData;
	const executedNodeNames = Object.keys(runData ?? {});
	if (includeOutputData) {
		if (runData) {
			for (const [nodeName, nodeRuns] of Object.entries(runData)) {
				const lastRun = nodeRuns[nodeRuns.length - 1];
				if (lastRun?.data?.main) {
					const outputItems = lastRun.data.main
						.flat()
						.filter((item): item is NonNullable<typeof item> => item !== null && item !== undefined)
						.map((item) => item.json);
					if (outputItems.length > 0) {
						resultData[nodeName] = truncateNodeOutput(outputItems);
					}
				}
			}
		}
	}

	// Extract error if present
	const error = execution.data?.resultData?.error;
	const errorMessage = error ? formatExecutionError(error, includeOutputData) : undefined;
	const nodeErrors = extractNodeErrors(runData, includeOutputData, execution.workflowData?.nodes);

	return {
		executionId,
		status,
		data:
			Object.keys(resultData).length > 0
				? wrapResultDataEntries(truncateResultData(resultData))
				: undefined,
		executedNodeNames: executedNodeNames.length > 0 ? executedNodeNames : undefined,
		nodeErrors: nodeErrors.length > 0 ? nodeErrors : undefined,
		lastNodeExecuted: execution.data?.resultData?.lastNodeExecuted,
		error: errorMessage,
		startedAt: execution.startedAt?.toISOString(),
		finishedAt: execution.stoppedAt?.toISOString(),
	};
}

/**
 * NodeApiError.messages can hold large API response bodies; cap formatted
 * errors so a single failure doesn't blow up the agent's context window.
 */
const MAX_ERROR_CHARS = 4_000;

/**
 * `.description` and `.messages[]` carry upstream API response content, so
 * they're gated behind the AI privacy setting. `.message` stays — it's
 * sanitized (STATUS_CODE_MESSAGES) and lets the LLM recognize the failure.
 *
 * Accesses fields structurally: persisted errors lose their prototype on
 * `unflattenData`, so `instanceof Error` is false in production.
 */
export function formatExecutionError(
	error: ExecutionError,
	includeUpstreamDetails: boolean,
): string {
	const parts: string[] = [];
	if (error.message) parts.push(error.message);

	if (includeUpstreamDetails) {
		if (error.description && error.description !== error.message) {
			parts.push(error.description);
		}
		if ('messages' in error && error.messages.length > 0) {
			parts.push(`Details: ${error.messages.join(' | ')}`);
		}
	} else {
		const hasDescription = !!error.description && error.description !== error.message;
		const hasMessages = 'messages' in error && error.messages.length > 0;
		if (hasDescription || hasMessages) {
			parts.push(
				'(upstream error details suppressed by the instance AI privacy setting; ask the user to share the node error from the UI)',
			);
		}
	}

	const combined = parts.join(' — ') || 'Unknown error';
	return combined.length > MAX_ERROR_CHARS ? `${combined.slice(0, MAX_ERROR_CHARS)}…` : combined;
}

/**
 * Smart truncation for per-node execution output.
 * Prevents context window dilution when a workflow returns thousands of records.
 * Keeps items until the serialized size exceeds MAX_NODE_OUTPUT_BYTES, then
 * replaces the rest with a truncation marker so the agent knows to request
 * specific data if needed.
 */
const MAX_NODE_OUTPUT_BYTES = 5_000;

export function truncateNodeOutput(items: unknown[]): unknown[] | unknown {
	const serialized = JSON.stringify(items);
	if (serialized.length <= MAX_NODE_OUTPUT_BYTES) return items;

	// Binary search for the number of items that fit within the limit
	const truncated: unknown[] = [];
	let size = 2; // account for "[]"
	for (const item of items) {
		const itemStr = JSON.stringify(item);
		// +1 for comma separator, +1 margin
		if (size + itemStr.length + 2 > MAX_NODE_OUTPUT_BYTES) break;
		truncated.push(item);
		size += itemStr.length + 1;
	}

	return {
		items: truncated,
		truncated: true,
		totalItems: items.length,
		shownItems: truncated.length,
		message: `Output truncated: showing ${truncated.length} of ${items.length} items. Use get-node-output to retrieve full data for this node.`,
	};
}

/** Maximum characters for a single item returned by get-node-output. */
const MAX_ITEM_CHARS = 50_000;

/**
 * Extract paginated raw output for a specific node from an execution.
 * Each item is capped at MAX_ITEM_CHARS to prevent a single giant JSON blob from flooding context.
 */
export async function extractNodeOutput(
	executionId: string,
	nodeName: string,
	options?: { startIndex?: number; maxItems?: number },
): Promise<NodeOutputResult> {
	const execution = await Container.get(ExecutionPersistence).findSingleExecution(executionId, {
		includeData: true,
		unflattenData: true,
	});

	if (!execution) {
		throw new Error(`Execution ${executionId} not found`);
	}

	const runData = execution.data?.resultData?.runData;
	if (!runData?.[nodeName]) {
		throw new Error(`Node "${nodeName}" not found in execution ${executionId}`);
	}

	const nodeRuns = runData[nodeName];
	const lastRun = nodeRuns[nodeRuns.length - 1];

	const startIndex = options?.startIndex ?? 0;
	const maxItems = Math.min(options?.maxItems ?? 10, 50);

	// Walk the nested output arrays without materializing all items into memory.
	// Only collect the slice we need — avoids OOM on nodes with huge result sets.
	let index = 0;
	let totalItems = 0;
	const collected: unknown[] = [];
	for (const output of lastRun?.data?.main ?? []) {
		for (const item of output ?? []) {
			totalItems++;
			if (index >= startIndex && collected.length < maxItems) {
				collected.push(item.json);
			}
			index++;
		}
	}

	// Per-item char cap
	const capped = collected.map((item) => {
		const str = JSON.stringify(item);
		if (str.length > MAX_ITEM_CHARS) {
			return {
				_truncatedItem: true,
				preview: str.slice(0, MAX_ITEM_CHARS),
				originalLength: str.length,
			};
		}
		return item;
	});

	return {
		nodeName,
		items: capped.map((item, i) =>
			wrapUntrustedData(
				JSON.stringify(item, null, 2),
				'execution-output',
				`node:${nodeName}[${startIndex + i}]`,
			),
		),
		totalItems,
		returned: { from: startIndex, to: startIndex + capped.length },
	};
}

/** Known trigger node types in priority order. */
const KNOWN_TRIGGER_TYPES = new Set([
	CHAT_TRIGGER_NODE_TYPE,
	FORM_TRIGGER_NODE_TYPE,
	WEBHOOK_NODE_TYPE,
	SCHEDULE_TRIGGER_NODE_TYPE,
]);

/** Find the trigger node: known types first, then fall back to naive string matching. */
function findTriggerNode(nodes: INode[]): INode | undefined {
	// Prefer known trigger types
	const known = nodes.find((n) => KNOWN_TRIGGER_TYPES.has(n.type));
	if (known) return known;

	// Fall back to any node with "Trigger" or "webhook" in its type
	return nodes.find(
		(n) => n.type.includes('Trigger') || n.type.includes('trigger') || n.type.includes('webhook'),
	);
}

/** Get the execution mode based on the trigger node type. */
function getExecutionModeForTrigger(node: INode): WorkflowExecuteMode {
	switch (node.type) {
		case WEBHOOK_NODE_TYPE:
			return 'webhook';
		case CHAT_TRIGGER_NODE_TYPE:
			return 'chat';
		case FORM_TRIGGER_NODE_TYPE:
		case SCHEDULE_TRIGGER_NODE_TYPE:
			return 'trigger';
		default:
			return 'manual';
	}
}

/** Extract structured debug info from a completed execution. */
export async function extractExecutionDebugInfo(
	executionId: string,
	includeOutputData = true,
	nodeTypes?: NodeTypes,
): Promise<ExecutionDebugInfo> {
	const execution = await Container.get(ExecutionPersistence).findSingleExecution(executionId, {
		includeData: true,
		unflattenData: true,
	});

	if (!execution) {
		return {
			executionId,
			status: 'unknown',
			nodeTrace: [],
		};
	}

	const baseResult = await extractExecutionResult(executionId, includeOutputData);

	const runData = execution.data?.resultData?.runData;
	const nodeTrace: ExecutionDebugInfo['nodeTrace'] = [];
	let failedNode: ExecutionDebugInfo['failedNode'];
	let failedItemIndex: number | undefined;
	let failedRunIndex: number | undefined;

	if (runData) {
		const workflowNodes = execution.workflowData?.nodes ?? [];
		const nodeTypeMap = new Map(workflowNodes.map((n) => [n.name, n.type]));

		for (const [nodeName, nodeRuns] of Object.entries(runData)) {
			const lastRun = nodeRuns[nodeRuns.length - 1];
			if (!lastRun) continue;

			const nodeType = nodeTypeMap.get(nodeName) ?? 'unknown';

			nodeTrace.push({
				name: nodeName,
				type: nodeType,
				status: isFailedNodeRun(lastRun) ? 'error' : 'success',
				startedAt:
					lastRun.startTime !== undefined ? new Date(lastRun.startTime).toISOString() : undefined,
				finishedAt:
					lastRun.startTime !== undefined && lastRun.executionTime !== undefined
						? new Date(lastRun.startTime + lastRun.executionTime).toISOString()
						: undefined,
			});

			// Capture the first failed node with its error and input data
			if (lastRun.error !== undefined && !failedNode) {
				const errorContext = (lastRun.error as { context?: Record<string, unknown> }).context;
				failedItemIndex =
					typeof errorContext?.itemIndex === 'number' ? errorContext.itemIndex : undefined;
				failedRunIndex =
					typeof errorContext?.runIndex === 'number' ? errorContext.runIndex : nodeRuns.length - 1;

				failedNode = {
					name: nodeName,
					type: nodeType,
					error: formatExecutionError(lastRun.error, includeOutputData),
					inputData: includeOutputData
						? (() => {
								const inputItems = lastRun.data?.main
									?.flat()
									.filter(
										(item): item is NonNullable<typeof item> => item !== null && item !== undefined,
									)
									.map((item) => item.json);
								if (inputItems && inputItems.length > 0) {
									const raw = inputItems[0] as Record<string, unknown>;
									return wrapUntrustedData(
										JSON.stringify(raw, null, 2),
										'execution-output',
										`failed-node-input:${nodeName}`,
									);
								}
								return undefined;
							})()
						: undefined,
				};
			}
		}
	}

	// Attach resolved-parameter view for the failed node so the agent sees both the
	// raw expression and what it resolved to (or which expression threw).
	if (failedNode && includeOutputData && nodeTypes) {
		try {
			const {
				nodeName: _omitName,
				suppressed: _omitSuppressed,
				...bundle
			} = await extractResolvedNodeParameters(nodeTypes, executionId, failedNode.name, {
				itemIndex: failedItemIndex,
				runIndex: failedRunIndex,
			});
			failedNode.resolvedParameters = bundle;
		} catch {
			// debug must always succeed — silently skip the resolved-params view.
		}
	}

	return {
		...baseResult,
		failedNode,
		nodeTrace,
	};
}

/**
 * Groups are authoritative on save: persist the emitted groups, or [] to clear when the
 * agent removed every `.group(...)`. `undefined` would leave the NOT-NULL column stale.
 */
function sdkNodeGroupsToRuntime(
	nodeGroups: WorkflowJSON['nodeGroups'],
): NonNullable<WorkflowJSON['nodeGroups']> {
	return nodeGroups ?? [];
}

function hasCredentialId(value: unknown): boolean {
	if (typeof value !== 'object' || value === null) return false;
	if (Reflect.get(value, 'id') === null && Reflect.get(value, '__aiGatewayManaged') === true) {
		return true;
	}
	const id = Reflect.get(value, 'id');
	return typeof id === 'string' && id.trim() !== '';
}

function sanitizeCredentialReferencesForSave(nodes: WorkflowJSON['nodes']): WorkflowJSON['nodes'] {
	return nodes.map((node) => {
		if (!node.credentials) return node;

		const credentials = Object.entries(node.credentials).reduce<
			NonNullable<typeof node.credentials>
		>((acc, [type, value]) => {
			if (hasCredentialId(value)) {
				acc[type] = value;
			}
			return acc;
		}, {});

		if (Object.keys(credentials).length === Object.keys(node.credentials).length) return node;

		const sanitized = { ...node };
		if (Object.keys(credentials).length > 0) {
			sanitized.credentials = credentials;
		} else {
			delete sanitized.credentials;
		}
		return sanitized;
	});
}

function toWorkflowJSON(
	workflow: WorkflowEntity,
	options?: {
		redactParameters?: boolean;
		/** Substitute a history version's graph; id/name/settings stay from the live entity, as history rows only carry a version label. */
		graph?: Pick<WorkflowEntity, 'nodes' | 'connections' | 'nodeGroups'>;
	},
): WorkflowJSON {
	const redact = options?.redactParameters ?? false;
	const source = options?.graph ?? workflow;
	return {
		id: workflow.id,
		name: workflow.name,
		nodes: (source.nodes ?? []).map((n) => ({
			id: n.id ?? '',
			name: n.name,
			type: n.type,
			typeVersion: n.typeVersion,
			position: n.position,
			parameters: redact ? {} : n.parameters,
			credentials: n.credentials as Record<string, { id?: string; name: string }> | undefined,
			webhookId: n.webhookId,
			disabled: n.disabled,
			notes: n.notes,
			notesInFlow: n.notesInFlow,
			executeOnce: n.executeOnce,
			retryOnFail: n.retryOnFail,
			alwaysOutputData: n.alwaysOutputData,
			onError: n.onError,
		})),
		connections: source.connections as WorkflowJSON['connections'],
		settings: workflow.settings as WorkflowJSON['settings'],
		...(source.nodeGroups ? { nodeGroups: source.nodeGroups } : {}),
	};
}

function toWorkflowDetail(
	workflow: WorkflowEntity,
	options?: { redactParameters?: boolean },
): WorkflowDetail {
	const redact = options?.redactParameters ?? false;
	return {
		id: workflow.id,
		name: workflow.name,
		versionId: workflow.versionId,
		activeVersionId: workflow.activeVersionId ?? null,
		isArchived: workflow.isArchived,
		createdAt: workflow.createdAt.toISOString(),
		updatedAt: workflow.updatedAt.toISOString(),
		nodes: (workflow.nodes ?? []).map(
			(n): WorkflowNode => ({
				name: n.name,
				type: n.type,
				typeVersion: n.typeVersion,
				parameters: redact ? undefined : n.parameters,
				position: n.position,
				webhookId: n.webhookId,
			}),
		),
		connections: workflow.connections as Record<string, unknown>,
		settings: workflow.settings as Record<string, unknown> | undefined,
	};
}
