// Empty PostHog store - all telemetry has been removed
import { defineStore } from 'pinia';

export const usePostHog = defineStore('posthog', () => {
	return {
		init: () => {},
		reset: () => {},
		identify: () => {},
		capture: () => {},
		setMetadata: () => {},
		isFeatureEnabled: () => false,
		isVariantEnabled: () => false,
		getVariant: () => undefined,
		overrides: { value: {} },
	};
});
