/* eslint-disable @typescript-eslint/no-require-imports */
import type * as SharedSandboxMod from '@n8n/agents/sandbox';

import './source-map-filter';

import type * as InstanceAgentMod from './agent/instance-agent';
import type * as SubAgentFactoryMod from './agent/sub-agent-factory';
import type * as SystemPromptMod from './agent/system-prompt';
import type * as DomainAccessMod from './domain-access';
import type * as McpClientManagerMod from './mcp/mcp-client-manager';
import type * as TitleUtilsMod from './memory/title-utils';
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
import type * as ToolsMod from './tools';
import type * as AgentPersistenceMod from './tools/orchestration/agent-persistence';
import type * as DelegateToolMod from './tools/orchestration/delegate.tool';
import type * as SanitizeWebContentMod from './tools/web-research/sanitize-web-content';
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
const loadInstanceAgent = lazyModule(
	() => require('./agent/instance-agent') as typeof InstanceAgentMod,
);
const loadDomainAccess = lazyModule(() => require('./domain-access') as typeof DomainAccessMod);
const loadSubAgentFactory = lazyModule(
	() => require('./agent/sub-agent-factory') as typeof SubAgentFactoryMod,
);
const loadSystemPrompt = lazyModule(
	() => require('./agent/system-prompt') as typeof SystemPromptMod,
);
const loadSanitizeWebContent = lazyModule(
	() => require('./tools/web-research/sanitize-web-content') as typeof SanitizeWebContentMod,
);
const loadDelegateTool = lazyModule(
	() => require('./tools/orchestration/delegate.tool') as typeof DelegateToolMod,
);
const loadTools = lazyModule(() => require('./tools') as typeof ToolsMod);
const loadAgentPersistence = lazyModule(
	() => require('./tools/orchestration/agent-persistence') as typeof AgentPersistenceMod,
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

export const appendGeneratedWorkflowIdToRootMetadata: typeof LangsmithTracingMod.appendGeneratedWorkflowIdToRootMetadata =
	lazyFunction(() => loadLangsmithTracing().appendGeneratedWorkflowIdToRootMetadata);

export const appendRootRunMetadata: typeof LangsmithTracingMod.appendRootRunMetadata = lazyFunction(
	() => loadLangsmithTracing().appendRootRunMetadata,
);

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

export const submitLangsmithUserFeedback: typeof LangsmithTracingMod.submitLangsmithUserFeedback =
	lazyFunction(() => loadLangsmithTracing().submitLangsmithUserFeedback);

export const withCurrentTraceSpan: typeof LangsmithTracingMod.withCurrentTraceSpan = lazyFunction(
	() => loadLangsmithTracing().withCurrentTraceSpan,
);
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
export const parseTraceJsonl: typeof TraceReplayMod.parseTraceJsonl = lazyFunction(
	() => loadTraceReplay().parseTraceJsonl,
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
export const hasRuntimeSkills: typeof RuntimeSkillsMod.hasRuntimeSkills = lazyFunction(
	() => loadRuntimeSkills().hasRuntimeSkills,
);
export const loadInstanceAiRuntimeSkillSource: typeof RuntimeSkillsMod.loadInstanceAiRuntimeSkillSource =
	lazyFunction(() => loadRuntimeSkills().loadInstanceAiRuntimeSkillSource);
export const createLazyWorkspaceRuntimeSkillSource: typeof MaterializeRuntimeSkillsMod.createLazyWorkspaceRuntimeSkillSource =
	lazyFunction(() => loadMaterializeRuntimeSkills().createLazyWorkspaceRuntimeSkillSource);
export const buildRuntimeSkillWorkspaceBundle: typeof MaterializeRuntimeSkillsMod.buildRuntimeSkillWorkspaceBundle =
	lazyFunction(() => loadMaterializeRuntimeSkills().buildRuntimeSkillWorkspaceBundle);
export const materializeRuntimeSkillsIntoWorkspace: typeof MaterializeRuntimeSkillsMod.materializeRuntimeSkillsIntoWorkspace =
	lazyFunction(() => loadMaterializeRuntimeSkills().materializeRuntimeSkillsIntoWorkspace);
export const loadPrebakedRuntimeSkillsBundle: typeof MaterializeRuntimeSkillsMod.loadPrebakedRuntimeSkillsBundle =
	lazyFunction(() => loadMaterializeRuntimeSkills().loadPrebakedRuntimeSkillsBundle);
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

export const createSubAgent: typeof SubAgentFactoryMod.createSubAgent = lazyFunction(
	() => loadSubAgentFactory().createSubAgent,
);
export const getDateTimeSection: typeof SystemPromptMod.getDateTimeSection = lazyFunction(
	() => loadSystemPrompt().getDateTimeSection,
);
export const createAllTools: typeof ToolsMod.createAllTools = lazyFunction(
	() => loadTools().createAllTools,
);
export const createOrchestrationTools: typeof ToolsMod.createOrchestrationTools = lazyFunction(
	() => loadTools().createOrchestrationTools,
);
export const createSubAgentResourceId: typeof AgentPersistenceMod.createSubAgentResourceId =
	lazyFunction(() => loadAgentPersistence().createSubAgentResourceId);
export const createSubAgentResourceIdPrefix: typeof AgentPersistenceMod.createSubAgentResourceIdPrefix =
	lazyFunction(() => loadAgentPersistence().createSubAgentResourceIdPrefix);
export declare const SUB_AGENT_RESOURCE_PREFIX: typeof AgentPersistenceMod.SUB_AGENT_RESOURCE_PREFIX;

export const startDetachedDelegateTask: typeof DelegateToolMod.startDetachedDelegateTask =
	lazyFunction(() => loadDelegateTool().startDetachedDelegateTask);
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
export declare const SONNET_MODEL: typeof EvalAgentsMod.SONNET_MODEL;
export declare const HAIKU_MODEL: typeof EvalAgentsMod.HAIKU_MODEL;
defineLazyExport('SONNET_MODEL', () => loadEvalAgents().SONNET_MODEL);
defineLazyExport('HAIKU_MODEL', () => loadEvalAgents().HAIKU_MODEL);
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
export const createWorkItem: typeof WorkflowLoopMod.createWorkItem = lazyFunction(
	() => loadWorkflowLoop().createWorkItem,
);
export const formatWorkflowLoopGuidance: typeof WorkflowLoopMod.formatWorkflowLoopGuidance =
	lazyFunction(() => loadWorkflowLoop().formatWorkflowLoopGuidance);
export const handleBuildOutcome: typeof WorkflowLoopMod.handleBuildOutcome = lazyFunction(
	() => loadWorkflowLoop().handleBuildOutcome,
);
export const handleVerificationVerdict: typeof WorkflowLoopMod.handleVerificationVerdict =
	lazyFunction(() => loadWorkflowLoop().handleVerificationVerdict);
export const formatAttemptHistory: typeof WorkflowLoopMod.formatAttemptHistory = lazyFunction(
	() => loadWorkflowLoop().formatAttemptHistory,
);
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
	LocalMcpServer,
	McpServerConfig,
	ModelConfig,
	InstanceAiMemoryConfig,
	CreateInstanceAgentOptions,
	TaskStorage,
	PlannedTask,
	PlannedTaskKind,
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
	NodeSummary,
	NodeDescription,
	SearchableNodeDescription,
	ExploreResourcesParams,
	ExploreResourcesResult,
	FetchedPage,
	WebSearchResult,
	WebSearchResponse,
	InstanceAiWebResearchService,
	InstanceAiWorkspaceService,
	ProjectSummary,
	FolderSummary,
	ServiceProxyConfig,
} from './types';
export type { DetachedDelegateTaskResult } from './tools/orchestration/delegate.tool';
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
