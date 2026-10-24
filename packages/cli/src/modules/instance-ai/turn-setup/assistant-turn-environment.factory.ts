import { createScopedWorkspace } from '@n8n/agents';
import type { Workspace } from '@n8n/agents';
import { getPromptWorkspaceRoot, getWorkspaceRoot } from '@n8n/agents/sandbox';
import { applyBranchReadOnlyOverrides, buildProxyHeaders } from '@n8n/api-types';
import { Logger, ModuleRegistry } from '@n8n/backend-common';
import { InstanceWriteAccessService, UrlService } from '@n8n/backend-services';
import { GlobalConfig, type AiConfig, type InstanceAiConfig } from '@n8n/config';
import { type User } from '@n8n/db';
import { Container, Service } from '@n8n/di';
import {
	assertInstanceAiPromptVersion,
	CONCISE_PROMPT_VERSION,
	createLazyRuntimeWorkspace,
	resolvePromptProfile,
	describePromptProfile,
	createDomainAccessTracker,
	createSetupItemsEmitter,
	isSetupPanelEnabled,
	orchestratorAgentId,
	type InstanceAiContext,
	type ModelConfig,
	type OrchestrationContext,
	type ServiceProxyConfig,
	type WorkflowTaskService,
	WorkflowTaskCoordinator,
	WorkflowLoopStorage,
	ThreadTaskStorage,
} from '@n8n/instance-ai';
import { redactTelemetryProperties } from '@n8n/telemetry';
import { getErrorMessage } from '@n8n/utils/errors/get-error-message';
import { setSchemaBaseDirs } from '@n8n/workflow-sdk';
import { UnexpectedError } from 'n8n-workflow';
import { nanoid } from 'nanoid';
import { N8N_VERSION } from '@/constants';
import { ForbiddenError } from '@n8n/errors';
import { modelStreamStallOptions } from '@/utils/model-stream-stall-options';
import { AiUsageService } from '@/services/ai-usage.service';
import { AiService } from '@/services/ai.service';
import { ProxyTokenManager } from '@/services/proxy-token-manager';
import { Telemetry } from '@/telemetry';
import { resolveBrowserUseState } from '../browser/browser-use-availability';
import { InstanceAiBrowserSessionService } from '../browser/instance-ai-browser-session.service';
import { EvalThreadCredentialAllowlistService } from '../eval/thread-credential-allowlist.service';
import {
	InstanceAiConversationHistoryService,
	type ScopedConversationHistory,
} from '../instance-ai-conversation-history.service';
import { InstanceAiCreditService } from '../instance-ai-credit.service';
import { InstanceAiErrorReporterService } from '../instance-ai-error-reporter.service';
import { InstanceAiModelService } from '../instance-ai-model.service';
import { InstanceAiSettingsService } from '../instance-ai-settings.service';
import { InstanceAiSkillsService, type InstanceAiSkillScope } from '../instance-ai-skills.service';
import {
	InstanceAiAdapterService,
	type InstanceAiFeatureFlags,
} from '../instance-ai.adapter.service';
import { DbIterationLogStorage } from '../storage/db-iteration-log-storage';
import type { AssistantTurnMemory, AssistantTurnRuntime } from './assistant-turn-runtime';
import {
	assistantCreditsExhaustedError,
	isAssistantCreditBalanceExhausted,
} from './assistant-credits';

/**
 * Normalises `N8N_INSTANCE_AI_PROMPT_VERSION`. Blank and absent both mean "no
 * pin" and must become `undefined`: passing `''` on to `resolvePromptProfile`
 * would report a fallback from an empty version instead of a clean default
 * selection.
 *
 * An unknown version throws, so a typo fails the run loudly rather than
 * silently serving the default profile. Resolved at the point of use, not
 * cached at construction: a module `init()` that throws takes the whole n8n
 * process down with it, and an optional Instance AI pin must not cost the
 * instance its webhooks and executions.
 */
export function resolveOperatorPromptVersion(configured: string | undefined): string | undefined {
	const version = configured?.trim();
	if (!version) return undefined;
	assertInstanceAiPromptVersion(version);
	return version;
}

