import type { AgentRuntimeOverlay } from '@n8n/agents';

import type { AgentExpressionContext } from './agent-expression-context';
import { resolveAgentRunFields, type AgentRunFieldSources } from './agent-run-fields';

export type AgentRunOverlay = AgentRuntimeOverlay;

export type AgentRunOverlayFactory = (context: AgentExpressionContext) => Promise<AgentRunOverlay>;

/** Capture raw persisted sources once, then materialize a fresh isolated overlay for every run. */
export function createAgentRunOverlayFactory(
	sources: AgentRunFieldSources,
): AgentRunOverlayFactory {
	const rawSources: AgentRunFieldSources = structuredClone({
		config: sources.config,
		skills: sources.skills,
	});
	if (sources.resolveNodeToolInputSchema) {
		rawSources.resolveNodeToolInputSchema = sources.resolveNodeToolInputSchema;
	}

	return async (context) => await resolveAgentRunFields(rawSources, context);
}
