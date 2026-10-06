/** PostHog selects new instances; the local license identifies the Trial plan. */
export type McpDiscoveryEligibilityInput = {
	pickedClaude?: boolean;
	now: number;
	planName?: string;
	firstLoginAt?: number;
	/** Null means no recorded Assistant change. */
	assistantMutationAt?: number | null;
};

export const MCP_DISCOVERY_DELAY_MS = 30 * 60 * 1000;
export type McpDiscoveryEligibility =
	| { status: 'unknown' }
	| { status: 'excluded'; reason: 'trial' | 'assistant' | 'client' }
	| { status: 'waiting'; eligibleAt: number }
	| { status: 'eligible'; eligibleAt: number };

/** Freeze Assistant history at the deadline; require a Trial license at assignment. */
export function evaluateMcpDiscoveryEligibility(
	input: McpDiscoveryEligibilityInput,
): McpDiscoveryEligibility {
	const { now, planName, firstLoginAt, assistantMutationAt, pickedClaude } = input;
	if (!planName) return { status: 'unknown' };
	if (planName !== 'Trial') return { status: 'excluded', reason: 'trial' };
	if (
		firstLoginAt === undefined ||
		![now, firstLoginAt].every(Number.isFinite) ||
		firstLoginAt > now ||
		assistantMutationAt === undefined ||
		(assistantMutationAt !== null && !Number.isFinite(assistantMutationAt))
	) {
		return { status: 'unknown' };
	}
	const eligibleAt = firstLoginAt + MCP_DISCOVERY_DELAY_MS;
	if (now < eligibleAt) return { status: 'waiting', eligibleAt };
	if (pickedClaude === undefined) return { status: 'unknown' };
	if (!pickedClaude) return { status: 'excluded', reason: 'client' };
	if (assistantMutationAt !== null && assistantMutationAt <= eligibleAt) {
		return { status: 'excluded', reason: 'assistant' };
	}
	return { status: 'eligible', eligibleAt };
}
