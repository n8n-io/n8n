import { useRouter } from 'vue-router';
import { generateNanoId } from '@n8n/utils/generate-nano-id';
import type { AgentStarter } from '../agentTemplates';
import {
	AGENT_BUILDER_VIEW,
	PENDING_AGENT_ID_STATE,
	PENDING_AGENT_STARTER_STATE,
} from '../constants';
import { useAgentTelemetry, type AgentCreateSource } from './useAgentTelemetry';

/**
 * The "new agent" action shared by every entry point (agents list, project
 * header, empty state): mint the id up front so the "clicked" and "created"
 * telemetry events join on it, report the click, then open the builder for it.
 * The builder persists the agent lazily, on the first edit.
 */
export function useCreateAgent() {
	const router = useRouter();
	const agentTelemetry = useAgentTelemetry();

	function createAgent(source: AgentCreateSource, projectId: string, starter?: AgentStarter): void {
		const agentId = generateNanoId();
		const templateId = starter?.kind === 'template' ? starter.templateId : undefined;
		if (templateId) {
			agentTelemetry.trackClickedNewAgent(source, agentId, templateId);
		} else {
			agentTelemetry.trackClickedNewAgent(source, agentId);
		}
		void router.push({
			name: AGENT_BUILDER_VIEW,
			params: { projectId, agentId },
			state: {
				[PENDING_AGENT_ID_STATE]: agentId,
				...(starter ? { [PENDING_AGENT_STARTER_STATE]: starter } : {}),
			},
		});
	}

	return { createAgent };
}
