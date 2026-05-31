import { z } from 'zod';

export const AGENT_TASK_NAME_MAX_LENGTH = 128;

/** Persisted, user-editable fields of a task. */
export const agentTaskSchema = z.object({
	name: z.string().min(1).max(AGENT_TASK_NAME_MAX_LENGTH),
	objective: z.string().min(1),
	cronExpression: z.string().min(1),
	enabled: z.boolean(),
});

export type AgentTaskConfig = z.infer<typeof agentTaskSchema>;

export type AgentTaskRunStatus = 'success' | 'error';

/** API response shape: persisted fields + runtime metadata. ISO 8601 strings. */
export interface AgentTaskDto extends AgentTaskConfig {
	id: string;
	nextRunAt: string | null;
	lastRunAt: string | null;
	lastRunStatus: AgentTaskRunStatus | null;
	createdAt: string;
	updatedAt: string;
}
