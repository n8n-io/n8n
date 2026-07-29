import { toValue, type MaybeRefOrGetter } from 'vue';
import { TELEMETRY_EVENT } from '@n8n/telemetry';
import { useTelemetry } from '@/app/composables/useTelemetry';

import type { AgentJsonMcpServerConfig, AgentJsonToolRef } from '../types';

/**
 * Small, opinionated wrapper around `useTelemetry()` that centralizes the
 * four Agent-tool events fired from the modal + sidebar. Keeping them in one
 * place means the event names and property shapes stay consistent — and when
 * we want to add a new property everywhere (e.g. `agent_id`), there's a single
 * edit.
 *
 * Event names follow the existing n8n convention ("User did X", not
 * snake_case) — see `features/agents/views/AgentBuilderView.vue`.
 */

type ToolType = AgentJsonToolRef['type'];

/** Identifier payload — node_type for node tools, workflow name for workflow tools. */
function identityProps(ref: AgentJsonToolRef): {
	node_type?: string;
	workflow?: string;
	custom_id?: string;
} {
	if (ref.type === 'node') {
		return { node_type: ref.node?.nodeType };
	}
	if (ref.type === 'workflow') {
		return { workflow: ref.workflow };
	}
	return { custom_id: ref.id };
}

export function useAgentToolTelemetry(agentId?: MaybeRefOrGetter<string | undefined>) {
	const telemetry = useTelemetry();

	function agentProps(): { agent_id?: string } {
		const resolvedAgentId = toValue(agentId);
		return resolvedAgentId ? { agent_id: resolvedAgentId } : {};
	}

	/** Fired when the user clicks Connect on an Available row — a new-ref flow begins. */
	function trackAddStarted(toolType: ToolType) {
		telemetry.track(TELEMETRY_EVENT.AGENTS.USER_STARTED_ADDING_AGENT_TOOL, {
			tool_type: toolType,
			source: 'manual',
			...agentProps(),
		});
	}

	/** Fired when a new tool ref is saved for the first time. */
	function trackAdded(ref: AgentJsonToolRef) {
		telemetry.track(TELEMETRY_EVENT.AGENTS.USER_ADDED_AGENT_TOOL, {
			tool_type: ref.type,
			has_approval: ref.requireApproval ?? false,
			...identityProps(ref),
			...agentProps(),
		});
	}

	/** Fired when a new MCP server is saved for the first time. */
	function trackAddedMcpServer(server: AgentJsonMcpServerConfig) {
		telemetry.track(TELEMETRY_EVENT.AGENTS.USER_ADDED_AGENT_TOOL, {
			tool_type: 'mcpServer',
			has_approval: false,
			server_name: server.name,
			authentication: server.authentication,
			...agentProps(),
		});
	}

	/** Fired when an existing tool's config is saved. */
	function trackEdited(ref: AgentJsonToolRef) {
		telemetry.track(TELEMETRY_EVENT.AGENTS.USER_EDITED_AGENT_TOOL, {
			tool_type: ref.type,
			...identityProps(ref),
			...agentProps(),
		});
	}

	/** Fired when the user confirms removing a tool (from modal or sidebar). */
	function trackRemoved(ref: AgentJsonToolRef) {
		telemetry.track(TELEMETRY_EVENT.AGENTS.USER_REMOVED_AGENT_TOOL, {
			tool_type: ref.type,
			...identityProps(ref),
			...agentProps(),
		});
	}

	/** Fired when the user confirms removing an MCP server from the config modal. */
	function trackRemovedMcpServer(server: AgentJsonMcpServerConfig) {
		telemetry.track(TELEMETRY_EVENT.AGENTS.USER_REMOVED_AGENT_TOOL, {
			tool_type: 'mcpServer',
			server_name: server.name,
			...agentProps(),
		});
	}

	return {
		trackAddStarted,
		trackAdded,
		trackAddedMcpServer,
		trackEdited,
		trackRemoved,
		trackRemovedMcpServer,
	};
}
