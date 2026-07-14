import { useTelemetry } from '@/app/composables/useTelemetry';

import { useInstanceAiAvailable } from './useInstanceAiAvailability';
import {
	buildInstanceAiAgentPreviewHandoffContext,
	useInstanceAiHandoff,
} from './useInstanceAiHandoff';

interface AgentPreviewHandoffParams {
	projectId: string;
	agentId: string;
	threadId: string;
}

export function useInstanceAiAgentPreviewHandoff() {
	const telemetry = useTelemetry();
	const canSendPreviewToInstanceAi = useInstanceAiAvailable();
	const { openThreadWithContext } = useInstanceAiHandoff();

	async function sendPreviewSessionToInstanceAi({
		projectId,
		agentId,
		threadId,
	}: AgentPreviewHandoffParams): Promise<void> {
		if (!canSendPreviewToInstanceAi.value || !projectId || !agentId || !threadId) return;

		await openThreadWithContext(
			projectId,
			buildInstanceAiAgentPreviewHandoffContext({ agentId, threadId }),
			{ newTab: true },
		);

		telemetry.track('Instance AI opened from agent preview', {
			agent_id: agentId,
			preview_thread_id: threadId,
		});
	}

	return { canSendPreviewToInstanceAi, sendPreviewSessionToInstanceAi };
}