/** What the shared turn setup returns for one run. */
export interface AssistantTurnEnvironment {
	context: InstanceAiContext;
	memory: AssistantTurnMemory;
	taskStorage: ThreadTaskStorage;
	iterationLog: DbIterationLogStorage;
	workflowTasks: WorkflowTaskService;
	modelId: ModelConfig;
	memoryModelId: ModelConfig | undefined;
	orchestrationContext: OrchestrationContext;
	conversationHistory: ScopedConversationHistory | undefined;
	aiPreferencesEnabled: boolean;
	instanceContextEnabled: boolean;
	nodeUsageEnabled: boolean;
	skillScope: InstanceAiSkillScope;
}

export interface AssistantTurnEnvironmentParams {
	user: User;
	threadId: string;
	runId: string;
	abortSignal: AbortSignal;
	messageGroupId?: string;
	pushRef?: string;
	/** Reuse the proxy config of the run, so one token manager backs tracing and the run. */
	proxyRunConfig?: AssistantProxyRunConfig;
	/** Resumed segments use the gates bound to the original turn. */
	instanceContextGates?: InstanceContextGates;
	experimentGates?: InstanceAiFeatureFlags;
}

export type AssistantProxyRunConfig = Awaited<
	ReturnType<AssistantTurnEnvironmentFactory['createProxyRunConfig']>
>;

export type InstanceContextGates = {
	instanceContextEnabled: boolean;
	nodeUsageEnabled: boolean;
};

/**
 * Builds the execution environment of one Assistant turn: model and credits,
 * gates, prompt profile, tool context, grants, skills and the sandbox
 * workspace. The runtime that runs the turn supplies its own state through
 * `AssistantTurnRuntime`.
 */
@Service()
export class AssistantTurnEnvironmentFactory {
	private readonly logger: Logger;

	private readonly instanceAiConfig: InstanceAiConfig;

	private readonly aiConfig: AiConfig;

	private readonly oauth2CallbackUrl: string;

	private readonly defaultTimeZone: string;

	constructor(
		logger: Logger,
		globalConfig: GlobalConfig,
		urlService: UrlService,
		private readonly adapterService: InstanceAiAdapterService,
		private readonly settingsService: InstanceAiSettingsService,
		private readonly browserSessionService: InstanceAiBrowserSessionService,
		private readonly aiService: AiService,
		private readonly dbIterationLogStorage: DbIterationLogStorage,
		private readonly instanceWriteAccess: InstanceWriteAccessService,
		private readonly telemetry: Telemetry,
		private readonly evalCredentialAllowlists: EvalThreadCredentialAllowlistService,
		private readonly modelService: InstanceAiModelService,
		private readonly creditService: InstanceAiCreditService,
		private readonly instanceAiErrorReporter: InstanceAiErrorReporterService,
		private readonly conversationHistoryService: InstanceAiConversationHistoryService,
		private readonly aiUsageService: AiUsageService,
		private readonly skillsService: InstanceAiSkillsService,
	) {
		this.logger = logger.scoped('instance-ai');
		this.instanceAiConfig = globalConfig.instanceAi;
		this.aiConfig = globalConfig.ai;
		this.defaultTimeZone = globalConfig.generic.timezone;
		this.oauth2CallbackUrl = `${urlService.getInstanceBaseUrl()}/${globalConfig.endpoints.rest}/oauth2-credential/callback`;
	}

	async createProxyRunConfig(user: Pick<User, 'id'>): Promise<{
		searchProxyConfig?: ServiceProxyConfig;
		tracingProxyConfig?: ServiceProxyConfig;
		tokenManager?: ProxyTokenManager;
		proxyBaseUrl?: string;
	}> {
		if (!this.aiService.isProxyEnabled()) return {};

		const client = await this.aiService.getClient();
		const proxyBaseUrl = client.getApiProxyBaseUrl();
		const tokenManager = new ProxyTokenManager(async () => {
			return await client.getInstanceAiApiProxyToken({ id: user.id }, { userMessageId: nanoid() });
		});
		const featureHeaders = buildProxyHeaders({
			feature: 'instance-ai',
			n8nVersion: N8N_VERSION,
		});

		return {
			proxyBaseUrl,
			tokenManager,
			searchProxyConfig: {
				apiUrl: proxyBaseUrl + '/brave-search',
				getAuthHeaders: async () => ({
					...(await tokenManager.getAuthHeaders()),
					...featureHeaders,
				}),
			},
			tracingProxyConfig: {
				apiUrl: proxyBaseUrl + '/langsmith',
				getAuthHeaders: async () => ({
					...(await tokenManager.getAuthHeaders()),
					...featureHeaders,
				}),
			},
		};
	}

