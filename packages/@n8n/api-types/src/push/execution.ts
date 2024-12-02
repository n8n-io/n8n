import type { ExecutionStatus, ITaskData, WorkflowExecuteMode } from 'n8n-workflow';

type ExecutionStarted = {
	type: 'executionStarted';
	data: {
		executionId: string;
		mode: WorkflowExecuteMode;
		startedAt: Date;
		workflowId: string;
		workflowName?: string;
		retryOf?: string;
		flattedRunData: string;
	};
};

type ExecutionWaiting = {
	type: 'executionWaiting';
	data: {
		executionId: string;
	};
};

type ExecutionFinished = {
	type: 'executionFinished';
	data: {
		executionId: string;
		workflowId: string;
		status: ExecutionStatus;
		/** @deprecated: Please construct execution data in the frontend from the data pushed in previous messages, instead of depending on this additional payload serialization */
		rawData?: string;
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
	| ExecutionWaiting
	| ExecutionFinished
	| ExecutionRecovered
	| NodeExecuteBefore
	| NodeExecuteAfter;
