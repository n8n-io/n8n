// ---------------------------------------------------------------------------
// Agent artifact handler — static (no mock-execution scenarios). Captures the
// agent's sanitized JSON config plus the full content of any skills the
// builder authored, so the shared assertion judge can grade both.
// ---------------------------------------------------------------------------

import { sanitizeAgentJsonConfig } from '@n8n/api-types';

import { renderAgentArtifact } from './render-agent';
import type { AgentArtifact, ArtifactHandler } from './types';

export const agentHandler: ArtifactHandler<AgentArtifact> = {
	type: 'agent',
	runsExecutionScenarios: false,
	discover(ctx) {
		// Refs are captured from the `create_agent` tool result (via the agent_builder router),
		// which carries the agentId. `build_agent` only persists config and returns no id.
		return ctx.artifactRefs.filter((ref) => ref.type === 'agent');
	},
	async fetch(ref, client) {
		// Agent routes are project-scoped; the harness builds in the user's personal project.
		const projectId = await client.getPersonalProjectId();
		const [config, skills] = await Promise.all([
			client.getAgentConfig(projectId, ref.id),
			client.getAgentSkills(projectId, ref.id),
		]);
		return { config: sanitizeAgentJsonConfig(config), skills }; // sanitize at fetch -> no secrets retained
	},
	renderArtifact(artifact) {
		return renderAgentArtifact(artifact);
	},
};
