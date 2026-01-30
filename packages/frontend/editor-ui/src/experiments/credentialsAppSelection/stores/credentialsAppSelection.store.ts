import { useTelemetry } from '@/app/composables/useTelemetry';
import { CREDENTIALS_APP_SELECTION_EXPERIMENT } from '@/app/constants';
import { useCloudPlanStore } from '@/app/stores/cloudPlan.store';
import { usePostHog } from '@/app/stores/posthog.store';
import { useCredentialsStore } from '@/features/credentials/credentials.store';
import { useStorage } from '@/app/composables/useStorage';
import { STORES } from '@n8n/stores';
import { defineStore } from 'pinia';
import { computed, ref } from 'vue';

const APP_SELECTION_DISMISSED_KEY = 'N8N_APP_SELECTION_DISMISSED';
const APP_SELECTION_STARTED_KEY = 'N8N_APP_SELECTION_STARTED';

export const useCredentialsAppSelectionStore = defineStore(
	STORES.EXPERIMENT_CREDENTIALS_APP_SELECTION,
	() => {
		const posthogStore = usePostHog();
		const credentialsStore = useCredentialsStore();
		const cloudPlanStore = useCloudPlanStore();
		const telemetry = useTelemetry();

		const connectedCredentialIds = ref<Set<string>>(new Set());
		const dismissedStorage = useStorage(APP_SELECTION_DISMISSED_KEY);
		const startedStorage = useStorage(APP_SELECTION_STARTED_KEY);

		const isDismissed = computed(() => dismissedStorage.value === 'true');
		const hasStarted = computed(() => startedStorage.value === 'true');

		const currentVariant = computed(() =>
			posthogStore.getVariant(CREDENTIALS_APP_SELECTION_EXPERIMENT.name),
		);

		const isVariant = computed(
			() => currentVariant.value === CREDENTIALS_APP_SELECTION_EXPERIMENT.variant,
		);

		const hasNoCredentials = computed(() => credentialsStore.allCredentials.length === 0);

		const userIsTrialing = computed(() => true || cloudPlanStore.userIsTrialing);

		// Show if in variant, trialing, not dismissed, and either:
		// - Already started the flow (keep showing until dismissed)
		// - OR has no credentials (first time)
		const isFeatureEnabled = computed(() => {
			if (!isVariant.value || !userIsTrialing.value || isDismissed.value) {
				return false;
			}
			// Keep showing if already started
			if (hasStarted.value) {
				return true;
			}
			// First time: only show if no credentials
			return hasNoCredentials.value;
		});

		const connectedCount = computed(() => connectedCredentialIds.value.size);

		const canContinue = computed(() => connectedCount.value > 0);

		function markCredentialConnected(credentialId: string) {
			connectedCredentialIds.value.add(credentialId);
		}

		function trackPageViewed() {
			// Mark as started so the page stays visible until dismissed
			startedStorage.value = 'true';
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

		function trackCompleted() {
			telemetry.track('App selection completed', {
				connected_count: connectedCount.value,
			});
			dismiss();
		}

		function reset() {
			connectedCredentialIds.value = new Set();
			dismissedStorage.value = null;
			startedStorage.value = null;
		}

		return {
			currentVariant,
			isFeatureEnabled,
			isDismissed,
			connectedCount,
			canContinue,
			connectedCredentialIds,
			markCredentialConnected,
			trackPageViewed,
			trackSearchPerformed,
			trackCompleted,
			dismiss,
			reset,
		};
	},
);
