import { describe, expect, test, vi } from 'vitest';

import { INSTANCE_AI_EMPTY_STATE_SUGGESTIONS_VERSION } from '../emptyStateSuggestions';
import { createInstanceAiPromptSuggestionsTelemetry } from '../instanceAiPromptSuggestions.telemetry';

describe('instance ai prompt suggestions telemetry', () => {
	const track = vi.fn();
	const telemetry = { track };

	beforeEach(() => {
		track.mockClear();
	});

	test('tracks suggestion impressions once per thread and version', () => {
		const shownKeys = new Set<string>();
		const helper = createInstanceAiPromptSuggestionsTelemetry(telemetry, shownKeys);

		helper.trackSuggestionsShown({ threadId: 'thread-1' });
		expect(track).toHaveBeenCalledTimes(1);
		expect(track).toHaveBeenCalledWith('Instance AI prompt suggestions shown', {
			thread_id: 'thread-1',
			suggestion_catalog_version: INSTANCE_AI_EMPTY_STATE_SUGGESTIONS_VERSION,
		});

		helper.trackSuggestionsShown({ threadId: 'thread-1' });
		expect(track).toHaveBeenCalledTimes(1);

		helper.trackSuggestionsShown({ threadId: 'thread-2' });
		expect(track).toHaveBeenCalledTimes(2);

		const shownPayload = track.mock.calls[0][1];
		const shownSerializedPayload = JSON.stringify(shownPayload);
		expect(shownSerializedPayload).not.toContain('"prompt":"');
		expect(shownSerializedPayload).not.toContain('"prompt_text":"');
	});

	test('tracks suggestion impressions with a caller-provided catalog version', () => {
		const helper = createInstanceAiPromptSuggestionsTelemetry(telemetry, new Set<string>());

		helper.trackSuggestionsShown({
			threadId: 'thread-v2',
			suggestionCatalogVersion: 'v2',
		});

		expect(track).toHaveBeenCalledWith('Instance AI prompt suggestions shown', {
			thread_id: 'thread-v2',
			suggestion_catalog_version: 'v2',
		});
	});

	test('tracks suggestion impressions without a thread id for the empty state', () => {
		const helper = createInstanceAiPromptSuggestionsTelemetry(telemetry, new Set<string>());

		helper.trackSuggestionsShown({
			suggestionCatalogVersion: 'v2',
		});

		expect(track).toHaveBeenCalledWith('Instance AI prompt suggestions shown', {
			suggestion_catalog_version: 'v2',
		});
	});

	test('dedupes suggestion impressions by thread and resolved catalog version', () => {
		const shownKeys = new Set<string>();
		const helper = createInstanceAiPromptSuggestionsTelemetry(telemetry, shownKeys);

		helper.trackSuggestionsShown({ threadId: 'thread-versioned' });
		helper.trackSuggestionsShown({
			threadId: 'thread-versioned',
			suggestionCatalogVersion: 'v2',
		});
		helper.trackSuggestionsShown({
			threadId: 'thread-versioned',
			suggestionCatalogVersion: 'v2',
		});

		expect(track).toHaveBeenCalledTimes(2);
		expect(track.mock.calls[0][1]).toEqual({
			thread_id: 'thread-versioned',
			suggestion_catalog_version: INSTANCE_AI_EMPTY_STATE_SUGGESTIONS_VERSION,
		});
		expect(track.mock.calls[1][1]).toEqual({
			thread_id: 'thread-versioned',
			suggestion_catalog_version: 'v2',
		});
	});

	test('dedupes empty-state suggestion impressions by catalog version', () => {
		const helper = createInstanceAiPromptSuggestionsTelemetry(telemetry, new Set<string>());

		helper.trackSuggestionsShown({
			suggestionCatalogVersion: 'v2',
		});
		helper.trackSuggestionsShown({
			suggestionCatalogVersion: 'v2',
		});

		expect(track).toHaveBeenCalledTimes(1);
	});

	test('tracks quick example opens with suggestion metadata', () => {
		const helper = createInstanceAiPromptSuggestionsTelemetry(telemetry);

		helper.trackQuickExamplesOpened({
			threadId: 'thread-1',
			suggestionId: 'quick-examples',
			position: 2,
		});

		expect(track).toHaveBeenCalledWith('Instance AI quick examples opened', {
			thread_id: 'thread-1',
			suggestion_catalog_version: INSTANCE_AI_EMPTY_STATE_SUGGESTIONS_VERSION,
			suggestion_id: 'quick-examples',
			position: 2,
		});

		const quickExamplePayload = track.mock.calls[0][1];
		const quickExampleSerializedPayload = JSON.stringify(quickExamplePayload);
		expect(Object.keys(quickExamplePayload)).not.toContain('prompt');
		expect(Object.keys(quickExamplePayload)).not.toContain('promptKey');
		expect(quickExampleSerializedPayload).not.toContain('"prompt":"');
		expect(quickExampleSerializedPayload).not.toContain('"prompt_text":"');
	});

	test('tracks suggestion selections with kind and position', () => {
		const helper = createInstanceAiPromptSuggestionsTelemetry(telemetry);

		helper.trackSuggestionSelected({
			threadId: 'thread-abc',
			suggestionId: 'build-workflow',
			suggestionKind: 'prompt',
			position: 1,
		});

		expect(track).toHaveBeenCalledWith('Instance AI prompt suggestion selected', {
			thread_id: 'thread-abc',
			suggestion_catalog_version: INSTANCE_AI_EMPTY_STATE_SUGGESTIONS_VERSION,
			suggestion_id: 'build-workflow',
			suggestion_kind: 'prompt',
			position: 1,
		});

		const selectedPayload = track.mock.calls[0][1];
		const selectedSerializedPayload = JSON.stringify(selectedPayload);
		expect(selectedSerializedPayload).not.toContain('"prompt":"');
		expect(selectedSerializedPayload).not.toContain('"prompt_text":"');
	});

	test('tracks suggestion selections with a caller-provided catalog version', () => {
		const helper = createInstanceAiPromptSuggestionsTelemetry(telemetry);

		helper.trackSuggestionSelected({
			threadId: 'thread-v2',
			suggestionCatalogVersion: 'v2',
			suggestionId: 'plan-workflow',
			suggestionKind: 'prompt',
			position: 2,
		});

		expect(track).toHaveBeenCalledWith('Instance AI prompt suggestion selected', {
			thread_id: 'thread-v2',
			suggestion_catalog_version: 'v2',
			suggestion_id: 'plan-workflow',
			suggestion_kind: 'prompt',
			position: 2,
		});
	});

	test('tracks suggestion cycles with the visible suggestions and cycle count', () => {
		const helper = createInstanceAiPromptSuggestionsTelemetry(telemetry);

		helper.trackSuggestionsCycled({
			suggestionCatalogVersion: 'v2',
			visibleSuggestionIds: [
				'analyze-exit-interviews',
				'post-to-linkedin',
				'customer-health-agent',
				'automate-order-flow',
			],
			cycleCount: 1,
		});

		expect(track).toHaveBeenCalledWith('Instance AI prompt suggestions cycled', {
			suggestion_catalog_version: 'v2',
			visible_suggestion_ids: [
				'analyze-exit-interviews',
				'post-to-linkedin',
				'customer-health-agent',
				'automate-order-flow',
			],
			cycle_count: 1,
		});
		expect(track.mock.calls[0][1]).not.toHaveProperty('thread_id');
	});

	test('tracks submitted inserted suggestions with modified state', () => {
		const helper = createInstanceAiPromptSuggestionsTelemetry(telemetry);

		helper.trackSuggestionSubmitted({
			suggestionCatalogVersion: 'v2',
			suggestionId: 'accounts-payable-agent',
			suggestionKind: 'prompt',
			position: 1,
			promptModified: true,
		});

		expect(track).toHaveBeenCalledWith('Instance AI prompt suggestion submitted', {
			suggestion_catalog_version: 'v2',
			suggestion_id: 'accounts-payable-agent',
			suggestion_kind: 'prompt',
			position: 1,
			prompt_modified: true,
		});
	});
});
