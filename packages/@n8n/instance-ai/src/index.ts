/* eslint-disable @typescript-eslint/no-require-imports */
import type * as SharedSandboxMod from '@n8n/agents/sandbox';

import './source-map-filter';

import type * as ApplyAgentThinkingMod from './agent/apply-agent-thinking';
import type * as InstanceAgentMod from './agent/instance-agent';
import type * as SystemPromptMod from './agent/system-prompt';
import type * as DomainAccessMod from './domain-access';
import type * as McpClientManagerMod from './mcp/mcp-client-manager';
import type * as TitleUtilsMod from './memory/title-utils';
import type * as OneOffTaskContractsMod from './one-off-task/contracts';
import type * as RunOneOffTaskToolMod from './one-off-task/run-one-off-task.tool';
import type * as OneOffTaskSandboxMod from './one-off-task/sandbox';
import type * as StructuredFileParserMod from './parsers/structured-file-parser';
import type * as ValidateAttachmentsMod from './parsers/validate-attachments';
import type * as PlannedTaskPermissionsMod from './planned-tasks/planned-task-permissions';
import type * as PlannedTaskServiceMod from './planned-tasks/planned-task-service';
import type * as BackgroundTaskManagerMod from './runtime/background-task-manager';
import type * as LivenessPolicyMod from './runtime/liveness-policy';
import type * as ResumableStreamExecutorMod from './runtime/resumable-stream-executor';
import type * as RunStateRegistryMod from './runtime/run-state-registry';
import type * as StreamRunnerMod from './runtime/stream-runner';
import type * as TerminalResponseGuardMod from './runtime/terminal-response-guard';
import type * as MaterializeRuntimeSkillsMod from './skills/materialize-runtime-skills';
import type * as RuntimeSkillsMod from './skills/runtime-skills';
import type * as StorageMod from './storage';
import type * as MapChunkMod from './stream/map-chunk';
import type * as UsageAccumulatorMod from './stream/usage-accumulator';
import type * as ToolsMod from './tools';
import type * as AgentPersistenceMod from './tools/orchestration/agent-persistence';
import type * as SanitizeWebContentMod from './tools/web-research/sanitize-web-content';
import type * as AgentSnapshotEventMod from './tracing/agent-snapshot-event';
import type * as LangsmithTracingMod from './tracing/langsmith-tracing';
import type * as TraceReplayMod from './tracing/trace-replay';
import type * as AgentTreeMod from './utils/agent-tree';
import type * as EvalAgentsMod from './utils/eval-agents';
import type * as StreamHelpersMod from './utils/stream-helpers';
import type * as WorkflowLoopMod from './workflow-loop';
import type * as WorkflowLoopRuntimeMod from './workflow-loop/runtime';
import type * as BuilderTemplatesServiceMod from './workspace/builder-templates-service';
import type * as CreateWorkspaceMod from './workspace/create-workspace';
import type * as LazyRuntimeWorkspaceMod from './workspace/lazy-runtime-workspace';
import type * as SandboxSetupMod from './workspace/sandbox-setup';
import type * as ScopedWorkspaceMod from './workspace/scoped-workspace';
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
const loadInstanceAgent = lazyModule(
	() => require('./agent/instance-agent') as typeof InstanceAgentMod,
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
const loadTools = lazyModule(() => require('./tools') as typeof ToolsMod);
const loadAgentPersistence = lazyModule(
	() => require('./tools/orchestration/agent-persistence') as typeof AgentPersistenceMod,
);
const loadTitleUtils = lazyModule(() => require('./memory/title-utils') as typeof TitleUtilsMod);
const loadOneOffTaskContracts = lazyModule(
	() => require('./one-off-task/contracts') as typeof OneOffTaskContractsMod,
);
const loadRunOneOffTaskTool = lazyModule(
	() => require('./one-off-task/run-one-off-task.tool') as typeof RunOneOffTaskToolMod,
);
const loadOneOffTaskSandbox = lazyModule(
	() => require('./one-off-task/sandbox') as typeof OneOffTaskSandboxMod,
);
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
const loadRuntimeSkills = lazyModule(
	() => require('./skills/runtime-skills') as typeof RuntimeSkillsMod,
);
const loadMaterializeRuntimeSkills = lazyModule(
	() => require('./skills/materialize-runtime-skills') as typeof MaterializeRuntimeSkillsMod,
);
const loadEvalAgents = lazyModule(() => require('./utils/eval-agents') as typeof EvalAgentsMod);
const loadAgentTree = lazyModule(() => require('./utils/agent-tree') as typeof AgentTreeMod);
const loadBuilderTemplatesService = lazyModule(
	() => require('./workspace/builder-templates-service') as typeof BuilderTemplatesServiceMod,
);
const loadCreateWorkspace = lazyModule(
	() => require('./workspace/create-workspace') as typeof CreateWorkspaceMod,
);
const loadSharedSandbox = lazyModule(
	() => require('@n8n/agents/sandbox') as typeof SharedSandboxMod,
);
const loadLazyRuntimeWorkspace = lazyModule(
	() => require('./workspace/lazy-runtime-workspace') as typeof LazyRuntimeWorkspaceMod,
);
const loadSandboxSetup = lazyModule(
	() => require('./workspace/sandbox-setup') as typeof SandboxSetupMod,
);
const loadScopedWorkspace = lazyModule(
	() => require('./workspace/scoped-workspace') as typeof ScopedWorkspaceMod,
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
const loadPlannedTaskService = lazyModule(
	() => require('./planned-tasks/planned-task-service') as typeof PlannedTaskServiceMod,
);
const loadPlannedTaskPermissions = lazyModule(
	() => require('./planned-tasks/planned-task-permissions') as typeof PlannedTaskPermissionsMod,
);
const loadStructuredFileParser = lazyModule(
	() => require('./parsers/structured-file-parser') as typeof StructuredFileParserMod,
);
const loadValidateAttachments = lazyModule(
	() => require('./parsers/validate-attachments') as typeof ValidateAttachmentsMod,
);

export { MAX_STEPS } from './constants/max-steps';
export { WorkflowSaveConflictError } from './errors/workflow-save-conflict.error';
export { WorkflowNotFoundError } from './errors/workflow-not-found.error';
export {
	LEGACY_PLANNED_TASK_KINDS,
	PLANNED_TASK_KINDS,
	STORED_PLANNED_TASK_KINDS,
} from './types';
export { deriveCredentialHosts } from './tools/workflows/credential-url-resolver';
export { instanceAiBuilderThreadPrefix } from './tools/orchestration/builder-thread-id';
export type { CredentialHostMeta } from './tools/workflows/credential-url-resolver';
export {
	agentBuilderTargetMetadata,
	clearedAgentBuilderTargetMetadata,
	seedAgentBuilderTargetMetadata,
	saveAgentBuilderTarget,
} from './tools/orchestration/agent-target-binding';
export {
	resolveAgentPreviewSession,
	saveAgentPreviewSession,
} from './tools/orchestration/agent-preview-session-binding';

export type {
	AgentDbMessage,
	AgentMessage,
	BuiltMemory,
	CheckpointStore,
	ContentToolCall,
	MessageContent,
	SerializableAgentState,
	Thread,
} from '@n8n/agents';
export const wrapUntrustedData: typeof SanitizeWebContentMod.wrapUntrustedData = lazyFunction(
	() => loadSanitizeWebContent().wrapUntrustedData,
);
export type { Logger } from './logger';
export const createDomainAccessTracker: typeof DomainAccessMod.createDomainAccessTracker =
	lazyFunction(() => loadDomainAccess().createDomainAccessTracker);
export type { DomainAccessTracker } from './domain-access';
export type { SubmitLangsmithUserFeedbackOptions } from './tracing/langsmith-tracing';

export const emitAgentSnapshotTraceEvent: typeof AgentSnapshotEventMod.emitAgentSnapshotTraceEvent =
	lazyFunction(() => loadAgentSnapshotEvent().emitAgentSnapshotTraceEvent);
export type {
	AgentSnapshotArtifact,
	AgentSnapshotReason,
} from './tracing/agent-snapshot-event';

export const createInstanceAiTraceContext: typeof LangsmithTracingMod.createInstanceAiTraceContext =
	lazyFunction(() => loadLangsmithTracing().createInstanceAiTraceContext);

export const createInternalOperationTraceContext: typeof LangsmithTracingMod.createInternalOperationTraceContext =
	lazyFunction(() => loadLangsmithTracing().createInternalOperationTraceContext);

export const createTraceReplayOnlyContext: typeof LangsmithTracingMod.createTraceReplayOnlyContext =
	lazyFunction(() => loadLangsmithTracing().createTraceReplayOnlyContext);

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
export type { SubAgentOptions } from './agent/sub-agent-factory';
export declare const INSTANCE_AI_SKILLS_DIR: typeof RuntimeSkillsMod.INSTANCE_AI_SKILLS_DIR;
export const loadInstanceAiRuntimeSkillSource: typeof RuntimeSkillsMod.loadInstanceAiRuntimeSkillSource =
	lazyFunction(() => loadRuntimeSkills().loadInstanceAiRuntimeSkillSource);
export const createLazyWorkspaceRuntimeSkillSource: typeof MaterializeRuntimeSkillsMod.createLazyWorkspaceRuntimeSkillSource =
	lazyFunction(() => loadMaterializeRuntimeSkills().createLazyWorkspaceRuntimeSkillSource);
export {
	CONFIG_EVALS_SKILL_ID,
	disabledInstanceAiSkillIds,
	type InstanceAiSkillFlags,
} from './skills/skill-gates';
export declare const SANDBOX_RUNTIME_SKILLS_DIR: typeof MaterializeRuntimeSkillsMod.SANDBOX_RUNTIME_SKILLS_DIR;
export declare const SANDBOX_RUNTIME_SKILL_REGISTRY_FILE: typeof MaterializeRuntimeSkillsMod.SANDBOX_RUNTIME_SKILL_REGISTRY_FILE;
export declare const RUNTIME_SKILL_MANIFEST_FILE: typeof MaterializeRuntimeSkillsMod.RUNTIME_SKILL_MANIFEST_FILE;
export declare const RUNTIME_SKILL_MANIFEST_SCHEMA_VERSION: typeof MaterializeRuntimeSkillsMod.RUNTIME_SKILL_MANIFEST_SCHEMA_VERSION;
export declare const N8N_SKILLS_DIR_ENV: typeof MaterializeRuntimeSkillsMod.N8N_SKILLS_DIR_ENV;
export declare const N8N_SKILL_DIR_ENV: typeof MaterializeRuntimeSkillsMod.N8N_SKILL_DIR_ENV;
export declare const N8N_WORKSPACE_DIR_ENV: typeof MaterializeRuntimeSkillsMod.N8N_WORKSPACE_DIR_ENV;
export type {
	MaterializedRuntimeSkill,
	MaterializedRuntimeSkills,
	RuntimeSkillWorkspaceBundle,
	RuntimeSkillWorkspaceManifest,
} from './skills/materialize-runtime-skills';

export const createInstanceAgent: typeof InstanceAgentMod.createInstanceAgent = lazyFunction(
	() => loadInstanceAgent().createInstanceAgent,
);

export const applyAgentThinking: typeof ApplyAgentThinkingMod.applyAgentThinking = lazyFunction(
	() => loadApplyAgentThinking().applyAgentThinking,
);

export const getDateTimeSection: typeof SystemPromptMod.getDateTimeSection = lazyFunction(
	() => loadSystemPrompt().getDateTimeSection,
);
export const createAllTools: typeof ToolsMod.createAllTools = lazyFunction(
	() => loadTools().createAllTools,
);
export const createSubAgentResourceIdPrefix: typeof AgentPersistenceMod.createSubAgentResourceIdPrefix =
	lazyFunction(() => loadAgentPersistence().createSubAgentResourceIdPrefix);
export declare const SUB_AGENT_RESOURCE_PREFIX: typeof AgentPersistenceMod.SUB_AGENT_RESOURCE_PREFIX;

export declare const iterationEntrySchema: typeof StorageMod.iterationEntrySchema;
export const formatPreviousAttempts: typeof StorageMod.formatPreviousAttempts = lazyFunction(
	() => loadStorage().formatPreviousAttempts,
);
export type ThreadIterationLogStorage = StorageMod.ThreadIterationLogStorage;
export const ThreadIterationLogStorage: typeof StorageMod.ThreadIterationLogStorage = lazyClass(
	() => loadStorage().ThreadIterationLogStorage,
);
export type ThreadTaskStorage = StorageMod.ThreadTaskStorage;
export const ThreadTaskStorage: typeof StorageMod.ThreadTaskStorage = lazyClass(
	() => loadStorage().ThreadTaskStorage,
);
export type PlannedTaskStorage = StorageMod.PlannedTaskStorage;
export const PlannedTaskStorage: typeof StorageMod.PlannedTaskStorage = lazyClass(
	() => loadStorage().PlannedTaskStorage,
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
	IterationEntry,
	IterationLog,
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
export type Tool = EvalAgentsMod.Tool;
export const Tool: typeof EvalAgentsMod.Tool = lazyClass(() => loadEvalAgents().Tool);
defineLazyExport('PURE_REPLAY_TOOLS', () => loadTraceReplay().PURE_REPLAY_TOOLS);
defineLazyExport(
	'SUB_AGENT_RESOURCE_PREFIX',
	() => loadAgentPersistence().SUB_AGENT_RESOURCE_PREFIX,
);
defineLazyExport('iterationEntrySchema', () => loadStorage().iterationEntrySchema);
defineLazyExport('INSTANCE_AI_SKILLS_DIR', () => loadRuntimeSkills().INSTANCE_AI_SKILLS_DIR);
defineLazyExport(
	'SANDBOX_RUNTIME_SKILLS_DIR',
	() => loadMaterializeRuntimeSkills().SANDBOX_RUNTIME_SKILLS_DIR,
);
defineLazyExport(
	'SANDBOX_RUNTIME_SKILL_REGISTRY_FILE',
	() => loadMaterializeRuntimeSkills().SANDBOX_RUNTIME_SKILL_REGISTRY_FILE,
);
defineLazyExport(
	'RUNTIME_SKILL_MANIFEST_FILE',
	() => loadMaterializeRuntimeSkills().RUNTIME_SKILL_MANIFEST_FILE,
);
defineLazyExport(
	'RUNTIME_SKILL_MANIFEST_SCHEMA_VERSION',
	() => loadMaterializeRuntimeSkills().RUNTIME_SKILL_MANIFEST_SCHEMA_VERSION,
);
defineLazyExport('N8N_SKILLS_DIR_ENV', () => loadMaterializeRuntimeSkills().N8N_SKILLS_DIR_ENV);
defineLazyExport('N8N_SKILL_DIR_ENV', () => loadMaterializeRuntimeSkills().N8N_SKILL_DIR_ENV);
defineLazyExport(
	'N8N_WORKSPACE_DIR_ENV',
	() => loadMaterializeRuntimeSkills().N8N_WORKSPACE_DIR_ENV,
);
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
defineLazyExport(
	'PLANNED_TASK_PERMISSION_OVERRIDES',
	() => loadPlannedTaskPermissions().PLANNED_TASK_PERMISSION_OVERRIDES,
);
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
export const getWorkspaceRoot: typeof SharedSandboxMod.getWorkspaceRoot = lazyFunction(
	() => loadSharedSandbox().getWorkspaceRoot,
);
export const getPromptWorkspaceRoot: typeof SharedSandboxMod.getPromptWorkspaceRoot = lazyFunction(
	() => loadSharedSandbox().getPromptWorkspaceRoot,
);
export const setupSandboxWorkspace: typeof SandboxSetupMod.setupSandboxWorkspace = lazyFunction(
	() => loadSandboxSetup().setupSandboxWorkspace,
);
export type BuilderTemplatesService = BuilderTemplatesServiceMod.BuilderTemplatesService;
export const createScopedWorkspace: typeof ScopedWorkspaceMod.createScopedWorkspace = lazyFunction(
	() => loadScopedWorkspace().createScopedWorkspace,
);
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
export type { RunDebugRecord } from './debug/run-debug-buffer';
export {
	RunDebugBuffer,
	buildRunDebugLabel,
	createRunDebugStepHooks,
} from './debug/run-debug-buffer';
export type {
	ActiveRunState,
	BackgroundTaskStatusSnapshot,
	ConfirmationData,
	PendingConfirmation,
	RunStateTimeoutDetails,
	StartedRunState,
	SuspendedRunState,
} from './runtime/run-state-registry';
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
export type { WorkSummary } from './stream/work-summary-accumulator';
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
export const resolveWorkflowBuildOwner: typeof WorkflowLoopMod.resolveWorkflowBuildOwner =
	lazyFunction(() => loadWorkflowLoop().resolveWorkflowBuildOwner);
export const plannedTaskIdFromWorkflowBuildOwner: typeof WorkflowLoopMod.plannedTaskIdFromWorkflowBuildOwner =
	lazyFunction(() => loadWorkflowLoop().plannedTaskIdFromWorkflowBuildOwner);
export const isPlannedWorkflowBuildOwner: typeof WorkflowLoopMod.isPlannedWorkflowBuildOwner =
	lazyFunction(() => loadWorkflowLoop().isPlannedWorkflowBuildOwner);
export declare const workflowBuildOutcomeSchema: typeof WorkflowLoopMod.workflowBuildOutcomeSchema;
export declare const workflowVerificationEvidenceSchema: typeof WorkflowLoopMod.workflowVerificationEvidenceSchema;
export declare const attemptRecordSchema: typeof WorkflowLoopMod.attemptRecordSchema;
export declare const workflowLoopStateSchema: typeof WorkflowLoopMod.workflowLoopStateSchema;
export declare const verificationResultSchema: typeof WorkflowLoopMod.verificationResultSchema;
export type {
	WorkflowLoopState,
	WorkflowLoopAction,
	WorkflowBuildOwner,
	WorkflowBuildOutcome,
	VerificationResult,
	AttemptRecord,
	WorkflowVerificationEvidence,
	WorkflowVerificationObligation,
	WorkflowVerificationObligationSource,
} from './workflow-loop';
export type WorkflowLoopRuntime = WorkflowLoopRuntimeMod.WorkflowLoopRuntime;
export const WorkflowLoopRuntime: typeof WorkflowLoopRuntimeMod.WorkflowLoopRuntime = lazyClass(
	() => loadWorkflowLoopRuntime().WorkflowLoopRuntime,
);
export type PlannedTaskCoordinator = PlannedTaskServiceMod.PlannedTaskCoordinator;
export const PlannedTaskCoordinator: typeof PlannedTaskServiceMod.PlannedTaskCoordinator =
	lazyClass(() => loadPlannedTaskService().PlannedTaskCoordinator);
export const applyPlannedTaskPermissions: typeof PlannedTaskPermissionsMod.applyPlannedTaskPermissions =
	lazyFunction(() => loadPlannedTaskPermissions().applyPlannedTaskPermissions);
export declare const PLANNED_TASK_PERMISSION_OVERRIDES: typeof PlannedTaskPermissionsMod.PLANNED_TASK_PERMISSION_OVERRIDES;
export type {
	InstanceAiContext,
	InstanceAiWorkflowService,
	InstanceAiExecutionService,
	InstanceAiCredentialService,
	InstanceAiNodeService,
	InstanceAiDataTableService,
	DataTableSummary,
	DataTableColumnInfo,
	DataTableFilterInput,
	InstanceAiEvaluationConfigService,
	InstanceAiMcpService,
	McpRegistryServerSummary,
	EvaluationConfigSummary,
	EvaluationConfigDetail,
	EvaluationConfigMetricInput,
	EvaluationConfigMetricPreset,
	UpsertEvaluationConfigInput,
	LocalMcpServer,
	McpServerConfig,
	ModelConfig,
	InstanceAiMemoryConfig,
	CreateInstanceAgentOptions,
	TaskStorage,
	PlannedTask,
	PlannedTaskKind,
	StoredPlannedTaskKind,
	PlannedTaskStatus,
	PlannedTaskRecord,
	PlannedTaskGraph,
	PlannedTaskGraphStatus,
	PlannedWorkflowVerification,
	PlannedTaskSchedulerAction,
	PlannedTaskService,
	OrchestrationContext,
	SpawnBackgroundTaskOptions,
	SpawnBackgroundTaskResult,
	BackgroundTaskResult,
	InstanceAiToolTraceOptions,
	InstanceAiTraceContext,
	InstanceAiTraceRun,
	InstanceAiTraceRunFinishOptions,
	InstanceAiTraceRunInit,
	WorkflowTaskService,
	WorkflowSummary,
	WorkflowDetail,
	WorkflowNode,
	WorkflowVersionSummary,
	WorkflowVersionDetail,
	ExecutionResult,
	ExecutionDebugInfo,
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
	BuilderDelegateSession,
	BuilderTurnStream,
	BuilderOpenSuspension,
	SessionWorkflowRef,
} from './types';
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
export type { UnsupportedAttachmentDetail } from './parsers/validate-attachments';

// ── One-off task sandboxes ───────────────────────────────────────────────────

export { isOneOffTaskEnabled, ONE_OFF_TASK_SKILL_ID } from './one-off-task/is-one-off-task-enabled';
export const credentialEnvVarName: typeof OneOffTaskContractsMod.credentialEnvVarName =
	lazyFunction(() => loadOneOffTaskContracts().credentialEnvVarName);
export declare const ONE_OFF_TASK_PI_VERSION: typeof OneOffTaskContractsMod.ONE_OFF_TASK_PI_VERSION;
export declare const TASK_DIR: typeof OneOffTaskContractsMod.TASK_DIR;
export declare const SECRETS_MANIFEST_PATH: typeof OneOffTaskContractsMod.SECRETS_MANIFEST_PATH;
export declare const REPORT_PATH: typeof OneOffTaskContractsMod.REPORT_PATH;
export declare const SESSION_DIR: typeof OneOffTaskContractsMod.SESSION_DIR;
export declare const ONE_OFF_TASK_CREDENTIAL_WAIT_TIMEOUT_MS: typeof OneOffTaskContractsMod.ONE_OFF_TASK_CREDENTIAL_WAIT_TIMEOUT_MS;
export declare const secretsManifestSchema: typeof OneOffTaskContractsMod.secretsManifestSchema;
export declare const injectedCredentialSchema: typeof OneOffTaskContractsMod.injectedCredentialSchema;
export declare const oneOffTaskContractSchema: typeof OneOffTaskContractsMod.oneOffTaskContractSchema;
export declare const credentialRecipeRequestSchema: typeof OneOffTaskContractsMod.credentialRecipeRequestSchema;
export declare const harnessReportSchema: typeof OneOffTaskContractsMod.harnessReportSchema;
export declare const piStreamEventSchema: typeof OneOffTaskContractsMod.piStreamEventSchema;
export declare const resolvedCredentialEnvSchema: typeof OneOffTaskContractsMod.resolvedCredentialEnvSchema;
defineLazyExport(
	'ONE_OFF_TASK_PI_VERSION',
	() => loadOneOffTaskContracts().ONE_OFF_TASK_PI_VERSION,
);
defineLazyExport('TASK_DIR', () => loadOneOffTaskContracts().TASK_DIR);
defineLazyExport('SECRETS_MANIFEST_PATH', () => loadOneOffTaskContracts().SECRETS_MANIFEST_PATH);
defineLazyExport('REPORT_PATH', () => loadOneOffTaskContracts().REPORT_PATH);
defineLazyExport('SESSION_DIR', () => loadOneOffTaskContracts().SESSION_DIR);
defineLazyExport(
	'ONE_OFF_TASK_CREDENTIAL_WAIT_TIMEOUT_MS',
	() => loadOneOffTaskContracts().ONE_OFF_TASK_CREDENTIAL_WAIT_TIMEOUT_MS,
);
defineLazyExport('secretsManifestSchema', () => loadOneOffTaskContracts().secretsManifestSchema);
defineLazyExport(
	'injectedCredentialSchema',
	() => loadOneOffTaskContracts().injectedCredentialSchema,
);
defineLazyExport(
	'oneOffTaskContractSchema',
	() => loadOneOffTaskContracts().oneOffTaskContractSchema,
);
defineLazyExport(
	'credentialRecipeRequestSchema',
	() => loadOneOffTaskContracts().credentialRecipeRequestSchema,
);
defineLazyExport('harnessReportSchema', () => loadOneOffTaskContracts().harnessReportSchema);
defineLazyExport('piStreamEventSchema', () => loadOneOffTaskContracts().piStreamEventSchema);
defineLazyExport(
	'resolvedCredentialEnvSchema',
	() => loadOneOffTaskContracts().resolvedCredentialEnvSchema,
);
export type {
	HarnessReport,
	HarnessRunResult,
	OneOffTaskContract,
	OneOffTaskCredentialResolver,
	OneOffTaskSandbox,
	OneOffTaskSandboxProvider,
	ResolvedCredentialEnv,
	SecretsManifest,
} from './one-off-task/contracts';
export const createOneOffTaskSandboxProvider: typeof OneOffTaskSandboxMod.createOneOffTaskSandboxProvider =
	lazyFunction(() => loadOneOffTaskSandbox().createOneOffTaskSandboxProvider);
export type { CreateOneOffTaskSandboxProviderOptions } from './one-off-task/sandbox';
export const createRunOneOffTaskTool: typeof RunOneOffTaskToolMod.createRunOneOffTaskTool =
	lazyFunction(() => loadRunOneOffTaskTool().createRunOneOffTaskTool);
export declare const RUN_ONE_OFF_TASK_TOOL_ID: typeof RunOneOffTaskToolMod.RUN_ONE_OFF_TASK_TOOL_ID;
defineLazyExport(
	'RUN_ONE_OFF_TASK_TOOL_ID',
	() => loadRunOneOffTaskTool().RUN_ONE_OFF_TASK_TOOL_ID,
);
export type { OneOffTaskOutcome, OneOffTaskToolDeps } from './one-off-task/run-one-off-task.tool';
