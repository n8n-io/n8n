import type {
	ExecutionStatus,
	ITaskData,
	ITaskStartedData,
	WorkflowExecuteMode,
} from 'n8n-workflow';

export type ExecutionStarted = {
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

export type ExecutionWaiting = {
	type: 'executionWaiting';
	data: {
		executionId: string;
	};
};

export type ExecutionFinished = {
	type: 'executionFinished';
	data: {
		executionId: string;
		workflowId: string;
		status: ExecutionStatus;
		/** @deprecated: Please construct execution data in the frontend from the data pushed in previous messages, instead of depending on this additional payload serialization */
		rawData?: string;
	};
};

export type ExecutionRecovered = {
	type: 'executionRecovered';
	data: {
		executionId: string;
	};
};

export type NodeExecuteBefore = {
	type: 'nodeExecuteBefore';
	data: {
		executionId: string;
		nodeName: string;
		data: ITaskStartedData;
	};
};

/**
 * Message sent after a node has finished executing that contains all that node's data
 * except for the output items which are sent in the `NodeExecuteAfterData` message.
 */
export type NodeExecuteAfter = {
	type: 'nodeExecuteAfter';
	data: {
		executionId: string;
		nodeName: string;
		data: Omit<ITaskData, 'data'>;
		itemCount: number;
	};
};

/**
 * Message sent after a node has finished executing that contains the entire output data
 * of that node. This is sent immediately after `NodeExecuteAfter`.
 */
export type NodeExecuteAfterData = {
	type: 'nodeExecuteAfterData';
	data: {
		executionId: string;
		nodeName: string;
		/**
		 * When a worker relays updates about a manual execution to main, if the
		 * payload size is above a limit, we send only a placeholder to the client.
		 * Later we fetch the entire execution data and fill in any placeholders.
		 */
		data: ITaskData;
		itemCount: number;
	};
};

export type ExecutionPushMessage =
	| ExecutionStarted
	| ExecutionWaiting
	| ExecutionFinished
	| ExecutionRecovered
	| NodeExecuteBefore
	| NodeExecuteAfter
	| NodeExecuteAfterData;
