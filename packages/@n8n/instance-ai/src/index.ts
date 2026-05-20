import './source-map-filter';

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
import type * as CompactionMod from './compaction';
let _compactionMod: typeof CompactionMod | undefined;
function loadCompaction(): typeof CompactionMod {
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	return (_compactionMod ??= require('./compaction'));
}
export const generateCompactionSummary: typeof CompactionMod.generateCompactionSummary = ((
	...args: unknown[]
) =>
	(loadCompaction().generateCompactionSummary as Function)(
		...args,
	)) as typeof CompactionMod.generateCompactionSummary;
export { createDomainAccessTracker } from './domain-access';
export type { DomainAccessTracker } from './domain-access';
export type { SubmitLangsmithUserFeedbackOptions } from './tracing/langsmith-tracing';

// ---- Lazy re-exports of langsmith-tracing entry points ----
//
// tracing/langsmith-tracing.ts is the largest file still loaded at boot
// after iter #12/#13 (38.5 KB compiled). Its functions are only called on
// trace context creation -- chat-time, never at idle. Same lazy-thunk
// pattern as the orchestration tools in iter #13: type-only import + sync
// require() inside thunks. The lazy `require()` inside the file (already
// in place from iter #3) defers the `langsmith` package itself; this
// outer thunk defers the source file too.
import type * as LangsmithTracingMod from './tracing/langsmith-tracing';

let _langsmithTracingMod: typeof LangsmithTracingMod | undefined;
function loadLangsmithTracing(): typeof LangsmithTracingMod {
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	return (_langsmithTracingMod ??= require('./tracing/langsmith-tracing'));
}

export const appendGeneratedWorkflowIdToRootMetadata: typeof LangsmithTracingMod.appendGeneratedWorkflowIdToRootMetadata =
	((...args: unknown[]) =>
		(loadLangsmithTracing().appendGeneratedWorkflowIdToRootMetadata as Function)(
			...args,
		)) as typeof LangsmithTracingMod.appendGeneratedWorkflowIdToRootMetadata;

export const appendRootRunMetadata: typeof LangsmithTracingMod.appendRootRunMetadata = ((
	...args: unknown[]
) =>
	(loadLangsmithTracing().appendRootRunMetadata as Function)(
		...args,
	)) as typeof LangsmithTracingMod.appendRootRunMetadata;

export const createInstanceAiTraceContext: typeof LangsmithTracingMod.createInstanceAiTraceContext =
	((...args: unknown[]) =>
		(loadLangsmithTracing().createInstanceAiTraceContext as Function)(
			...args,
		)) as typeof LangsmithTracingMod.createInstanceAiTraceContext;

export const createInternalOperationTraceContext: typeof LangsmithTracingMod.createInternalOperationTraceContext =
	((...args: unknown[]) =>
		(loadLangsmithTracing().createInternalOperationTraceContext as Function)(
			...args,
		)) as typeof LangsmithTracingMod.createInternalOperationTraceContext;

export const createTraceReplayOnlyContext: typeof LangsmithTracingMod.createTraceReplayOnlyContext =
	((...args: unknown[]) =>
		(loadLangsmithTracing().createTraceReplayOnlyContext as Function)(
			...args,
		)) as typeof LangsmithTracingMod.createTraceReplayOnlyContext;

export const continueInstanceAiTraceContext: typeof LangsmithTracingMod.continueInstanceAiTraceContext =
	((...args: unknown[]) =>
		(loadLangsmithTracing().continueInstanceAiTraceContext as Function)(
			...args,
		)) as typeof LangsmithTracingMod.continueInstanceAiTraceContext;

export const releaseTraceClient: typeof LangsmithTracingMod.releaseTraceClient = ((
	...args: unknown[]
) =>
	(loadLangsmithTracing().releaseTraceClient as Function)(
		...args,
	)) as typeof LangsmithTracingMod.releaseTraceClient;

export const submitLangsmithUserFeedback: typeof LangsmithTracingMod.submitLangsmithUserFeedback =
	((...args: unknown[]) =>
		(loadLangsmithTracing().submitLangsmithUserFeedback as Function)(
			...args,
		)) as typeof LangsmithTracingMod.submitLangsmithUserFeedback;

