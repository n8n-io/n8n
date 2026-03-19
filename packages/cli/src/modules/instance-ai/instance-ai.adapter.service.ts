import { randomUUID } from 'node:crypto';
import type {
	InstanceAiContext,
	InstanceAiWorkflowService,
	InstanceAiExecutionService,
	InstanceAiCredentialService,
	InstanceAiNodeService,
	InstanceAiDataTableService,
	InstanceAiWebResearchService,
	InstanceAiFilesystemService,
	FetchedPage,
	WebSearchResponse,
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
} from '@n8n/instance-ai';
import type { WorkflowJSON } from '@n8n/workflow-sdk';
import { GlobalConfig } from '@n8n/config';
import { Time } from '@n8n/constants';
import type { User, WorkflowEntity } from '@n8n/db';

import { InstanceAiSettingsService } from './instance-ai-settings.service';
import {
	resolveNodeTypeDefinition,
	resolveBuiltinNodeDefinitionDirs,
	listNodeDiscriminators,
} from './node-definition-resolver';
import {
	fetchAndExtract,
	maybeSummarize,
	braveSearch,
	searxngSearch,
	LRUCache,
} from './web-research';
import {
	ExecutionRepository,
	ProjectRepository,
	SharedWorkflowRepository,
	WorkflowRepository,
} from '@n8n/db';
import { Service } from '@n8n/di';
import type { Scope } from '@n8n/permissions';
// eslint-disable-next-line n8n-local-rules/misplaced-n8n-typeorm-import
import { LessThan } from '@n8n/typeorm';
import {
	type ICredentialsDecrypted,
	type IDataObject,
	type INode,
	type INodeParameters,
	type IConnections,
	type IWorkflowSettings,
	type IPinData,
	type IWorkflowExecutionDataProcess,
	type DataTableFilter,
	type DataTableRow,
	type DataTableRows,
	type WorkflowExecuteMode,
	createRunExecutionData,
	CHAT_TRIGGER_NODE_TYPE,
	FORM_TRIGGER_NODE_TYPE,
	WEBHOOK_NODE_TYPE,
	SCHEDULE_TRIGGER_NODE_TYPE,
	TimeoutExecutionCancelledError,
} from 'n8n-workflow';

import { ActiveExecutions } from '@/active-executions';
import { CredentialsFinderService } from '@/credentials/credentials-finder.service';
import { CredentialsService } from '@/credentials/credentials.service';
import { License } from '@/license';
import { LoadNodesAndCredentials } from '@/load-nodes-and-credentials';
import { DataTableRepository } from '@/modules/data-table/data-table.repository';
import { DataTableService } from '@/modules/data-table/data-table.service';
import { SourceControlPreferencesService } from '@/modules/source-control.ee/source-control-preferences.service.ee';
import { userHasScopes } from '@/permissions.ee/check-access';
import { DynamicNodeParametersService } from '@/services/dynamic-node-parameters.service';
import { FolderService } from '@/services/folder.service';
import { ProjectService } from '@/services/project.service.ee';
import { TagService } from '@/services/tag.service';
import { WorkflowSharingService } from '@/workflows/workflow-sharing.service';
import { WorkflowFinderService } from '@/workflows/workflow-finder.service';
import { WorkflowHistoryService } from '@/workflows/workflow-history/workflow-history.service';
import { WorkflowService } from '@/workflows/workflow.service';
import { WorkflowRunner } from '@/workflow-runner';
import { getBase } from '@/workflow-execute-additional-data';

@Service()
export class InstanceAiAdapterService {
	private readonly allowSendingParameterValues: boolean;

	constructor(
		globalConfig: GlobalConfig,
		private readonly workflowService: WorkflowService,
		private readonly workflowFinderService: WorkflowFinderService,
		private readonly workflowSharingService: WorkflowSharingService,
		private readonly workflowRepository: WorkflowRepository,
		private readonly sharedWorkflowRepository: SharedWorkflowRepository,
		private readonly projectRepository: ProjectRepository,
		private readonly executionRepository: ExecutionRepository,
		private readonly credentialsService: CredentialsService,
		private readonly credentialsFinderService: CredentialsFinderService,
		private readonly activeExecutions: ActiveExecutions,
		private readonly workflowRunner: WorkflowRunner,
		private readonly loadNodesAndCredentials: LoadNodesAndCredentials,
		private readonly dataTableService: DataTableService,
		private readonly dataTableRepository: DataTableRepository,
		private readonly dynamicNodeParametersService: DynamicNodeParametersService,
		private readonly folderService: FolderService,
		private readonly projectService: ProjectService,
		private readonly tagService: TagService,
		private readonly sourceControlPreferencesService: SourceControlPreferencesService,
		private readonly settingsService: InstanceAiSettingsService,
		private readonly workflowHistoryService: WorkflowHistoryService,
		private readonly license: License,
	) {
		this.allowSendingParameterValues = globalConfig.ai.allowSendingParameterValues;
	}

