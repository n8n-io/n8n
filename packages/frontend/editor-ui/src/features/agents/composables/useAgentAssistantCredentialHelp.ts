import { useRoute } from 'vue-router';
import { computed } from 'vue';
import type { InstanceAiCredentialHelpHandler } from '@/app/composables/useInstanceAiEditorCapability';
import { useInstanceAiReady } from '@/features/ai/instanceAi/composables/useInstanceAiAvailability';
import { agentsEventBus, type AgentCredentialHelpRequest } from '../agents.eventBus';
import { AGENT_BUILDER_VIEW, AGENT_PREVIEW_VIEW } from '../constants';

export function useAgentAssistantCredentialHelp() {
	const route = useRoute();
	const ready = useInstanceAiReady();
	const isAgentUi = computed(
		() => route?.name === AGENT_BUILDER_VIEW || route?.name === AGENT_PREVIEW_VIEW,
	);

	function getCredentialHelp(): InstanceAiCredentialHelpHandler | undefined {
		if (!ready.value || !isAgentUi.value) return undefined;
		const { projectId, agentId } = route.params;
		if (typeof projectId !== 'string' || typeof agentId !== 'string') return undefined;

		return async (credential) => {
			const request: AgentCredentialHelpRequest = { projectId, agentId, credential };
			agentsEventBus.emit('credentialHelpRequested', request);
			return (await request.handle?.()) ?? false;
		};
	}
	return { isAgentUi, getCredentialHelp };
}
