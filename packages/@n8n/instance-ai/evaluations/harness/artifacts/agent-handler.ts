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
		// The only signal is `targetResource.type === 'agent'`, captured from the SSE
		// `agent-spawned` stream. The build_agent tool result is
		// `{ ok, config, configHash, updatedAt, versionId }` and carries no agent id.
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
