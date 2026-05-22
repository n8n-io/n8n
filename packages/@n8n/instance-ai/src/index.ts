/* eslint-disable @typescript-eslint/no-require-imports */
import './source-map-filter';

import type * as InstanceAgentMod from './agent/instance-agent';
import type * as SubAgentFactoryMod from './agent/sub-agent-factory';
import type * as CompactionMod from './compaction';
import type * as McpClientManagerMod from './mcp/mcp-client-manager';
import type * as TitleUtilsMod from './memory/title-utils';
import type * as MaterializeRuntimeSkillsMod from './skills/materialize-runtime-skills';
import type * as RuntimeSkillsMod from './skills/runtime-skills';
import type * as BuildWorkflowAgentPromptMod from './tools/orchestration/build-workflow-agent.prompt';
import type * as BuildWorkflowAgentToolMod from './tools/orchestration/build-workflow-agent.tool';
import type * as DelegateToolMod from './tools/orchestration/delegate.tool';
import type * as ResearchWithAgentToolMod from './tools/orchestration/research-with-agent.tool';
import type * as LangsmithTracingMod from './tracing/langsmith-tracing';
import type * as EvalAgentsMod from './utils/eval-agents';
import type * as CreateWorkspaceMod from './workspace/create-workspace';

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

const loadCompaction = lazyModule(() => require('./compaction') as typeof CompactionMod);
const loadLangsmithTracing = lazyModule(
	() => require('./tracing/langsmith-tracing') as typeof LangsmithTracingMod,
);
const loadInstanceAgent = lazyModule(
	() => require('./agent/instance-agent') as typeof InstanceAgentMod,
);
const loadSubAgentFactory = lazyModule(
	() => require('./agent/sub-agent-factory') as typeof SubAgentFactoryMod,
);
const loadBuildWorkflowAgentPrompt = lazyModule(
	() =>
		require('./tools/orchestration/build-workflow-agent.prompt') as typeof BuildWorkflowAgentPromptMod,
);
const loadBuildWorkflowAgentTool = lazyModule(
	() =>
		require('./tools/orchestration/build-workflow-agent.tool') as typeof BuildWorkflowAgentToolMod,
);
const loadDelegateTool = lazyModule(
	() => require('./tools/orchestration/delegate.tool') as typeof DelegateToolMod,
);
const loadResearchWithAgentTool = lazyModule(
	() =>
		require('./tools/orchestration/research-with-agent.tool') as typeof ResearchWithAgentToolMod,
);
const loadTitleUtils = lazyModule(() => require('./memory/title-utils') as typeof TitleUtilsMod);
const loadMcpClientManager = lazyModule(
	() => require('./mcp/mcp-client-manager') as typeof McpClientManagerMod,
);
const loadRuntimeSkills = lazyModule(
	() => require('./skills/runtime-skills') as typeof RuntimeSkillsMod,
);
const loadMaterializeRuntimeSkills = lazyModule(
	() => require('./skills/materialize-runtime-skills') as typeof MaterializeRuntimeSkillsMod,
);
const loadEvalAgents = lazyModule(() => require('./utils/eval-agents') as typeof EvalAgentsMod);
const loadCreateWorkspace = lazyModule(
	() => require('./workspace/create-workspace') as typeof CreateWorkspaceMod,
);

export { MAX_STEPS } from './constants/max-steps';
export type {
	AgentDbMessage,
	AgentMessage,
	BuiltMemory,
	CheckpointStore,
	SerializableAgentState,
	Thread,
} from '@n8n/agents';
export { wrapUntrustedData } from './tools/web-research/sanitize-web-content';
export type { Logger } from './logger';
export type { CompactionInput } from './compaction';
export const generateCompactionSummary: typeof CompactionMod.generateCompactionSummary =
	lazyFunction(() => loadCompaction().generateCompactionSummary);
export { createDomainAccessTracker } from './domain-access';
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
export {
	IdRemapper,
	TraceIndex,
	TraceWriter,
	parseTraceJsonl,
	PURE_REPLAY_TOOLS,
} from './tracing/trace-replay';
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
export const materializeRuntimeSkillsIntoWorkspace: typeof MaterializeRuntimeSkillsMod.materializeRuntimeSkillsIntoWorkspace =
	lazyFunction(() => loadMaterializeRuntimeSkills().materializeRuntimeSkillsIntoWorkspace);
