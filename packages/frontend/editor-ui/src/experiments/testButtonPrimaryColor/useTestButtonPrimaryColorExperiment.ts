import { computed } from 'vue';

import { TEST_BUTTON_PRIMARY_COLOR_EXPERIMENT } from '@/app/constants/experiments';
import { usePostHog } from '@/app/stores/posthog.store';

export function useTestButtonPrimaryColorExperiment() {
	const posthog = usePostHog();
	const isEnabled = computed(() =>
		posthog.isVariantEnabled(
			TEST_BUTTON_PRIMARY_COLOR_EXPERIMENT.name,
			TEST_BUTTON_PRIMARY_COLOR_EXPERIMENT.variant,
		),
	);

	return { isEnabled };
}
