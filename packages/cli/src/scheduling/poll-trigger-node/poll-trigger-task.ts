/** Task type poll-trigger jobs are materialised under and their handler registers for. */
export const POLL_TRIGGER_TASK_TYPE = 'workflow:poll-trigger';

export type { WorkflowNodeTaskPayload as PollTriggerTaskPayload } from '../workflow-node-task-payload';
export { isWorkflowNodeTaskPayload as isPollTriggerTaskPayload } from '../workflow-node-task-payload';
