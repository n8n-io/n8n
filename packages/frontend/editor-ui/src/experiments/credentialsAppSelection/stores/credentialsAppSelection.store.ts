import { useTelemetry } from '@/app/composables/useTelemetry';
import { CREDENTIALS_APP_SELECTION_EXPERIMENT } from '@/app/constants';
import { useCloudPlanStore } from '@/app/stores/cloudPlan.store';
import { usePostHog } from '@/app/stores/posthog.store';
import { useCredentialsStore } from '@/features/credentials/credentials.store';
import { useStorage } from '@/app/composables/useStorage';
import { STORES } from '@n8n/stores';
import { defineStore } from 'pinia';
import { computed } from 'vue';

const APP_SELECTION_DISMISSED_KEY = 'N8N_APP_SELECTION_DISMISSED';

export const useCredentialsAppSelectionStore = defineStore(
	STORES.EXPERIMENT_CREDENTIALS_APP_SELECTION,
	() => {
		const posthogStore = usePostHog();
		const credentialsStore = useCredentialsStore();
		const cloudPlanStore = useCloudPlanStore();
		const telemetry = useTelemetry();

		const dismissedStorage = useStorage(APP_SELECTION_DISMISSED_KEY);

		const isDismissed = computed(() => dismissedStorage.value === 'true');

		const currentVariant = computed(() =>
			posthogStore.getVariant(CREDENTIALS_APP_SELECTION_EXPERIMENT.name),
		);

		const isVariant = computed(
			() => currentVariant.value === CREDENTIALS_APP_SELECTION_EXPERIMENT.variant,
		);

		const userIsTrialing = computed(() => cloudPlanStore.userIsTrialing);

		const isFeatureEnabled = computed(() => {
			if (isDismissed.value) {
				return false;
			}

			if (!isVariant.value || !userIsTrialing.value) {
				return false;
			}

			return true;
		});

		const connectedCount = computed(() => credentialsStore.allCredentials.length);

		const canContinue = computed(() => connectedCount.value > 0);

		function trackPageViewed() {
			telemetry.track('App selection page viewed');
		}

		function trackSearchPerformed(searchTerm: string, resultCount: number) {
			telemetry.track('App selection search performed', {
				search_term: searchTerm,
				result_count: resultCount,
			});
		}

		function dismiss() {
			dismissedStorage.value = 'true';
		}

		function trackCompleted(connectedApps: Array<{ credential_type: string; is_valid: boolean }>) {
			telemetry.track('App selection completed', {
				connected_count: connectedCount.value,
				connected_apps: connectedApps,
			});
			dismiss();
		}

		function reset() {
			dismissedStorage.value = null;
		}

		return {
			currentVariant,
			isFeatureEnabled,
			isDismissed,
			connectedCount,
			canContinue,
			trackPageViewed,
			trackSearchPerformed,
			trackCompleted,
			dismiss,
			reset,
		};
	},
);
