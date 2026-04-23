import { BUILDER_AGENT_PROMPT, MAX_STEPS } from '@n8n/instance-ai';

export interface SubAgentRoleConfig {
	/** System prompt that drives the agent's behavior. */
	systemPrompt: string;
	/** Human-readable role label injected into the agent's id. */
	label: string;
	/** Default step budget, sourced from the same `MAX_STEPS` table production uses. */
	defaultMaxSteps: number;
}

/**
 * Registry of sub-agent roles the eval endpoint can run.
 *
 * The full native tool surface (`createAllTools(context)`) is exposed to every
 * sub-agent; there is no per-role tool allowlist. This mirrors how the
 * orchestrator spawns sub-agents in production and ensures the eval harness
 * stays in sync with tool additions/removals automatically.
 */
export const SUB_AGENT_ROLES: Record<string, SubAgentRoleConfig> = {
	builder: {
		systemPrompt: BUILDER_AGENT_PROMPT,
		label: 'builder',
		defaultMaxSteps: MAX_STEPS.BUILDER,
	},
};

export function resolveSubAgentRole(role: string): SubAgentRoleConfig {
	const config = SUB_AGENT_ROLES[role];
	if (!config) {
		const available = Object.keys(SUB_AGENT_ROLES).join(', ');
		throw new Error(`Unknown sub-agent role "${role}". Available: ${available}`);
	}
	return config;
}
