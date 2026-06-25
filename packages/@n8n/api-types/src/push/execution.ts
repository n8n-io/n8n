import type {
	ExecutionStatus,
	ITaskData,
	ITaskStartedData,
	NodeConnectionType,
	WorkflowExecuteMode,
	WorkflowExecutionSource,
} from 'n8n-workflow';

export type ExecutionStarted = {
	type: 'executionStarted';
	data: {
		executionId: string;
		mode: WorkflowExecuteMode;
		/**
		 * Who initiated the run. Absent for ordinary user runs; `'instance_ai'`
		 * when the AI assistant ran the workflow on the user's behalf.
		 */
		source?: WorkflowExecutionSource;
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
		source?: WorkflowExecutionSource;
	};
};

export type ExecutionFinished = {
	type: 'executionFinished';
	data: {
		executionId: string;
		workflowId: string;
		status: ExecutionStatus;
		/**
		 * Who initiated the run. Absent for ordinary user runs; `'instance_ai'`
		 * when the AI assistant ran the workflow on the user's behalf.
		 */
		source?: WorkflowExecutionSource;
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
		/**
		 * The data field for task data in `NodeExecuteAfter` is always trimmed (undefined).
		 */
		data: Omit<ITaskData, 'data'>;
		/**
		 * The number of items per output connection type. This is needed so that the frontend
		 * can know how many items to expect when receiving the `NodeExecuteAfterData` message.
		 */
		itemCountByConnectionType: Partial<Record<NodeConnectionType, number[]>>;
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
		itemCountByConnectionType: NodeExecuteAfter['data']['itemCountByConnectionType'];
	};
};

/**
 * Sent once when a sub-workflow execution begins. Lets the editor display a
 * live progress overlay on the parent's "Execute Sub-workflow" node.
 */
export type SubworkflowExecutionStarted = {
	type: 'subworkflowExecutionStarted';
	data: {
		/** Root execution id whose UI session should display the overlay. */
		parentExecutionId: string;
		/** Name of the "Execute Sub-workflow" node in the parent workflow. */
		parentNodeName: string;
		/** Child sub-execution id. */
		executionId: string;
		/** Total nodes in the child workflow — used to render "X / Y". */
		totalNodes: number;
	};
};

/**
 * Sent on each child node start/finish during a sub-workflow execution.
 * Lightweight (no item data) so it can fire at high frequency.
 */
export type SubworkflowNodeProgress = {
	type: 'subworkflowNodeProgress';
	data: {
		parentExecutionId: string;
		parentNodeName: string;
		executionId: string;
		/** Currently-running node name in the child workflow. */
		currentNodeName: string;
		/** 1-based index of the node in the child workflow's execution order. */
		currentNodeIndex: number;
		totalNodes: number;
		/** 'running' on nodeExecuteBefore; 'success' | 'error' on nodeExecuteAfter. */
		phase: 'running' | 'success' | 'error';
	};
};

/**
 * Sent when a sub-workflow execution reaches a terminal state. The editor uses
 * this to clear the per-node progress overlay.
 */
export type SubworkflowExecutionFinished = {
	type: 'subworkflowExecutionFinished';
	data: {
		parentExecutionId: string;
		parentNodeName: string;
		executionId: string;
		status: ExecutionStatus;
	};
};

export type ExecutionPushMessage =
	| ExecutionStarted
	| ExecutionWaiting
	| ExecutionFinished
	| ExecutionRecovered
	| NodeExecuteBefore
	| NodeExecuteAfter
	| NodeExecuteAfterData
	| SubworkflowExecutionStarted
	| SubworkflowNodeProgress
	| SubworkflowExecutionFinished;