export declare const SANDBOX_RUNTIME_SKILLS_DIR: typeof MaterializeRuntimeSkillsMod.SANDBOX_RUNTIME_SKILLS_DIR;
export declare const SANDBOX_RUNTIME_SKILL_REGISTRY_FILE: typeof MaterializeRuntimeSkillsMod.SANDBOX_RUNTIME_SKILL_REGISTRY_FILE;
export declare const N8N_SKILLS_DIR_ENV: typeof MaterializeRuntimeSkillsMod.N8N_SKILLS_DIR_ENV;
export declare const N8N_SKILL_DIR_ENV: typeof MaterializeRuntimeSkillsMod.N8N_SKILL_DIR_ENV;
export declare const N8N_WORKSPACE_DIR_ENV: typeof MaterializeRuntimeSkillsMod.N8N_WORKSPACE_DIR_ENV;
export type {
	MaterializedRuntimeSkill,
	MaterializedRuntimeSkills,
} from './skills/materialize-runtime-skills';

export const createInstanceAgent: typeof InstanceAgentMod.createInstanceAgent = lazyFunction(
	() => loadInstanceAgent().createInstanceAgent,
);

export const createSubAgent: typeof SubAgentFactoryMod.createSubAgent = lazyFunction(
	() => loadSubAgentFactory().createSubAgent,
);
export { createAllTools, createOrchestrationTools } from './tools';
export {
	createSubAgentResourceIdPrefix,
	SUB_AGENT_RESOURCE_PREFIX,
} from './tools/orchestration/agent-persistence';

export declare const BUILDER_AGENT_PROMPT: typeof BuildWorkflowAgentPromptMod.BUILDER_AGENT_PROMPT;

export const startBuildWorkflowAgentTask: typeof BuildWorkflowAgentToolMod.startBuildWorkflowAgentTask =
	lazyFunction(() => loadBuildWorkflowAgentTool().startBuildWorkflowAgentTask);

export const startDetachedDelegateTask: typeof DelegateToolMod.startDetachedDelegateTask =
	lazyFunction(() => loadDelegateTool().startDetachedDelegateTask);

export const startResearchAgentTask: typeof ResearchWithAgentToolMod.startResearchAgentTask =
	lazyFunction(() => loadResearchWithAgentTool().startResearchAgentTask);
