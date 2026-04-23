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

		helper.trackSuggestionsShown({ threadId: 'thread-1', researchMode: true });
		expect(track).toHaveBeenCalledTimes(1);
		expect(track).toHaveBeenCalledWith('Instance AI prompt suggestions shown', {
			thread_id: 'thread-1',
			suggestion_catalog_version: INSTANCE_AI_EMPTY_STATE_SUGGESTIONS_VERSION,
			research_mode: true,
		});

		helper.trackSuggestionsShown({ threadId: 'thread-1', researchMode: true });
		expect(track).toHaveBeenCalledTimes(1);

		helper.trackSuggestionsShown({ threadId: 'thread-2', researchMode: false });
		expect(track).toHaveBeenCalledTimes(2);

		const shownPayload = track.mock.calls[0][1];
		const shownSerializedPayload = JSON.stringify(shownPayload);
		expect(shownSerializedPayload).not.toContain('"prompt":"');
		expect(shownSerializedPayload).not.toContain('"prompt_text":"');
	});

	test('tracks quick example opens with suggestion metadata', () => {
		const helper = createInstanceAiPromptSuggestionsTelemetry(telemetry);

		helper.trackQuickExamplesOpened({
			threadId: 'thread-1',
			researchMode: false,
			suggestionId: 'quick-examples',
			position: 2,
		});

		expect(track).toHaveBeenCalledWith('Instance AI quick examples opened', {
			thread_id: 'thread-1',
			suggestion_catalog_version: INSTANCE_AI_EMPTY_STATE_SUGGESTIONS_VERSION,
			research_mode: false,
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
			researchMode: true,
			suggestionId: 'build-workflow',
			suggestionKind: 'prompt',
			position: 1,
		});

		expect(track).toHaveBeenCalledWith('Instance AI prompt suggestion selected', {
			thread_id: 'thread-abc',
			suggestion_catalog_version: INSTANCE_AI_EMPTY_STATE_SUGGESTIONS_VERSION,
			research_mode: true,
			suggestion_id: 'build-workflow',
			suggestion_kind: 'prompt',
			position: 1,
		});

		const selectedPayload = track.mock.calls[0][1];
		const selectedSerializedPayload = JSON.stringify(selectedPayload);
		expect(selectedSerializedPayload).not.toContain('"prompt":"');
		expect(selectedSerializedPayload).not.toContain('"prompt_text":"');
	});
});
