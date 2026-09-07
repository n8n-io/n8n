import type { StepExecutionContext, StepSlots, WorkflowGraph } from '@n8n/engine';
import type { ExecuteContext } from 'n8n-core';
import type {
	INode,
	INodeExecutionData,
	INodeParameters,
	INodeType,
	INodeTypes,
	IRunData,
	ISourceData,
	IWorkflowBase,
	IWorkflowExecuteAdditionalData,
	Workflow,
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

export interface V1StepExecutorDeps {
	nodeTypes: INodeTypes;
	additionalDataFactory: (executionId: string) => Promise<IWorkflowExecuteAdditionalData>;
	loadStepData: StepDataLoader;
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
