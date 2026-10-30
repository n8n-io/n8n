/* eslint-disable @typescript-eslint/no-require-imports */
import './source-map-filter';

import type * as AiaModelDefaultsMod from './agent/aia-model-defaults';
import type * as ApplyAgentThinkingMod from './agent/apply-agent-thinking';
import type * as InstanceAgentMod from './agent/instance-agent';
import type * as SelfHealingAgentMod from './agent/self-healing-agent';
import type * as SelfHealingMod from './self-healing';
import type * as WorkspaceFilesMod from './workspace/workspace-files';
import type * as SystemPromptMod from './agent/system-prompt';
import type * as DomainAccessMod from './domain-access';
import type * as McpClientManagerMod from './mcp/mcp-client-manager';
import type * as TitleUtilsMod from './memory/title-utils';
import type * as StructuredFileParserMod from './parsers/structured-file-parser';
import type * as ValidateAttachmentsMod from './parsers/validate-attachments';
import type * as PromptProfilesMod from './prompts/prompt-profiles';
import type * as BackgroundTaskManagerMod from './runtime/background-task-manager';
import type * as InstanceContextStateMod from './runtime/instance-context-state';
import type * as LivenessPolicyMod from './runtime/liveness-policy';
import type * as ResumableStreamExecutorMod from './runtime/resumable-stream-executor';
import type * as RunStateRegistryMod from './runtime/run-state-registry';
import type * as StreamRunnerMod from './runtime/stream-runner';
import type * as TerminalResponseGuardMod from './runtime/terminal-response-guard';
import type * as SkillsMod from './skills/skills';
import type * as StorageMod from './storage';
import type * as InstanceContextReachMod from './stream/instance-context-reach';
import type * as MapChunkMod from './stream/map-chunk';
import type * as UsageAccumulatorMod from './stream/usage-accumulator';
import type * as WorkSummaryAccumulatorMod from './stream/work-summary-accumulator';
import type * as AgentBuildMetricsMod from './tools/orchestration/agent-build-metrics';
import type * as AgentPersistenceMod from './tools/orchestration/agent-persistence';
import type * as AgentContextToolMod from './tools/agent-context.tool';
import type * as VerificationAnalysisMod from './tools/orchestration/verification/analyze-result';
import type * as PrepareVerificationRunMod from './tools/orchestration/verification/prepare-run';
import type * as ResolvedParameterWarningsMod from './tools/orchestration/verification/resolved-parameter-warnings';
import type * as WorkflowVerificationMod from './tools/orchestration/verification/run-workflow-verification';
import type * as ToolSimulationPreflightMod from './tools/orchestration/verification/tool-simulation-preflight';
import type * as VerificationSimulationMod from './tools/workflows/plan-verification-simulation';
import type * as PrepareWorkflowForSaveMod from './tools/workflows/prepare-workflow-for-save';
import type * as ResolveCredentialsMod from './tools/workflows/resolve-credentials';
import type * as SetupWorkflowMod from './tools/workflows/setup-workflow.service';
import type * as WorkflowSourceCompilerMod from './tools/workflows/workflow-source-compiler';
import type * as WorkflowSourceGeneratorMod from './tools/workflows/workflow-source-generator';
import type * as WorkflowNodeDiffMod from './tools/workflows/workflow-node-diff';
import type * as ChatModelValidationMod from './tools/workflows/chat-model-validation';
import type * as WorkflowValidationWarningsMod from './tools/workflows/workflow-validation-warnings';
import type * as SanitizeWebContentMod from './tools/web-research/sanitize-web-content';
import type * as AgentSnapshotEventMod from './tracing/agent-snapshot-event';
import type * as BuilderMetricEventMod from './tracing/builder-metric-event';
import type * as LangsmithTracingMod from './tracing/langsmith-tracing';
import type * as TraceReplayMod from './tracing/trace-replay';
import type * as AgentTreeMod from './utils/agent-tree';
import type * as EvalAgentsMod from './utils/eval-agents';
import type * as EvalUsageMod from './utils/eval-usage';
import type * as StreamHelpersMod from './utils/stream-helpers';
import type * as WorkflowLoopMod from './workflow-loop';
import type * as WorkflowLoopRuntimeMod from './workflow-loop/runtime';
import type * as BuilderTemplatesServiceMod from './workspace/builder-templates-service';
import type * as CreateWorkspaceMod from './workspace/create-workspace';
import type * as LazyRuntimeWorkspaceMod from './workspace/lazy-runtime-workspace';
import type * as SandboxSetupMod from './workspace/sandbox-setup';
import type * as SnapshotManagerMod from './workspace/snapshot-manager';

type LazyFunction = (...args: never[]) => unknown;
type LazyConstructor = abstract new (...args: never[]) => unknown;

const lazyModule = <TModule>(loader: () => TModule): (() => TModule) => {
	let cached: TModule | undefined;
	return () => (cached ??= loader());
};

const lazyFunction = <TFunction extends LazyFunction>(load: () => TFunction): TFunction =>
	((...args: Parameters<TFunction>): ReturnType<TFunction> => {
		const fn = load() as (...fnArgs: Parameters<TFunction>) => ReturnType<TFunction>;
		return fn(...args);
	}) as TFunction;

const lazyClass = <TConstructor extends LazyConstructor>(load: () => TConstructor): TConstructor =>
	class LazyClass {
		constructor(...args: ConstructorParameters<TConstructor>) {
			const Real = load() as unknown as new (
				...ctorArgs: ConstructorParameters<TConstructor>
			) => LazyClass;
			return new Real(...args);
		}

		static [Symbol.hasInstance](instance: unknown): boolean {
			if (instance === null || (typeof instance !== 'object' && typeof instance !== 'function')) {
				return false;
			}

			const Real = load() as unknown as { prototype: object };
			return Object.prototype.isPrototypeOf.call(Real.prototype, instance);
		}
	} as unknown as TConstructor;

const defineLazyExport = <TValue>(name: string, load: () => TValue): void => {
	Object.defineProperty(module.exports, name, {
		enumerable: true,
		configurable: true,
		get: load,
	});
};

