import { useStorage } from '@n8n/composables/useStorage';
import { useTelemetry } from '@n8n/composables/useTelemetry';
import { useMCPStore } from '@n8n/frontend-module-mcp';
import { STORES } from '@n8n/stores';
import { useSettingsStore } from '@n8n/stores/settings.store';
import { useUsersStore } from '@n8n/stores/users.store';
import { TELEMETRY_EVENT } from '@n8n/telemetry';
import type { ITelemetryTrackProperties } from 'n8n-workflow';
import { defineStore } from 'pinia';
import { computed, ref } from 'vue';

import { BUILD_MANUALLY_BY_DEFAULT_EXPERIMENT as EXPERIMENT } from '@/app/constants/experiments';
import { usePostHog } from '@/app/stores/posthog.store';
import { getExperimentTelemetryPayload } from '@/experiments/utils';

import { isOnBuildManuallyTrack } from '../enrollment';

export type BuildManuallyByDefaultVariant =
	| typeof EXPERIMENT.control
	| typeof EXPERIMENT.canvas
	| typeof EXPERIMENT.canvasComposer;

export type EmptyCanvasConnectOption = 'claude' | 'other_assistants';

const VARIANTS: readonly BuildManuallyByDefaultVariant[] = [
	EXPERIMENT.control,
	EXPERIMENT.canvas,
	EXPERIMENT.canvasComposer,
];

export const LANDED_ON_CANVAS_STORAGE_KEY = 'N8N_BUILD_MANUALLY_BY_DEFAULT_LANDED';

/** Reads the ids of the users who already landed. A malformed value counts as none. */
function parseLandedUserIds(raw: string | null): string[] {
	if (!raw) return [];
	try {
		const parsed: unknown = JSON.parse(raw);
		return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === 'string') : [];
	} catch {
		return [];
	}
}

function isVariant(value: unknown): value is BuildManuallyByDefaultVariant {
	return VARIANTS.some((variant) => variant === value);
}

export const useBuildManuallyByDefaultStore = defineStore(
	STORES.EXPERIMENT_BUILD_MANUALLY_BY_DEFAULT,
	() => {
		const posthogStore = usePostHog();
		const settingsStore = useSettingsStore();
		const usersStore = useUsersStore();
		const telemetry = useTelemetry();
		// Assignment is per user, so the landing is too. Users who share a browser each get it once.
		const landedStorage = useStorage(LANDED_ON_CANVAS_STORAGE_KEY);
		const landedUserIds = computed(() => parseLandedUserIds(landedStorage.value));

		/**
		 * The only place that reads the assigned arm. Callers must not read PostHog
		 * for this experiment directly. Users on the other onboarding track never
		 * take part.
		 */
		const currentVariant = computed<BuildManuallyByDefaultVariant | undefined>(() => {
			if (!isOnBuildManuallyTrack(posthogStore.getVariant)) return undefined;
			const variant = posthogStore.getVariant(EXPERIMENT.name);
			return isVariant(variant) ? variant : undefined;
		});

		const landsOnCanvas = computed(
			() =>
				currentVariant.value === EXPERIMENT.canvas ||
				currentVariant.value === EXPERIMENT.canvasComposer,
		);
		const isComposerVariant = computed(() => currentVariant.value === EXPERIMENT.canvasComposer);

		/** Only the first landing of each user changes. Later visits keep today's behavior. */
		const shouldLandOnCanvas = computed(() => {
			const userId = usersStore.currentUserId;
			return !!userId && landsOnCanvas.value && !landedUserIds.value.includes(userId);
		});

		function markLandedOnCanvas() {
			const userId = usersStore.currentUserId;
			if (!userId || landedUserIds.value.includes(userId)) return;
			landedStorage.value = JSON.stringify([...landedUserIds.value, userId]);
		}

		// Unknown until the check answers, so users with a client never see the row flash.
		const mcpClientState = ref<'unknown' | 'connected' | 'none'>('unknown');
		const showConnectRow = computed(() => mcpClientState.value === 'none');

		async function refreshConnectedMcpClients() {
			if (!isComposerVariant.value) return;
			// Hide the row again while this check runs, so an old answer never shows.
			mcpClientState.value = 'unknown';
			if (settingsStore.moduleSettings.mcp?.mcpAccessEnabled !== true) {
				mcpClientState.value = 'none';
				return;
			}
			try {
				const clients = await useMCPStore().fetchOAuthClientsPreview(1);
				mcpClientState.value = clients.length > 0 ? 'connected' : 'none';
			} catch {
				// Show the row when the check fails. It only links to the MCP setup.
				mcpClientState.value = 'none';
			}
		}

		// Set when the composer minimizes, read once by the canvas Assistant button.
		const isAssistantButtonHighlightPending = ref(false);

		// Keeps the payload type, so each registry event checks its own properties.
		function composerPayload<const T extends ITelemetryTrackProperties>(payload: T) {
			return getExperimentTelemetryPayload(EXPERIMENT, EXPERIMENT.canvasComposer, payload);
		}

		function trackComposerShown() {
			if (!isComposerVariant.value) return;
			telemetry.track(TELEMETRY_EVENT.INSTANCE_AI.EMPTY_CANVAS_COMPOSER_SHOWN, composerPayload({}));
		}

		function trackComposerPromptSent(prompt: string) {
			if (!isComposerVariant.value) return;
			telemetry.track(
				TELEMETRY_EVENT.INSTANCE_AI.EMPTY_CANVAS_COMPOSER_PROMPT_SENT,
				composerPayload({ prompt_length: prompt.length }),
			);
		}

		function minimizeComposer() {
			if (!isComposerVariant.value) return;
			isAssistantButtonHighlightPending.value = true;
			telemetry.track(
				TELEMETRY_EVENT.INSTANCE_AI.EMPTY_CANVAS_COMPOSER_MINIMIZED,
				composerPayload({}),
			);
		}

		/** Returns true once after each minimize, so the button highlights one time. */
		function consumeAssistantButtonHighlight(): boolean {
			if (!isAssistantButtonHighlightPending.value) return false;
			isAssistantButtonHighlightPending.value = false;
			telemetry.track(
				TELEMETRY_EVENT.INSTANCE_AI.CANVAS_ASSISTANT_BUTTON_TIP_SHOWN,
				composerPayload({}),
			);
			return true;
		}

		function trackConnectOptionClicked(client: EmptyCanvasConnectOption) {
			if (!isComposerVariant.value) return;
			telemetry.track(
				TELEMETRY_EVENT.MCP.EMPTY_CANVAS_CONNECT_OPTION_CLICKED,
				composerPayload({ client }),
			);
		}

		return {
			currentVariant,
			isComposerVariant,
			shouldLandOnCanvas,
			markLandedOnCanvas,
			showConnectRow,
			refreshConnectedMcpClients,
			isAssistantButtonHighlightPending,
			trackComposerShown,
			trackComposerPromptSent,
			minimizeComposer,
			consumeAssistantButtonHighlight,
			trackConnectOptionClicked,
		};
	},
);