	async assertAssistantCreditsAvailable(user: User): Promise<void> {
		let credits: Awaited<ReturnType<InstanceAiModelService['getCredits']>>;
		try {
			credits = await this.modelService.getCredits(user);
		} catch (error) {
			this.logger.debug('Skipping pre-run credit check; balance read failed', {
				userId: user.id,
				error: getErrorMessage(error),
			});
			return;
		}
		if (!isAssistantCreditBalanceExhausted(credits)) return;
		throw assistantCreditsExhaustedError();
	}

	areMcpConnectionsAvailable(): boolean {
		return (
			Container.get(ModuleRegistry).isActive('mcp-registry') &&
			this.settingsService.isMcpAccessEnabled()
		);
	}

	async create(
		params: AssistantTurnEnvironmentParams,
		runtime: AssistantTurnRuntime,
	): Promise<AssistantTurnEnvironment> {
		const {
			user,
			threadId,
			runId,
			abortSignal,
			messageGroupId,
			pushRef,
			proxyRunConfig,
			instanceContextGates,
			experimentGates,
		} = params;
		const { memory } = runtime;
		const thread = await memory.getThread(threadId);
		if (thread && thread.resourceId !== runtime.resourceId) {
			throw new ForbiddenError('Not authorized for this thread');
		}

		const boundProjectId = await runtime.getProjectId();
		if (!boundProjectId) {
			throw new UnexpectedError(
				`Instance AI thread "${threadId}" has no bound project; it must be created via POST /instance-ai/threads before a run can start`,
			);
		}

		const adminSettings = await this.settingsService.getAdminSettings();
		const browserUseEnabledGlobally = adminSettings.browserUseEnabled;
		const mcpConnectionsAvailable = this.areMcpConnectionsAvailable();

		// Stop before this run resolves a model. A cached proxy token stays valid
		// after the balance hits zero, so a later token request would not 403.
		await this.assertAssistantCreditsAvailable(user);

		const { searchProxyConfig, tokenManager, proxyBaseUrl } =
			proxyRunConfig ?? (await this.createProxyRunConfig(user));

		const proxyContext = { runId, threadId };
		const modelId =
			proxyBaseUrl && tokenManager
				? await this.modelService.resolveProxyModel(user, proxyBaseUrl, tokenManager, proxyContext)
				: await this.modelService.resolveAgentModelConfig(user, proxyContext);
		const memoryModelId = await this.modelService.resolveMemoryModelConfig(user, modelId, {
			proxyBaseUrl,
			tokenManager,
			proxyContext,
		});

		const gates = experimentGates ?? (await this.adapterService.resolveExperimentGates(user));
		const {
			configEvalsEnabled,
			conversationHistoryEnabled,
			progressiveBuildingEnabled,
			conciseStyleEnabled,
			setupPanelEnabled,
			setupPanelVariant,
			folderExplorationEnabled,
			credentialDescriptionsEnabled,
			aiPreferencesEnabled,
			assistantSkillsEnabled,
		} = gates;
		runtime.turnState.setSetupPanelEnabled(setupPanelEnabled);
		// Resumed segments use the gates bound to the original turn.
		const { instanceContextEnabled, nodeUsageEnabled } = instanceContextGates ?? gates;
		// One scoped reader backs both the tool and the first-turn hint.
		const conversationHistory = conversationHistoryEnabled
			? this.conversationHistoryService.forContext(user.id, boundProjectId, threadId)
			: undefined;
		// Follow-ups and resumed runs retain the selected mode if flags change.
		const mode =
			runtime.turnState.getBuildMode() ?? (progressiveBuildingEnabled ? 'progressive' : 'default');
		// The operator pin sits below the request pin and the thread's own selection,
		// so evals and in-flight conversations keep the profile they started on.
		// The concise experiment applies only in default mode, so a progressive
		// thread or assignment keeps its own profile.
		const selectedPrompt = resolvePromptProfile({
			version:
				runtime.turnState.getPromptVersion() ??
				resolveOperatorPromptVersion(this.instanceAiConfig.promptVersion) ??
				(conciseStyleEnabled && mode === 'default' ? CONCISE_PROMPT_VERSION : undefined),
			mode,
		});
		const buildMode = selectedPrompt.profile.mode;
		runtime.turnState.setBuildMode(buildMode);
		// Read per run so a settings change applies to the next message.
		const allowSendingParameterValues = await this.aiUsageService.isParameterValueSharingAllowed();
		// The frontend writes the exit to thread metadata when the agent calls `leave-onboarding` or
		// starts a build, so a thread that left gets the tool no more.
		const onboardingThread =
			thread?.metadata?.source === 'onboarding' && !thread.metadata.onboardingLeft;
		const context = this.adapterService.createContext(user, {
			searchProxyConfig,
			pushRef,
			threadId,
			projectId: boundProjectId,
			getCredentialIdAllowlist: () => this.evalCredentialAllowlists.get(threadId),
			shouldBypassCredentialTest: (credentialId: string) =>
				this.evalCredentialAllowlists.shouldBypassTest(threadId, credentialId),
			getCredentialTestTarget: (credentialType: string) =>
				this.evalCredentialAllowlists.getTestTarget(threadId, credentialType),
			configEvalsEnabled,
			setupPanelVariant,
			mcpConnectionsAvailable,
			nodeUsageEnabled,
			instanceContextEnabled,
			conversationHistory,
			folderExplorationEnabled,
			onboardingThread,
			credentialDescriptionsEnabled,
			aiPreferencesEnabled,
			assistantSkillsEnabled,
			modelId,
			modelFetch: this.modelService.getModelFetch(),
			allowSendingParameterValues,
			temporaryWorkflowMarkers: runtime.temporaryWorkflowMarkers,
		});

		const browserMcpServer = browserUseEnabledGlobally
			? this.browserSessionService.findMcpServer(user.id)
			: undefined;
		if (browserMcpServer) {
			context.localMcpServer = browserMcpServer;
		}

		context.permissions = this.settingsService.getPermissions();
		if (this.instanceWriteAccess.isReadOnly()) {
			context.permissions = applyBranchReadOnlyOverrides(context.permissions);
			context.branchReadOnly = true;
		}

		context.runId = runId;

		// Setup panel v2: wire the durable `setup-items` sink only while the flag
		// is on — its presence is the package-side gate. Seeded with the thread's
		// persisted snapshots so a recomputed, unchanged list publishes nothing.
		if (setupPanelEnabled) {
			context.setupItemsEmitter = createSetupItemsEmitter({
				eventBus: runtime.eventBus,
				threadId,
				runId,
				agentId: orchestratorAgentId(runId),
				initialSnapshots: await runtime.readSetupItemsSnapshots().catch((error) => {
					this.logger.warn('Failed to read setup panel snapshots', {
						threadId,
						error: getErrorMessage(error),
					});
					return [];
				}),
				readPersistedSnapshot: async (workflowId) => {
					const snapshots = await runtime.readSetupItemsSnapshots();
					return snapshots.find((snapshot) => snapshot.workflowId === workflowId)?.items;
				},
			});
			context.markWorkflowSetupHandled = runtime.markWorkflowSetupHandled;
		}

		context.browserCredentialSetup = runtime.browserCredentialSetup;
		context.onArtifactChanged = runtime.onArtifactChanged;

		// Per-user, thread-level "always allow" grants are persisted in the DB so they survive
		// reload/navigation and are visible across mains. Load once per run; a tool resuming
		// from a `scope: 'session'` approval persists new grants via `grantSessionToolApproval`.
		// Keep the mutable set so a grant approved mid-run is honored by later calls in the same
		// run — the next run reloads it from the DB anyway.
		const sessionGrants = await runtime.sessionGrants.load();
		context.sessionApprovedToolKeys = sessionGrants;
		const grantSessionToolApproval = async (key: string) => {
			await runtime.sessionGrants.grant(key);
			sessionGrants.add(key);
		};
		context.grantSessionToolApproval = grantSessionToolApproval;
		context.revokeSessionToolApproval = async (key: string) => {
			await runtime.sessionGrants.revoke(key);
			sessionGrants.delete(key);
		};

		// Domain-access approvals are stored as grant keys in `instance_ai_thread_grants` (via
		// the same load/persist path as above), so they survive restart and are visible
		// cross-main. Recreate the tracker per run seeded from the freshly loaded grants;
		// transient (allow_once) approvals are run-scoped and don't carry across runs.
		const domainTracker = createDomainAccessTracker({
			grantedKeys: sessionGrants,
			persistGrant: grantSessionToolApproval,
		});
		runtime.onDomainAccessTracker(domainTracker);
		context.domainAccessTracker = domainTracker;
		if (runtime.recordWorkflowCodeSnapshot) {
			context.recordWorkflowCodeSnapshot = runtime.recordWorkflowCodeSnapshot;
		}

		browserMcpServer?.setDomainGate({
			tracker: domainTracker,
			runId,
			permissionMode: context.permissions?.fetchUrl,
			createCredentialPermissionMode: context.permissions?.createCredential,
		});

		// The client reports whether it renders the Browser Use + menu entry, because
		// only it can see the device. The admin switch is still applied here, so the
		// report can only narrow.
		context.browserUseState = resolveBrowserUseState({
			reportedByClient: runtime.turnState.getBrowserUseAvailable() ?? false,
			browserUseEnabledGlobally,
			browserConnected: browserMcpServer !== undefined,
		});

		const taskStorage = new ThreadTaskStorage(memory);
		const iterationLog = this.dbIterationLogStorage;
		const workflowLoopStorage = new WorkflowLoopStorage(memory);
		const workflowTaskCoordinator = new WorkflowTaskCoordinator(threadId, workflowLoopStorage);
		const workflowTasks = runtime.syncWorkflowTasks
			? this.createWorkflowTaskServiceWithUiSync(workflowTaskCoordinator, runtime.syncWorkflowTasks)
			: workflowTaskCoordinator;

		const nodeDefDirs = this.adapterService.getNodeDefinitionDirs();
		if (nodeDefDirs.length > 0) {
			setSchemaBaseDirs(nodeDefDirs);
		}

		const skillScope: InstanceAiSkillScope = {
			profile: selectedPrompt.profile,
			flags: { configEvalsEnabled, instanceContextEnabled },
			// The agent-building skills need the build-agent tool, which needs a builder delegate.
			agentBuildingEnabled: context.builderDelegate !== undefined,
		};
		const skills = await this.skillsService.loadSkills(skillScope, {
			user,
			projectId: boundProjectId,
		});
		const promptMetadata = describePromptProfile(selectedPrompt, skills.source);
		runtime.turnState.setPromptConfiguration(promptMetadata);
		let runtimeWorkspace: Workspace | undefined;
		let workspaceRoot: string | undefined;

		const sandboxStatus = this.settingsService.getSandboxStatus();
		if (sandboxStatus.workflowBuilderAvailable) {
			const sandboxConfig = await this.instanceAiErrorReporter.withBoundary(
				'instance-ai-sandbox-setup',
				{ threadId, runId, userId: user.id, messageGroupId },
				async () => await runtime.sandbox.resolveConfig(),
			);

			if (sandboxConfig.enabled) {
				workspaceRoot = getPromptWorkspaceRoot(sandboxConfig.provider);

				const scopeWorkspaceForAgent = async (
					workspace: Workspace | undefined,
				): Promise<Workspace | undefined> => {
					if (!workspace) return undefined;
					const root = await getWorkspaceRoot(workspace);
					return createScopedWorkspace(workspace, root);
				};

				runtimeWorkspace = createLazyRuntimeWorkspace({
					// Empty + stable across resumes: sandbox/filesystem guidance lives in
					// the system prompt's `## Sandbox workspace` section. Passing '' here
					// (instead of omitting) keeps the lazy workspace from falling back to
					// resolution-dependent live `getInstructions()` text, which would
					// shift the cached prompt prefix across rebuilds/resumes.
					sandboxInstructions: '',
					filesystemInstructions: '',
					ensureWorkspace: async () =>
						await scopeWorkspaceForAgent(await runtime.sandbox.getOrCreateWorkspace(context)),
				});
			}
		}

		context.workspace = runtimeWorkspace;
		context.workspaceRoot = workspaceRoot;
		context.threadId = threadId;
		context.threadMemory = memory;
		// Tool-emitted telemetry is an open-ended property bag (search queries,
		// remediation reasons, node error strings) — scrub at the boundary so a
		// new call site can't leak by omission.
		context.trackTelemetry = (eventName, properties) => {
			this.telemetry.track(eventName, redactTelemetryProperties(properties));
		};
		const orchestrationContext: OrchestrationContext = {
			threadId,
			runId,
			messageGroupId,
			userId: user.id,
			projectId: boundProjectId,
			promptConfiguration: promptMetadata,
			disabledToolNames: new Set(skills.disabledTools),
			setupPanelEnabled: isSetupPanelEnabled(context),
			orchestratorAgentId: orchestratorAgentId(runId),
			modelId,
			modelFetch: this.modelService.getModelFetch(),
			modelStreamStallOptions: modelStreamStallOptions(this.aiConfig),
			eventBus: runtime.eventBus,
			logger: this.logger,
			trackTelemetry: (eventName, properties) => {
				this.telemetry.track(eventName, redactTelemetryProperties(properties));
			},
			// Aggregate on the instance-AI thread (not the `ia-builder:` session
			// thread) so the credit service's per-thread display total and FE push
			// attribute builder tokens to the conversation the user sees. The tool
			// awaits this before returning/cascading a terminal segment outcome, so
			// a billing failure must never propagate — best-effort by contract.
			claimSubAgentUsage: async (dedupeId, usage, status) => {
				try {
					await this.creditService.claimRunUsage(user, threadId, dedupeId, usage, status);
				} catch (error) {
					// claimRunUsage() handles ordinary claim failures (network, retries)
					// internally and only throws for exceptional contract violations
					// (e.g. a negative quota) — those must still reach centralized
					// Instance AI error reporting even though billing stays best-effort.
					this.instanceAiErrorReporter.report(error, {
						component: 'instance-ai-agent-builder-usage',
						threadId,
						runId,
						userId: user.id,
						...(boundProjectId ? { projectId: boundProjectId } : {}),
						...(messageGroupId ? { messageGroupId } : {}),
					});
					this.logger.warn('Failed to claim agent-builder usage', {
						threadId,
						runId,
						dedupeId,
						error: getErrorMessage(error),
					});
				}
			},
			abortSignal,
			taskStorage,
			timeZone: this.defaultTimeZone,
			localMcpServer: context.localMcpServer,
			skills: skills.source,
			skillAvailabilityNotice: skills.availabilityNotice,
			mapSkillEventForDisplay: skills.mapSkillEventForDisplay,
			oauth2CallbackUrl: this.oauth2CallbackUrl,
			cancelBackgroundTask: runtime.cancelBackgroundTask,
			touchRun: runtime.touchRun,
			touchBackgroundTask: runtime.touchBackgroundTask,
			iterationLog,
			sendCorrectionToTask: runtime.sendCorrectionToTask,
			workflowTaskService: workflowTasks,
			workspace: runtimeWorkspace,
			workspaceRoot,
			nodeDefinitionDirs: nodeDefDirs.length > 0 ? nodeDefDirs : undefined,
			domainContext: context,
		};

		return {
			context,
			memory,
			taskStorage,
			iterationLog,
			workflowTasks,
			modelId,
			memoryModelId,
			orchestrationContext,
			conversationHistory,
			aiPreferencesEnabled,
			// Reuse the gate results so a rollout change cannot split this turn.
			instanceContextEnabled,
			nodeUsageEnabled,
			skillScope,
		};
	}

