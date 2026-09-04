/**
 * Task type that routes durable-scheduler occurrences to the agent-task handler.
 * The agent (`ownerId`) owns a job of this type through one of its scheduled
 * tasks (`ownerMemberId`).
 */
export const AGENT_TASK_TASK_TYPE = 'agent:scheduled-task';

/**
 * Stamped on every agent-task job and copied onto each occurrence. It carries
 * no version id. The handler reads the `activeVersionId` of the agent again at
 * fire time, so an occurrence materialized before a republish runs the newest
 * published snapshot.
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

/** Unique job name for one agent task. Task ids are unique within an agent. */
export function agentTaskJobName(agentId: string, taskId: string): string {
	return `agent-task:${agentId}:${taskId}`;
}
