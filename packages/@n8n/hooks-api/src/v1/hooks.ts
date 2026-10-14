export type ExecutionModeV1 =
	| 'cli'
	| 'error'
	| 'integrated'
	| 'internal'
	| 'manual'
	| 'retry'
	| 'trigger'
	| 'webhook'
	| 'evaluation'
	| 'chat'
	| 'agent';

/** Who started the run. `undefined` means a regular run that a user started. */
export type ExecutionSourceV1 = 'user' | 'instance_ai';

export interface WorkflowPreExecuteEventV1 {
	workflow: {
		id: string;
		name: string;
		active: boolean;
	};
	mode: ExecutionModeV1;
	source?: ExecutionSourceV1;
}

export interface WorkflowHooksV1 {
	readonly version: 1;

	/**
	 * Runs before each workflow execution. Throw to stop the execution.
	 * n8n shows the error message to the user.
	 */
	onPreExecute(handler: (event: WorkflowPreExecuteEventV1) => Promise<void>): void;
}
