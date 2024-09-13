import type { IRun, ITaskData, WorkflowExecuteMode } from 'n8n-workflow';

type ExecutionStarted = {
	type: 'executionStarted';
	data: {
		executionId: string;
		mode: WorkflowExecuteMode;
		startedAt: Date;
		workflowId: string;
		workflowName?: string;
		retryOf?: string;
	};
};

type ExecutionFinished = {
	type: 'executionFinished';
	data: {
		executionId: string;
		data: IRun;
		retryOf?: string;
	};
};

type ExecutionRecovered = {
	type: 'executionRecovered';
	data: {
		executionId: string;
	};
};

type NodeExecuteBefore = {
	type: 'nodeExecuteBefore';
	data: {
		executionId: string;
		nodeName: string;
	};
};

type NodeExecuteAfter = {
	type: 'nodeExecuteAfter';
	data: {
		executionId: string;
		nodeName: string;
		data: ITaskData;
	};
};

export type ExecutionPushMessage =
	| ExecutionStarted
	| ExecutionFinished
	| ExecutionRecovered
	| NodeExecuteBefore
	| NodeExecuteAfter;