export {
	iterationEntrySchema,
	formatPreviousAttempts,
	ThreadIterationLogStorage,
	ThreadTaskStorage,
	PlannedTaskStorage,
	getThread,
	TerminalOutcomeStorage,
	patchThread,
	WorkflowLoopStorage,
} from './storage';
export type {
	AgentTreeSnapshot,
	IterationEntry,
	IterationLog,
	PatchableThreadMemory,
	ThreadPatch,
	TerminalOutcome,
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
export { mapAgentChunkToEvent } from './stream/map-chunk';
export { isRecord, parseSuspension, asResumable } from './utils/stream-helpers';
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
defineLazyExport('BUILDER_AGENT_PROMPT', () => loadBuildWorkflowAgentPrompt().BUILDER_AGENT_PROMPT);
defineLazyExport('SONNET_MODEL', () => loadEvalAgents().SONNET_MODEL);
defineLazyExport('HAIKU_MODEL', () => loadEvalAgents().HAIKU_MODEL);
defineLazyExport('INSTANCE_AI_SKILLS_DIR', () => loadRuntimeSkills().INSTANCE_AI_SKILLS_DIR);
defineLazyExport(
	'SANDBOX_RUNTIME_SKILLS_DIR',
	() => loadMaterializeRuntimeSkills().SANDBOX_RUNTIME_SKILLS_DIR,
);
defineLazyExport(
	'SANDBOX_RUNTIME_SKILL_REGISTRY_FILE',
	() => loadMaterializeRuntimeSkills().SANDBOX_RUNTIME_SKILL_REGISTRY_FILE,
);
defineLazyExport('N8N_SKILLS_DIR_ENV', () => loadMaterializeRuntimeSkills().N8N_SKILLS_DIR_ENV);
defineLazyExport('N8N_SKILL_DIR_ENV', () => loadMaterializeRuntimeSkills().N8N_SKILL_DIR_ENV);
defineLazyExport(
	'N8N_WORKSPACE_DIR_ENV',
	() => loadMaterializeRuntimeSkills().N8N_WORKSPACE_DIR_ENV,
);
export type { SuspensionInfo, Resumable } from './utils/stream-helpers';
export { buildAgentTreeFromEvents, findAgentNodeInTree } from './utils/agent-tree';
export type { SandboxConfig } from './workspace/create-workspace';
export { createLazyRuntimeWorkspace } from './workspace/lazy-runtime-workspace';
export type { RuntimeWorkspaceResolver } from './workspace/lazy-runtime-workspace';
export { getWorkspaceRoot, setupSandboxWorkspace } from './workspace/sandbox-setup';
export type { FilesystemMutationGuardSetter } from './workspace/guarded-filesystem';
export const createSandbox: typeof CreateWorkspaceMod.createSandbox = lazyFunction(
	() => loadCreateWorkspace().createSandbox,
);
export const createWorkspace: typeof CreateWorkspaceMod.createWorkspace = lazyFunction(
	() => loadCreateWorkspace().createWorkspace,
);
export const getWorkspaceMutationGuardSetter: typeof CreateWorkspaceMod.getWorkspaceMutationGuardSetter =
	lazyFunction(() => loadCreateWorkspace().getWorkspaceMutationGuardSetter);
export const cleanupWorkspaceProcesses: typeof CreateWorkspaceMod.cleanupWorkspaceProcesses =
	lazyFunction(() => loadCreateWorkspace().cleanupWorkspaceProcesses);
export { SnapshotManager } from './workspace/snapshot-manager';
export type { InstanceAiEventBus, StoredEvent } from './event-bus';
export {
	BackgroundTaskManager,
	enrichMessageWithRunningTasks as enrichMessageWithBackgroundTasks,
	enrichMessageWithRunningTasks,
} from './runtime/background-task-manager';
export type {
	BackgroundTaskStatus,
	ManagedBackgroundTask,
	SpawnManagedBackgroundTaskOptions,
} from './runtime/background-task-manager';
export { RunStateRegistry } from './runtime/run-state-registry';
export type {
	ActiveRunState,
	BackgroundTaskStatusSnapshot,
	ConfirmationData,
	PendingConfirmation,
	RunStateTimeoutDetails,
	StartedRunState,
	SuspendedRunState,
} from './runtime/run-state-registry';
export { InstanceAiTerminalResponseGuard } from './runtime/terminal-response-guard';
export type {
	TerminalResponseDecision,
	TerminalResponseStatus,
	TerminalVisibilitySource,
} from './runtime/terminal-response-guard';
export { executeResumableStream } from './runtime/resumable-stream-executor';
export type {
	AutoResumeControl,
	ExecuteResumableStreamOptions,
	ExecuteResumableStreamResult,
	ManualSuspensionControl,
	ResumableStreamContext,
	ResumableStreamControl,
	ResumableStreamSource,
} from './runtime/resumable-stream-executor';
export type { WorkSummary } from './stream/work-summary-accumulator';
export { resumeAgentRun, streamAgentRun } from './runtime/stream-runner';
export {
	createInstanceAiLivenessPolicyConfig,
	INSTANCE_AI_DEFAULT_LIVENESS_POLICY_CONFIG,
	InstanceAiLivenessPolicy,
	type InstanceAiLivenessDecision,
	type InstanceAiLivenessInput,
	type InstanceAiLivenessPolicyConfig,
	type InstanceAiLivenessSurface,
	type InstanceAiLivenessTimeoutReason,
} from './runtime/liveness-policy';
export type {
	StreamableAgent,
	StreamRunOptions,
	StreamRunResult,
} from './runtime/stream-runner';
export {
	createWorkItem,
	formatWorkflowLoopGuidance,
	handleBuildOutcome,
	handleVerificationVerdict,
	formatAttemptHistory,
	WorkflowTaskCoordinator,
	workflowBuildOutcomeSchema,
	attemptRecordSchema,
	workflowLoopStateSchema,
	verificationResultSchema,
} from './workflow-loop';
export type {
	WorkflowLoopState,
	WorkflowLoopAction,
	WorkflowBuildOutcome,
	VerificationResult,
	AttemptRecord,
} from './workflow-loop';
export { WorkflowLoopRuntime } from './workflow-loop/runtime';
export { PlannedTaskCoordinator } from './planned-tasks/planned-task-service';
export {
	applyPlannedTaskPermissions,
	PLANNED_TASK_PERMISSION_OVERRIDES,
} from './planned-tasks/planned-task-permissions';
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
export type { StartedWorkflowBuildTask } from './tools/orchestration/build-workflow-agent.tool';
export type { DetachedDelegateTaskResult } from './tools/orchestration/delegate.tool';
export type { StartedResearchAgentTask } from './tools/orchestration/research-with-agent.tool';
export {
	classifyAttachments,
	buildAttachmentManifest,
	isStructuredAttachment,
	isParseableAttachment,
} from './parsers/structured-file-parser';
export type {
	ClassifiedAttachment,
	ParseableFormat,
	TabularFormat,
	TextLikeFormat,
	SupportedFormat,
} from './parsers/structured-file-parser';
export {
	getParseableAttachmentMimeTypes,
	getSupportedAttachmentMimeTypes,
	isSupportedAttachmentMimeType,
	validateAttachmentMimeTypes,
	UnsupportedAttachmentError,
} from './parsers/validate-attachments';
export type { UnsupportedAttachmentDetail } from './parsers/validate-attachments';
