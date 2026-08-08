import type {
	ExecutionStatus,
	ITaskData,
	ITaskStartedData,
	NodeConnectionType,
	WorkflowExecuteMode,
	WorkflowExecutionSource,
} from 'n8n-workflow';

import type { PushMessageMeta } from './meta';

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
	/**
	 * Terminal-class execution event (spinner → idle). Carries delivery metadata
	 * so it can be deduped and replayed on reconnect. See {@link PushMessageMeta}.
	 */
	meta?: PushMessageMeta;
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
	/**
	 * Delivery metadata so this terminal execution event can be deduped and
	 * replayed on reconnect. See {@link PushMessageMeta}.
	 */
	meta?: PushMessageMeta;
};

export type ExecutionRecovered = {
	type: 'executionRecovered';
	data: {
		executionId: string;
	};
};

/**
 * Server → client message closing the reconnect handshake: sent after the
 * server has re-delivered any terminal execution events the client missed (in
 * response to a `resume` message), so the client knows catch-up is done.
 */
export type ResumeComplete = {
	type: 'resumeComplete';
	data: {
		/**
		 * Execution ids whose terminal execution event was re-delivered during
		 * this resume.
		 * Informational — the client dedups by executionId regardless; empty when
		 * nothing needed replaying.
		 */
		replayed: string[];
	};
};

export type NodeExecuteBefore = {
	type: 'nodeExecuteBefore';
	data: {
		executionId: string;
		nodeName: string;
		/**
		 * Monotonic counter over this execution *segment*'s `nodeExecuteBefore` and
		 * `nodeExecuteAfter` events, assigned in engine order by the instance
		 * running the workflow. Lets the UI order node events that arrive late or
		 * out of order (e.g. after a suspended background tab resumes) and render
		 * only the latest node as executing.
		 *
		 * Scoped to a segment, not the whole execution: the counter restarts at 0
		 * for each run, including when a waiting execution (Wait/Form node) resumes
		 * — resuming rebuilds the push hooks with a fresh counter. Only compare
		 * sequence numbers within a segment; ordering does not carry across a resume
		 * boundary. Unique per event within a segment; starts at 0.
		 */
		sequenceNumber: number;
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
		/** Per-segment monotonic counter — see {@link NodeExecuteBefore}. */
		sequenceNumber: number;
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

export type ExecutionPushMessage =
	| ExecutionStarted
	| ExecutionWaiting
	| ExecutionFinished
	| ExecutionRecovered
	| ResumeComplete
	| NodeExecuteBefore
	| NodeExecuteAfter
	| NodeExecuteAfterData;
