import { computed } from 'vue';

import { ASSISTANT_SKILLS_EXPERIMENT } from '@/app/constants/experiments';
import { usePostHog } from '@/app/stores/posthog.store';

export function useAssistantSkillsExperiment() {
	const posthog = usePostHog();
	const isEnabled = computed(() => posthog.isFeatureEnabled(ASSISTANT_SKILLS_EXPERIMENT.name));

	return { isEnabled };
}