const loadLangsmithTracing = lazyModule(
	() => require('./tracing/langsmith-tracing') as typeof LangsmithTracingMod,
);
const loadTraceReplay = lazyModule(
	() => require('./tracing/trace-replay') as typeof TraceReplayMod,
);
const loadAgentSnapshotEvent = lazyModule(
	() => require('./tracing/agent-snapshot-event') as typeof AgentSnapshotEventMod,
);
const loadBuilderMetricEvent = lazyModule(
	() => require('./tracing/builder-metric-event') as typeof BuilderMetricEventMod,
);
const loadAgentBuildMetrics = lazyModule(
	() => require('./tools/orchestration/agent-build-metrics') as typeof AgentBuildMetricsMod,
);
const loadInstanceAgent = lazyModule(
	() => require('./agent/instance-agent') as typeof InstanceAgentMod,
);
const loadSelfHealingAgent = lazyModule<typeof SelfHealingAgentMod>(() =>
	require('./agent/self-healing-agent'),
);
const loadSelfHealing = lazyModule<typeof SelfHealingMod>(() => require('./self-healing'));
const loadWorkspaceFiles = lazyModule<typeof WorkspaceFilesMod>(() =>
	require('./workspace/workspace-files'),
);
const loadAiaModelDefaults = lazyModule(
	() => require('./agent/aia-model-defaults') as typeof AiaModelDefaultsMod,
);
const loadApplyAgentThinking = lazyModule(
	() => require('./agent/apply-agent-thinking') as typeof ApplyAgentThinkingMod,
);
const loadDomainAccess = lazyModule(() => require('./domain-access') as typeof DomainAccessMod);
const loadSystemPrompt = lazyModule(
	() => require('./agent/system-prompt') as typeof SystemPromptMod,
);
const loadSanitizeWebContent = lazyModule(
	() => require('./tools/web-research/sanitize-web-content') as typeof SanitizeWebContentMod,
);
const loadAgentPersistence = lazyModule(
	() => require('./tools/orchestration/agent-persistence') as typeof AgentPersistenceMod,
);
const loadAgentContextTool = lazyModule(
	() => require('./tools/agent-context.tool') as typeof AgentContextToolMod,
);
const loadVerificationAnalysis = lazyModule<typeof VerificationAnalysisMod>(() =>
	require('./tools/orchestration/verification/analyze-result'),
);
const loadPrepareVerificationRun = lazyModule<typeof PrepareVerificationRunMod>(() =>
	require('./tools/orchestration/verification/prepare-run'),
);
const loadResolvedParameterWarnings = lazyModule<typeof ResolvedParameterWarningsMod>(() =>
	require('./tools/orchestration/verification/resolved-parameter-warnings'),
);
const loadWorkflowVerification = lazyModule<typeof WorkflowVerificationMod>(() =>
	require('./tools/orchestration/verification/run-workflow-verification'),
);
const loadToolSimulationPreflight = lazyModule<typeof ToolSimulationPreflightMod>(() =>
	require('./tools/orchestration/verification/tool-simulation-preflight'),
);
const loadVerificationSimulation = lazyModule<typeof VerificationSimulationMod>(() =>
	require('./tools/workflows/plan-verification-simulation'),
);
const loadPrepareWorkflowForSave = lazyModule<typeof PrepareWorkflowForSaveMod>(() =>
	require('./tools/workflows/prepare-workflow-for-save'),
);
const loadResolveCredentials = lazyModule<typeof ResolveCredentialsMod>(() =>
	require('./tools/workflows/resolve-credentials'),
);
const loadSetupWorkflow = lazyModule<typeof SetupWorkflowMod>(() =>
	require('./tools/workflows/setup-workflow.service'),
);
const loadWorkflowSourceCompiler = lazyModule<typeof WorkflowSourceCompilerMod>(() =>
	require('./tools/workflows/workflow-source-compiler'),
);
const loadWorkflowSourceGenerator = lazyModule<typeof WorkflowSourceGeneratorMod>(() =>
	require('./tools/workflows/workflow-source-generator'),
);
const loadWorkflowNodeDiff = lazyModule<typeof WorkflowNodeDiffMod>(() =>
	require('./tools/workflows/workflow-node-diff'),
);
const loadChatModelValidation = lazyModule<typeof ChatModelValidationMod>(() =>
	require('./tools/workflows/chat-model-validation'),
);
const loadWorkflowValidationWarnings = lazyModule<typeof WorkflowValidationWarningsMod>(() =>
	require('./tools/workflows/workflow-validation-warnings'),
);
const loadTitleUtils = lazyModule(() => require('./memory/title-utils') as typeof TitleUtilsMod);
const loadMcpClientManager = lazyModule(
	() => require('./mcp/mcp-client-manager') as typeof McpClientManagerMod,
);
const loadStreamHelpers = lazyModule(
	() => require('./utils/stream-helpers') as typeof StreamHelpersMod,
);
const loadStorage = lazyModule(() => require('./storage') as typeof StorageMod);
const loadMapChunk = lazyModule(() => require('./stream/map-chunk') as typeof MapChunkMod);
const loadUsageAccumulator = lazyModule(
	() => require('./stream/usage-accumulator') as typeof UsageAccumulatorMod,
);
const loadWorkSummaryAccumulator = lazyModule<typeof WorkSummaryAccumulatorMod>(() =>
	require('./stream/work-summary-accumulator'),
);
const loadInstanceContextReach = lazyModule<typeof InstanceContextReachMod>(() =>
	require('./stream/instance-context-reach'),
);
const loadInstanceContextState = lazyModule<typeof InstanceContextStateMod>(() =>
	require('./runtime/instance-context-state'),
);
const loadSkills = lazyModule(() => require('./skills/skills') as typeof SkillsMod);
const loadPromptProfiles = lazyModule(
	() => require('./prompts/prompt-profiles') as typeof PromptProfilesMod,
);
const loadEvalAgents = lazyModule(() => require('./utils/eval-agents') as typeof EvalAgentsMod);
const loadEvalUsage = lazyModule(() => require('./utils/eval-usage') as typeof EvalUsageMod);
const loadAgentTree = lazyModule(() => require('./utils/agent-tree') as typeof AgentTreeMod);
const loadBuilderTemplatesService = lazyModule(
	() => require('./workspace/builder-templates-service') as typeof BuilderTemplatesServiceMod,
);
const loadCreateWorkspace = lazyModule(
	() => require('./workspace/create-workspace') as typeof CreateWorkspaceMod,
);
const loadLazyRuntimeWorkspace = lazyModule(
	() => require('./workspace/lazy-runtime-workspace') as typeof LazyRuntimeWorkspaceMod,
);
const loadSandboxSetup = lazyModule(
	() => require('./workspace/sandbox-setup') as typeof SandboxSetupMod,
);
const loadSnapshotManager = lazyModule(
	() => require('./workspace/snapshot-manager') as typeof SnapshotManagerMod,
);
const loadRunStateRegistry = lazyModule(
	() => require('./runtime/run-state-registry') as typeof RunStateRegistryMod,
);
const loadBackgroundTaskManager = lazyModule(
	() => require('./runtime/background-task-manager') as typeof BackgroundTaskManagerMod,
);
const loadTerminalResponseGuard = lazyModule(
	() => require('./runtime/terminal-response-guard') as typeof TerminalResponseGuardMod,
);
const loadResumableStreamExecutor = lazyModule(
	() => require('./runtime/resumable-stream-executor') as typeof ResumableStreamExecutorMod,
);
const loadStreamRunner = lazyModule(
	() => require('./runtime/stream-runner') as typeof StreamRunnerMod,
);
const loadLivenessPolicy = lazyModule(
	() => require('./runtime/liveness-policy') as typeof LivenessPolicyMod,
);
const loadWorkflowLoop = lazyModule(() => require('./workflow-loop') as typeof WorkflowLoopMod);
const loadWorkflowLoopRuntime = lazyModule(
	() => require('./workflow-loop/runtime') as typeof WorkflowLoopRuntimeMod,
);
const loadStructuredFileParser = lazyModule(
	() => require('./parsers/structured-file-parser') as typeof StructuredFileParserMod,
);
const loadValidateAttachments = lazyModule(
	() => require('./parsers/validate-attachments') as typeof ValidateAttachmentsMod,
);

