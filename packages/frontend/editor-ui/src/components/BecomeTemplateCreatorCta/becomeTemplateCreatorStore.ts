import { DateTime } from 'luxon';
import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { STORES } from '@n8n/stores';
import { useCloudPlanStore } from '@/stores/cloudPlan.store';
import { useStorage } from '@/composables/useStorage';
import { useRootStore } from '@n8n/stores/useRootStore';
import { getBecomeCreatorCta } from '@n8n/rest-api-client/api/ctas';

const LOCAL_STORAGE_KEY = 'N8N_BECOME_TEMPLATE_CREATOR_CTA_DISMISSED_AT';
const RESHOW_DISMISSED_AFTER_DAYS = 30;
const POLL_INTERVAL_IN_MS = 15 * 60 * 1000; // 15 minutes

export const useBecomeTemplateCreatorStore = defineStore(STORES.BECOME_TEMPLATE_CREATOR, () => {
	const cloudPlanStore = useCloudPlanStore();
	const rootStore = useRootStore();

	//#region State

	const dismissedAt = useStorage(LOCAL_STORAGE_KEY);
	const ctaMeetsCriteria = ref(false);
	const monitorCtasTimer = ref<ReturnType<typeof setInterval> | null>(null);

	//#endregion State

	//#region Computed

	const isDismissed = computed(() => {
		return dismissedAt.value ? !hasEnoughTimePassedSinceDismissal(dismissedAt.value) : false;
	});

	const showBecomeCreatorCta = computed(() => {
		return ctaMeetsCriteria.value && !cloudPlanStore.userIsTrialing && !isDismissed.value;
	});

	//#endregion Computed

	//#region Actions

	const dismissCta = () => {
		dismissedAt.value = DateTime.now().toISO();
	};

	const fetchBecomeCreatorCta = async () => {
		const becomeCreatorCta = await getBecomeCreatorCta(rootStore.restApiContext);

		ctaMeetsCriteria.value = becomeCreatorCta;
	};

	const fetchUserCtasIfNeeded = async () => {
		if (isDismissed.value || cloudPlanStore.userIsTrialing || ctaMeetsCriteria.value) {
			return;
		}

		await fetchBecomeCreatorCta();
	};

	const startMonitoringCta = () => {
		if (monitorCtasTimer.value) {
			return;
		}

		// Initial check after 1s so we don't bombard the API immediately during startup
		setTimeout(fetchUserCtasIfNeeded, 1000);

		monitorCtasTimer.value = setInterval(fetchUserCtasIfNeeded, POLL_INTERVAL_IN_MS);
	};

	const stopMonitoringCta = () => {
		if (!monitorCtasTimer.value) {
			return;
		}

		clearInterval(monitorCtasTimer.value);
		monitorCtasTimer.value = null;
	};

	//#endregion Actions

	return {
		showBecomeCreatorCta,
		dismissCta,
		startMonitoringCta,
		stopMonitoringCta,
	};
});

function hasEnoughTimePassedSinceDismissal(dismissedAt: string) {
	const reshowAtTime = DateTime.fromISO(dismissedAt).plus({
		days: RESHOW_DISMISSED_AFTER_DAYS,
	});

	return reshowAtTime <= DateTime.now();
}
