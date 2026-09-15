import { useInstanceAiAvailable } from './useInstanceAiAvailability';

export interface AgentPreviewHandoffParams {
	projectId: string;
	agentId: string;
	threadId: string;
	agentName?: string;
	agentIcon?: string;
	sessionTitle?: string;
	executionId?: string;
	initialDraft?: string;
}

/**
 * `sendPreviewSessionToInstanceAi` (navigate to the full assistant with the
 * agent as an artifact) used to live here. The agent builder now hands the
 * preview session to its own embedded panel instead — see
 * `AgentBuilderView.onSendPreviewToAssistant` — so only the availability gate
 * remains.
 */
export function useInstanceAiAgentPreviewHandoff() {
	const canSendPreviewToInstanceAi = useInstanceAiAvailable();

	return { canSendPreviewToInstanceAi };
}
