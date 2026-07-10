/**
 * create_agent — create a brand-new (empty) n8n Agent and bind the rest of the
 * conversation to it. Target-less: available before any agent exists. On
 * success it sets `context.agentBuilderTarget` for the current run and
 * persists the binding to thread metadata so later turns keep editing the
 * same agent.
 */
import { Tool } from '@n8n/agents';
import { z } from 'zod';

import { saveAgentBuilderTarget } from './agent-target-binding';
import type { InstanceAiContext } from '../../types';
import { AGENT_BUILDER_TOOL_IDS } from '../tool-ids';

export function createCreateAgentTool(context: InstanceAiContext) {
	return new Tool(AGENT_BUILDER_TOOL_IDS.CREATE_AGENT)
		.description(
			'Create a new, empty n8n agent and start building it. Call this first when there is no ' +
				'agent to configure yet (read_config / build_agent report that no agent is targeted). ' +
				'Pass a short human-readable name. After this succeeds the agent is the active build ' +
				'target for the rest of the conversation, so follow up by writing the agent config JSON ' +
				'to a workspace file and calling build_agent with its filePath. ' +
				'Returns { ok: true, agentId, projectId, name }.',
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
				// Persist so follow-up turns stay targeted at the same agent.
				await saveAgentBuilderTarget(context, context.agentBuilderTarget);
				return {
					ok: true as const,
					agentId: created.agentId,
					projectId: created.projectId,
					name: created.name,
				};
			} catch (e) {
				return {
					ok: false as const,
					errors: [{ message: e instanceof Error ? e.message : String(e) }],
				};
			}
		})
		.build();
}
