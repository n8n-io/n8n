import { computed, ref } from 'vue';
import { defineStore } from 'pinia';
import { useTelemetry } from '@n8n/composables/useTelemetry';
import { STORES } from '@n8n/stores';
import { useUsersStore } from '@n8n/stores/users.store';
import { TELEMETRY_EVENT } from '@n8n/telemetry';
import type { ITelemetryTrackProperties } from 'n8n-workflow';

import { OPEN_WORKFLOW_IN_ASSISTANT_EXPERIMENT } from '@/app/constants/experiments';
import { usePostHog } from '@/app/stores/posthog.store';
import { useUIStore } from '@/app/stores/ui.store';
import { getExperimentTelemetryPayload } from '@/experiments/utils';
import { useInstanceAiAvailable } from '@/features/ai/instanceAi/composables/useInstanceAiAvailability';
import { useInstanceAiStore } from '@/features/ai/instanceAi/instanceAi.store';

export const OPEN_IN_ASSISTANT_CALLOUT_KEY = 'open-workflows-in-assistant';
export const OPEN_IN_ASSISTANT_OPT_OUT_KEY = 'open-workflows-in-assistant-opt-out';

export type DefaultEditor = 'assistant' | 'manual';

export const useOpenWorkflowInAssistantStore = defineStore(
	STORES.EXPERIMENT_OPEN_WORKFLOW_IN_ASSISTANT,
	() => {
		const posthogStore = usePostHog();
		const usersStore = useUsersStore();
		const uiStore = useUIStore();
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

		const optedOut = computed(() => usersStore.isCalloutDismissed(OPEN_IN_ASSISTANT_OPT_OUT_KEY));
		// Only read under treatment (DefaultEditorSetting is v-if="isTreatment").
		const resolvedDefaultEditor = computed<DefaultEditor>(() =>
			optedOut.value ? 'manual' : 'assistant',
		);

		const opensInAssistant = computed(
			() => isTreatment.value && instanceAiAvailable.value && !optedOut.value,
		);
		const showsOptedOutCardButton = computed(
			() => isTreatment.value && instanceAiAvailable.value && optedOut.value,
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

		// --- Settings-row highlight hand-off ---
		// Consume-on-read rather than a `?highlight=` query param: the one-shot
		// semantics come for free and a reload cannot replay in-memory state.
		const settingHighlightRequested = ref(false);

		function requestSettingHighlight() {
			settingHighlightRequested.value = true;
		}

		function consumeSettingHighlight() {
			const requested = settingHighlightRequested.value;
			settingHighlightRequested.value = false;
			return requested;
		}

		// --- Preference ---
		async function saveDefaultEditor(value: DefaultEditor) {
			await usersStore.updateUserSettings({
				dismissedCallouts: {
					...usersStore.currentUser?.settings?.dismissedCallouts,
					[OPEN_IN_ASSISTANT_OPT_OUT_KEY]: value === 'manual',
				},
			});
			telemetry.track(
				TELEMETRY_EVENT.INSTANCE_AI.DEFAULT_EDITOR_PREFERENCE_CHANGED,
				experimentPayload({ value }),
			);
		}

		function trackManualEditorOpened(workflowId: string, threadId?: string) {
			telemetry.track(
				TELEMETRY_EVENT.INSTANCE_AI.MANUAL_EDITOR_OPENED,
				experimentPayload({ workflow_id: workflowId, thread_id: threadId }),
			);
		}

		return {
			isTreatment,
			resolvedDefaultEditor,
			opensInAssistant,
			showsOptedOutCardButton,
			isNotificationVisibleFor,
			handleRedirectLanding,
			closeNotification,
			neverShowAgain,
			requestSettingHighlight,
			consumeSettingHighlight,
			saveDefaultEditor,
			trackManualEditorOpened,
		};
	},
);
