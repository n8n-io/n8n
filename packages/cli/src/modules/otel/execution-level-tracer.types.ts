import type { ExecutionStatus, WorkflowExecuteMode, INode } from 'n8n-workflow';

import type { TracingContext } from './tracing-context';

export type StartWorkflowParams = {
	executionId: string;
	/** Parent context — incoming webhook traceparent or parent sub-workflow span. */
	tracingContext?: TracingContext;
	/**
	 * Link this workflow to a different workflow. Used by `workflowExecuteResume` when a
	 * workflow is resumed after a pause.
	 */
	linkTo?: TracingContext;
	workflow: { id: string; name: string; versionId?: string; nodeCount: number };
};

export type EndWorkflowParams = {
	executionId: string;
	status: ExecutionStatus;
	mode: WorkflowExecuteMode;
	error?: unknown;
	isRetry: boolean;
	retryOf?: string;
};

type NodeTracingParams = Pick<INode, 'id' | 'name' | 'type' | 'typeVersion'>;

export type StartNodeParams = {
	executionId: string;
	node: NodeTracingParams;
};

export type EndNodeParams = {
	executionId: string;
	node: NodeTracingParams;
	inputItemCount: number;
	outputItemCount: number;
	error?: { message: string; constructor: { name: string }; stack?: string };
	customAttributes?: Record<string, string>;
};
