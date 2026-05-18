import { useTelemetry } from '@/app/composables/useTelemetry';

import { INSTANCE_AI_EMPTY_STATE_SUGGESTIONS_VERSION } from './emptyStateSuggestions';

export type TelemetryTracker = Pick<ReturnType<typeof useTelemetry>, 'track'>;

// Experiment cleanup: remove with instanceAiPromptSuggestionsV2.
export type InstanceAiPromptSuggestionsShownContext = {
	threadId?: string;
	researchMode: boolean;
	suggestionCatalogVersion?: string;
};

export type InstanceAiQuickExampleOpenedContext = InstanceAiPromptSuggestionsShownContext & {
	suggestionId: 'quick-examples';
	position: number;
};

export type InstanceAiPromptSuggestionsCycledContext = {
	researchMode: boolean;
	suggestionCatalogVersion?: string;
	visibleSuggestionIds: string[];
	cycleCount: number;
};

export type InstanceAiPromptSuggestionSelectedContext = InstanceAiPromptSuggestionsShownContext & {
	suggestionId: string;
	suggestionKind: 'prompt' | 'quick_example';
	position: number;
};

export type InstanceAiPromptSuggestionSubmittedContext =
	InstanceAiPromptSuggestionSelectedContext & {
		promptModified: boolean;
	};

type InstanceAiPromptSuggestionsBasePayload = {
	thread_id?: string;
	suggestion_catalog_version: string;
	research_mode: boolean;
};

const shownImpressionKeys = new Set<string>();

const resolveSuggestionCatalogVersion = (context: InstanceAiPromptSuggestionsShownContext) =>
	context.suggestionCatalogVersion ?? INSTANCE_AI_EMPTY_STATE_SUGGESTIONS_VERSION;

const createBasePayload = (
	context: InstanceAiPromptSuggestionsShownContext,
): InstanceAiPromptSuggestionsBasePayload => {
	const payload: InstanceAiPromptSuggestionsBasePayload = {
		suggestion_catalog_version: resolveSuggestionCatalogVersion(context),
		research_mode: context.researchMode,
	};

	if (context.threadId) {
		payload.thread_id = context.threadId;
	}

	return payload;
};

export function createInstanceAiPromptSuggestionsTelemetry(
	telemetry: TelemetryTracker,
	shownKeys = shownImpressionKeys,
) {
	return {
		trackSuggestionsShown(context: InstanceAiPromptSuggestionsShownContext) {
			// Experiment cleanup: remove with instanceAiPromptSuggestionsV2.
			const impressionScope = context.threadId || 'empty-state';
			const impressionKey = impressionScope + ':' + resolveSuggestionCatalogVersion(context);
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

		trackSuggestionsCycled(context: InstanceAiPromptSuggestionsCycledContext) {
			telemetry.track('Instance AI prompt suggestions cycled', {
				suggestion_catalog_version: resolveSuggestionCatalogVersion(context),
				research_mode: context.researchMode,
				visible_suggestion_ids: context.visibleSuggestionIds,
				cycle_count: context.cycleCount,
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

		trackSuggestionSubmitted(context: InstanceAiPromptSuggestionSubmittedContext) {
			telemetry.track('Instance AI prompt suggestion submitted', {
				...createBasePayload(context),
				suggestion_id: context.suggestionId,
				suggestion_kind: context.suggestionKind,
				position: context.position,
				prompt_modified: context.promptModified,
			});
		},
	};
}

export function useInstanceAiPromptSuggestionsTelemetry() {
	return createInstanceAiPromptSuggestionsTelemetry(useTelemetry());
}
