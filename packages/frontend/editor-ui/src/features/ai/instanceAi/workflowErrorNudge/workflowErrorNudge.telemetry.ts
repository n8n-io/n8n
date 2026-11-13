import { useTelemetry } from '@n8n/composables/useTelemetry';
import { TELEMETRY_EVENT } from '@n8n/telemetry';

export function trackFixWithAssistantNudgeViewed() {
	useTelemetry().track(TELEMETRY_EVENT.INSTANCE_AI.USER_VIEWED_FIX_WITH_ASSISTANT_NUDGE, {});
}

export function trackErrorToastFixWithAssistantClick() {
	useTelemetry().track(TELEMETRY_EVENT.INSTANCE_AI.USER_CLICKED_ERROR_TOAST_FIX_WITH_ASSISTANT, {});
}
