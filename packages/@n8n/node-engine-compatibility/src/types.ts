import type { StepExecutionContext, StepSlots, WorkflowGraph } from '@n8n/engine';
import type { ExecuteContext } from 'n8n-core';
import type {
	INode,
	INodeCredentials,
	INodeExecutionData,
	INodeParameters,
	INodeType,
	INodeTypes,
	IRunData,
	ISourceData,
	IWorkflowBase,
	IWorkflowExecuteAdditionalData,
	Workflow,
	WorkflowExecuteMode,
} from 'n8n-workflow';

/** The v1 identity of a trigger node, kept so expressions can read it back. */
export interface TriggerStepConfig {
	nodeType: string;
	typeVersion: number;
	parameters: INodeParameters;
}

export interface V1NodeStepConfig {
	nodeType: string;
	typeVersion: number;
	parameters: INodeParameters;
	continueOnFail: boolean;
	/** The credential references of the v1 node, kept so a step can resolve them at run time. */
	credentials?: INodeCredentials;
}

export interface V1Execution extends Pick<IWorkflowBase, 'nodes' | 'connections'> {
	runData: IRunData;
}

export interface StepData {
	graph: WorkflowGraph;
	/** Completed step outputs, by node id then by iteration. */
	outputsByNode: Record<string, Record<number, StepSlots>>;
}

export type StepDataLoader = (context: StepExecutionContext) => Promise<StepData>;

/**
 * The facts about an execution that the host needs to build the v1
 * `additionalData` for one of its steps: who runs it, and in which v1 mode.
 */
export interface AdditionalDataContext {
	executionId: string;
	workflowId: string;
	mode: WorkflowExecuteMode;
	userId?: string;
	projectId?: string;
}

export interface V1StepExecutorDeps {
	nodeTypes: INodeTypes;
	additionalDataFactory: (
		context: AdditionalDataContext,
	) => Promise<IWorkflowExecuteAdditionalData>;
	loadStepData: StepDataLoader;
	/** Allows static NoOp steps for a legacy benchmark. The host must explicitly select legacy. */
	allowLegacyNoopBenchmark?: boolean;
	instrumentation?: V1StepExecutorInstrumentation;
	/** Measures the node call separately from executor setup and cleanup. */
	traceNodeExecution?: (
		context: NodeExecutionTraceContext,
		run: () => Promise<unknown>,
	) => Promise<unknown>;
}

export interface NodeExecutionTraceContext
	extends Pick<StepExecutionContext, 'executionId' | 'stepId' | 'workflowId' | 'iteration'> {
	nodeId: string;
	nodeType: string;
}

export const V1_STEP_EXECUTOR_PHASES = Object.freeze([
	'load-data',
	'adapter-setup',
	'additional-data',
	'context-setup',
	'isolate-enter',
	'cleanup',
	'result-conversion',
	'isolate-exit',
] as const);

export type V1StepExecutorPhase = (typeof V1_STEP_EXECUTOR_PHASES)[number];

/** Measures a boundary without changing the active execution context. */
export interface V1StepExecutorMeasurement {
	end(): void;
	fail(): void;
}

/** The host supplies measurements. The compatibility package does not import a tracing SDK. */
export interface V1StepExecutorInstrumentation {
	run<T>(
		phase: V1StepExecutorPhase,
		metadata: NodeExecutionTraceContext,
		operation: () => Promise<T>,
	): Promise<T>;
	runSync<T>(
		phase: V1StepExecutorPhase,
		metadata: NodeExecutionTraceContext,
		operation: () => T,
	): T;
	start(phase: V1StepExecutorPhase, metadata: NodeExecutionTraceContext): V1StepExecutorMeasurement;
}

export type ExecutableNodeType = INodeType & { execute: NonNullable<INodeType['execute']> };

export type NodeRunResult = { ok: true; value: unknown } | { ok: false; error: unknown };

export interface CreateExecuteContextParams {
	node: INode;
	workflow: Workflow;
	execution: V1Execution;
	source: Array<ISourceData | null>;
	additionalData: IWorkflowExecuteAdditionalData;
	itemsByConnection: INodeExecutionData[][];
	stepContext: StepExecutionContext;
}

export interface RunNodeParams {
	nodeType: ExecutableNodeType;
	context: ExecuteContext;
}
