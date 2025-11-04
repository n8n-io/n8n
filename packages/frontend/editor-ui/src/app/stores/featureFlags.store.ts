/**
 * Feature Flags Store
 *
 * Manages feature flags with local override capabilities for development/testing.
 * Feature flags are evaluated server-side and sent to the frontend during initialization.
 */

import type { Ref } from 'vue';
import { ref, computed } from 'vue';
import { defineStore } from 'pinia';
import { useStorage } from '@/app/composables/useStorage';
import type { FeatureFlags } from 'n8n-workflow';
import { LOCAL_STORAGE_EXPERIMENT_OVERRIDES } from '@/app/constants';

export type FeatureFlagsStore = ReturnType<typeof useFeatureFlags>;

/**
 * Feature Flags Store
 *
 * Provides access to server-evaluated feature flags with local override support.
 * Priority order: local overrides > server flags > default (false)
 */
export const useFeatureFlags = defineStore('featureFlags', () => {
	// ========== State ==========

	/**
	 * Feature flags evaluated and provided by the server
	 */
	const featureFlags: Ref<FeatureFlags | null> = ref(null);

	/**
	 * Local overrides for development/testing
	 * Takes precedence over server-provided flags
	 */
	const overrides: Ref<Record<string, string | boolean>> = ref({});

	// ========== Computed ==========

	/**
	 * Indicates if the feature flag system is initialized
	 */
	const isInitialized = computed(() => featureFlags.value !== null);

	// ========== Methods ==========

	/**
	 * Reset the feature flags state
	 */
	const reset = () => {
		featureFlags.value = null;
		overrides.value = {};
	};

	/**
	 * Get the value/variant of a feature flag
	 *
	 * @param experiment - The feature flag key
	 * @returns The flag value (priority: overrides > server flags > false)
	 */
	const getVariant = (experiment: keyof FeatureFlags): FeatureFlags[keyof FeatureFlags] => {
		return overrides.value[experiment] ?? featureFlags.value?.[experiment] ?? false;
	};

	/**
	 * Check if a specific variant is enabled for a feature flag
	 *
	 * @param experiment - The feature flag key
	 * @param variant - The variant value to check
	 * @returns True if the current variant matches the specified variant
	 */
	const isVariantEnabled = (experiment: string, variant: string) => {
		return getVariant(experiment) === variant;
	};

	/**
	 * Check if a boolean feature flag is enabled
	 * Should only be used for flags that return true/false
	 *
	 * @param experiment - The feature flag key
	 * @returns True if the flag is enabled
	 */
	const isFeatureEnabled = (experiment: keyof FeatureFlags) => {
		return getVariant(experiment) === true;
	};

	/**
	 * Set a local override for a feature flag
	 * Persisted to localStorage for development/testing
	 *
	 * @param name - The feature flag key
	 * @param value - The override value
	 */
	const override = (name: string, value: string | boolean) => {
		overrides.value[name] = value;
		try {
			useStorage(LOCAL_STORAGE_EXPERIMENT_OVERRIDES).value = JSON.stringify(overrides.value);
			console.log(`[FeatureFlags] Override set: ${name} = ${value}`);
		} catch (e) {
			console.error('[FeatureFlags] Failed to save override:', e);
		}
	};

	/**
	 * Clear a local override for a feature flag
	 *
	 * @param name - The feature flag key
	 */
	const clearOverride = (name: string) => {
		delete overrides.value[name];
		try {
			useStorage(LOCAL_STORAGE_EXPERIMENT_OVERRIDES).value = JSON.stringify(overrides.value);
			console.log(`[FeatureFlags] Override cleared: ${name}`);
		} catch (e) {
			console.error('[FeatureFlags] Failed to clear override:', e);
		}
	};

	/**
	 * Clear all local overrides
	 */
	const clearAllOverrides = () => {
		overrides.value = {};
		try {
			useStorage(LOCAL_STORAGE_EXPERIMENT_OVERRIDES).value = JSON.stringify(overrides.value);
			console.log('[FeatureFlags] All overrides cleared');
		} catch (e) {
			console.error('[FeatureFlags] Failed to clear overrides:', e);
		}
	};

	/**
	 * Get all feature flags (including overrides)
	 *
	 * @returns Object containing all feature flags with their current values
	 */
	const getAll = (): FeatureFlags => {
		return {
			...(featureFlags.value ?? {}),
			...overrides.value,
		};
	};

	/**
	 * Initialize feature flags from server settings
	 *
	 * @param evaluatedFeatureFlags - Feature flags evaluated by the server
	 */
	const init = (evaluatedFeatureFlags?: FeatureFlags) => {
		console.log('[FeatureFlags] Initializing feature flags');

		if (evaluatedFeatureFlags && Object.keys(evaluatedFeatureFlags).length) {
			featureFlags.value = evaluatedFeatureFlags;
			console.log('[FeatureFlags] Loaded feature flags from server:', evaluatedFeatureFlags);
		} else {
			featureFlags.value = {};
			console.log('[FeatureFlags] No feature flags provided, using defaults');
		}
	};

	// ========== Initialization ==========

	// Initialize local feature flags override mechanism for development/testing
	if (!window.featureFlags) {
		// Load cached overrides from localStorage
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

		// Expose global API for development/testing
		window.featureFlags = {
			override,
			clearOverride,
			clearAll: clearAllOverrides,
			getVariant,
			getAll,
		};

		console.log('[FeatureFlags] Global API available: window.featureFlags');
	}

	// ========== Return Store Interface ==========

	return {
		// State
		featureFlags,
		overrides,
		isInitialized,

		// Methods
		init,
		reset,
		getVariant,
		isVariantEnabled,
		isFeatureEnabled,
		override,
		clearOverride,
		clearAllOverrides,
		getAll,
	};
});
