// ---------------------------------------------------------------------------
// Agent artifact handler — static (no mock-execution scenarios). Captures the
// agent's sanitized JSON config plus the full content of any skills the
// builder authored, so the shared assertion judge can grade both.
// ---------------------------------------------------------------------------

import { sanitizeAgentJsonConfig } from '@n8n/api-types';

import { renderAgentArtifact } from './render-agent';
import type { AgentArtifact, ArtifactHandler } from './types';
import { collectArtifactRefIds } from '../../outcome/collect-refs';

// PROVISIONAL: the assistant does not yet emit an agent-build signal. Primary signal is
// targetResource.type === 'agent' (enum added in Step 4); the tool-name set is a best guess.
const AGENT_TOOLS = new Set<string>(['build-agent']);

export const agentHandler: ArtifactHandler<AgentArtifact> = {
	type: 'agent',
	runsExecutionScenarios: false,
	discover(ctx) {
		return collectArtifactRefIds(ctx.messages, {
			targetType: 'agent',
			toolNames: AGENT_TOOLS,
			resultKeys: ['agentId', 'id'],
		}).map((id) => ({ type: 'agent', id }));
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
