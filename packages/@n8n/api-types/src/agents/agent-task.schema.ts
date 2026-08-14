import { z } from 'zod';

export const AGENT_TASK_NAME_MAX_LENGTH = 128;
export const AGENT_TASK_ID_MAX_LENGTH = 32;
export const AGENT_TASK_OBJECTIVE_MAX_LENGTH = 10_000;
export const AGENT_TASK_CRON_EXPRESSION_MAX_LENGTH = 128;

/**
 * Persisted, user-editable body of a task. Membership + enabled state live in
 * the agent config as `{ type: 'task', id, enabled }` refs (mirroring skills),
 * so they are intentionally not part of the body.
 */
export const agentTaskSchema = z.object({
	name: z.string().min(1).max(AGENT_TASK_NAME_MAX_LENGTH),
	objective: z.string().min(1).max(AGENT_TASK_OBJECTIVE_MAX_LENGTH),
	cronExpression: z
		.string()
		.min(1)
		.max(AGENT_TASK_CRON_EXPRESSION_MAX_LENGTH)
		.describe('Standard five-field cron expression, for example "0 9 * * *"'),
});

export type AgentTaskConfig = z.infer<typeof agentTaskSchema>;

/**
 * A task as embedded in exported agent JSON: the persisted body plus the
 * `enabled` flag from its config ref. Refs alone are dropped on import (the
 * body lives in a separate table), so export inlines the full definition and
 * import recreates it via the task API.
 */
export const agentExportedTaskSchema = agentTaskSchema.extend({
	enabled: z.boolean(),
});

export const agentExportedTasksSchema = z.array(agentExportedTaskSchema);

export type AgentExportedTask = z.infer<typeof agentExportedTaskSchema>;

/**
 * API response shape for a task body. `enabled` and `nextRunAt` are derived
 * from the config ref on the client, so they are not part of this DTO.
 */
export interface AgentTaskDto extends AgentTaskConfig {
	id: string;
	createdAt: string;
	updatedAt: string;
}
