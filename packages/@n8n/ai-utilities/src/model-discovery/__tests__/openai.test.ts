import { shouldIncludeOpenAiModel } from '../providers/openai';

describe('shouldIncludeOpenAiModel', () => {
	const testCases: Array<{ modelId: string; officialAPI: boolean }> = [
		// Excluded model types
		{ modelId: 'babbage-002', officialAPI: false },
		{ modelId: 'davinci-002', officialAPI: false },
		{ modelId: 'computer-use-preview', officialAPI: false },
		{ modelId: 'dall-e-3', officialAPI: false },
		{ modelId: 'text-embedding-ada-002', officialAPI: false },
		{ modelId: 'tts-1', officialAPI: false },
		{ modelId: 'whisper-1', officialAPI: false },
		{ modelId: 'omni-moderation-latest', officialAPI: false },
		{ modelId: 'sora-1', officialAPI: false },
		{ modelId: 'gpt-4o-realtime-preview', officialAPI: false }, // infix check for -realtime
		{ modelId: 'gpt-3.5-turbo-instruct', officialAPI: false }, // gpt-* with instruct

		// Non-chat families named gpt-*, so caught by infix rather than prefix
		{ modelId: 'gpt-image-2', officialAPI: false },
		{ modelId: 'chatgpt-image-latest', officialAPI: false },
		{ modelId: 'gpt-transcribe', officialAPI: false },
		{ modelId: 'gpt-4o-transcribe-diarize', officialAPI: false },
		// Every diarization model OpenAI ships today is also *-transcribe-diarize,
		// so this pins the -diarize clause on its own
		{ modelId: 'gpt-4o-diarize', officialAPI: false },

		// Included models (standard chat models)
		{ modelId: 'gpt-4', officialAPI: true },
		{ modelId: 'gpt-4o', officialAPI: true },
		// Unsupported on responses, but supported on chat/completions, which the
		// OpenAI node's "Message a Model" uses, so it must stay selectable
		{ modelId: 'gpt-audio', officialAPI: true },
		{ modelId: 'o1-preview', officialAPI: true },
		{ modelId: 'ft:gpt-3.5-turbo', officialAPI: true }, // fine-tuned models

		// Edge cases
		{ modelId: 'llama-3-70b-instruct', officialAPI: true }, // non-gpt instruct is allowed
		{ modelId: 'custom-model', officialAPI: true }, // arbitrary custom model names
	];

	describe('Custom API behavior', () => {
		it.each(testCases)('should include "$modelId"', ({ modelId }) => {
			expect(shouldIncludeOpenAiModel(modelId, true)).toBe(true);
		});
	});

	describe('Official OpenAI API filtering', () => {
		const testCasesWithAction = testCases.map((tc) => ({
			...tc,
			action: tc.officialAPI ? 'include' : 'exclude',
		}));

		it.each(testCasesWithAction)('should $action "$modelId"', ({ modelId, officialAPI }) => {
			expect(shouldIncludeOpenAiModel(modelId, false)).toBe(officialAPI);
		});
	});
});
