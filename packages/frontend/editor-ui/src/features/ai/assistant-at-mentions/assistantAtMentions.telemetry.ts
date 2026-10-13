import { useTelemetry } from '@n8n/composables/useTelemetry';
import {
	ASSISTANT_MENTION_QUERY_TEXT_MAX_LENGTH,
	redactTelemetryText,
	TELEMETRY_EVENT,
} from '@n8n/telemetry';
import { toValue, type MaybeRefOrGetter } from 'vue';

import type {
	AssistantMentionCloseInfo,
	AssistantMentionKind,
	AssistantMentionPickerOpenMetrics,
	AssistantMentionSelection,
	AssistantMentionTriggerSource,
	WorkflowArtifactReference,
} from './assistantAtMentions.types';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';

export function useAssistantAtMentionsTelemetry(options: {
	/** Undefined on the empty view, where no thread exists before the first send. */
	threadId: MaybeRefOrGetter<string | undefined>;
}) {
	const telemetry = useTelemetry();
	const nodeTypesStore = useNodeTypesStore();
	const threadId = () => toValue(options.threadId) ?? null;
	// An empty search happens inside an open, so it reports how that open started.
	let openSource: AssistantMentionTriggerSource | undefined;

	function trackPickerOpened(source: AssistantMentionTriggerSource): void {
		openSource = source;
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

	/**
	 * The node type a query names outright, e.g. "slack". Search only matches
	 * nodes by their instance names, so a hit here reads as the user reaching
	 * for a service rather than a node they had named.
	 */
	function findNamedNodeType(query: string): string | null {
		const wanted = query.toLowerCase();
		return (
			nodeTypesStore.visibleNodeTypes.find(
				(nodeType) => nodeType.displayName.toLowerCase() === wanted,
			)?.name ?? null
		);
	}

	function trackEmptySearch(query: string, context: { artifactCount: number }): void {
		if (!openSource) return;
		telemetry.track(
			TELEMETRY_EVENT.INSTANCE_AI.USER_SEARCHED_AI_ASSISTANT_MENTIONS_WITHOUT_RESULTS,
			{
				thread_id: threadId(),
				source: openSource,
				// The one mention property that carries user text: scrub it like every
				// other free-text value that leaves the browser.
				query: redactTelemetryText(query, { maxLength: ASSISTANT_MENTION_QUERY_TEXT_MAX_LENGTH }),
				query_length: query.length,
				matched_node_type: findNamedNodeType(query),
				artifact_count: context.artifactCount,
			},
		);
	}

	function trackMentionSelected(
		selection: AssistantMentionSelection,
		/** The thread tab the mentioned workflow already has, if any. */
		existingArtifact: WorkflowArtifactReference | undefined,
	): void {
		if (!selection.telemetry) return;
		telemetry.track(TELEMETRY_EVENT.INSTANCE_AI.USER_SELECTED_AI_ASSISTANT_MENTION, {
			thread_id: threadId(),
			kind: selection.item.kind,
			mode: selection.telemetry.mode,
			source: selection.item.source,
			result_position: selection.telemetry.resultPosition,
			query_length: selection.telemetry.queryLength,
			already_artifact: existingArtifact !== undefined,
			artifact_origin: existingArtifact?.origin ?? null,
		});
	}

	function trackMentionRemoved(kind: AssistantMentionKind): void {
		telemetry.track(TELEMETRY_EVENT.INSTANCE_AI.USER_REMOVED_AI_ASSISTANT_MENTION, {
			thread_id: threadId(),
			kind,
		});
	}

	return {
		trackPickerOpened,
		trackPickerDismissed,
		trackEmptySearch,
		trackMentionSelected,
		trackMentionRemoved,
	};
}
