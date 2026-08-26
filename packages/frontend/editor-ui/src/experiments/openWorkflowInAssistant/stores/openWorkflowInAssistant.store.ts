import { computed, ref } from 'vue';
import { defineStore } from 'pinia';
import { useTelemetry } from '@n8n/composables/useTelemetry';
import { STORES } from '@n8n/stores';
import { useUsersStore } from '@n8n/stores/users.store';
import { useRootStore } from '@n8n/stores/useRootStore';
import { TELEMETRY_EVENT } from '@n8n/telemetry';
import type { ITelemetryTrackProperties } from 'n8n-workflow';

import { OPEN_WORKFLOW_IN_ASSISTANT_EXPERIMENT } from '@/app/constants/experiments';
import { usePostHog } from '@/app/stores/posthog.store';
import { useUIStore } from '@/app/stores/ui.store';
import { getExperimentTelemetryPayload } from '@/experiments/utils';
import { useInstanceAiAvailable } from '@/features/ai/instanceAi/composables/useInstanceAiAvailability';
import { updatePreferences } from '@/features/ai/instanceAi/instanceAi.settings.api';
import { useInstanceAiStore } from '@/features/ai/instanceAi/instanceAi.store';

export const OPEN_IN_ASSISTANT_CALLOUT_KEY = 'open-workflows-in-assistant';

export type DefaultEditor = 'assistant' | 'manual';

export const useOpenWorkflowInAssistantStore = defineStore(
	STORES.EXPERIMENT_OPEN_WORKFLOW_IN_ASSISTANT,
	() => {
		const posthogStore = usePostHog();
		const usersStore = useUsersStore();
		const uiStore = useUIStore();
		const rootStore = useRootStore();
		const telemetry = useTelemetry();
		const instanceAiAvailable = useInstanceAiAvailable();

		const currentVariant = computed(() =>
			posthogStore.getVariant(OPEN_WORKFLOW_IN_ASSISTANT_EXPERIMENT.name),
		);
		const isTreatment = computed(() =>
			posthogStore.isVariantEnabled(
				OPEN_WORKFLOW_IN_ASSISTANT_EXPERIMENT.name,
				OPEN_WORKFLOW_IN_ASSISTANT_EXPERIMENT.variant,
			),
		);

		const storedPreference = computed<DefaultEditor | undefined>(
			() => usersStore.currentUser?.settings?.instanceAi?.defaultEditor,
		);
		// Tri-state: an explicit preference wins; unset falls back to the variant.
		const resolvedDefaultEditor = computed<DefaultEditor>(
			() => storedPreference.value ?? (isTreatment.value ? 'assistant' : 'manual'),
		);

		const opensInAssistant = computed(
			() =>
				isTreatment.value &&
				instanceAiAvailable.value &&
				resolvedDefaultEditor.value === 'assistant',
		);
		const showsOptedOutCardButton = computed(
			() => isTreatment.value && instanceAiAvailable.value && storedPreference.value === 'manual',
		);

		function experimentPayload<const T extends ITelemetryTrackProperties>(payload: T) {
			// The registered events require a variant literal; every call site is
			// treatment-gated, so a non-variant value can only mean control.
			const variant =
				currentVariant.value === OPEN_WORKFLOW_IN_ASSISTANT_EXPERIMENT.variant
					? OPEN_WORKFLOW_IN_ASSISTANT_EXPERIMENT.variant
					: OPEN_WORKFLOW_IN_ASSISTANT_EXPERIMENT.control;
			return getExperimentTelemetryPayload(OPEN_WORKFLOW_IN_ASSISTANT_EXPERIMENT, variant, payload);
		}

		// --- First-open notification ---
		const notificationThreadId = ref<string | null>(null);
		const notificationWorkflowId = ref<string | null>(null);

		function isNotificationVisibleFor(threadId: string) {
			return notificationThreadId.value === threadId;
		}

		/**
		 * Called by the thread view right after it consumes and sends a stashed
		 * first message. That one-shot consumption is the only reliable "fresh
		 * redirect landing" signal — the thread's metadata source persists
		 * forever and would re-fire on every revisit of an old thread.
		 */
		function handleRedirectLanding(threadId: string) {
			if (!isTreatment.value) return;
			const metadata = useInstanceAiStore().getThreadMetadata(threadId);
			if (metadata?.source !== 'workflow_list_auto') return;

			// Spec 4.4: plain write, no restore logic.
			uiStore.sidebarMenuCollapsed = true;

			if (usersStore.isCalloutDismissed(OPEN_IN_ASSISTANT_CALLOUT_KEY)) return;
			const context = metadata.sourceContext;
			const workflowId =
				context !== null &&
				typeof context === 'object' &&
				'workflowId' in context &&
				typeof context.workflowId === 'string'
					? context.workflowId
					: null;
			notificationThreadId.value = threadId;
			notificationWorkflowId.value = workflowId;
			telemetry.track(
				TELEMETRY_EVENT.INSTANCE_AI.OPEN_BY_DEFAULT_NOTIFICATION_SHOWN,
				experimentPayload({ workflow_id: workflowId }),
			);
		}

		function closeNotification(method: 'got_it' | 'close' | 'settings_link') {
			notificationThreadId.value = null;
			telemetry.track(
				TELEMETRY_EVENT.INSTANCE_AI.OPEN_BY_DEFAULT_NOTIFICATION_ACTION,
				experimentPayload({ method }),
			);
		}

		async function neverShowAgain() {
			notificationThreadId.value = null;
			usersStore.setCalloutDismissed(OPEN_IN_ASSISTANT_CALLOUT_KEY);
			telemetry.track(
				TELEMETRY_EVENT.INSTANCE_AI.OPEN_BY_DEFAULT_NOTIFICATION_ACTION,
				experimentPayload({ method: 'never_show_again' }),
			);
			// updateUserSettings mirrors the response back into currentUser.settings,
			// which also covers fresh users whose settings are still null (where
			// setCalloutDismissed above no-ops).
			await usersStore.updateUserSettings({
				dismissedCallouts: {
					...usersStore.currentUser?.settings?.dismissedCallouts,
					[OPEN_IN_ASSISTANT_CALLOUT_KEY]: true,
				},
			});
		}

		// --- Preference ---
		async function saveDefaultEditor(value: DefaultEditor) {
			await updatePreferences(rootStore.restApiContext, { defaultEditor: value });
			// Mirror into the local user settings copy — the card reads from there.
			// Fresh users have settings: null, so build the object rather than
			// requiring it to exist.
			if (usersStore.currentUser) {
				usersStore.currentUser.settings = {
					...(usersStore.currentUser.settings ?? {}),
					instanceAi: {
						...(usersStore.currentUser.settings?.instanceAi ?? {}),
						defaultEditor: value,
					},
				};
			}
			telemetry.track(
				TELEMETRY_EVENT.INSTANCE_AI.DEFAULT_EDITOR_PREFERENCE_CHANGED,
				experimentPayload({ value }),
			);
		}

		return {
			currentVariant,
			isTreatment,
			storedPreference,
			resolvedDefaultEditor,
			opensInAssistant,
			showsOptedOutCardButton,
			notificationWorkflowId,
			isNotificationVisibleFor,
			handleRedirectLanding,
			closeNotification,
			neverShowAgain,
			saveDefaultEditor,
		};
	},
);
