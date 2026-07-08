/**
 * create_agent — create a brand-new (empty) n8n Agent and bind the rest of the
 * run to it. Target-less: available before any agent exists. On success it sets
 * `context.agentBuilderTarget` so subsequent config tools resolve the new agent
 * within the same run; the host adapter is responsible for persisting the
 * binding to thread state so later turns stay targeted.
 */
import { Tool } from '@n8n/agents';
import { z } from 'zod';

import type { InstanceAiContext } from '../../types';
import { AGENT_BUILDER_TOOL_IDS } from '../tool-ids';

export function createCreateAgentTool(context: InstanceAiContext) {
	return new Tool(AGENT_BUILDER_TOOL_IDS.CREATE_AGENT)
		.description(
			'Create a new, empty n8n agent and start building it. Call this first when there is no ' +
				'agent to configure yet (read_config / write_config / patch_config report that no agent is ' +
				'targeted). Pass a short human-readable name. After this succeeds the agent is the active ' +
				'build target for the rest of the conversation, so follow up with read_config then ' +
				'write_config to set its instructions, model, and tools. Returns { ok: true, agentId, name }.',
		)
		.input(
			z.object({
				name: z
					.string()
					.min(1)
					.max(128)
					.describe('Short, human-readable agent name, e.g. "Support Triage Agent"'),
			}),
		)
		.handler(async ({ name }) => {
			if (!context.agentBuilderService) {
				return {
					ok: false as const,
					errors: [{ message: 'Agent building is not available in this context.' }],
				};
			}
			try {
				const created = await context.agentBuilderService.createAgent(name, context.projectId);
				// Bind the run to the new agent so later config tools resolve it.
				context.agentBuilderTarget = {
					agentId: created.agentId,
					projectId: created.projectId,
				};
				return { ok: true as const, agentId: created.agentId, name: created.name };
			} catch (e) {
				return {
					ok: false as const,
					errors: [{ message: e instanceof Error ? e.message : String(e) }],
				};
			}
		})
		.build();
}