export { MAX_STEPS } from './constants/max-steps';
export { RESOURCE_EXPLORATION_UNAVAILABLE } from './constants/resource-exploration';
export { parseModelHeadersJson } from './utils/parse-model-headers';
export { modelConfigId } from './utils/model-config-id';
export { isEndpointModelConfig } from './utils/modal-session';
export { resolveCustomModelExperimentDefaultsFromEnv } from './utils/custom-model-defaults';
export {
	WorkflowSaveConflictError,
	WorkflowNotFoundError,
	WorkflowEditorLockedError,
	FolderResolutionError,
	OutsideThreadProjectError,
	formatRedactedError,
} from './errors';
export { deriveCredentialHosts } from './tools/workflows/credential-url-resolver';
export { instanceAiBuilderThreadPrefix } from './tools/orchestration/builder-thread-id';
export type { CredentialHostMeta } from './tools/workflows/credential-url-resolver';
export {
	agentBuilderTargetMetadata,
	clearedAgentBuilderTargetMetadata,
	seedAgentBuilderTargetMetadata,
	rereadAgentBuilderTarget,
	saveAgentBuilderTarget,
	threadAuthorizesAgentAdoption,
	withBoundAgentTarget,
} from './tools/orchestration/agent-target-binding';
export type { AgentBuilderTarget } from './tools/orchestration/agent-target-binding';
export { parseAppTargets, parsePendingAppTarget } from './tools/apps/app-target-binding';
export {
	resolveAgentPreviewSession,
	saveAgentPreviewSession,
} from './tools/orchestration/agent-test-session-binding';

export const wrapUntrustedData: typeof SanitizeWebContentMod.wrapUntrustedData = lazyFunction(
	() => loadSanitizeWebContent().wrapUntrustedData,
);
export type { Logger } from './logger';
export const createDomainAccessTracker: typeof DomainAccessMod.createDomainAccessTracker =
	lazyFunction(() => loadDomainAccess().createDomainAccessTracker);
export type { DomainAccessTracker } from './domain-access';
export type {
	BrowserExtensionTraceContext,
	SubmitLangsmithUserFeedbackOptions,
} from './tracing/langsmith-tracing';

export const emitAgentSnapshotTraceEvent: typeof AgentSnapshotEventMod.emitAgentSnapshotTraceEvent =
	lazyFunction(() => loadAgentSnapshotEvent().emitAgentSnapshotTraceEvent);
export type {
	AgentSnapshotArtifact,
	AgentSnapshotReason,
} from './tracing/agent-snapshot-event';

export const emitBuilderMetric: typeof BuilderMetricEventMod.emitBuilderMetric = lazyFunction(
	() => loadBuilderMetricEvent().emitBuilderMetric,
);

export const carryAgentBuildRunState: typeof AgentBuildMetricsMod.carryAgentBuildRunState =
	lazyFunction(() => loadAgentBuildMetrics().carryAgentBuildRunState);

// Plain re-export, not a lazyFunction: this is a pure mapping with no imports,
// so it costs nothing to load eagerly.
export { threadProvenanceMetadata } from './tracing/thread-provenance';

export const createInstanceAiTraceContext: typeof LangsmithTracingMod.createInstanceAiTraceContext =
	lazyFunction(() => loadLangsmithTracing().createInstanceAiTraceContext);

export const createInternalOperationTraceContext: typeof LangsmithTracingMod.createInternalOperationTraceContext =
	lazyFunction(() => loadLangsmithTracing().createInternalOperationTraceContext);

export { traceSandboxOperation } from './tracing/sandbox-tracing';

export const withSandboxLifecycleTrace: typeof LangsmithTracingMod.withSandboxLifecycleTrace =
	lazyFunction(() => loadLangsmithTracing().withSandboxLifecycleTrace);

export const createTraceReplayOnlyContext: typeof LangsmithTracingMod.createTraceReplayOnlyContext =
	lazyFunction(() => loadLangsmithTracing().createTraceReplayOnlyContext);

export const setTracePromptVersion: typeof LangsmithTracingMod.setTracePromptVersion = lazyFunction(
	() => loadLangsmithTracing().setTracePromptVersion,
);

export const setTraceModelId: typeof LangsmithTracingMod.setTraceModelId = lazyFunction(
	() => loadLangsmithTracing().setTraceModelId,
);

export const modelIdTraceMetadata: typeof LangsmithTracingMod.modelIdTraceMetadata = lazyFunction(
	() => loadLangsmithTracing().modelIdTraceMetadata,
);