export const withCurrentTraceSpan: typeof LangsmithTracingMod.withCurrentTraceSpan = ((
	...args: unknown[]
) =>
	(loadLangsmithTracing().withCurrentTraceSpan as Function)(
		...args,
	)) as typeof LangsmithTracingMod.withCurrentTraceSpan;
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

// ---- Lazy re-exports of the agent factories ----
//
// agent/instance-agent.ts and agent/sub-agent-factory.ts are the entry
// points for actually running an agent (Mastra Agent instantiation,
// system prompt loading -- agent/system-prompt.js is 24.9 KB and pulled
// transitively here). All call sites are inside async chat handlers, so
// deferring the require() is behaviour-preserving.
import type * as InstanceAgentMod from './agent/instance-agent';
import type * as SubAgentFactoryMod from './agent/sub-agent-factory';

let _instanceAgentMod: typeof InstanceAgentMod | undefined;
let _subAgentFactoryMod: typeof SubAgentFactoryMod | undefined;

function loadInstanceAgent(): typeof InstanceAgentMod {
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	return (_instanceAgentMod ??= require('./agent/instance-agent'));
}
function loadSubAgentFactory(): typeof SubAgentFactoryMod {
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	return (_subAgentFactoryMod ??= require('./agent/sub-agent-factory'));
}

export const createInstanceAgent: typeof InstanceAgentMod.createInstanceAgent = ((
	...args: unknown[]
) =>
	(loadInstanceAgent().createInstanceAgent as Function)(
		...args,
	)) as typeof InstanceAgentMod.createInstanceAgent;

export const createSubAgent: typeof SubAgentFactoryMod.createSubAgent = ((...args: unknown[]) =>
	(loadSubAgentFactory().createSubAgent as Function)(
		...args,
	)) as typeof SubAgentFactoryMod.createSubAgent;
export { createAllTools, createOrchestrationTools } from './tools';
export {
	createSubAgentResourceIdPrefix,
	SUB_AGENT_RESOURCE_PREFIX,
} from './tools/orchestration/agent-persistence';
export { BUILDER_AGENT_PROMPT } from './tools/orchestration/build-workflow-agent.prompt';

// ---- Lazy re-exports of the orchestration agent-task entry points ----
//
// Each `start*AgentTask` function lives in a sibling file that pulls in
// heavy transitive deps (Mastra `Agent`, agent persistence, sub-agent
// briefing, etc.) at module evaluation. Re-exporting them statically
// forced those source files (collectively ~100–150 KB compiled) to be
// parsed and held in V8's source cache at boot, even on idle instances
// that will never run a chat. The heap-snapshot probe flagged compiled
// source strings as the #1 V8 self-size delta vs base.
//
// We keep the public API identical (consumers still do
// `import { startBuildWorkflowAgentTask } from '@n8n/instance-ai'`) by
// exporting thunk functions that resolve the real implementation lazily
// via require() on first call. After first call the underlying module is
// in the require cache, so subsequent calls have zero overhead.
import type * as BuildWorkflowAgentToolMod from './tools/orchestration/build-workflow-agent.tool';
import type * as DataTableAgentToolMod from './tools/orchestration/data-table-agent.tool';
import type * as DelegateToolMod from './tools/orchestration/delegate.tool';
import type * as ResearchWithAgentToolMod from './tools/orchestration/research-with-agent.tool';

let _buildWorkflowAgentToolMod: typeof BuildWorkflowAgentToolMod | undefined;
let _dataTableAgentToolMod: typeof DataTableAgentToolMod | undefined;
let _delegateToolMod: typeof DelegateToolMod | undefined;
let _researchWithAgentToolMod: typeof ResearchWithAgentToolMod | undefined;

