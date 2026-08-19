/**
 * Task type routing durable-scheduler occurrences to the agent-task handler.
 * Jobs of this type are owned by an agent through `agent_task_schedule`, with
 * `workflowId`/`nodeId` NULL on the job row.
 */
export const AGENT_TASK_TASK_TYPE = 'agent:scheduled-task';

/**
 * Stamped on every agent-task job and copied onto each occurrence. Carries no
 * version id: the handler re-reads the agent's `activeVersionId` at fire time,
 * so an occurrence materialized before a republish runs the newest published
 * snapshot.
 */
export interface AgentTaskJobPayload {
	agentId: string;
	taskId: string;
}

export function isAgentTaskJobPayload(payload: unknown): payload is AgentTaskJobPayload {
	if (typeof payload !== 'object' || payload === null) return false;
	const candidate = payload as Record<string, unknown>;
	return typeof candidate.agentId === 'string' && typeof candidate.taskId === 'string';
}

/** Unique job name for one agent task; task ids are unique within an agent. */
export function agentTaskJobName(agentId: string, taskId: string): string {
	return `agent-task:${agentId}:${taskId}`;
}

/** Recover the task id from a job name built by {@link agentTaskJobName}. */
export function taskIdFromJobName(agentId: string, jobName: string): string {
	return jobName.slice(`agent-task:${agentId}:`.length);
}
