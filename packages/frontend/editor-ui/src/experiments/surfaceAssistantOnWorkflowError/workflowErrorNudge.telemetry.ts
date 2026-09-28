// Experiment cleanup (119_surface_assistant_on_workflow_error)
import { useTelemetry } from '@n8n/composables/useTelemetry';
import { TELEMETRY_EVENT } from '@n8n/telemetry';

import { SURFACE_ASSISTANT_ON_WORKFLOW_ERROR_EXPERIMENT } from '@/app/constants/experiments';
import { usePostHog } from '@/app/stores/posthog.store';
import { getExperimentTelemetryPayload } from '@/experiments/utils';

function experimentVariant() {
	const currentVariant = usePostHog().getVariant(
		SURFACE_ASSISTANT_ON_WORKFLOW_ERROR_EXPERIMENT.name,
	);
	return currentVariant === SURFACE_ASSISTANT_ON_WORKFLOW_ERROR_EXPERIMENT.variant
		? SURFACE_ASSISTANT_ON_WORKFLOW_ERROR_EXPERIMENT.variant
		: SURFACE_ASSISTANT_ON_WORKFLOW_ERROR_EXPERIMENT.control;
}

export function trackFixWithAssistantNudgeViewed() {
	useTelemetry().track(
		TELEMETRY_EVENT.INSTANCE_AI.USER_VIEWED_FIX_WITH_ASSISTANT_NUDGE,
		getExperimentTelemetryPayload(
			SURFACE_ASSISTANT_ON_WORKFLOW_ERROR_EXPERIMENT,
			experimentVariant(),
		),
	);
}

export function trackErrorToastFixWithAssistantClick(assistantEnabled: boolean) {
	useTelemetry().track(
		TELEMETRY_EVENT.INSTANCE_AI.USER_CLICKED_ERROR_TOAST_FIX_WITH_ASSISTANT,
		getExperimentTelemetryPayload(
			SURFACE_ASSISTANT_ON_WORKFLOW_ERROR_EXPERIMENT,
			experimentVariant(),
			{ assistant_enabled: assistantEnabled },
		),
	);
}
