/**
 * Agent-builder tools — give the instance AI the ability to create and
 * configure n8n *Agents* (the `AgentJsonConfig` artifact). Registered as a
 * deferred tool and loaded on demand by the agent-builder skill. Only created
 * when the host provides `agentBuilderService`.
 *
 * Most builder actions are exposed through a single `agent_builder` router
 * (action discriminator). There are no interactive picker tools: instance AI
 * has no picker cards, so user choices go through the native `ask-user` tool,
 * and credentials are read via the native `credentials` tool (action `list`).
 * The one exception is `configure_channel`: chat-channel setup needs an
 * interactive HITL card, and the router can't suspend, so it is registered as
 * its own deferred tool.
 */
import type { BuiltTool } from '@n8n/agents';

import { createConfigureChannelTool } from './configure-channel.tool';
import { createAgentBuilderRouterTool } from './router';
import { createToolRegistry } from '../../tool-registry';
import type { InstanceAiContext, InstanceAiToolRegistry } from '../../types';
import { AGENT_BUILDER_TOOL_IDS } from '../tool-ids';

/**
 * True when the context can back the agent-builder tools. Requires only the
 * service — not a target — so create_agent (via the router) is available before
 * any agent exists. Per-action handlers re-guard and stay inert (structured
 * `{ ok: false }`) until `agentBuilderTarget` is set (by create_agent or a
 * pre-bound thread).
 */
export function hasAgentBuilderSupport(context: InstanceAiContext): boolean {
	return Boolean(context.agentBuilderService);
}

/**
 * Build the agent-builder tool registry. Returns an empty registry when the
 * context lacks agent-builder support, so callers can register unconditionally.
 */
export function createAgentBuilderTools(context: InstanceAiContext): InstanceAiToolRegistry {
	if (!hasAgentBuilderSupport(context)) return createToolRegistry();

	const tools: Array<[string, BuiltTool]> = [
		[AGENT_BUILDER_TOOL_IDS.AGENT_BUILDER, createAgentBuilderRouterTool(context)],
		[AGENT_BUILDER_TOOL_IDS.CONFIGURE_CHANNEL, createConfigureChannelTool(context)],
	];

	return createToolRegistry(tools);
}
