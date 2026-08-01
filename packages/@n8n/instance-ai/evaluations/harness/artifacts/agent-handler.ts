// ---------------------------------------------------------------------------
// Agent artifact handler — static (no mock-execution scenarios). Captures the
// agent's sanitized JSON config plus the full content of any skills the
// builder authored, so the shared assertion judge can grade both.
// ---------------------------------------------------------------------------

import { sanitizeAgentJsonConfig } from '@n8n/api-types';

import { renderAgentArtifact } from './render-agent';
import type { AgentArtifact, ArtifactHandler } from './types';
import { N8nApiError } from '../../clients/n8n-client';

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
		try {
			const [config, skills] = await Promise.all([
				client.getAgentConfig(projectId, ref.id),
				client.getAgentSkills(projectId, ref.id),
			]);
			return { config: sanitizeAgentJsonConfig(config), skills }; // sanitize at fetch -> no secrets retained
		} catch (error) {
			// The ref comes from `agent-spawned`, published when the builder session
			// is constructed — before it has written anything. An agent row only
			// exists once the builder writes config, so a 404 here means the build
			// produced no agent. That's a gradeable outcome, not a harness failure.
			if (error instanceof N8nApiError && error.status === 404) {
				return { config: null, skills: {}, notCreated: true };
			}
			throw error;
		}
	},
	renderArtifact(artifact) {
		return renderAgentArtifact(artifact);
	},
};
