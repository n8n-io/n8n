import { useTelemetry } from '@/app/composables/useTelemetry';
import { TRIAL_INTRO_MODAL_EXPERIMENT } from '@/app/constants/experiments';
import { useCloudPlanStore } from '@/app/stores/cloudPlan.store';
import { usePostHog } from '@/app/stores/posthog.store';
import { useSettingsStore } from '@/app/stores/settings.store';
import { useUIStore } from '@/app/stores/ui.store';
import { getExperimentTelemetryPayload } from '@/experiments/utils';
import { useUsersStore } from '@/features/settings/users/users.store';
import type { Cloud } from '@n8n/rest-api-client/api/cloudPlans';
import { getUpgradeOffer } from '@n8n/rest-api-client/api/cloudPlans';
import { updateCurrentUserSettings } from '@n8n/rest-api-client/api/users';
import { STORES } from '@n8n/stores';
import { useRootStore } from '@n8n/stores/useRootStore';
import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import {
	TRIAL_INTRO_MODAL_KEY,
	TRIAL_INTRO_SEEN_CALLOUT,
	TRIAL_INTRO_UPGRADE_SOURCE,
} from '../constants';

function isUpgradeOffer(
	response: Cloud.UpgradeOffer | Record<string, never>,
): response is Cloud.UpgradeOffer {
	return 'slug' in response && Boolean(response.slug);
}

export const useTrialIntroModalStore = defineStore(STORES.EXPERIMENT_TRIAL_INTRO_MODAL, () => {
	const posthogStore = usePostHog();
	const telemetry = useTelemetry();
	const rootStore = useRootStore();
	const cloudPlanStore = useCloudPlanStore();
	const usersStore = useUsersStore();
	const settingsStore = useSettingsStore();
	const uiStore = useUIStore();

	const currentVariant = computed(() => posthogStore.getVariant(TRIAL_INTRO_MODAL_EXPERIMENT.name));

	const isVariantEnabled = computed(
		() => currentVariant.value === TRIAL_INTRO_MODAL_EXPERIMENT.variant,
	);

	const isEligible = computed(
		() =>
			settingsStore.isCloudDeployment &&
			cloudPlanStore.userIsTrialing &&
			!cloudPlanStore.trialExpired &&
			usersStore.isInstanceOwner &&
			!usersStore.isCalloutDismissed(TRIAL_INTRO_SEEN_CALLOUT),
	);

	const shouldShowModal = computed(() => isVariantEnabled.value && isEligible.value);

	const upgradeOffer = ref<Cloud.UpgradeOffer | undefined>();
	const hasFetchedUpgradeOffer = ref(false);

	const starterOffer = computed(() => upgradeOffer.value);

	const offerCurrency = computed(() => starterOffer.value?.currency);

	const markSeen = async () => {
		usersStore.setCalloutDismissed(TRIAL_INTRO_SEEN_CALLOUT);

		try {
			await updateCurrentUserSettings(rootStore.restApiContext, {
				dismissedCallouts: {
					...usersStore.currentUser?.settings?.dismissedCallouts,
					[TRIAL_INTRO_SEEN_CALLOUT]: true,
				},
			});
		} catch {}
	};

	const fetchUpgradeOfferOnce = async (): Promise<void> => {
		if (hasFetchedUpgradeOffer.value) return;
		hasFetchedUpgradeOffer.value = true;

		try {
			const response = await getUpgradeOffer(rootStore.restApiContext);
			if (isUpgradeOffer(response)) {
				upgradeOffer.value = response;
			}
		} catch {}
	};

	function openIfEligible() {
		if (!shouldShowModal.value) return false;
		if (uiStore.isAnyModalOpen) return false;
		uiStore.openModal(TRIAL_INTRO_MODAL_KEY);
		void markSeen();
		void fetchUpgradeOfferOnce();
		return true;
	}

	const trackModalViewed = (step: 1 | 2) => {
		telemetry.track(
			'User viewed trial welcome modal',
			getExperimentTelemetryPayload(TRIAL_INTRO_MODAL_EXPERIMENT, currentVariant.value, {
				step,
				trial_days_left: cloudPlanStore.trialDaysLeft,
				executions_limit: cloudPlanStore.currentPlanData?.monthlyExecutionsLimit,
				ai_credits: cloudPlanStore.currentPlanData?.licenseFeatures?.['quota:instanceAiCredits'],
				has_prices: Boolean(starterOffer.value?.prices),
			}),
		);
	};

	const buildUpgradeReturnPath = (period: 'annual' | 'monthly') =>
		`/account/change-plan?plan=starter&period=${period}&checkout=open&source=${TRIAL_INTRO_UPGRADE_SOURCE}`;

	return {
		isVariantEnabled,
		isEligible,
		shouldShowModal,
		starterOffer,
		offerCurrency,
		markSeen,
		openIfEligible,
		fetchUpgradeOfferOnce,
		trackModalViewed,
		buildUpgradeReturnPath,
	};
});
