import { useRouter } from 'vue-router';
import { generateNanoId } from '@n8n/utils/generate-nano-id';
import { newAgentRoute } from '../createAgentRoute';
import { useAgentTelemetry, type AgentCreateSource } from './useAgentTelemetry';

/**
 * The "new agent" action shared by every entry point (agents list, project
 * header, empty state): mint the id up front so the "clicked" and "created"
 * telemetry events join on it, report the click, then open the builder for it.
 */
export function useCreateAgent() {
	const router = useRouter();
	const agentTelemetry = useAgentTelemetry();

	function createAgent(source: AgentCreateSource, projectId: string): void {
		const agentId = generateNanoId();
		agentTelemetry.trackClickedNewAgent(source, agentId);
		void router.push(newAgentRoute(projectId, agentId));
	}

	return { createAgent };
}
