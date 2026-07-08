import { EVAL_COLLECTIONS_FLAG } from '@n8n/api-types';
import { computed } from 'vue';

import { usePostHog } from '@/app/stores/posthog.store';

/**
 * Frontend gate for the eval-collections feature surface. Mirrors the
 * `084_eval_collections` PostHog rollout flag that the backend consults to
 * 404 the controller routes. The env override
 * `N8N_EVAL_COLLECTIONS_ENABLED=true` flips PostHog to "enabled for every
 * user on the running main" — useful for local + QA — without round-tripping
 * the cohort layer.
 *
 * Coerces PostHog's `boolean | undefined` return to a strict boolean so
 * `v-if="isEvalCollectionsEnabled"` is never undefined-flickering during
 * the initial flag-fetch frame.
 */
export const useEvalCollectionsFlag = () => {
	const postHog = usePostHog();
	return computed(() => postHog.isFeatureEnabled(EVAL_COLLECTIONS_FLAG) === true);
};
