import type { AgentCapabilitySummary } from '@n8n/api-types';

/**
 * Dismissal key for the "test your agent" suggestion, stored alongside the
 * handoff-context keys in `dismissedContextKeys`. Scoped per agent so
 * dismissing it for one agent doesn't suppress it for another built later in
 * the same thread.
 */
export function testAgentOfferKey(agentId: string): string {
	return `test-agent:${agentId}`;
}

/**
 * Whether an agent is set up enough to be worth testing.
 *
 * A model alone isn't enough — an agent with no tools and no skills has almost
 * no behaviour to get wrong, so generated cases would only exercise the model's
 * prose. Requiring one capability is what makes the suggestion land at the
 * moment the design describes ("your agent is set up") rather than the moment
 * the row was created.
 */
export function isAgentWorthTesting(summary: AgentCapabilitySummary | null): boolean {
	if (!summary?.model) return false;
	return summary.tools.length + summary.skills.length > 0;
}
