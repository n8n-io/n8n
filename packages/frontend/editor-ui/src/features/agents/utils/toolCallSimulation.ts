import type { BadgeVariant, IconName } from '@n8n/design-system';
import type { BaseTextKey } from '@n8n/i18n';

import type { ToolCallReason, ToolCallRoute } from '../toolCallSimulation.types';

export interface ToolCallRouteDisplay {
	labelKey: BaseTextKey;
	variant: BadgeVariant;
	icon: IconName;
}

export const TOOL_CALL_ROUTE_DISPLAY: Record<ToolCallRoute, ToolCallRouteDisplay> = {
	real_read: {
		labelKey: 'agents.testRun.toolCall.route.realRead',
		variant: 'info',
		icon: 'globe',
	},
	simulated: {
		labelKey: 'agents.testRun.toolCall.route.simulated',
		variant: 'subtle',
		icon: 'flask-conical',
	},
	simulated_made_up: {
		labelKey: 'agents.testRun.toolCall.route.simulatedMadeUp',
		variant: 'warning',
		icon: 'sparkles',
	},
	blocked: {
		labelKey: 'agents.testRun.toolCall.route.blocked',
		variant: 'danger',
		icon: 'ban',
	},
};

export const TOOL_CALL_REASON_KEYS: Record<ToolCallReason, BaseTextKey> = {
	served_from_world: 'agents.testRun.toolCall.reason.servedFromWorld',
	invented_by_llm: 'agents.testRun.toolCall.reason.inventedByLlm',
	real_read_allowed: 'agents.testRun.toolCall.reason.realReadAllowed',
	unsupported_by_simulator: 'agents.testRun.toolCall.reason.unsupportedBySimulator',
	simulator_unavailable: 'agents.testRun.toolCall.reason.simulatorUnavailable',
	not_simulatable: 'agents.testRun.toolCall.reason.notSimulatable',
	blocked_by_policy: 'agents.testRun.toolCall.reason.blockedByPolicy',
};

/** What the user can do next when a call was blocked, by reason. */
export const TOOL_CALL_BLOCKED_NEXT_STEP_KEYS: Partial<Record<ToolCallReason, BaseTextKey>> = {
	unsupported_by_simulator: 'agents.testRun.toolCall.blocked.next.unsupportedBySimulator',
	simulator_unavailable: 'agents.testRun.toolCall.blocked.next.simulatorUnavailable',
	not_simulatable: 'agents.testRun.toolCall.blocked.next.notSimulatable',
	blocked_by_policy: 'agents.testRun.toolCall.blocked.next.blockedByPolicy',
};

const TOOL_CALL_BLOCKED_NEXT_STEP_FALLBACK_KEY: BaseTextKey =
	'agents.testRun.toolCall.blocked.next.fallback';

/** Reasons where the simulator, not the agent, is the cause. */
const SIMULATOR_SIDE_REASONS = new Set<ToolCallReason>([
	'unsupported_by_simulator',
	'simulator_unavailable',
]);

export function isSimulatorSideReason(reason: ToolCallReason): boolean {
	return SIMULATOR_SIDE_REASONS.has(reason);
}

/** The wire value may be newer than this client. Unknown routes render no label. */
export function getToolCallRouteDisplay(route: string): ToolCallRouteDisplay | undefined {
	return Object.hasOwn(TOOL_CALL_ROUTE_DISPLAY, route)
		? TOOL_CALL_ROUTE_DISPLAY[route as ToolCallRoute]
		: undefined;
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
