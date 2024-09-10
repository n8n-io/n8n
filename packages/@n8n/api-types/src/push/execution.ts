import type { IRun, ITaskData, WorkflowExecuteMode } from 'n8n-workflow';

interface ExecutionStarted {
	type: 'executionStarted';
	data: {
		executionId: string;
		mode: WorkflowExecuteMode;
		startedAt: Date;
		workflowId: string;
		workflowName?: string;
		retryOf?: string;
	};
}

interface ExecutionFinished {
	type: 'executionFinished';
	data: {
		executionId: string;
		data: IRun;
		retryOf?: string;
	};
}

interface ExecutionRecovered {
	type: 'executionRecovered';
	data: {
		executionId: string;
	};
}

interface NodeExecuteBefore {
	type: 'nodeExecuteBefore';
	data: {
		executionId: string;
		nodeName: string;
	};
}

interface NodeExecuteAfter {
	type: 'nodeExecuteAfter';
	data: {
		executionId: string;
		nodeName: string;
		data: ITaskData;
	};
}

export type ExecutionPushMessage =
	| ExecutionStarted
	| ExecutionFinished
	| ExecutionRecovered
	| NodeExecuteBefore
	| NodeExecuteAfter;