export const continueInstanceAiTraceContext: typeof LangsmithTracingMod.continueInstanceAiTraceContext =
	lazyFunction(() => loadLangsmithTracing().continueInstanceAiTraceContext);

export const releaseTraceClient: typeof LangsmithTracingMod.releaseTraceClient = lazyFunction(
	() => loadLangsmithTracing().releaseTraceClient,
);

export const shutdownProductTelemetryProviders: typeof LangsmithTracingMod.shutdownProductTelemetryProviders =
	lazyFunction(() => loadLangsmithTracing().shutdownProductTelemetryProviders);

export const submitLangsmithUserFeedback: typeof LangsmithTracingMod.submitLangsmithUserFeedback =
	lazyFunction(() => loadLangsmithTracing().submitLangsmithUserFeedback);

export type IdRemapper = TraceReplayMod.IdRemapper;
export const IdRemapper: typeof TraceReplayMod.IdRemapper = lazyClass(
	() => loadTraceReplay().IdRemapper,
);
export type TraceIndex = TraceReplayMod.TraceIndex;
export const TraceIndex: typeof TraceReplayMod.TraceIndex = lazyClass(
	() => loadTraceReplay().TraceIndex,
);
export type TraceWriter = TraceReplayMod.TraceWriter;
export const TraceWriter: typeof TraceReplayMod.TraceWriter = lazyClass(
	() => loadTraceReplay().TraceWriter,
);
export declare const PURE_REPLAY_TOOLS: typeof TraceReplayMod.PURE_REPLAY_TOOLS;
export type {
	TraceEvent,
	TraceHeader,
	TraceToolCall,
	TraceToolSuspend,
	TraceToolResume,
} from './tracing/trace-replay';
export const loadInstanceAiSkills: typeof SkillsMod.loadInstanceAiSkills = lazyFunction(
	() => loadSkills().loadInstanceAiSkills,
);
export const loadInstanceAiPromptSkills: typeof SkillsMod.loadInstanceAiPromptSkills = lazyFunction(
	() => loadSkills().loadInstanceAiPromptSkills,
);
export type { PromptProfile } from './prompts/prompt-profiles';
export const resolvePromptProfile: typeof PromptProfilesMod.resolvePromptProfile = lazyFunction(
	() => loadPromptProfiles().resolvePromptProfile,
);
export declare const CONCISE_PROMPT_VERSION: typeof PromptProfilesMod.CONCISE_PROMPT_VERSION;
export const assertInstanceAiPromptVersion: typeof PromptProfilesMod.assertInstanceAiPromptVersion =
	lazyFunction(() => loadPromptProfiles().assertInstanceAiPromptVersion);
export const describePromptProfile: typeof PromptProfilesMod.describePromptProfile = lazyFunction(
	() => loadPromptProfiles().describePromptProfile,
);

export const createInstanceAgent: typeof InstanceAgentMod.createInstanceAgent = lazyFunction(
	() => loadInstanceAgent().createInstanceAgent,
);

export const applyAgentThinking: typeof ApplyAgentThinkingMod.applyAgentThinking = lazyFunction(
	() => loadApplyAgentThinking().applyAgentThinking,
);
export const resolveAIAPromptCaching: typeof AiaModelDefaultsMod.resolveAIAPromptCaching =
	lazyFunction(() => loadAiaModelDefaults().resolveAIAPromptCaching);
export const resolveAIAReasoning: typeof AiaModelDefaultsMod.resolveAIAReasoning = lazyFunction(
	() => loadAiaModelDefaults().resolveAIAReasoning,
);

export const getDateTimeSection: typeof SystemPromptMod.getDateTimeSection = lazyFunction(
	() => loadSystemPrompt().getDateTimeSection,
);
export const createSubAgentResourceIdPrefix: typeof AgentPersistenceMod.createSubAgentResourceIdPrefix =
	lazyFunction(() => loadAgentPersistence().createSubAgentResourceIdPrefix);
export const createAgentContextTool: typeof AgentContextToolMod.createAgentContextTool =
	lazyFunction(() => loadAgentContextTool().createAgentContextTool);
export declare const SUB_AGENT_RESOURCE_PREFIX: typeof AgentPersistenceMod.SUB_AGENT_RESOURCE_PREFIX;

