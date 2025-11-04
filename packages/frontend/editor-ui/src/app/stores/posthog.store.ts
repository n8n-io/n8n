/**
 * Local Feature Flags Store (PostHog Removed)
 *
 * This file maintains API compatibility with the original PostHog store
 * but removes all external tracking and analytics functionality.
 *
 * Feature flags are now managed locally without any external dependencies.
 */

import type { Ref } from 'vue';
import { ref, computed } from 'vue';
import { defineStore } from 'pinia';
import { useStorage } from '@/app/composables/useStorage';
import type { FeatureFlags, IDataObject } from 'n8n-workflow';
import { LOCAL_STORAGE_EXPERIMENT_OVERRIDES } from '@/app/constants';

export type PosthogStore = ReturnType<typeof usePostHog>;

export const usePostHog = defineStore('posthog', () => {
	const featureFlags: Ref<FeatureFlags | null> = ref(null);
	const overrides: Ref<Record<string, string | boolean>> = ref({});

	const reset = () => {
		// No PostHog reset needed
		featureFlags.value = null;
	};

	const getVariant = (experiment: keyof FeatureFlags): FeatureFlags[keyof FeatureFlags] => {
		// Priority: overrides > server-provided featureFlags > false (default)
		return overrides.value[experiment] ?? featureFlags.value?.[experiment] ?? false;
	};

	const isVariantEnabled = (experiment: string, variant: string) => {
		return getVariant(experiment) === variant;
	};

	/**
	 * Checks if the given feature flag is enabled. Should only be used for boolean flags
	 */
	const isFeatureEnabled = (experiment: keyof FeatureFlags) => {
		return getVariant(experiment) === true;
	};

	// Initialize local feature flags override mechanism (for development/testing)
	if (!window.featureFlags) {
		const cachedOverrides = useStorage(LOCAL_STORAGE_EXPERIMENT_OVERRIDES).value;
		if (cachedOverrides) {
			try {
				console.log('[FeatureFlags] Loading overrides from localStorage');
				const parsedOverrides = JSON.parse(cachedOverrides);
				if (typeof parsedOverrides === 'object') {
					overrides.value = parsedOverrides;
				}
			} catch (e) {
				console.warn('[FeatureFlags] Could not load overrides:', e);
			}
		}

		window.featureFlags = {
			override: (name: string, value: string | boolean) => {
				overrides.value[name] = value;
				try {
					useStorage(LOCAL_STORAGE_EXPERIMENT_OVERRIDES).value = JSON.stringify(overrides.value);
					console.log(`[FeatureFlags] Override set: ${name} = ${value}`);
				} catch (e) {
					console.error('[FeatureFlags] Failed to save override:', e);
				}
			},
			getVariant,
			getAll: () => featureFlags.value ?? {},
		};
	}

	/**
	 * No-op identify function (PostHog removed)
	 */
	const identify = () => {
		// Local feature flags - no external identification needed
	};

	/**
	 * Initialize feature flags from server settings
	 * PostHog initialization is completely removed
	 */
	const init = (evaluatedFeatureFlags?: FeatureFlags) => {
		console.log('[FeatureFlags] Initializing local feature flags (PostHog disabled)');

		if (evaluatedFeatureFlags && Object.keys(evaluatedFeatureFlags).length) {
			featureFlags.value = evaluatedFeatureFlags;
			console.log('[FeatureFlags] Loaded feature flags from server:', evaluatedFeatureFlags);
		} else {
			console.log('[FeatureFlags] No feature flags provided, using defaults');
		}
	};

	/**
	 * No-op metadata setter (PostHog removed)
	 */
	const setMetadata = (metadata: IDataObject, target: 'user' | 'events') => {
		// No external tracking - metadata not sent anywhere
	};

	/**
	 * No-op capture function (PostHog removed)
	 */
	const capture = (event: string, properties: IDataObject) => {
		// No external tracking - events not captured
	};

	// Always return false since PostHog is disabled
	const isEnabled = computed(() => false);

	return {
		// State
		featureFlags,
		overrides,
		isEnabled,

		// Methods
		init,
		isFeatureEnabled,
		isVariantEnabled,
		getVariant,
		reset,
		identify,
		setMetadata,
		capture,
	};
});
