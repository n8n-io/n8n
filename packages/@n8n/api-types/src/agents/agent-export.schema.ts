import { z } from 'zod';

import { agentTaskSchema } from './agent-task.schema';

/**
 * A scheduled task as carried by exported agent JSON: the persisted body plus
 * the `enabled` flag from its `config.tasks` ref. Task ids are per-agent and
 * generated on create, so the export carries no id — an import recreates each
 * task (and its ref) instead of reusing one.
 */
export const AgentExportTaskSchema = agentTaskSchema.extend({ enabled: z.boolean() }).strict();

/**
 * The extras an exported agent JSON file carries next to the agent config.
 * Deliberately a superset of `AgentJsonConfig` rather than an
 * `{ config, tasks }` envelope, so an exported file still validates as an agent
 * config everywhere else; `sanitizeAgentJsonConfig` drops the extra key when a
 * whole export is submitted as a config.
 */
export const AgentExportSchema = z.object({
	taskDefinitions: z.array(AgentExportTaskSchema).optional(),
});

export type AgentExportTask = z.infer<typeof AgentExportTaskSchema>;
export type AgentExport = z.infer<typeof AgentExportSchema>;
