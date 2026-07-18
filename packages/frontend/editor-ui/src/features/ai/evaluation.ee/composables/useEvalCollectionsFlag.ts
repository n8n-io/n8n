import { EVAL_COLLECTIONS_FLAG } from '@n8n/api-types';
import { computed } from 'vue';

import { usePostHog } from '@/app/stores/posthog.store';
import { useSettingsStore } from '@/app/stores/settings.store';

/**
 * Frontend gate for the eval-collections feature surface, matching the
 * `084_eval_collections` flag the backend consults to 404 the controller
 * routes. It combines two independent signals:
 *
 *  - `settings.evaluation.collectionsEnabled` — the backend-provided operator
 *    override (`N8N_EVAL_COLLECTIONS_ENABLED`). Delivered in the settings
 *    payload, so it works even when the in-browser PostHog client never
 *    initializes (telemetry off), where the flag would otherwise stay false.
 *  - the PostHog client flag — carries per-cohort rollout when telemetry is on.
 *
 * Coerces to a strict boolean so `v-if="isEvalCollectionsEnabled"` never
 * undefined-flickers during the initial flag-fetch frame.
 */
export const useEvalCollectionsFlag = () => {
	const postHog = usePostHog();
	const settingsStore = useSettingsStore();
	return computed(
		() =>
			settingsStore.settings.evaluation?.collectionsEnabled === true ||
			postHog.isFeatureEnabled(EVAL_COLLECTIONS_FLAG) === true,
	);
};
