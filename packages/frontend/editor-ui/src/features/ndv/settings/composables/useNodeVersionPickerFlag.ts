import { computed } from 'vue';

import { NODE_VERSION_PICKER_EXPERIMENT } from '@/app/constants/experiments';
import { usePostHog } from '@/app/stores/posthog.store';

export function useNodeVersionPickerFlag() {
	const posthog = usePostHog();

	return computed(() => posthog.isFeatureEnabled(NODE_VERSION_PICKER_EXPERIMENT.name));
}
