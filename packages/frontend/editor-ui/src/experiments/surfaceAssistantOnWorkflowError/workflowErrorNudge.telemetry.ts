// Experiment cleanup (119_surface_assistant_on_workflow_error)
import { useTelemetry } from '@n8n/composables/useTelemetry';
import { TELEMETRY_EVENT } from '@n8n/telemetry';

import { SURFACE_ASSISTANT_ON_WORKFLOW_ERROR_EXPERIMENT } from '@/app/constants/experiments';
import { getExperimentTelemetryPayload } from '@/experiments/utils';
import type { WorkflowErrorNudgeVariant } from './composables/useSurfaceAssistantOnWorkflowError';

export function trackFixWithAssistantNudgeViewed(variant: WorkflowErrorNudgeVariant) {
	useTelemetry().track(
		TELEMETRY_EVENT.INSTANCE_AI.USER_VIEWED_FIX_WITH_ASSISTANT_NUDGE,
		getExperimentTelemetryPayload(SURFACE_ASSISTANT_ON_WORKFLOW_ERROR_EXPERIMENT, variant),
	);
}

export function trackErrorToastFixWithAssistantClick(
	variant: WorkflowErrorNudgeVariant,
	assistantEnabled: boolean,
) {
	useTelemetry().track(
		TELEMETRY_EVENT.INSTANCE_AI.USER_CLICKED_ERROR_TOAST_FIX_WITH_ASSISTANT,
		getExperimentTelemetryPayload(SURFACE_ASSISTANT_ON_WORKFLOW_ERROR_EXPERIMENT, variant, {
			assistant_enabled: assistantEnabled,
		}),
	);
}
