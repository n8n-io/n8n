import { z } from 'zod';

import { StrictTimeZoneSchema } from '../schemas/timezone.schema';

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
	timezone: StrictTimeZoneSchema.describe(
		'IANA timezone the cron is evaluated in, for example "Europe/London". Omit to use the instance timezone.',
	).nullish(),
});

export type AgentTaskConfig = z.infer<typeof agentTaskSchema>;

/**
 * API response shape for a task body. `enabled` and `nextRunAt` are derived
 * from the config ref on the client, so they are not part of this DTO.
 */
export interface AgentTaskDto extends AgentTaskConfig {
	id: string;
	createdAt: string;
	updatedAt: string;
}
