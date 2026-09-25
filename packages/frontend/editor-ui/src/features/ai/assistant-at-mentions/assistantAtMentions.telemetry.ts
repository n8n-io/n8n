import { useTelemetry } from '@n8n/composables/useTelemetry';
import { TELEMETRY_EVENT } from '@n8n/telemetry';
import { toValue, type MaybeRefOrGetter } from 'vue';

import type {
	AssistantMentionCloseInfo,
	AssistantMentionKind,
	AssistantMentionPickerOpenMetrics,
	AssistantMentionSelection,
	AssistantMentionTriggerSource,
} from './assistantAtMentions.types';

export function useAssistantAtMentionsTelemetry(options: {
	/** Undefined on the empty view, where no thread exists before the first send. */
	threadId: MaybeRefOrGetter<string | undefined>;
}) {
	const telemetry = useTelemetry();
	const threadId = () => toValue(options.threadId) ?? null;

	function trackPickerOpened(source: AssistantMentionTriggerSource): void {
		telemetry.track(TELEMETRY_EVENT.INSTANCE_AI.USER_OPENED_AI_ASSISTANT_MENTION_PICKER, {
			thread_id: threadId(),
			source,
		});
	}

	function trackPickerDismissed(
		info: AssistantMentionCloseInfo,
		metrics: AssistantMentionPickerOpenMetrics,
	): void {
		if (info.reason === 'selected') return;
		telemetry.track(TELEMETRY_EVENT.INSTANCE_AI.USER_DISMISSED_AI_ASSISTANT_MENTION_PICKER, {
			thread_id: threadId(),
			source: info.source,
			reason: info.reason,
			mode: metrics.mode,
			query_length: metrics.queryLength,
			result_count: metrics.resultCount,
			ambiguous_result_count: metrics.ambiguousResultCount,
			submenu_open_count: metrics.submenuOpenCount,
		});
	}

	function trackMentionSelected(
		selection: AssistantMentionSelection,
		alreadyArtifact: boolean,
	): void {
		if (!selection.telemetry) return;
		telemetry.track(TELEMETRY_EVENT.INSTANCE_AI.USER_SELECTED_AI_ASSISTANT_MENTION, {
			thread_id: threadId(),
			kind: selection.item.kind,
			mode: selection.telemetry.mode,
			source: selection.item.source,
			result_position: selection.telemetry.resultPosition,
			query_length: selection.telemetry.queryLength,
			already_artifact: alreadyArtifact,
		});
	}

	function trackMentionRemoved(kind: AssistantMentionKind): void {
		telemetry.track(TELEMETRY_EVENT.INSTANCE_AI.USER_REMOVED_AI_ASSISTANT_MENTION, {
			thread_id: threadId(),
			kind,
		});
	}

	return { trackPickerOpened, trackPickerDismissed, trackMentionSelected, trackMentionRemoved };
}