export type ThreadTaskStorage = StorageMod.ThreadTaskStorage;
export const ThreadTaskStorage: typeof StorageMod.ThreadTaskStorage = lazyClass(
	() => loadStorage().ThreadTaskStorage,
);
export const getThread: typeof StorageMod.getThread = lazyFunction(() => loadStorage().getThread);
export type TerminalOutcomeStorage = StorageMod.TerminalOutcomeStorage;
export const TerminalOutcomeStorage: typeof StorageMod.TerminalOutcomeStorage = lazyClass(
	() => loadStorage().TerminalOutcomeStorage,
);
export const patchThread: typeof StorageMod.patchThread = lazyFunction(
	() => loadStorage().patchThread,
);
export type WorkflowLoopStorage = StorageMod.WorkflowLoopStorage;
export const WorkflowLoopStorage: typeof StorageMod.WorkflowLoopStorage = lazyClass(
	() => loadStorage().WorkflowLoopStorage,
);
export type {
	AgentTreeSnapshot,
	PatchableThreadMemory,
	ThreadPatch,
	TerminalOutcome,
	WorkflowSetupRoutingClaim,
	WorkflowLoopWorkItemRecord,
} from './storage';
export const truncateToTitle: typeof TitleUtilsMod.truncateToTitle = lazyFunction(
	() => loadTitleUtils().truncateToTitle,
);
export const generateTitleForRun: typeof TitleUtilsMod.generateTitleForRun = lazyFunction(
	() => loadTitleUtils().generateTitleForRun,
);
export type McpClientManager = McpClientManagerMod.McpClientManager;
export const McpClientManager: typeof McpClientManagerMod.McpClientManager = lazyClass(
	() => loadMcpClientManager().McpClientManager,
);
export const mapAgentChunkToEvent: typeof MapChunkMod.mapAgentChunkToEvent = lazyFunction(
	() => loadMapChunk().mapAgentChunkToEvent,
);
export const isQuotaExhaustedError: typeof MapChunkMod.isQuotaExhaustedError = lazyFunction(
	() => loadMapChunk().isQuotaExhaustedError,
);
export const parseSuspension: typeof StreamHelpersMod.parseSuspension = lazyFunction(
	() => loadStreamHelpers().parseSuspension,
);
export const asResumable: typeof StreamHelpersMod.asResumable = lazyFunction(
	() => loadStreamHelpers().asResumable,
);
export const createEvalAgent: typeof EvalAgentsMod.createEvalAgent = lazyFunction(
	() => loadEvalAgents().createEvalAgent,
);
export const extractText: typeof EvalAgentsMod.extractText = lazyFunction(
	() => loadEvalAgents().extractText,
);
export const isRetryableEvalError: typeof EvalAgentsMod.isRetryableEvalError = lazyFunction(
	() => loadEvalAgents().isRetryableEvalError,
);
export const meterEvalUsage: typeof EvalUsageMod.meterEvalUsage = lazyFunction(
	() => loadEvalUsage().meterEvalUsage,
);
defineLazyExport('PURE_REPLAY_TOOLS', () => loadTraceReplay().PURE_REPLAY_TOOLS);
defineLazyExport(
	'SUB_AGENT_RESOURCE_PREFIX',
	() => loadAgentPersistence().SUB_AGENT_RESOURCE_PREFIX,
);
defineLazyExport(
	'suspendedInstanceContextSchema',
	() => loadInstanceContextState().suspendedInstanceContextSchema,
);
defineLazyExport('CONCISE_PROMPT_VERSION', () => loadPromptProfiles().CONCISE_PROMPT_VERSION);
defineLazyExport(
	'INSTANCE_AI_DEFAULT_LIVENESS_POLICY_CONFIG',
	() => loadLivenessPolicy().INSTANCE_AI_DEFAULT_LIVENESS_POLICY_CONFIG,
);
defineLazyExport('workflowBuildOutcomeSchema', () => loadWorkflowLoop().workflowBuildOutcomeSchema);
defineLazyExport(
	'workflowVerificationEvidenceSchema',
	() => loadWorkflowLoop().workflowVerificationEvidenceSchema,
);
defineLazyExport('attemptRecordSchema', () => loadWorkflowLoop().attemptRecordSchema);
defineLazyExport('workflowLoopStateSchema', () => loadWorkflowLoop().workflowLoopStateSchema);
defineLazyExport('verificationResultSchema', () => loadWorkflowLoop().verificationResultSchema);
export type { SuspensionInfo, Resumable } from './utils/stream-helpers';
export const buildAgentTreeFromEvents: typeof AgentTreeMod.buildAgentTreeFromEvents = lazyFunction(
	() => loadAgentTree().buildAgentTreeFromEvents,
);
export const findAgentNodeInTree: typeof AgentTreeMod.findAgentNodeInTree = lazyFunction(
	() => loadAgentTree().findAgentNodeInTree,
);
export type { SandboxConfig } from './workspace/create-workspace';
export const createLazyRuntimeWorkspace: typeof LazyRuntimeWorkspaceMod.createLazyRuntimeWorkspace =
	lazyFunction(() => loadLazyRuntimeWorkspace().createLazyRuntimeWorkspace);
export type { RuntimeWorkspaceResolver } from './workspace/lazy-runtime-workspace';
export const setupSandboxWorkspace: typeof SandboxSetupMod.setupSandboxWorkspace = lazyFunction(
	() => loadSandboxSetup().setupSandboxWorkspace,
);
export const isSandboxWorkspaceInitialized: typeof SandboxSetupMod.isSandboxWorkspaceInitialized =
	lazyFunction(() => loadSandboxSetup().isSandboxWorkspaceInitialized);
export type BuilderTemplatesService = BuilderTemplatesServiceMod.BuilderTemplatesService;
export const BuilderTemplatesService: typeof BuilderTemplatesServiceMod.BuilderTemplatesService =
	lazyClass(() => loadBuilderTemplatesService().BuilderTemplatesService);
export const builderTemplatesOptionsFromEnv: typeof BuilderTemplatesServiceMod.builderTemplatesOptionsFromEnv =
	lazyFunction(() => loadBuilderTemplatesService().builderTemplatesOptionsFromEnv);
export type {
	BuilderTemplatesBundle,
	BuilderTemplatesServiceOptions,
} from './workspace/builder-templates-service';
export const createSandbox: typeof CreateWorkspaceMod.createSandbox = lazyFunction(
	() => loadCreateWorkspace().createSandbox,
);
export const createWorkspace: typeof CreateWorkspaceMod.createWorkspace = lazyFunction(
	() => loadCreateWorkspace().createWorkspace,
);
export type { VerifiedWorkspaceBundles } from './workspace/prebaked-workspace-bundle';
export type SnapshotManager = SnapshotManagerMod.SnapshotManager;
export const SnapshotManager: typeof SnapshotManagerMod.SnapshotManager = lazyClass(
	() => loadSnapshotManager().SnapshotManager,
);
export type { InstanceAiEventBus, StoredEvent } from './event-bus';
export type BackgroundTaskManager = BackgroundTaskManagerMod.BackgroundTaskManager;
export const BackgroundTaskManager: typeof BackgroundTaskManagerMod.BackgroundTaskManager =
	lazyClass(() => loadBackgroundTaskManager().BackgroundTaskManager);
export const enrichMessageWithRunningTasks: typeof BackgroundTaskManagerMod.enrichMessageWithRunningTasks =
	lazyFunction(() => loadBackgroundTaskManager().enrichMessageWithRunningTasks);
export const enrichMessageWithBackgroundTasks: typeof BackgroundTaskManagerMod.enrichMessageWithRunningTasks =
	enrichMessageWithRunningTasks;
