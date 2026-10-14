export interface WorkflowsApiV1 {
	readonly version: 1;

	/** Returns the ID of the workflow that the execution belongs to, or `null` if the execution does not exist. */
	getWorkflowIdForExecution(executionId: string): Promise<string | null>;
}
