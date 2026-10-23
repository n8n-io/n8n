const isNonEmptyString = (value: unknown): value is string =>
	typeof value === 'string' && value !== '';

/** What a task payload carries to name a node inside a workflow. */
export interface WorkflowNodeTaskPayload {
	workflowId: string;
	nodeId: string;
}

/** Validates the payload snapshot the materializer copied from the job onto the task. */
export const isWorkflowNodeTaskPayload = (
	payload: Record<string, unknown>,
): payload is Record<string, unknown> & WorkflowNodeTaskPayload =>
	isNonEmptyString(payload.workflowId) && isNonEmptyString(payload.nodeId);
