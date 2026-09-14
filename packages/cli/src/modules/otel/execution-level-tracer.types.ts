import type { ExecutionStatus, WorkflowExecuteMode, INode } from 'n8n-workflow';

import type { TracingContext } from './tracing-context';

export type CustomAttributes = Record<string, string>;
type ProjectContext = {
	id: string;
	customAttributes?: CustomAttributes;
};
type WorkflowContext = {
	id: string;
	name: string;
	versionId?: string;
	nodeCount: number;
	customAttributes?: CustomAttributes;
};

export type StartWorkflowParams = {
	executionId: string;
	/** Parent context — webhook traceparent, parent sub-workflow span, or the parked span on a resume. */
	tracingContext?: TracingContext;
	/** Adds a `n8n.continuation.reason` link. Set alongside `tracingContext` on a resume. */
	linkTo?: TracingContext;
	workflow: WorkflowContext;
	project?: ProjectContext;
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

type EndNodeError = {
	message: string;
	constructor: { name: string };
	stack?: string;
	name?: string;
	description?: string | null;
};

export function isEndNodeError(error: unknown): error is EndNodeError {
	if (typeof error !== 'object' || error === null) return false;

	const record = error as Record<string, unknown>;
	if (typeof record.message !== 'string') return false;

	const ctor = record.constructor;
	if (typeof ctor?.name !== 'string') return false;

	if ('stack' in record && typeof record.stack !== 'string') return false;

	return true;
}

export type EndNodeParams = {
	executionId: string;
	node: NodeTracingParams;
	inputItemCount: number;
	outputItemCount: number;
	error?: EndNodeError;
	customAttributes?: Record<string, string>;
};
