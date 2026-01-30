import { defineStore } from 'pinia';
import { computed } from 'vue';
import { usePostHog } from '@/app/stores/posthog.store';
import { NODE_CREATOR_AI_ASSIST_EXPERIMENT } from '@/app/constants/experiments';

export const useNodeCreatorAiAssistStore = defineStore('nodeCreatorAiAssist', () => {
	const posthogStore = usePostHog();

	const isEnabled = computed(() => {
		return (
			posthogStore.getVariant(NODE_CREATOR_AI_ASSIST_EXPERIMENT.name) ===
			NODE_CREATOR_AI_ASSIST_EXPERIMENT.variant
		);
	});

	return { isEnabled };
});
