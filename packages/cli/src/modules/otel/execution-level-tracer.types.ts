import type { ExecutionStatus, WorkflowExecuteMode, INode } from 'n8n-workflow';

import type { TracingContext } from './tracing-context';

export type StartWorkflowParams = {
	executionId: string;
	/** Parent context — incoming webhook traceparent or parent sub-workflow span. */
	tracingContext?: TracingContext;
	/**
	 * Continuation link target — used by `workflowExecuteResume` to associate
	 * the post-resume root with the pre-wait root without making it a child
	 * of an already-ended span. Rendered as `span.links` in OTel.
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
