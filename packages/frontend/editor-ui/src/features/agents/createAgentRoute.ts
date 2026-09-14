import type { RouteLocationRaw } from 'vue-router';
import { generateNanoId } from '@n8n/utils/generate-nano-id';
import { AGENT_BUILDER_VIEW, PENDING_AGENT_ID_STATE } from './constants';

/**
 * Routes straight to the builder for a new agent. `agentId` lets a caller that
 * reports the click (telemetry) pin the id the click will eventually produce;
 * omit it and one is minted here. The builder mints the id's n8n Assistant
 * thread and persists the agent lazily, on the first configuration change or
 * assistant edit.
 */
export function newAgentRoute(
	projectId: string,
	agentId: string = generateNanoId(),
): RouteLocationRaw {
	return {
		name: AGENT_BUILDER_VIEW,
		params: { projectId, agentId },
		state: { [PENDING_AGENT_ID_STATE]: agentId },
	};
}
