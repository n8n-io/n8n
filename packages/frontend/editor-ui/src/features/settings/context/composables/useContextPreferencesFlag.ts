import { computed } from 'vue';

import { usePostHog } from '@/app/stores/posthog.store';

import { CONTEXT_PREFERENCES_FLAG } from '../context.constants';

/**
 * Gate for the Context settings surface.
 *
 * The flag is the only signal, because there is no backend module to deliver an
 * operator override in the settings payload yet. Add that second signal alongside the
 * real endpoints, so instances with telemetry switched off can still opt in.
 *
 * Override locally with:
 *   window.featureFlags.override('111_context_preferences', true)
 */
export function isContextPreferencesEnabled(): boolean {
	return usePostHog().isFeatureEnabled(CONTEXT_PREFERENCES_FLAG) === true;
}

export const useContextPreferencesFlag = () => computed(isContextPreferencesEnabled);