export type {
	BackgroundTaskStatus,
	ManagedBackgroundTask,
	SpawnManagedBackgroundTaskOptions,
} from './runtime/background-task-manager';
export { MemoryTaskRegistry } from './runtime/memory-task-registry';
export type RunStateRegistry<TUser = unknown> = RunStateRegistryMod.RunStateRegistry<TUser>;
export const RunStateRegistry: typeof RunStateRegistryMod.RunStateRegistry = lazyClass(
	() => loadRunStateRegistry().RunStateRegistry,
);
export { orchestratorAgentId } from './runtime/orchestrator-identity';
export declare const suspendedInstanceContextSchema: typeof InstanceContextStateMod.suspendedInstanceContextSchema;
export type { HubSkillTelemetryState } from './runtime/instance-context-state';
export { createSetupItemsEmitter, isSetupPanelEnabled } from './tools/workflows/setup-items';
export {
	formatWorkflowSetupStateNote,
	observeWorkflowSetupStates,
} from './tools/workflows/setup-panel-state';
export type { RunDebugRecord } from './debug/run-debug-buffer';
export {
	RunDebugBuffer,
	buildRunDebugLabel,
	createRunDebugStepHooks,
} from './debug/run-debug-buffer';
export type {
	ActiveRunState,
	BackgroundTaskStatusSnapshot,
	PendingConfirmation,
	RunStateTimeoutDetails,
	StartedRunState,
	SuspendedRunState,
} from './runtime/run-state-registry';
export type { ConfirmationData } from './runtime/confirmation-payload';
export type InstanceAiTerminalResponseGuard =
	TerminalResponseGuardMod.InstanceAiTerminalResponseGuard;
export const InstanceAiTerminalResponseGuard: typeof TerminalResponseGuardMod.InstanceAiTerminalResponseGuard =
	lazyClass(() => loadTerminalResponseGuard().InstanceAiTerminalResponseGuard);
export type {
	TerminalResponseDecision,
	TerminalResponseStatus,
	TerminalVisibilitySource,
} from './runtime/terminal-response-guard';
export const executeResumableStream: typeof ResumableStreamExecutorMod.executeResumableStream =
	lazyFunction(() => loadResumableStreamExecutor().executeResumableStream);
export type {
	AutoResumeControl,
	ExecuteResumableStreamOptions,
	ExecuteResumableStreamResult,
	ManualSuspensionControl,
	ResumableStreamContext,
	ResumableStreamControl,
	ResumableStreamSource,
	TraceStatus,
} from './runtime/resumable-stream-executor';
export type { WorkSummary, ToolCallSummary } from './stream/work-summary-accumulator';
export type WorkSummaryAccumulator = WorkSummaryAccumulatorMod.WorkSummaryAccumulator;
export const WorkSummaryAccumulator: typeof WorkSummaryAccumulatorMod.WorkSummaryAccumulator =
	lazyClass(() => loadWorkSummaryAccumulator().WorkSummaryAccumulator);
export const deriveInstanceContextReach: typeof InstanceContextReachMod.deriveInstanceContextReach =
	lazyFunction(() => loadInstanceContextReach().deriveInstanceContextReach);
export const mergeInstanceContextReach: typeof InstanceContextReachMod.mergeInstanceContextReach =
	lazyFunction(() => loadInstanceContextReach().mergeInstanceContextReach);
export type { RunTokenUsage, BuilderUsageItem } from './stream/usage-accumulator';
export const tokenUsageToBuilderUsageItems: typeof UsageAccumulatorMod.tokenUsageToBuilderUsageItems =
	lazyFunction(() => loadUsageAccumulator().tokenUsageToBuilderUsageItems);
export const resumeAgentRun: typeof StreamRunnerMod.resumeAgentRun = lazyFunction(
	() => loadStreamRunner().resumeAgentRun,
);
export const streamAgentRun: typeof StreamRunnerMod.streamAgentRun = lazyFunction(
	() => loadStreamRunner().streamAgentRun,
);
export const createInstanceAiLivenessPolicyConfig: typeof LivenessPolicyMod.createInstanceAiLivenessPolicyConfig =
	lazyFunction(() => loadLivenessPolicy().createInstanceAiLivenessPolicyConfig);
export declare const INSTANCE_AI_DEFAULT_LIVENESS_POLICY_CONFIG: typeof LivenessPolicyMod.INSTANCE_AI_DEFAULT_LIVENESS_POLICY_CONFIG;
export type InstanceAiLivenessPolicy = LivenessPolicyMod.InstanceAiLivenessPolicy;
export const InstanceAiLivenessPolicy: typeof LivenessPolicyMod.InstanceAiLivenessPolicy =
	lazyClass(() => loadLivenessPolicy().InstanceAiLivenessPolicy);
export type {
	InstanceAiLivenessDecision,
	InstanceAiLivenessInput,
	InstanceAiLivenessPolicyConfig,
	InstanceAiLivenessSurface,
	InstanceAiLivenessTimeoutReason,
} from './runtime/liveness-policy';
export type {
	StreamableAgent,
	StreamRunOptions,
	StreamRunResult,
} from './runtime/stream-runner';
export type WorkflowTaskCoordinator = WorkflowLoopMod.WorkflowTaskCoordinator;
export const WorkflowTaskCoordinator: typeof WorkflowLoopMod.WorkflowTaskCoordinator = lazyClass(
	() => loadWorkflowLoop().WorkflowTaskCoordinator,
);
export const deriveWorkflowVerificationObligation: typeof WorkflowLoopMod.deriveWorkflowVerificationObligation =
	lazyFunction(() => loadWorkflowLoop().deriveWorkflowVerificationObligation);
export const deriveWorkflowVerificationObligationFromOutcome: typeof WorkflowLoopMod.deriveWorkflowVerificationObligationFromOutcome =
	lazyFunction(() => loadWorkflowLoop().deriveWorkflowVerificationObligationFromOutcome);
export const isWorkflowVerificationObligationUnsettled: typeof WorkflowLoopMod.isWorkflowVerificationObligationUnsettled =
	lazyFunction(() => loadWorkflowLoop().isWorkflowVerificationObligationUnsettled);
export declare const workflowBuildOutcomeSchema: typeof WorkflowLoopMod.workflowBuildOutcomeSchema;
export declare const workflowVerificationEvidenceSchema: typeof WorkflowLoopMod.workflowVerificationEvidenceSchema;
export declare const attemptRecordSchema: typeof WorkflowLoopMod.attemptRecordSchema;
export declare const workflowLoopStateSchema: typeof WorkflowLoopMod.workflowLoopStateSchema;
export declare const verificationResultSchema: typeof WorkflowLoopMod.verificationResultSchema;
export type {
	WorkflowLoopState,
	WorkflowLoopAction,
	WorkflowBuildOutcome,
	VerificationResult,
	AttemptRecord,
	WorkflowVerificationEvidence,
	WorkflowVerificationObligation,
} from './workflow-loop';
export const compileWorkflowSource: typeof WorkflowSourceCompilerMod.compileWorkflowSource =
	lazyFunction(() => loadWorkflowSourceCompiler().compileWorkflowSource);
