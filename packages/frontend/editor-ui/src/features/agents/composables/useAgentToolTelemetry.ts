import { useTelemetry } from '@/app/composables/useTelemetry';
import type { GenericValue } from 'n8n-workflow';

import type { AgentJsonToolRef } from '../types';

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
function identityProps(ref: AgentJsonToolRef): Record<string, GenericValue> {
	if (ref.type === 'node') {
		return { node_type: ref.node?.nodeType };
	}
	if (ref.type === 'workflow') {
		return { workflow: ref.workflow };
	}
	return { custom_id: ref.id };
}

export function useAgentToolTelemetry(agentId?: string) {
	const telemetry = useTelemetry();

	function withAgent(props: Record<string, GenericValue>): Record<string, GenericValue> {
		return agentId ? { ...props, agent_id: agentId } : props;
	}

	/** Fired when the user clicks Connect on an Available row — a new-ref flow begins. */
	function trackAddStarted(toolType: ToolType) {
		telemetry.track(
			'User started adding agent tool',
			withAgent({ tool_type: toolType, source: 'manual' }),
		);
	}

	/** Fired when a new tool ref is saved for the first time. */
	function trackAdded(ref: AgentJsonToolRef) {
		telemetry.track(
			'User added agent tool',
			withAgent({
				tool_type: ref.type,
				has_approval: ref.requireApproval ?? false,
				...identityProps(ref),
			}),
		);
	}

	/** Fired when an existing tool's config is saved. */
	function trackEdited(ref: AgentJsonToolRef) {
		telemetry.track(
			'User edited agent tool',
			withAgent({ tool_type: ref.type, ...identityProps(ref) }),
		);
	}

	/** Fired when the user confirms removing a tool (from modal or sidebar). */
	function trackRemoved(ref: AgentJsonToolRef) {
		telemetry.track(
			'User removed agent tool',
			withAgent({ tool_type: ref.type, ...identityProps(ref) }),
		);
	}

	return { trackAddStarted, trackAdded, trackEdited, trackRemoved };
}
