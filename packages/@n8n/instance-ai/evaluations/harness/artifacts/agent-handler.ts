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
		// Refs are captured from the build-agent sub-agent's `agent-spawned` targetResource
		// (`{ type: 'agent', id }`) — the only agent signal; its tool result carries no id.
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