function loadBuildWorkflowAgentTool(): typeof BuildWorkflowAgentToolMod {
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	return (_buildWorkflowAgentToolMod ??= require('./tools/orchestration/build-workflow-agent.tool'));
}
function loadDataTableAgentTool(): typeof DataTableAgentToolMod {
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	return (_dataTableAgentToolMod ??= require('./tools/orchestration/data-table-agent.tool'));
}
function loadDelegateTool(): typeof DelegateToolMod {
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	return (_delegateToolMod ??= require('./tools/orchestration/delegate.tool'));
}
function loadResearchWithAgentTool(): typeof ResearchWithAgentToolMod {
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	return (_researchWithAgentToolMod ??= require('./tools/orchestration/research-with-agent.tool'));
}

export const startBuildWorkflowAgentTask: typeof BuildWorkflowAgentToolMod.startBuildWorkflowAgentTask =
	((...args: unknown[]) =>
		(loadBuildWorkflowAgentTool().startBuildWorkflowAgentTask as Function)(
			...args,
		)) as typeof BuildWorkflowAgentToolMod.startBuildWorkflowAgentTask;

export const startDataTableAgentTask: typeof DataTableAgentToolMod.startDataTableAgentTask = ((
	...args: unknown[]
) =>
	(loadDataTableAgentTool().startDataTableAgentTask as Function)(
		...args,
	)) as typeof DataTableAgentToolMod.startDataTableAgentTask;

export const startDetachedDelegateTask: typeof DelegateToolMod.startDetachedDelegateTask = ((
	...args: unknown[]
) =>
	(loadDelegateTool().startDetachedDelegateTask as Function)(
		...args,
	)) as typeof DelegateToolMod.startDetachedDelegateTask;

export const startResearchAgentTask: typeof ResearchWithAgentToolMod.startResearchAgentTask = ((
	...args: unknown[]
) =>
	(loadResearchWithAgentTool().startResearchAgentTask as Function)(
		...args,
	)) as typeof ResearchWithAgentToolMod.startResearchAgentTask;
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
import type * as TitleUtilsMod from './memory/title-utils';
let _titleUtilsMod: typeof TitleUtilsMod | undefined;
function loadTitleUtils(): typeof TitleUtilsMod {
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	return (_titleUtilsMod ??= require('./memory/title-utils'));
}
export const truncateToTitle: typeof TitleUtilsMod.truncateToTitle = ((...args: unknown[]) =>
	(loadTitleUtils().truncateToTitle as Function)(...args)) as typeof TitleUtilsMod.truncateToTitle;
export const generateTitleForRun: typeof TitleUtilsMod.generateTitleForRun = ((
	...args: unknown[]
) =>
	(loadTitleUtils().generateTitleForRun as Function)(
		...args,
	)) as typeof TitleUtilsMod.generateTitleForRun;
// Lazy class shim for McpClientManager. mcp-client-manager.ts statically
// imports `McpClient` from @n8n/agents -- the LAST direct path bringing
// @n8n/agents into our boot graph. Pairing this with a lazy-getter for the
// `mcpClientManager` field in `InstanceAiService` (which is the only
// consumer that uses `new McpClientManager(...)`) keeps the underlying
// file out of the boot graph entirely.
import type * as McpClientManagerMod from './mcp/mcp-client-manager';
let _mcpClientManagerMod: typeof McpClientManagerMod | undefined;
function loadMcpClientManager(): typeof McpClientManagerMod {
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	return (_mcpClientManagerMod ??= require('./mcp/mcp-client-manager'));
}
export type McpClientManager = import('./mcp/mcp-client-manager').McpClientManager;
export const McpClientManager: typeof McpClientManagerMod.McpClientManager =
	class McpClientManagerLazyShim {
		constructor(...args: unknown[]) {
			const Real = loadMcpClientManager().McpClientManager as new (...a: unknown[]) => unknown;
			return new Real(...args) as McpClientManagerLazyShim;
		}
	} as unknown as typeof McpClientManagerMod.McpClientManager;
