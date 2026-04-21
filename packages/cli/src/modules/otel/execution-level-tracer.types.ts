import type { ExecutionStatus, WorkflowExecuteMode } from 'n8n-workflow';

import type { TracingContext } from './tracing-context';

export type StartWorkflowParams = {
	executionId: string;
	tracingContext?: TracingContext;
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

export type StartNodeParams = {
	executionId: string;
	node: { id: string; name: string; type: string; typeVersion: number };
};

export type EndNodeParams = {
	executionId: string;
	nodeName: string;
	inputItemCount: number;
	outputItemCount: number;
	error?: { message: string; constructor: { name: string }; stack?: string };
	customAttributes?: Record<string, string>;
};
