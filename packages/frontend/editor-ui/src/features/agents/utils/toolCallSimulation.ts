import type { IconName } from '@n8n/design-system';
import type { BaseTextKey } from '@n8n/i18n';

import type {
	ToolCallReason,
	ToolCallRoute,
	ToolCallSimulation,
} from '../toolCallSimulation.types';

/**
 * How a tool call looks in the list. This is the route, except that a call blocked by a
 * simulator gap gets its own variant, so it does not read as an agent failure.
 */
export type ToolCallDisplayVariant = ToolCallRoute | 'simulator_gap';

export interface ToolCallRouteDisplay {
	variant: ToolCallDisplayVariant;
	labelKey: BaseTextKey;
	icon: IconName;
}

export const TOOL_CALL_ROUTE_DISPLAY: Record<ToolCallDisplayVariant, ToolCallRouteDisplay> = {
	simulated: {
		variant: 'simulated',
		labelKey: 'agents.testRun.toolCall.route.simulated',
		icon: 'flask-conical',
	},
	simulated_made_up: {
		variant: 'simulated_made_up',
		labelKey: 'agents.testRun.toolCall.route.simulatedMadeUp',
		icon: 'sparkles',
	},
	blocked: {
		variant: 'blocked',
		labelKey: 'agents.testRun.toolCall.route.blocked',
		icon: 'ban',
	},
	simulator_gap: {
		variant: 'simulator_gap',
		labelKey: 'agents.testRun.toolCall.route.simulatorGap',
		icon: 'square-dashed',
	},
};

export const TOOL_CALL_REASON_KEYS: Record<ToolCallReason, BaseTextKey> = {
	served_from_world: 'agents.testRun.toolCall.reason.servedFromWorld',
	invented_by_llm: 'agents.testRun.toolCall.reason.inventedByLlm',
	unsupported_by_simulator: 'agents.testRun.toolCall.reason.unsupportedBySimulator',
	simulator_unavailable: 'agents.testRun.toolCall.reason.simulatorUnavailable',
	not_simulatable: 'agents.testRun.toolCall.reason.notSimulatable',
};

/** What the user can do next when a call was blocked, by reason. */
export const TOOL_CALL_BLOCKED_NEXT_STEP_KEYS: Partial<Record<ToolCallReason, BaseTextKey>> = {
	unsupported_by_simulator: 'agents.testRun.toolCall.blocked.next.unsupportedBySimulator',
	simulator_unavailable: 'agents.testRun.toolCall.blocked.next.simulatorUnavailable',
	not_simulatable: 'agents.testRun.toolCall.blocked.next.notSimulatable',
};

const TOOL_CALL_BLOCKED_NEXT_STEP_FALLBACK_KEY: BaseTextKey =
	'agents.testRun.toolCall.blocked.next.fallback';

// The guards below stay until TRUST-1187 validates the stream with `toolCallSimulationSchema`
// where it is parsed. Then these helpers can take `ToolCallRoute` / `ToolCallReason` directly.

function isKnownRoute(route: string): route is ToolCallRoute {
	return route !== 'simulator_gap' && Object.hasOwn(TOOL_CALL_ROUTE_DISPLAY, route);
}

/**
 * How to show a call, from its route and reason. Unknown routes render no icon.
 */
export function getToolCallDisplay(
	simulation: Pick<ToolCallSimulation, 'route' | 'reason'>,
): ToolCallRouteDisplay | undefined {
	const { route, reason } = simulation;
	if (!isKnownRoute(route)) return undefined;
	if (route === 'blocked' && reason === 'unsupported_by_simulator') {
		return TOOL_CALL_ROUTE_DISPLAY.simulator_gap;
	}
	return TOOL_CALL_ROUTE_DISPLAY[route];
}

export function getToolCallReasonKey(reason: string): BaseTextKey | undefined {
	return Object.hasOwn(TOOL_CALL_REASON_KEYS, reason)
		? TOOL_CALL_REASON_KEYS[reason as ToolCallReason]
		: undefined;
}

export function getToolCallBlockedNextStepKey(reason: string): BaseTextKey {
	return Object.hasOwn(TOOL_CALL_BLOCKED_NEXT_STEP_KEYS, reason)
		? (TOOL_CALL_BLOCKED_NEXT_STEP_KEYS[reason as ToolCallReason] ??
				TOOL_CALL_BLOCKED_NEXT_STEP_FALLBACK_KEY)
		: TOOL_CALL_BLOCKED_NEXT_STEP_FALLBACK_KEY;
}
