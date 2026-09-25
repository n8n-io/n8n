import { useTelemetry } from '@n8n/composables/useTelemetry';
import { TELEMETRY_EVENT } from '@n8n/telemetry';

import type {
	AssistantMentionKind,
	AssistantMentionSelection,
	AssistantMentionTriggerSource,
} from './assistantAtMentions.types';

export function useAssistantAtMentionsTelemetry() {
	const telemetry = useTelemetry();

	function trackPickerOpened(source: AssistantMentionTriggerSource): void {
		telemetry.track(TELEMETRY_EVENT.INSTANCE_AI.USER_OPENED_AI_ASSISTANT_MENTION_PICKER, {
			source,
		});
	}

	function trackMentionSelected(
		selection: AssistantMentionSelection,
		alreadyArtifact: boolean,
	): void {
		if (!selection.telemetry) return;
		telemetry.track(TELEMETRY_EVENT.INSTANCE_AI.USER_SELECTED_AI_ASSISTANT_MENTION, {
			kind: selection.item.kind,
			mode: selection.telemetry.mode,
			source: selection.item.source,
			result_position: selection.telemetry.resultPosition,
			query_length: selection.telemetry.queryLength,
			already_artifact: alreadyArtifact,
		});
	}

	function trackMentionRemoved(kind: AssistantMentionKind): void {
		telemetry.track(TELEMETRY_EVENT.INSTANCE_AI.USER_REMOVED_AI_ASSISTANT_MENTION, { kind });
	}

	return { trackPickerOpened, trackMentionSelected, trackMentionRemoved };
}
