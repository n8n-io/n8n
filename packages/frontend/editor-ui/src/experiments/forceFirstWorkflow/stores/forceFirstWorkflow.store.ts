import { useTelemetry } from '@n8n/composables/useTelemetry';
import { updateCurrentUserSettings } from '@n8n/rest-api-client/api/users';
import { STORES } from '@n8n/stores';
import { useSettingsStore } from '@n8n/stores/settings.store';
import { useUsersStore } from '@n8n/stores/users.store';
import { useRootStore } from '@n8n/stores/useRootStore';
import { TELEMETRY_EVENT } from '@n8n/telemetry';
import { defineStore } from 'pinia';
import { computed, ref } from 'vue';

import { FORCE_FIRST_WORKFLOW_EXPERIMENT } from '@/app/constants/experiments';
import { usePostHog } from '@/app/stores/posthog.store';
import { getExperimentTelemetryPayload } from '@/experiments/utils';

import {
	FORCE_FIRST_WORKFLOW_FINISHED_CALLOUT,
	FORCE_FIRST_WORKFLOW_NEW_USER_DAYS,
	type ForceFirstWorkflowStep,
} from '../constants';

type ExperimentVariant =
	| typeof FORCE_FIRST_WORKFLOW_EXPERIMENT.control
	| typeof FORCE_FIRST_WORKFLOW_EXPERIMENT.variant;

const DAY_IN_MS = 24 * 60 * 60 * 1000;

export const useForceFirstWorkflowStore = defineStore(
	STORES.EXPERIMENT_FORCE_FIRST_WORKFLOW,
	() => {
		const posthogStore = usePostHog();
		const telemetry = useTelemetry();
		const rootStore = useRootStore();
		const usersStore = useUsersStore();
		const settingsStore = useSettingsStore();

		const hasTrackedExposure = ref(false);

		const currentVariant = computed(() =>
			posthogStore.getVariant(FORCE_FIRST_WORKFLOW_EXPERIMENT.name),
		);
		const experimentVariant = computed<ExperimentVariant | null>(() => {
			const variant = currentVariant.value;

			return variant === FORCE_FIRST_WORKFLOW_EXPERIMENT.control ||
				variant === FORCE_FIRST_WORKFLOW_EXPERIMENT.variant
				? variant
				: null;
		});
		const isVariantEnabled = computed(
			() => experimentVariant.value === FORCE_FIRST_WORKFLOW_EXPERIMENT.variant,
		);

		// No flag says "invited user" or "new signup", so approximate with the owner role,
		// a young account, and no activation yet. Cloud only: self-hosted has no signup redirect.
		const isNewAccount = computed(() => {
			const createdAt = usersStore.currentUser?.createdAt;
			if (!createdAt) return false;

			const ageInMs = Date.now() - new Date(createdAt).getTime();
			return ageInMs <= FORCE_FIRST_WORKFLOW_NEW_USER_DAYS * DAY_IN_MS;
		});
		const isFinished = computed(() =>
			usersStore.isCalloutDismissed(FORCE_FIRST_WORKFLOW_FINISHED_CALLOUT),
		);
		const isEligible = computed(
			() =>
				settingsStore.isCloudDeployment &&
				usersStore.isInstanceOwner &&
				isNewAccount.value &&
				usersStore.currentUser?.settings?.userActivated !== true &&
				!isFinished.value,
		);

		const shouldForceFlow = computed(() => isVariantEnabled.value && isEligible.value);
		// Exposure follows the decision point, so control users who are eligible count too.
		const shouldTrackExposure = computed(
			() => experimentVariant.value !== null && isEligible.value && !hasTrackedExposure.value,
		);

		function trackExposure() {
			const variant = experimentVariant.value;
			if (!variant || !shouldTrackExposure.value) return;

			hasTrackedExposure.value = true;
			telemetry.track(
				TELEMETRY_EVENT.INSTANCE_AI.FORCE_FIRST_WORKFLOW_EXPOSED,
				getExperimentTelemetryPayload(FORCE_FIRST_WORKFLOW_EXPERIMENT, variant),
			);
		}

		function trackStepCompleted(step: ForceFirstWorkflowStep, succeeded?: boolean) {
			const variant = experimentVariant.value;
			if (!variant) return;

			telemetry.track(
				TELEMETRY_EVENT.INSTANCE_AI.FORCE_FIRST_WORKFLOW_STEP_COMPLETED,
				getExperimentTelemetryPayload(FORCE_FIRST_WORKFLOW_EXPERIMENT, variant, {
					step,
					...(succeeded === undefined ? {} : { succeeded }),
				}),
			);
		}

		/** Never prompt this user again. A failed save only means the flow can show once more. */
		async function markFinished() {
			usersStore.setCalloutDismissed(FORCE_FIRST_WORKFLOW_FINISHED_CALLOUT);

			try {
				await updateCurrentUserSettings(rootStore.restApiContext, {
					dismissedCallouts: {
						...usersStore.currentUser?.settings?.dismissedCallouts,
						[FORCE_FIRST_WORKFLOW_FINISHED_CALLOUT]: true,
					},
				});
			} catch {}
		}

		async function skip(step: ForceFirstWorkflowStep) {
			const variant = experimentVariant.value;
			if (variant) {
				telemetry.track(
					TELEMETRY_EVENT.INSTANCE_AI.FORCE_FIRST_WORKFLOW_SKIPPED,
					getExperimentTelemetryPayload(FORCE_FIRST_WORKFLOW_EXPERIMENT, variant, { step }),
				);
			}
			await markFinished();
		}

		async function complete(workflowId: string) {
			const variant = experimentVariant.value;
			if (variant) {
				telemetry.track(
					TELEMETRY_EVENT.INSTANCE_AI.FORCE_FIRST_WORKFLOW_PUBLISHED,
					getExperimentTelemetryPayload(FORCE_FIRST_WORKFLOW_EXPERIMENT, variant, {
						workflow_id: workflowId,
					}),
				);
			}
			await markFinished();
		}

		return {
			currentVariant,
			isVariantEnabled,
			isEligible,
			isFinished,
			shouldForceFlow,
			shouldTrackExposure,
			trackExposure,
			trackStepCompleted,
			skip,
			complete,
		};
	},
);