export const generateWorkflowSource: typeof WorkflowSourceGeneratorMod.generateWorkflowSource =
	lazyFunction(() => loadWorkflowSourceGenerator().generateWorkflowSource);
export const prepareWorkflowForSave: typeof PrepareWorkflowForSaveMod.prepareWorkflowForSave =
	lazyFunction(() => loadPrepareWorkflowForSave().prepareWorkflowForSave);
export const buildCredentialMap: typeof ResolveCredentialsMod.buildCredentialMap = lazyFunction(
	() => loadResolveCredentials().buildCredentialMap,
);
export const resolveCredentials: typeof ResolveCredentialsMod.resolveCredentials = lazyFunction(
	() => loadResolveCredentials().resolveCredentials,
);
export const stripStaleCredentialsFromWorkflow: typeof SetupWorkflowMod.stripStaleCredentialsFromWorkflow =
	lazyFunction(() => loadSetupWorkflow().stripStaleCredentialsFromWorkflow);
export type { CredentialResolutionResult } from './tools/workflows/resolve-credentials';
export const downgradeUnchangedNodeBlockers: typeof WorkflowNodeDiffMod.downgradeUnchangedNodeBlockers =
	lazyFunction(() => loadWorkflowNodeDiff().downgradeUnchangedNodeBlockers);
export const computeChangedNodeNames: typeof WorkflowNodeDiffMod.computeChangedNodeNames =
	lazyFunction(() => loadWorkflowNodeDiff().computeChangedNodeNames);
export const computeChatModelValidationIssues: typeof ChatModelValidationMod.computeChatModelValidationIssues =
	lazyFunction(() => loadChatModelValidation().computeChatModelValidationIssues);
export const partitionWarnings: typeof WorkflowValidationWarningsMod.partitionWarnings =
	lazyFunction(() => loadWorkflowValidationWarnings().partitionWarnings);
export const planVerificationSimulation: typeof VerificationSimulationMod.planVerificationSimulation =
	lazyFunction(() => loadVerificationSimulation().planVerificationSimulation);
export const prepareVerificationRun: typeof PrepareVerificationRunMod.prepareVerificationRun =
	lazyFunction(() => loadPrepareVerificationRun().prepareVerificationRun);
export const collectResolvedParameterWarnings: typeof ResolvedParameterWarningsMod.collectResolvedParameterWarnings =
	lazyFunction(() => loadResolvedParameterWarnings().collectResolvedParameterWarnings);
export const checkToolSimulationSupport: typeof ToolSimulationPreflightMod.checkToolSimulationSupport =
	lazyFunction(() => loadToolSimulationPreflight().checkToolSimulationSupport);
export const runWorkflowVerification: typeof WorkflowVerificationMod.runWorkflowVerification =
	lazyFunction(() => loadWorkflowVerification().runWorkflowVerification);
export const buildNodePreviews: typeof VerificationAnalysisMod.buildNodePreviews = lazyFunction(
	() => loadVerificationAnalysis().buildNodePreviews,
);
export type { VerificationNodePreview } from './tools/orchestration/verification/types';
export type { ValidationWarning } from './tools/workflows/workflow-validation-warnings';
export type WorkflowLoopRuntime = WorkflowLoopRuntimeMod.WorkflowLoopRuntime;
export const WorkflowLoopRuntime: typeof WorkflowLoopRuntimeMod.WorkflowLoopRuntime = lazyClass(
	() => loadWorkflowLoopRuntime().WorkflowLoopRuntime,
);
export type {
	InstanceAiChangedArtifact,
	InstanceAiContext,
	InstanceAiToolRegistry,
	InstanceAiWorkflowService,
	InstanceAiExecutionService,
	ExecutionNodeError,
	InstanceAiExecuteNodeService,
	ExecuteNodeResult,
	InstanceAiCredentialService,
	InstanceAiNodeService,
	InstanceAiAppService,
	InstanceAiDataTableService,
	DataTableSummary,
	DataTableColumnInfo,
	DataTableFilterInput,
	InstanceAiEvaluationConfigService,
	InstanceAiActivityEntry,
	InstanceAiActivityExpansion,
	InstanceAiActivityService,
	InstanceAiPreferenceService,
	InstanceAiPreferenceWriteResult,
	InstanceAiPreferenceWriteRejection,
	InstanceAiSavedPreference,
	InstanceAiMcpService,
	McpRegistryConnectServerSummary,
	McpRegistryServerSummary,
	EvaluationConfigSummary,
	EvaluationConfigDetail,
	EvaluationConfigMetricInput,
	EvaluationConfigMetricPreset,
	UpsertEvaluationConfigInput,
	LocalMcpServer,
	McpServerConfig,
	ModelConfig,
	EndpointModelConfig,
	VertexAnthropicModelConfig,
	InstanceAiMemoryConfig,
	CreateInstanceAgentOptions,
	TaskStorage,
	OrchestrationContext,
	BackgroundTaskResult,
	InstanceAiToolTraceOptions,
	InstanceAiTraceContext,
	InstanceAiTraceRun,
	InstanceAiTraceRunFinishOptions,
	InstanceAiTraceRunInit,
	WorkflowTaskService,
	WorkflowSummary,
	WorkflowFolderRef,
	FolderResolutionFailure,
	WorkflowDetail,
	NodeUsageResult,
	WorkflowNode,
	WorkflowVersionSummary,
	WorkflowVersionDetail,
	ExecutionResult,
	ExecutionRedaction,
	StepExecutionResult,
	StepRunInputMode,
	ExecutionDebugInfo,
	NodeOutputBranch,
	NodeOutputResult,
	ResolvedNodeParametersResult,
	ResolvedParametersDebugBundle,
	ResolvedExpressionFailure,
	EmptyExpressionResolution,
	ExecutionSummary,
	CredentialSummary,
	CredentialDetail,
	CredentialTypeSearchResult,
	CredentialHostInfo,
	NodeSummary,
	NodeDescription,
	SearchableNodeDescription,
	AiGatewayNodeMeta,
	ExploreResourcesParams,
	ExploreResourcesResult,
	ResolveParameterOptionsParams,
	ResolveParameterOptionsResult,
	UnavailableLocatorValue,
	FetchedPage,
	WebSearchResult,
	WebSearchResponse,
	InstanceAiWebResearchService,
	InstanceAiWorkspaceService,
	InstanceAiWorkflowTemplateService,
	ProjectSummary,
	FolderSummary,
	ServiceProxyConfig,
	InstanceAiBuilderDelegate,
	AgentValidationSummary,
	BuilderToolsSession,
	InstanceAiConversationHistoryReader,
	ConversationHistoryMatchSource,
	ConversationHistoryExcerpt,
	ConversationHistorySearchHit,
	ConversationHistorySearchResult,
	ConversationHistoryMessage,
	ConversationHistoryMessagesResult,
	AgentSessionSummary,
	AgentContextLookup,
	InstanceAiAgentContextReader,
	InstanceAiSkillService,
	BrowserUseState,
} from './types';
export {
	CONVERSATION_HISTORY_MAX_SEARCH_LIMIT,
	CONVERSATION_HISTORY_MAX_WINDOW_SIDE,
} from './types';
export { ASK_USER_TOOL_ID } from './tools/tool-ids';
export type {
	OrchestratorRunHandoffReason,
	OrchestratorRunHandoffState,
	OrchestratorRunStopSignal,
} from './runtime/orchestrator-run-control';
export { createOrchestratorRunControl } from './runtime/orchestrator-run-control';
export { createOrchestratorRunControlForState } from './runtime/orchestrator-run-control';
export const classifyAttachments: typeof StructuredFileParserMod.classifyAttachments = lazyFunction(
	() => loadStructuredFileParser().classifyAttachments,
);
export const buildAttachmentManifest: typeof StructuredFileParserMod.buildAttachmentManifest =
	lazyFunction(() => loadStructuredFileParser().buildAttachmentManifest);
