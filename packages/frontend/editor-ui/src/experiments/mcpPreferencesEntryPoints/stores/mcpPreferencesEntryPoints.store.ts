import { useStorage } from '@n8n/composables/useStorage';
import { useTelemetry } from '@n8n/composables/useTelemetry';
import type { McpPreferencesEntryPoint, McpPreferencesEntrySource } from '@n8n/frontend-module-sdk';
import { STORES } from '@n8n/stores';
import { useSettingsStore } from '@n8n/stores/settings.store';
import { TELEMETRY_EVENT } from '@n8n/telemetry';
import { defineStore } from 'pinia';
import { computed, ref } from 'vue';

import { MCP_PREFERENCES_ENTRY_POINTS_EXPERIMENT } from '@/app/constants/experiments';
import { usePostHog } from '@/app/stores/posthog.store';
import { getExperimentTelemetryPayload } from '@/experiments/utils';
import { useContextStore } from '@/features/settings/context/context.store';

const BANNER_DISMISSED_KEY = 'N8N_MCP_PREFERENCES_BANNER_DISMISSED';

const ENTRY_POINTS: readonly McpPreferencesEntryPoint[] = [
	MCP_PREFERENCES_ENTRY_POINTS_EXPERIMENT.banner,
	MCP_PREFERENCES_ENTRY_POINTS_EXPERIMENT.connectionRow,
];

function isEntryPoint(value: unknown): value is McpPreferencesEntryPoint {
	return ENTRY_POINTS.some((entryPoint) => entryPoint === value);
}

export const useMcpPreferencesEntryPointsStore = defineStore(
	STORES.EXPERIMENT_MCP_PREFERENCES_ENTRY_POINTS,
	() => {
		const posthogStore = usePostHog();
		const settingsStore = useSettingsStore();
		const telemetry = useTelemetry();
		const bannerDismissedStorage = useStorage(BANNER_DISMISSED_KEY);

		const preferenceCount = ref<number>();

		const canUsePreferencesOverMcp = computed(
			() =>
				settingsStore.settings.aiPreferences?.enabled === true &&
				settingsStore.moduleSettings.mcp?.mcpAccessEnabled === true &&
				settingsStore.moduleSettings.mcp?.preferencesEnabled === true,
		);

		const entryPoint = computed<McpPreferencesEntryPoint | undefined>(() => {
			if (!canUsePreferencesOverMcp.value) return undefined;
			const variant = posthogStore.getVariant(MCP_PREFERENCES_ENTRY_POINTS_EXPERIMENT.name);
			return isEntryPoint(variant) ? variant : undefined;
		});

		const isBannerDismissed = computed(() => bannerDismissedStorage.value === 'true');

		function trackExposure() {
			if (!canUsePreferencesOverMcp.value) return;
			posthogStore.trackExposure(MCP_PREFERENCES_ENTRY_POINTS_EXPERIMENT.name);
		}

		async function loadPreferenceCount() {
			preferenceCount.value = await useContextStore().fetchPreferenceCount();
		}

		function dismissBanner() {
			bannerDismissedStorage.value = 'true';
			if (entryPoint.value !== MCP_PREFERENCES_ENTRY_POINTS_EXPERIMENT.banner) return;
			telemetry.track(
				TELEMETRY_EVENT.MCP.PREFERENCES_BANNER_DISMISSED,
				getExperimentTelemetryPayload(MCP_PREFERENCES_ENTRY_POINTS_EXPERIMENT, entryPoint.value),
			);
		}

		function trackEntryPointClicked(source: McpPreferencesEntrySource) {
			if (!entryPoint.value) return;
			telemetry.track(
				TELEMETRY_EVENT.MCP.PREFERENCES_ENTRY_POINT_CLICKED,
				getExperimentTelemetryPayload(MCP_PREFERENCES_ENTRY_POINTS_EXPERIMENT, entryPoint.value, {
					entry_point: source,
				}),
			);
		}

		function trackPromptCopied(client: string) {
			if (!entryPoint.value) return;
			telemetry.track(
				TELEMETRY_EVENT.MCP.PREFERENCES_PROMPT_COPIED,
				getExperimentTelemetryPayload(MCP_PREFERENCES_ENTRY_POINTS_EXPERIMENT, entryPoint.value, {
					client,
				}),
			);
		}

		return {
			entryPoint,
			preferenceCount,
			isBannerDismissed,
			trackExposure,
			loadPreferenceCount,
			dismissBanner,
			trackEntryPointClicked,
			trackPromptCopied,
		};
	},
);