	createContext(user: User, filesystemService?: InstanceAiFilesystemService): InstanceAiContext {
		return {
			userId: user.id,
			workflowService: this.createWorkflowAdapter(user),
			executionService: this.createExecutionAdapter(user),
			credentialService: this.createCredentialAdapter(user),
			nodeService: this.createNodeAdapter(user),
			dataTableService: this.createDataTableAdapter(user),
			webResearchService: this.createWebResearchAdapter(user),
			workspaceService: this.createWorkspaceAdapter(user),
			licenseHints: this.buildLicenseHints(),
			...(filesystemService ? { filesystemService } : {}),
		};
	}

	private buildLicenseHints(): string[] {
		const hints: string[] = [];
		if (!this.license.isLicensed('feat:namedVersions')) {
			hints.push(
				'**Named workflow versions** — naming and describing workflow versions (update-workflow-version) is available on the Pro plan and above.',
			);
		}
		return hints;
	}

	private createProjectScopeHelpers(user: User) {
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
			const projectId = providedProjectId ?? (await getPersonalProjectId());
			await assertProjectScope(scopes, projectId);
			return projectId;
		};

		return { getPersonalProjectId, assertProjectScope, resolveProjectId };
	}

	private createWorkflowAdapter(user: User): InstanceAiWorkflowService {
		const {
			workflowService,
			workflowFinderService,
			workflowRepository,
			sharedWorkflowRepository,
			workflowHistoryService,
		} = this;
		const { resolveProjectId } = this.createProjectScopeHelpers(user);

		return {
			async list(options) {
				const { workflows } = await workflowService.getMany(user, {
					take: options?.limit ?? 50,
					filter: {
						isArchived: false,
						...(options?.query ? { query: options.query } : {}),
					},
				});

				return workflows
					.filter((wf): wf is WorkflowEntity => 'versionId' in wf)
					.map(
						(wf): WorkflowSummary => ({
							id: wf.id,
							name: wf.name,
							versionId: wf.versionId,
							activeVersionId: wf.activeVersionId ?? null,
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

				return toWorkflowDetail(workflow);
			},

			async archive(workflowId: string) {
				await workflowService.archive(user, workflowId, { skipArchived: true });
			},

			async delete(workflowId: string) {
				await workflowService.delete(user, workflowId);
			},

			async publish(workflowId: string, options?: { versionId?: string }) {
				const wf = await workflowService.activateWorkflow(user, workflowId, {
					versionId: options?.versionId,
				});
				if (!wf.activeVersionId) {
					throw new Error(`Workflow ${workflowId} was not activated — no active version set`);
				}
				return { activeVersionId: wf.activeVersionId };
			},

			async unpublish(workflowId: string) {
				await workflowService.deactivateWorkflow(user, workflowId);
			},

			async getAsWorkflowJSON(workflowId: string) {
				const wf = await workflowFinderService.findWorkflowForUser(workflowId, user, [
					'workflow:read',
				]);
				if (!wf) throw new Error(`Workflow ${workflowId} not found or not accessible`);
				return toWorkflowJSON(wf);
			},

			async createFromWorkflowJSON(json: WorkflowJSON, options?: { projectId?: string }) {
				const projectId = await resolveProjectId(['workflow:create'], options?.projectId);

				// Create the workflow shell WITHOUT nodes — so that the subsequent
				// update() detects a real change and creates a WorkflowHistory entry.
				// Without a history entry, activateWorkflow() fails with "Version not found"
				// because it looks up workflow.versionId in WorkflowHistory.
				const newWorkflow = workflowRepository.create({
					name: json.name,
					nodes: [] as INode[],
					connections: {} as IConnections,
					settings: (json.settings ?? {}) as IWorkflowSettings,
					active: false,
					versionId: randomUUID(),
				} as Partial<WorkflowEntity>);

				const saved = await workflowRepository.save(newWorkflow);

				await sharedWorkflowRepository.save(
					sharedWorkflowRepository.create({
						role: 'workflow:owner',
						projectId,
						workflow: saved,
					}),
				);

				// Now update with actual nodes — this creates the WorkflowHistory entry
				// needed for activation and publishing.
				const updateData = workflowRepository.create({
					name: json.name,
					nodes: json.nodes as unknown as INode[],
					connections: json.connections as unknown as IConnections,
					settings: (json.settings ?? {}) as IWorkflowSettings,
					pinData: sdkPinDataToRuntime(json.pinData),
				} as Partial<WorkflowEntity>);
				const updated = await workflowService.update(user, updateData, saved.id);

				return toWorkflowDetail(updated);
			},

			async updateFromWorkflowJSON(
				workflowId: string,
				json: WorkflowJSON,
				_options?: { projectId?: string },
			) {
				const updateData = workflowRepository.create({
					name: json.name,
					nodes: json.nodes as unknown as INode[],
					connections: json.connections as unknown as IConnections,
					settings: (json.settings ?? {}) as IWorkflowSettings,
					pinData: sdkPinDataToRuntime(json.pinData),
				} as Partial<WorkflowEntity>);

				const updated = await workflowService.update(user, updateData, workflowId);
				return toWorkflowDetail(updated);
			},

			async patchNode(workflowId, nodeName, patch) {
				const workflow = await workflowFinderService.findWorkflowForUser(workflowId, user, [
					'workflow:update',
				]);

				if (!workflow) {
					throw new Error(`Workflow ${workflowId} not found or not accessible`);
				}

				const nodes = workflow.nodes ?? [];
				const node = nodes.find((n) => n.name === nodeName);

				if (!node) {
					throw new Error(`Node "${nodeName}" not found in workflow ${workflowId}`);
				}

				// Shallow-merge parameters
				if (patch.parameters) {
					node.parameters = {
						...node.parameters,
						...(patch.parameters as INodeParameters),
					};
				}

				// Override credentials
				if (patch.credentials) {
					node.credentials = { ...node.credentials, ...patch.credentials };
				}

				// Override disabled
				if (patch.disabled !== undefined) {
					node.disabled = patch.disabled;
				}

				const updateData = workflowRepository.create({
					nodes,
				} as Partial<WorkflowEntity>);

				const updated = await workflowService.update(user, updateData, workflowId);
				return toWorkflowDetail(updated);
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
							parameters: n.parameters as Record<string, unknown>,
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
				} as Partial<WorkflowEntity>);

				await workflowService.update(user, updateData, workflowId);
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

	private createExecutionAdapter(user: User): InstanceAiExecutionService {
		const {
			workflowFinderService,
			workflowSharingService,
			workflowRunner,
			activeExecutions,
			executionRepository,
			allowSendingParameterValues,
		} = this;

		const DEFAULT_TIMEOUT_MS = 5 * Time.minutes.toMilliseconds;
		const MAX_TIMEOUT_MS = 10 * Time.minutes.toMilliseconds;

		/**
		 * Verify that the user has access to the workflow that owns this execution.
		 * Returns the execution or throws "not found" if unauthorized/missing.
		 */
		const assertExecutionAccess = async (executionId: string) => {
			const execution = await executionRepository.findSingleExecution(executionId, {
				includeData: false,
			});
			if (!execution) {
				throw new Error(`Execution ${executionId} not found`);
			}
			const workflow = await workflowFinderService.findWorkflowForUser(execution.workflowId, user, [
				'workflow:read',
			]);
			if (!workflow) {
				throw new Error(`Execution ${executionId} not found`);
			}
			return execution;
		};

		return {
			async list(options) {
				const accessibleWorkflowIds = await workflowSharingService.getSharedWorkflowIds(user, {
					scopes: ['workflow:read'],
				});

				if (accessibleWorkflowIds.length === 0) return [];

				const query = {
					kind: 'range' as const,
					range: { limit: options?.limit ?? 20, lastId: undefined, firstId: undefined },
					order: { startedAt: 'DESC' as const },
					accessibleWorkflowIds,
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
				const workflow = await workflowFinderService.findWorkflowForUser(workflowId, user, [
					'workflow:execute',
				]);

				if (!workflow) {
					throw new Error(`Workflow ${workflowId} not found or not accessible`);
				}

				const nodes = workflow.nodes ?? [];

				// Find trigger node using known trigger type constants first,
				// then fall back to naive string matching for unknown trigger types
				const triggerNode = findTriggerNode(nodes);

				const runData: IWorkflowExecutionDataProcess = {
					executionMode: triggerNode
						? getExecutionModeForTrigger(triggerNode)
						: ('manual' as WorkflowExecuteMode),
					workflowData: workflow,
					userId: user.id,
				};

				// Merge workflow-level pinData (from mocked credentials) with trigger input pinData.
				// Workflow pinData is set during build when credentials are mocked via pinned data.
				const workflowPinData = workflow.pinData ?? {};

				if (inputData && triggerNode) {
					const triggerPinData = getPinDataForTrigger(triggerNode, inputData);
					// Merge: trigger pinData takes precedence for the trigger node,
					// workflow pinData provides mock data for credential-mocked nodes.
					const mergedPinData = { ...workflowPinData, ...triggerPinData };

					runData.startNodes = [{ name: triggerNode.name, sourceData: null }];
					runData.pinData = mergedPinData;
					runData.executionData = createRunExecutionData({
						startData: {},
						resultData: { pinData: mergedPinData, runData: {} },
						executionData: {
							contextData: {},
							metadata: {},
							nodeExecutionStack: [
								{
									node: triggerNode,
									data: { main: [triggerPinData[triggerNode.name]] },
									source: null,
								},
							],
							waitingExecution: {},
							waitingExecutionSource: {},
						},
					});
				} else if (Object.keys(workflowPinData).length > 0) {
					// No trigger input but workflow has mock pinData — include it in the run
					runData.pinData = workflowPinData;
				}

				const executionId = await workflowRunner.run(runData);

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
							return {
								executionId,
								status: 'error',
								error: `Execution timed out after ${timeoutMs}ms and was cancelled`,
							} satisfies ExecutionResult;
						}
						throw error;
					}
				}

				return await extractExecutionResult(
					executionRepository,
					executionId,
					allowSendingParameterValues,
				);
			},

			async getStatus(executionId: string) {
				await assertExecutionAccess(executionId);
				const isRunning = activeExecutions.has(executionId);
				if (isRunning) {
					return { executionId, status: 'running' } satisfies ExecutionResult;
				}
				return await extractExecutionResult(
					executionRepository,
					executionId,
					allowSendingParameterValues,
				);
			},

			async getResult(executionId: string) {
				await assertExecutionAccess(executionId);
				// If still running, wait for it to complete
				if (activeExecutions.has(executionId)) {
					await activeExecutions.getPostExecutePromise(executionId);
				}
				return await extractExecutionResult(
					executionRepository,
					executionId,
					allowSendingParameterValues,
				);
			},

			async stop(executionId: string) {
				await assertExecutionAccess(executionId);
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
				return await extractExecutionDebugInfo(
					executionRepository,
					executionId,
					allowSendingParameterValues,
				);
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

				return await extractNodeOutput(executionRepository, executionId, nodeName, options);
			},
		};
	}

	private createCredentialAdapter(user: User): InstanceAiCredentialService {
		const { credentialsService, credentialsFinderService, loadNodesAndCredentials } = this;

		return {
			async list(options) {
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
						createdAt: c.createdAt.toISOString(),
						updatedAt: c.updatedAt.toISOString(),
					}),
				);
			},

			async get(credentialId: string) {
				const credential = await credentialsService.getOne(user, credentialId, false);
				return {
					id: credential.id,
					name: credential.name,
					type: credential.type,
					createdAt: credential.createdAt.toISOString(),
					updatedAt: credential.updatedAt.toISOString(),
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
					data: credentialsService.decrypt(credential, true),
				};

				const result = await credentialsService.test(user.id, credentialsToTest);
				return {
					success: result.status === 'OK',
					message: result.message,
				};
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
		};
	}

	private createDataTableAdapter(user: User): InstanceAiDataTableService {
		const { dataTableService, dataTableRepository, sourceControlPreferencesService } = this;

		const assertInstanceNotReadOnly = () => {
			if (sourceControlPreferencesService.getPreferences().branchReadOnly) {
				throw new Error(
					'Cannot modify data tables on a protected instance. This instance is in read-only mode.',
				);
			}
		};

		const { resolveProjectId } = this.createProjectScopeHelpers(user);

		// Check scope for a data table and return its projectId for downstream service calls
		const resolveProjectIdForTable = async (scopes: Scope[], dataTableId: string) => {
			const allowed = await userHasScopes(user, scopes, false, { dataTableId });
			if (!allowed) {
				throw new Error(`Data table "${dataTableId}" not found`);
			}
			const table = await dataTableRepository.findOneByOrFail({ id: dataTableId });
			return table.projectId;
		};

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

			async create(name, columns, options) {
				assertInstanceNotReadOnly();
				const projectId = await resolveProjectId(['dataTable:create'], options?.projectId);
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

			async delete(dataTableId) {
				assertInstanceNotReadOnly();
				const projectId = await resolveProjectIdForTable(['dataTable:delete'], dataTableId);
				await dataTableService.deleteDataTable(dataTableId, projectId);
			},

			async getSchema(dataTableId) {
				const projectId = await resolveProjectIdForTable(['dataTable:read'], dataTableId);
				const columns = await dataTableService.getColumns(dataTableId, projectId);
				return columns.map(
					(c, index): DataTableColumnInfo => ({
						id: c.id,
						name: c.name,
						type: c.type,
						index,
					}),
				);
			},

			async addColumn(dataTableId, column) {
				assertInstanceNotReadOnly();
				const projectId = await resolveProjectIdForTable(['dataTable:update'], dataTableId);
				const result = await dataTableService.addColumn(dataTableId, projectId, column);
				return {
					id: result.id,
					name: result.name,
					type: result.type,
					index: result.index,
				};
			},

			async deleteColumn(dataTableId, columnId) {
				assertInstanceNotReadOnly();
				const projectId = await resolveProjectIdForTable(['dataTable:update'], dataTableId);
				await dataTableService.deleteColumn(dataTableId, projectId, columnId);
			},

			async renameColumn(dataTableId, columnId, newName) {
				assertInstanceNotReadOnly();
				const projectId = await resolveProjectIdForTable(['dataTable:update'], dataTableId);
				await dataTableService.renameColumn(dataTableId, projectId, columnId, {
					name: newName,
				});
			},

			async queryRows(dataTableId, options) {
				const projectId = await resolveProjectIdForTable(['dataTable:readRow'], dataTableId);
				return await dataTableService.getManyRowsAndCount(dataTableId, projectId, {
					take: options?.limit ?? 50,
					skip: options?.offset ?? 0,
					filter: options?.filter as DataTableFilter | undefined,
				});
			},

			async insertRows(dataTableId, rows) {
				assertInstanceNotReadOnly();
				const projectId = await resolveProjectIdForTable(['dataTable:writeRow'], dataTableId);
				const result = await dataTableService.insertRows(
					dataTableId,
					projectId,
					rows as DataTableRows,
					'count',
				);
				return { insertedCount: typeof result === 'number' ? result : rows.length };
			},

			async updateRows(dataTableId, filter, data) {
				assertInstanceNotReadOnly();
				const projectId = await resolveProjectIdForTable(['dataTable:writeRow'], dataTableId);
				const result = await dataTableService.updateRows(
					dataTableId,
					projectId,
					{ filter: filter as DataTableFilter, data: data as DataTableRow },
					true,
				);
				return { updatedCount: Array.isArray(result) ? result.length : 0 };
			},

			async deleteRows(dataTableId, filter) {
				assertInstanceNotReadOnly();
				const projectId = await resolveProjectIdForTable(['dataTable:writeRow'], dataTableId);
				const result = await dataTableService.deleteRows(
					dataTableId,
					projectId,
					{ filter: filter as DataTableFilter },
					true,
				);
				return { deletedCount: Array.isArray(result) ? result.length : 0 };
			},
		};
	}

	/** Shared cache for web research results. */
	private readonly webResearchCache = new LRUCache<FetchedPage>({
		maxEntries: 100,
		ttlMs: 15 * 60 * 1000,
	});

	/** Shared cache for web search results. */
	private readonly searchCache = new LRUCache<WebSearchResponse>({
		maxEntries: 100,
		ttlMs: 15 * 60 * 1000,
	});

	private createWebResearchAdapter(user: User): InstanceAiWebResearchService {
		const fetchCache = this.webResearchCache;
		const searchCacheRef = this.searchCache;
		const settingsService = this.settingsService;

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
				// Check cache first
				const cached = fetchCache.get(url);
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

				// Fetch and extract — pass authorizeUrl for redirect-hop gating
				const page = await fetchAndExtract(url, {
					maxContentLength: options?.maxContentLength,
					maxResponseBytes: options?.maxResponseBytes,
					timeoutMs: options?.timeoutMs,
					authorizeUrl: options?.authorizeUrl,
				});

				// Attempt summarization (truncation fallback — no model injection yet)
				const result = await maybeSummarize(page);

				// Cache the result
				fetchCache.set(url, result);

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
	) {
		type SearchOptions = {
			maxResults?: number;
			includeDomains?: string[];
			excludeDomains?: string[];
		};

		if (apiKey) {
			return async (query: string, options?: SearchOptions) => {
				const cacheKey = JSON.stringify([query, options ?? {}]);
				const cached = cache.get(cacheKey);
				if (cached) return cached;

				const result = await braveSearch(apiKey, query, options ?? {});
				cache.set(cacheKey, result);
				return result;
			};
		}

		if (searxngUrl) {
			return async (query: string, options?: SearchOptions) => {
				const cacheKey = JSON.stringify([query, options ?? {}]);
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
		if (!this._nodeDefinitionDirs) {
			this._nodeDefinitionDirs = resolveBuiltinNodeDefinitionDirs();
		}
		return this._nodeDefinitionDirs;
	}

	private createNodeAdapter(user: User): InstanceAiNodeService {
		const { loadNodesAndCredentials, dynamicNodeParametersService, projectRepository } = this;

		// Cache the promise (not the result) to prevent concurrent collectTypes() calls.
		// Multiple parallel tool calls would otherwise race on the null check, fire
		// duplicate collectTypes() calls, and one empty resolution poisons the cache.
		let nodesPromise: Promise<
			Awaited<ReturnType<typeof loadNodesAndCredentials.collectTypes>>['nodes']
		> | null = null;
		const getNodes = async () => {
			if (!nodesPromise) {
				nodesPromise = loadNodesAndCredentials.collectTypes().then((result) => result.nodes);
			}
			return await nodesPromise;
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
						if (n.builderHint.message) {
							result.builderHint.message = n.builderHint.message;
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
					}
					return result;
				});
			},

			async getDescription(nodeType: string) {
				const nodes = await getNodes();
				const desc = nodes.find((n) => n.name === nodeType);

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
					})),
					inputs: Array.isArray(desc.inputs) ? desc.inputs.map(String) : [],
					outputs: Array.isArray(desc.outputs) ? desc.outputs.map(String) : [],
				} satisfies NodeDescription;
			},

			getNodeTypeDefinition: async (nodeType, options) => {
				const result = resolveNodeTypeDefinition(nodeType, this.getNodeDefinitionDirs(), options);

				if (result.error) {
					return { content: '', error: result.error };
				}

				return { content: result.content, version: result.version };
			},

			listDiscriminators: async (nodeType) => {
				return listNodeDiscriminators(nodeType, this.getNodeDefinitionDirs());
			},

			exploreResources: async (params: ExploreResourcesParams): Promise<ExploreResourcesResult> => {
				const nodeTypeAndVersion = {
					name: params.nodeType,
					version: params.version,
				};

				const currentNodeParameters = (params.currentNodeParameters ?? {}) as INodeParameters;
				const credentials = {
					[params.credentialType]: { id: params.credentialId, name: '' },
				};

				// Auto-detect the authentication parameter value from the credential type.
				// Many nodes (e.g. Google Sheets) use an `authentication` parameter to switch
				// between serviceAccount/oAuth2, and `getNodeParameter('authentication', 0)`
				// falls back to the wrong default when it's not set.
				if (!currentNodeParameters.authentication) {
					const nodes = await getNodes();
					const nodeDesc = nodes.find((n) => n.name === params.nodeType);
					if (nodeDesc) {
						const authProp = nodeDesc.properties.find((p) => p.name === 'authentication');
						if (authProp?.options) {
							// Find the option whose credentialTypes includes our credential type
							for (const opt of authProp.options) {
								if (typeof opt === 'object' && 'value' in opt && typeof opt.value === 'string') {
									const credTypes = nodeDesc.credentials
										?.filter((c) => {
											const show = c.displayOptions?.show?.authentication;
											return Array.isArray(show) && show.includes(opt.value);
										})
										.map((c) => c.name);
									if (credTypes?.includes(params.credentialType)) {
										currentNodeParameters.authentication = opt.value;
										break;
									}
								}
							}
						}
					}
				}

				const personalProject = await projectRepository.getPersonalProjectForUserOrFail(user.id);

				const additionalData = await getBase({
					userId: user.id,
					projectId: personalProject.id,
					currentNodeParameters,
				});
				try {
					if (params.methodType === 'listSearch') {
						const result = await dynamicNodeParametersService.getResourceLocatorResults(
							params.methodName,
							'',
							additionalData,
							nodeTypeAndVersion,
							currentNodeParameters,
							credentials,
							params.filter,
							params.paginationToken,
						);
						return {
							results: (result.results ?? []).map((r) => ({
								name: String(r.name),
								value: r.value,
								url: r.url,
							})),
							paginationToken: result.paginationToken,
						};
					}

					const options = await dynamicNodeParametersService.getOptionsViaMethodName(
						params.methodName,
						'',
						additionalData,
						nodeTypeAndVersion,
						currentNodeParameters,
						credentials,
					);
					return {
						results: options.map((o) => ({
							name: String(o.name),
							value: o.value,
							description: o.description,
						})),
					};
				} catch (error) {
					console.error(
						'[explore-resources] ERROR:',
						error instanceof Error ? error.message : error,
					);
					console.error('[explore-resources] stack:', error instanceof Error ? error.stack : 'N/A');
					throw error;
				}
			},
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
		} = this;

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

			async listFolders(projectId: string): Promise<FolderSummary[]> {
				const [folders] = await folderService.getManyAndCount(projectId, { take: 100 });
				return (folders as Array<{ id: string; name: string; parentFolderId: string | null }>).map(
					(f) => ({
						id: f.id,
						name: f.name,
						parentFolderId: f.parentFolderId,
					}),
				);
			},

			async createFolder(
				name: string,
				projectId: string,
				parentFolderId?: string,
			): Promise<FolderSummary> {
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
				await folderService.deleteFolder(user, folderId, projectId, {
					transferToFolderId: transferToFolderId ?? undefined,
				});
			},

			async moveWorkflowToFolder(workflowId: string, folderId: string): Promise<void> {
				const workflow = await workflowFinderService.findWorkflowForUser(workflowId, user, [
					'workflow:update',
				]);
				if (!workflow) {
					throw new Error(`Workflow ${workflowId} not found or not accessible`);
				}
				await workflowService.update(user, workflow, workflowId, {
					parentFolderId: folderId,
				});
			},

			async tagWorkflow(workflowId: string, tagNames: string[]): Promise<string[]> {
				const workflow = await workflowFinderService.findWorkflowForUser(workflowId, user, [
					'workflow:update',
				]);
				if (!workflow) {
					throw new Error(`Workflow ${workflowId} not found or not accessible`);
				}

				// Resolve tag names to IDs, creating missing tags
				const existingTags = await tagService.getAll();
				const tagMap = new Map(existingTags.map((t) => [t.name.toLowerCase(), t]));
				const tagIds: string[] = [];

				for (const tagName of tagNames) {
					const existing = tagMap.get(tagName.toLowerCase());
					if (existing) {
						tagIds.push(existing.id);
					} else {
						const entity = tagService.toEntity({ name: tagName });
						const saved = await tagService.save(entity, 'create');
						tagIds.push(saved.id);
					}
				}

				await workflowService.update(user, workflow, workflowId, { tagIds });
				return tagNames;
			},

			async listTags(): Promise<Array<{ id: string; name: string }>> {
				const tags = await tagService.getAll();
				return tags.map((t) => ({ id: t.id, name: t.name }));
			},

			async createTag(name: string): Promise<{ id: string; name: string }> {
				const entity = tagService.toEntity({ name });
				const saved = await tagService.save(entity, 'create');
				return { id: saved.id, name: saved.name };
			},

			async cleanupTestExecutions(
				workflowId: string,
				options?: { olderThanHours?: number },
			): Promise<{ deletedCount: number }> {
				// Access-check the workflow first
				const workflow = await workflowFinderService.findWorkflowForUser(workflowId, user, [
					'workflow:read',
				]);
				if (!workflow) {
					throw new Error(`Workflow ${workflowId} not found or not accessible`);
				}

				const olderThanHours = options?.olderThanHours ?? 1;
				const cutoff = new Date(Date.now() - olderThanHours * 60 * 60 * 1000);

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
				await executionRepository.deleteByIds(ids);
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

export async function extractExecutionResult(
	executionRepository: ExecutionRepository,
	executionId: string,
	includeOutputData = true,
): Promise<ExecutionResult> {
	const execution = await executionRepository.findSingleExecution(executionId, {
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
	if (includeOutputData) {
		const runData = execution.data?.resultData?.runData;
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
	const errorMessage = execution.data?.resultData?.error?.message;

	return {
		executionId,
		status,
		data: Object.keys(resultData).length > 0 ? truncateResultData(resultData) : undefined,
		error: errorMessage,
		startedAt: execution.startedAt?.toISOString(),
		finishedAt: execution.stoppedAt?.toISOString(),
	};
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
	executionRepository: ExecutionRepository,
	executionId: string,
	nodeName: string,
	options?: { startIndex?: number; maxItems?: number },
): Promise<NodeOutputResult> {
	const execution = await executionRepository.findSingleExecution(executionId, {
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
		items: capped,
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

/** Construct proper pin data per trigger type. */
function getPinDataForTrigger(node: INode, inputData: Record<string, unknown>): IPinData {
	switch (node.type) {
		case CHAT_TRIGGER_NODE_TYPE:
			return {
				[node.name]: [
					{
						json: {
							sessionId: `instance-ai-${Date.now()}`,
							action: 'sendMessage',
							chatInput:
								typeof inputData.chatInput === 'string'
									? inputData.chatInput
									: JSON.stringify(inputData),
						},
					},
				],
			};

		case FORM_TRIGGER_NODE_TYPE:
			return {
				[node.name]: [
					{
						json: {
							submittedAt: new Date().toISOString(),
							formMode: 'instanceAi',
							...inputData,
						},
					},
				],
			};

		case WEBHOOK_NODE_TYPE:
			return {
				[node.name]: [
					{
						json: {
							headers: {},
							query: {},
							body: inputData,
						},
					},
				],
			};

		case SCHEDULE_TRIGGER_NODE_TYPE: {
			const now = new Date();
			return {
				[node.name]: [
					{
						json: {
							timestamp: now.toISOString(),
							'Readable date': now.toLocaleString(),
							'Day of week': now.toLocaleDateString('en-US', { weekday: 'long' }),
							Year: String(now.getFullYear()),
							Month: now.toLocaleDateString('en-US', { month: 'long' }),
							'Day of month': String(now.getDate()).padStart(2, '0'),
							Hour: String(now.getHours()).padStart(2, '0'),
							Minute: String(now.getMinutes()).padStart(2, '0'),
							Second: String(now.getSeconds()).padStart(2, '0'),
						},
					},
				],
			};
		}

		default:
			// Generic fallback for unknown trigger types
			return {
				[node.name]: [{ json: inputData as never }],
			};
	}
}

/** Extract structured debug info from a completed execution. */
export async function extractExecutionDebugInfo(
	executionRepository: ExecutionRepository,
	executionId: string,
	includeOutputData = true,
): Promise<ExecutionDebugInfo> {
	const execution = await executionRepository.findSingleExecution(executionId, {
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

	const baseResult = await extractExecutionResult(
		executionRepository,
		executionId,
		includeOutputData,
	);

	const runData = execution.data?.resultData?.runData;
	const nodeTrace: ExecutionDebugInfo['nodeTrace'] = [];
	let failedNode: ExecutionDebugInfo['failedNode'];

	if (runData) {
		const workflowNodes = execution.workflowData?.nodes ?? [];
		const nodeTypeMap = new Map(workflowNodes.map((n) => [n.name, n.type]));

		for (const [nodeName, nodeRuns] of Object.entries(runData)) {
			const lastRun = nodeRuns[nodeRuns.length - 1];
			if (!lastRun) continue;

			const hasError = lastRun.error !== undefined;
			const nodeType = nodeTypeMap.get(nodeName) ?? 'unknown';

			nodeTrace.push({
				name: nodeName,
				type: nodeType,
				status: hasError ? 'error' : 'success',
				startedAt:
					lastRun.startTime !== undefined ? new Date(lastRun.startTime).toISOString() : undefined,
				finishedAt:
					lastRun.startTime !== undefined && lastRun.executionTime !== undefined
						? new Date(lastRun.startTime + lastRun.executionTime).toISOString()
						: undefined,
			});

			// Capture the first failed node with its error and input data
			if (hasError && !failedNode) {
				failedNode = {
					name: nodeName,
					type: nodeType,
					error:
						lastRun.error instanceof Error
							? lastRun.error.message
							: String(lastRun.error ?? 'Unknown error'),
					inputData: includeOutputData
						? (() => {
								const inputItems = lastRun.data?.main
									?.flat()
									.filter(
										(item): item is NonNullable<typeof item> => item !== null && item !== undefined,
									)
									.map((item) => item.json);
								return inputItems && inputItems.length > 0
									? (inputItems[0] as Record<string, unknown>)
									: undefined;
							})()
						: undefined,
				};
			}
		}
	}

	return {
		...baseResult,
		failedNode,
		nodeTrace,
	};
}

/**
 * Convert SDK pinData (Record<string, IDataObject[]>) to runtime format (IPinData).
 * SDK stores plain objects; runtime wraps each item in { json: item }.
 */
function sdkPinDataToRuntime(pinData: Record<string, unknown[]> | undefined): IPinData | undefined {
	if (!pinData || Object.keys(pinData).length === 0) return undefined;
	const result: IPinData = {};
	for (const [nodeName, items] of Object.entries(pinData)) {
		result[nodeName] = items.map((item) => ({ json: (item ?? {}) as IDataObject }));
	}
	return result;
}

function toWorkflowJSON(workflow: WorkflowEntity): WorkflowJSON {
	return {
		id: workflow.id,
		name: workflow.name,
		nodes: (workflow.nodes ?? []).map((n) => ({
			id: n.id ?? '',
			name: n.name,
			type: n.type,
			typeVersion: n.typeVersion,
			position: n.position,
			parameters: n.parameters,
			credentials: n.credentials as Record<string, { id?: string; name: string }> | undefined,
			webhookId: n.webhookId,
			disabled: n.disabled,
			notes: n.notes,
		})),
		connections: workflow.connections as WorkflowJSON['connections'],
		settings: workflow.settings as WorkflowJSON['settings'],
	};
}

function toWorkflowDetail(workflow: WorkflowEntity): WorkflowDetail {
	return {
		id: workflow.id,
		name: workflow.name,
		versionId: workflow.versionId,
		activeVersionId: workflow.activeVersionId ?? null,
		createdAt: workflow.createdAt.toISOString(),
		updatedAt: workflow.updatedAt.toISOString(),
		nodes: (workflow.nodes ?? []).map(
			(n): WorkflowNode => ({
				name: n.name,
				type: n.type,
				parameters: n.parameters,
				position: n.position,
			}),
		),
		connections: workflow.connections as Record<string, unknown>,
		settings: workflow.settings as Record<string, unknown> | undefined,
	};
}