export const isStructuredAttachment: typeof StructuredFileParserMod.isStructuredAttachment =
	lazyFunction(() => loadStructuredFileParser().isStructuredAttachment);
export const isParseableAttachment: typeof StructuredFileParserMod.isParseableAttachment =
	lazyFunction(() => loadStructuredFileParser().isParseableAttachment);
export type {
	ClassifiedAttachment,
	ParseableFormat,
	TabularFormat,
	TextLikeFormat,
	SupportedFormat,
} from './parsers/structured-file-parser';
export const getParseableAttachmentMimeTypes: typeof ValidateAttachmentsMod.getParseableAttachmentMimeTypes =
	lazyFunction(() => loadValidateAttachments().getParseableAttachmentMimeTypes);
export const getSupportedAttachmentMimeTypes: typeof ValidateAttachmentsMod.getSupportedAttachmentMimeTypes =
	lazyFunction(() => loadValidateAttachments().getSupportedAttachmentMimeTypes);
export const isSupportedAttachmentMimeType: typeof ValidateAttachmentsMod.isSupportedAttachmentMimeType =
	lazyFunction(() => loadValidateAttachments().isSupportedAttachmentMimeType);
export const validateAttachmentMimeTypes: typeof ValidateAttachmentsMod.validateAttachmentMimeTypes =
	lazyFunction(() => loadValidateAttachments().validateAttachmentMimeTypes);
export type UnsupportedAttachmentError = ValidateAttachmentsMod.UnsupportedAttachmentError;
export const UnsupportedAttachmentError: typeof ValidateAttachmentsMod.UnsupportedAttachmentError =
	lazyClass(() => loadValidateAttachments().UnsupportedAttachmentError);
export const validateAttachmentSizes: typeof ValidateAttachmentsMod.validateAttachmentSizes =
	lazyFunction(() => loadValidateAttachments().validateAttachmentSizes);
export type OversizedAttachmentError = ValidateAttachmentsMod.OversizedAttachmentError;
export const OversizedAttachmentError: typeof ValidateAttachmentsMod.OversizedAttachmentError =
	lazyClass(() => loadValidateAttachments().OversizedAttachmentError);
export type {
	UnsupportedAttachmentDetail,
	OversizedAttachmentDetail,
	OversizedAttachmentReason,
} from './parsers/validate-attachments';

export const createSelfHealingAgent: typeof SelfHealingAgentMod.createSelfHealingAgent =
	lazyFunction(() => loadSelfHealingAgent().createSelfHealingAgent);
export type { CreateSelfHealingAgentOptions } from './agent/self-healing-agent';
export const getSelfHealingResourceId: typeof SelfHealingMod.getSelfHealingResourceId =
	lazyFunction(() => loadSelfHealing().getSelfHealingResourceId);
export const isSelfHealingResourceId: typeof SelfHealingMod.isSelfHealingResourceId = lazyFunction(
	() => loadSelfHealing().isSelfHealingResourceId,
);
export type {
	SelfHealingOutput,
	SelfHealingThreadMetadata,
	SelfHealingCandidateInput,
	SelfHealingCandidateVerifier,
} from './self-healing';
export const readWorkspaceFile: typeof WorkspaceFilesMod.readWorkspaceFile = lazyFunction(
	() => loadWorkspaceFiles().readWorkspaceFile,
);
export const writeWorkspaceFile: typeof WorkspaceFilesMod.writeWorkspaceFile = lazyFunction(
	() => loadWorkspaceFiles().writeWorkspaceFile,
);
export type { WorkspaceFileTarget, WorkspaceFileOptions } from './workspace/workspace-files';
export declare const SELF_HEALING_PROFILE_VERSION: typeof SelfHealingMod.SELF_HEALING_PROFILE_VERSION;
defineLazyExport(
	'SELF_HEALING_PROFILE_VERSION',
	() => loadSelfHealing().SELF_HEALING_PROFILE_VERSION,
);
export declare const SELF_HEALING_RESOURCE_PREFIX: typeof SelfHealingMod.SELF_HEALING_RESOURCE_PREFIX;
defineLazyExport(
	'SELF_HEALING_RESOURCE_PREFIX',
	() => loadSelfHealing().SELF_HEALING_RESOURCE_PREFIX,
);
export declare const selfHealingOutputSchema: typeof SelfHealingMod.selfHealingOutputSchema;
defineLazyExport('selfHealingOutputSchema', () => loadSelfHealing().selfHealingOutputSchema);
