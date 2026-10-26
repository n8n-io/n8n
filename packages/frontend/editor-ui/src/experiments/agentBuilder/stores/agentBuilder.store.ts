import { computed } from 'vue';
import { defineStore } from 'pinia';
import { STORES } from '@n8n/stores';
import { useStorage } from '@n8n/composables/useStorage';
import {
	AGENT_BUILDER_CHAT_WIDTH_EXPERIMENT as WIDTH,
	AGENT_BUILDER_TEST_TOGGLE_EXPERIMENT as TOGGLE,
} from '@/app/constants/experiments';
import { usePostHog } from '@/app/stores/posthog.store';
import { getAgentBuilderExperimentEnrollment } from '../enrollment';
import type { AgentBuilderLayout } from '@/features/agents/composables/useAgentBuilderLayout';

export const useAgentBuilderExperimentStore = defineStore(STORES.EXPERIMENT_AGENT_BUILDER, () => {
	const posthog = usePostHog();
	const enrollment = computed(() => getAgentBuilderExperimentEnrollment(posthog.getVariant));
	const isEnabled = computed(() => enrollment.value !== undefined);
	const layout = computed<AgentBuilderLayout>(() => ({
		chatWidth:
			enrollment.value?.variant === WIDTH.wide || enrollment.value?.variant === TOGGLE.wide
				? 'wide'
				: 'current',
		testChat:
			enrollment.value?.variant === TOGGLE.wide || enrollment.value?.variant === TOGGLE.current
				? 'inline'
				: 'dock',
	}));

	// Keep the treatment's resize preference separate from the existing Assistant split.
	const storedAssistantRatio = useStorage('N8N_AGENT_BUILDER_ASSISTANT_WIDE_CHAT_RATIO');
	const assistantChatRatio = computed(() => {
		const value = Number(storedAssistantRatio.value);
		return storedAssistantRatio.value !== null && Number.isFinite(value) && value > 0 && value < 1
			? value
			: 0.65;
	});
	function resizeAssistantChat(ratio: number) {
		if (Number.isFinite(ratio) && ratio > 0 && ratio < 1)
			storedAssistantRatio.value = String(ratio);
	}
	function trackExposure() {
		if (enrollment.value) posthog.trackExposure(enrollment.value.name);
	}
	return { enrollment, isEnabled, layout, assistantChatRatio, resizeAssistantChat, trackExposure };
});