export { mapAgentChunkToEvent } from './stream/map-chunk';
export { isRecord, parseSuspension, asResumable } from './utils/stream-helpers';
import type * as EvalAgentsMod from './utils/eval-agents';
let _evalAgentsMod: typeof EvalAgentsMod | undefined;
function loadEvalAgents(): typeof EvalAgentsMod {
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	return (_evalAgentsMod ??= require('./utils/eval-agents'));
}
export const createEvalAgent: typeof EvalAgentsMod.createEvalAgent = ((...args: unknown[]) =>
	(loadEvalAgents().createEvalAgent as Function)(...args)) as typeof EvalAgentsMod.createEvalAgent;
export const extractText: typeof EvalAgentsMod.extractText = ((...args: unknown[]) =>
	(loadEvalAgents().extractText as Function)(...args)) as typeof EvalAgentsMod.extractText;
export type Tool = import('./utils/eval-agents').Tool;
export const Tool: typeof EvalAgentsMod.Tool = class ToolLazyShim {
	constructor(...args: unknown[]) {
		const Real = loadEvalAgents().Tool as new (...a: unknown[]) => unknown;
		return new Real(...args) as ToolLazyShim;
	}
} as unknown as typeof EvalAgentsMod.Tool;
export let SONNET_MODEL: typeof EvalAgentsMod.SONNET_MODEL = undefined as never;
export let HAIKU_MODEL: typeof EvalAgentsMod.HAIKU_MODEL = undefined as never;
Object.defineProperty(module.exports, 'SONNET_MODEL', {
	enumerable: true,
	configurable: true,
	get(): typeof EvalAgentsMod.SONNET_MODEL {
		return loadEvalAgents().SONNET_MODEL;
	},
});
Object.defineProperty(module.exports, 'HAIKU_MODEL', {
	enumerable: true,
	configurable: true,
	get(): typeof EvalAgentsMod.HAIKU_MODEL {
		return loadEvalAgents().HAIKU_MODEL;
	},
});
export type { SuspensionInfo, Resumable } from './utils/stream-helpers';
export { buildAgentTreeFromEvents, findAgentNodeInTree } from './utils/agent-tree';
export type { SandboxConfig } from './workspace/create-workspace';
export type { BuilderWorkspace } from './workspace/builder-sandbox-factory';
export type BuilderSandboxFactory =
	import('./workspace/builder-sandbox-factory').BuilderSandboxFactory;
import type * as CreateWorkspaceMod from './workspace/create-workspace';
import type * as BuilderSandboxFactoryMod from './workspace/builder-sandbox-factory';
let _createWorkspaceMod: typeof CreateWorkspaceMod | undefined;
let _builderSandboxFactoryMod: typeof BuilderSandboxFactoryMod | undefined;
function loadCreateWorkspace(): typeof CreateWorkspaceMod {
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	return (_createWorkspaceMod ??= require('./workspace/create-workspace'));
}
function loadBuilderSandboxFactory(): typeof BuilderSandboxFactoryMod {
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	return (_builderSandboxFactoryMod ??= require('./workspace/builder-sandbox-factory'));
}
export const createSandbox: typeof CreateWorkspaceMod.createSandbox = ((...args: unknown[]) =>
	(loadCreateWorkspace().createSandbox as Function)(
		...args,
	)) as typeof CreateWorkspaceMod.createSandbox;
export const createWorkspace: typeof CreateWorkspaceMod.createWorkspace = ((...args: unknown[]) =>
	(loadCreateWorkspace().createWorkspace as Function)(
		...args,
	)) as typeof CreateWorkspaceMod.createWorkspace;
export const BuilderSandboxFactory: typeof BuilderSandboxFactoryMod.BuilderSandboxFactory =
	class BuilderSandboxFactoryLazyShim {
		constructor(...args: unknown[]) {
			const Real = loadBuilderSandboxFactory().BuilderSandboxFactory as new (
				...a: unknown[]
			) => unknown;
			return new Real(...args) as BuilderSandboxFactoryLazyShim;
		}
	} as unknown as typeof BuilderSandboxFactoryMod.BuilderSandboxFactory;
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
export { BuilderSandboxSessionRegistry } from './runtime/builder-sandbox-session-registry';
export type { BuilderSandboxSession } from './runtime/builder-sandbox-session-registry';
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
export type { StartedBackgroundAgentTask } from './tools/orchestration/data-table-agent.tool';
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
