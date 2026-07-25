import { useTelemetry } from '@/app/composables/useTelemetry';
import { EXPOSE_ALL_WORKFLOWS_TO_MCP_EXPERIMENT } from '@/app/constants/experiments';
import { usePostHog } from '@/app/stores/posthog.store';
import { getExperimentTelemetryPayload } from '@/experiments/utils';
import { STORES } from '@n8n/stores';
import { defineStore } from 'pinia';
import { computed } from 'vue';

export const useExposeAllWorkflowsToMcpStore = defineStore(
	STORES.EXPERIMENT_EXPOSE_ALL_WORKFLOWS_TO_MCP,
	() => {
		const posthogStore = usePostHog();
		const telemetry = useTelemetry();

		const currentVariant = computed(() =>
			posthogStore.getVariant(EXPOSE_ALL_WORKFLOWS_TO_MCP_EXPERIMENT.name),
		);
		const isEnabled = computed(() =>
			posthogStore.isVariantEnabled(
				EXPOSE_ALL_WORKFLOWS_TO_MCP_EXPERIMENT.name,
				EXPOSE_ALL_WORKFLOWS_TO_MCP_EXPERIMENT.variant,
			),
		);

		const getTelemetryPayload = () =>
			getExperimentTelemetryPayload(EXPOSE_ALL_WORKFLOWS_TO_MCP_EXPERIMENT, currentVariant.value);

		function trackConfirmed() {
			telemetry.track('MCP expose all workflows confirmed', getTelemetryPayload());
		}

		function trackDeclined() {
			telemetry.track('MCP expose all workflows declined', getTelemetryPayload());
		}

		function trackDismissed() {
			telemetry.track('MCP expose all workflows modal dismissed', getTelemetryPayload());
		}

		return {
			currentVariant,
			isEnabled,
			trackConfirmed,
			trackDeclined,
			trackDismissed,
		};
	},
);
