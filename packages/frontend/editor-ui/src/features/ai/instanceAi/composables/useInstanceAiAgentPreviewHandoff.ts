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
	agentName?: string;
	agentIcon?: string;
	sessionTitle?: string;
	executionId?: string;
}

export function useInstanceAiAgentPreviewHandoff() {
	const telemetry = useTelemetry();
	const canSendPreviewToInstanceAi = useInstanceAiAvailable();
	const { openThreadWithContext } = useInstanceAiHandoff();

	async function sendPreviewSessionToInstanceAi({
		projectId,
		agentId,
		threadId,
		agentName,
		agentIcon,
		sessionTitle,
		executionId,
	}: AgentPreviewHandoffParams): Promise<void> {
		if (!canSendPreviewToInstanceAi.value || !projectId || !agentId || !threadId) return;

		const opened = await openThreadWithContext(
			projectId,
			buildInstanceAiAgentPreviewHandoffContext({
				agentId,
				threadId,
				agentName,
				agentIcon,
				sessionTitle,
				executionId,
			}),
			{
				source: 'agent_preview',
				origin: 'internal',
				sourceContext: { agentId, previewThreadId: threadId },
			},
			{ newTab: true },
		);
		if (!opened) return;

		telemetry.track('Instance AI opened from agent preview', {
			agent_id: agentId,
			preview_thread_id: threadId,
			...(executionId ? { preview_execution_id: executionId } : {}),
		});
	}

	return { canSendPreviewToInstanceAi, sendPreviewSessionToInstanceAi };
}
