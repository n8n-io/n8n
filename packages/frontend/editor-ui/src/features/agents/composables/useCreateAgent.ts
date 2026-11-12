import { useRoute, useRouter } from 'vue-router';
import { generateNanoId } from '@n8n/utils/generate-nano-id';
import type { AgentStarter } from '../agentTemplates';
import {
	AGENT_BUILDER_VIEW,
	PENDING_AGENT_ID_STATE,
	PENDING_AGENT_STARTER_STATE,
	PROJECT_AGENTS,
} from '../constants';
import { useAgentTelemetry, type AgentCreateSource } from './useAgentTelemetry';

/**
 * Ids minted in this tab whose agent is not saved yet. The history-state marker
 * lives on one history entry only, so a link that pushes a fresh entry for the
 * same URL (e.g. the Settings back link) drops it. The builder reads this set
 * as a fallback. It holds only ids this tab minted, so a URL cannot add to it.
 */
// ponytail: in-memory, so a reload on such a fresh entry still loses the draft; move to sessionStorage if that matters.
export const unsavedAgentIds = new Set<string>();

/**
 * The "new agent" action shared by every entry point (agents list, project
 * header, empty state): mint the id up front so the "clicked" and "created"
 * telemetry events join on it, report the click, then open the builder for it.
 * The builder persists the agent lazily, on the first edit.
 */
export function useCreateAgent() {
	const router = useRouter();
	const route = useRoute();
	const agentTelemetry = useAgentTelemetry();

	function createAgent(source: AgentCreateSource, projectId: string, starter?: AgentStarter): void {
		const agentId = generateNanoId();
		unsavedAgentIds.add(agentId);
		const templateId = starter?.kind === 'template' ? starter.templateId : undefined;
		if (templateId) {
			agentTelemetry.trackClickedNewAgent(source, agentId, templateId);
		} else {
			agentTelemetry.trackClickedNewAgent(source, agentId);
		}
		void router.push({
			name: AGENT_BUILDER_VIEW,
			params: { projectId, agentId },
			...(route?.name === PROJECT_AGENTS &&
			route.params.projectId === projectId &&
			typeof route.query.folderId === 'string'
				? { query: { folderId: route.query.folderId } }
				: {}),
			state: {
				[PENDING_AGENT_ID_STATE]: agentId,
				...(starter ? { [PENDING_AGENT_STARTER_STATE]: starter } : {}),
			},
		});
	}

	return { createAgent };
}
