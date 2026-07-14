import { useI18n } from '@n8n/i18n';

import { useTelemetry } from '@/app/composables/useTelemetry';

import { useInstanceAiAvailable } from './useInstanceAiAvailability';
import {
	buildInstanceAiAgentPreviewHandoffContext,
	buildInstanceAiAgentPreviewQuestion,
	useInstanceAiHandoff,
} from './useInstanceAiHandoff';

interface AgentPreviewHandoffParams {
	projectId: string;
	agentId: string;
	threadId: string;
}

export function useInstanceAiAgentPreviewHandoff() {
	const i18n = useI18n();
	const telemetry = useTelemetry();
	const canSendPreviewToInstanceAi = useInstanceAiAvailable();
	const { startThread } = useInstanceAiHandoff();

	async function sendPreviewSessionToInstanceAi({
		projectId,
		agentId,
		threadId,
	}: AgentPreviewHandoffParams): Promise<void> {
		if (!canSendPreviewToInstanceAi.value || !projectId || !agentId || !threadId) return;

		await startThread(
			projectId,
			i18n.baseText('agents.builder.preview.sendToAssistant.message') ??
				buildInstanceAiAgentPreviewQuestion(),
			undefined,
			undefined,
			{
				newTab: true,
				context: buildInstanceAiAgentPreviewHandoffContext({ agentId, threadId }),
			},
		);

		telemetry.track('Instance AI opened from agent preview', {
			agent_id: agentId,
			preview_thread_id: threadId,
		});
	}

	return { canSendPreviewToInstanceAi, sendPreviewSessionToInstanceAi };
}