	private createWorkflowTaskServiceWithUiSync(
		workflowTasks: WorkflowTaskCoordinator,
		sync: () => Promise<void>,
	): WorkflowTaskService {
		return {
			reportBuildOutcome: async (outcome) => {
				const action = await workflowTasks.reportBuildOutcome(outcome);
				await sync();
				return action;
			},
			reportVerificationVerdict: async (verdict) => {
				const action = await workflowTasks.reportVerificationVerdict(verdict);
				await sync();
				return action;
			},
			updateBuildOutcome: async (workItemId, update) => {
				await workflowTasks.updateBuildOutcome(workItemId, update);
				await sync();
			},
			beginVerification: async (outcome, state, verificationRunId) => {
				const resumed = await workflowTasks.beginVerification(outcome, state, verificationRunId);
				if (resumed) await sync();
				return resumed;
			},
			getBuildOutcome: async (workItemId) => await workflowTasks.getBuildOutcome(workItemId),
			startVerification: async (workItemId, triggerNodeName) => {
				const previousProgress = await workflowTasks.startVerification(workItemId, triggerNodeName);
				await sync();
				return previousProgress;
			},
			recordVerification: async (workItemId, verification, previousProgress) => {
				const claim = await workflowTasks.recordVerification(
					workItemId,
					verification,
					previousProgress,
				);
				await sync();
				return claim;
			},
			getLatestBuildOutcomeForWorkflow: async (workflowId) =>
				await workflowTasks.getLatestBuildOutcomeForWorkflow(workflowId),
			getWorkflowLoopState: async (workItemId) =>
				await workflowTasks.getWorkflowLoopState(workItemId),
		};
	}
}
