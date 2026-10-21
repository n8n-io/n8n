import type {
	StepExecutionContext,
	StepSlots,
	TriggerOutputs,
	WorkflowDocument,
	WorkflowGraph,
} from '@n8n/engine';
import type { ExecuteContext } from 'n8n-core';

import type { SubWorkflowCalls } from './sub-workflow-calls';
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

/**
 * What the host needs to resolve a sub-workflow a node calls: which workflow,
 * who calls it, and the items the child's trigger receives.
 */
export interface SubWorkflowResolveRequest {
	workflowId: string;
	/** The child execution's id, minted by the caller, so the trigger runs under it. */
	executionId: string;
	parent: {
		executionId: string;
		workflowId: string;
		mode: WorkflowExecuteMode;
		/** The calling node, named in a policy denial. */
		node: { id: string; name: string; type: string; typeVersion: number };
	};
	context: { userId?: string; projectId?: string };
	items: INodeExecutionData[];
}

/** The child as the engine starts it. */
export interface SubWorkflowResolveResult {
	workflowId: string;
	graph: WorkflowGraph;
	workflow: WorkflowDocument;
	triggerOutputs: TriggerOutputs | null;
}

export type SubWorkflowResolver = (
	request: SubWorkflowResolveRequest,
) => Promise<SubWorkflowResolveResult>;

export interface V1StepExecutorDeps {
	nodeTypes: INodeTypes;
	additionalDataFactory: (
		context: AdditionalDataContext,
	) => Promise<IWorkflowExecuteAdditionalData>;
	loadStepData: StepDataLoader;
	/** Absent in a host that runs no sub-workflows, where a call fails the node. */
	resolveSubWorkflow?: SubWorkflowResolver;
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
	subWorkflowCalls: SubWorkflowCalls;
}

export interface RunNodeParams {
	nodeType: ExecutableNodeType;
	context: ExecuteContext;
}
