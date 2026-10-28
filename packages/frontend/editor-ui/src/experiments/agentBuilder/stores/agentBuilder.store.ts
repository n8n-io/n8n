import { computed } from 'vue';
import { defineStore } from 'pinia';
import { STORES } from '@n8n/stores';
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

	function trackExposure() {
		if (enrollment.value) posthog.trackExposure(enrollment.value.name);
	}
	return { enrollment, isEnabled, layout, trackExposure };
});
