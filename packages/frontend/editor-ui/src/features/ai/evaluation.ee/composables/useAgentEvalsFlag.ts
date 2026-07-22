import { AGENT_EVALS_FLAG } from '@n8n/api-types';
import { computed } from 'vue';

import { usePostHog } from '@/app/stores/posthog.store';
import { useSettingsStore } from '@/app/stores/settings.store';

/**
 * Frontend gate for the agent-evals feature surface, matching the
 * `101_agent_evals` flag the backend consults to gate its routes. It combines
 * two independent signals:
 *
 *  - `settings.evaluation.agentEvalsEnabled` — the backend-provided operator
 *    override (`N8N_AGENT_EVALS_ENABLED`). Delivered in the settings payload,
 *    so it works even when the in-browser PostHog client never initializes
 *    (telemetry off), where the flag would otherwise stay false.
 *  - the PostHog client flag — carries per-cohort rollout when telemetry is on.
 *
 * Coerces to a strict boolean so `v-if="isAgentEvalsEnabled"` never
 * undefined-flickers during the initial flag-fetch frame.
 */
export const useAgentEvalsFlag = () => {
	const postHog = usePostHog();
	const settingsStore = useSettingsStore();
	return computed(
		() =>
			settingsStore.settings.evaluation?.agentEvalsEnabled === true ||
			postHog.isFeatureEnabled(AGENT_EVALS_FLAG) === true,
	);
};
