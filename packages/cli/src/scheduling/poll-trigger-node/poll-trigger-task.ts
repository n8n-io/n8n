/** Task type poll-trigger jobs are materialized under and their handler registers for. */
export const POLL_TRIGGER_TASK_TYPE = 'workflow:poll-trigger';

/** What a poll-trigger job carries through materialization to its handler. */
export interface PollTriggerTaskPayload {
	workflowId: string;
	nodeId: string;
}

const isNonEmptyString = (value: unknown): value is string =>
	typeof value === 'string' && value !== '';

/** Validates the payload the materialiser copied from the job onto the task. */
export const isPollTriggerTaskPayload = (
	payload: Record<string, unknown>,
): payload is Record<string, unknown> & PollTriggerTaskPayload =>
	isNonEmptyString(payload.workflowId) && isNonEmptyString(payload.nodeId);
