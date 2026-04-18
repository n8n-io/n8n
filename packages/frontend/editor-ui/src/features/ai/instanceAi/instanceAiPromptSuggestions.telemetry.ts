import { useTelemetry } from '@/app/composables/useTelemetry';

import { INSTANCE_AI_EMPTY_STATE_SUGGESTIONS_VERSION } from './emptyStateSuggestions';

export type TelemetryTracker = Pick<ReturnType<typeof useTelemetry>, 'track'>;

export type InstanceAiPromptSuggestionsShownContext = {
	threadId: string;
	researchMode: boolean;
};

export type InstanceAiQuickExampleOpenedContext = InstanceAiPromptSuggestionsShownContext & {
	suggestionId: 'quick-examples';
	position: number;
};

export type InstanceAiPromptSuggestionSelectedContext = InstanceAiPromptSuggestionsShownContext & {
	suggestionId: string;
	suggestionKind: 'prompt' | 'quick_example';
	position: number;
};

type InstanceAiPromptSuggestionsBasePayload = {
	thread_id: string;
	suggestion_catalog_version: string;
	research_mode: boolean;
};

const shownImpressionKeys = new Set<string>();

const createBasePayload = (
	context: InstanceAiPromptSuggestionsShownContext,
): InstanceAiPromptSuggestionsBasePayload => ({
	thread_id: context.threadId,
	suggestion_catalog_version: INSTANCE_AI_EMPTY_STATE_SUGGESTIONS_VERSION,
	research_mode: context.researchMode,
});

export function createInstanceAiPromptSuggestionsTelemetry(
	telemetry: TelemetryTracker,
	shownKeys = shownImpressionKeys,
) {
	return {
		trackSuggestionsShown(context: InstanceAiPromptSuggestionsShownContext) {
			const impressionKey = context.threadId + ':' + INSTANCE_AI_EMPTY_STATE_SUGGESTIONS_VERSION;
			if (shownKeys.has(impressionKey)) {
				return;
			}
			shownKeys.add(impressionKey);
			telemetry.track('Instance AI prompt suggestions shown', createBasePayload(context));
		},

		trackQuickExamplesOpened(context: InstanceAiQuickExampleOpenedContext) {
			telemetry.track('Instance AI quick examples opened', {
				...createBasePayload(context),
				suggestion_id: context.suggestionId,
				position: context.position,
			});
		},

		trackSuggestionSelected(context: InstanceAiPromptSuggestionSelectedContext) {
			telemetry.track('Instance AI prompt suggestion selected', {
				...createBasePayload(context),
				suggestion_id: context.suggestionId,
				suggestion_kind: context.suggestionKind,
				position: context.position,
			});
		},
	};
}

export function useInstanceAiPromptSuggestionsTelemetry() {
	return createInstanceAiPromptSuggestionsTelemetry(useTelemetry());
}
