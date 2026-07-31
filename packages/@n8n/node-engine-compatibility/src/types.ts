import type { StepExecutionContext } from '@n8n/engine';
import type { ExecuteContext } from 'n8n-core';
import type {
	INodeExecutionData,
	INodeParameters,
	INodeType,
	INodeTypes,
	IWorkflowExecuteAdditionalData,
} from 'n8n-workflow';

export interface V1NodeStepConfig {
	nodeType: string;
	typeVersion: number;
	parameters: INodeParameters;
	continueOnFail: boolean;
}

export interface V1StepExecutorDeps {
	nodeTypes: INodeTypes;
	additionalDataFactory: (executionId: string) => Promise<IWorkflowExecuteAdditionalData>;
}

export type ExecutableNodeType = INodeType & { execute: NonNullable<INodeType['execute']> };

export type NodeRunResult = { ok: true; value: unknown } | { ok: false; error: unknown };

export interface CreateNodeExecuteContextParams {
	nodeId: string;
	nodeName: string;
	stepConfig: V1NodeStepConfig;
	itemsByConnection: INodeExecutionData[][];
	stepContext: StepExecutionContext;
}

export interface RunNodeParams {
	nodeType: ExecutableNodeType;
	nodeExecuteContext: ExecuteContext;
}
