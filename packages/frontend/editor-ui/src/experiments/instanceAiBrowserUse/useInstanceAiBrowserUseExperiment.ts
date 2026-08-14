import Bowser from 'bowser';
import { computed } from 'vue';

import { INSTANCE_AI_BROWSER_USE_EXPERIMENT } from '@/app/constants/experiments';
import { usePostHog } from '@/app/stores/posthog.store';

/**
 * Browser extensions don't exist on phones and tablets
 */
function isBrowserUseSupportedOnDevice(): boolean {
	const { platform } = Bowser.parse(navigator.userAgent);
	return platform.type !== 'mobile' && platform.type !== 'tablet';
}

/**
 * Browser Use only supports Chromium through n8n Browser Use Chrome extension
 */
export function isBrowserUseSupportedForBrowser(): boolean {
	return Bowser.parse(navigator.userAgent).engine.name === 'Blink';
}

export function useInstanceAiBrowserUseExperiment() {
	const posthogStore = usePostHog();

	const isFeatureEnabled = computed(
		() =>
			isBrowserUseSupportedOnDevice() &&
			posthogStore.getVariant(INSTANCE_AI_BROWSER_USE_EXPERIMENT.name) ===
				INSTANCE_AI_BROWSER_USE_EXPERIMENT.variant,
	);

	return { isFeatureEnabled };
}
