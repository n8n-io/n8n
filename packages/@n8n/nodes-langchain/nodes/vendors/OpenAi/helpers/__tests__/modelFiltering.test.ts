import { shouldIncludeModel, shouldIncludeVisionModel } from '../modelFiltering';

describe('shouldIncludeModel', () => {
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

		// Included models (standard chat models)
		{ modelId: 'gpt-4', officialAPI: true },
		{ modelId: 'gpt-4o', officialAPI: true },
		{ modelId: 'o1-preview', officialAPI: true },
		{ modelId: 'ft:gpt-3.5-turbo', officialAPI: true }, // fine-tuned models

		// Edge cases
		{ modelId: 'llama-3-70b-instruct', officialAPI: true }, // non-gpt instruct is allowed
		{ modelId: 'custom-model', officialAPI: true }, // arbitrary custom model names
	];

	describe('Custom API behavior', () => {
		it.each(testCases)('should include "$modelId"', ({ modelId }) => {
			expect(shouldIncludeModel(modelId, true)).toBe(true);
		});
	});

	describe('Official OpenAI API filtering', () => {
		const testCasesWithAction = testCases.map((tc) => ({
			...tc,
			action: tc.officialAPI ? 'include' : 'exclude',
		}));

		it.each(testCasesWithAction)('should $action "$modelId"', ({ modelId, officialAPI }) => {
			expect(shouldIncludeModel(modelId, false)).toBe(officialAPI);
		});
	});
});

describe('shouldIncludeVisionModel', () => {
	const testCases: Array<{ modelId: string; officialAPI: boolean }> = [
		// Vision-capable models → include on official API
		{ modelId: 'gpt-4o', officialAPI: true },
		{ modelId: 'gpt-4o-mini', officialAPI: true },
		{ modelId: 'gpt-4.1', officialAPI: true },
		{ modelId: 'gpt-4.1-mini', officialAPI: true },
		{ modelId: 'gpt-4.1-nano', officialAPI: true },
		{ modelId: 'gpt-4-turbo', officialAPI: true },
		{ modelId: 'gpt-5', officialAPI: true },
		{ modelId: 'gpt-5-mini', officialAPI: true },
		{ modelId: 'gpt-5.4', officialAPI: true },
		{ modelId: 'o1', officialAPI: true },
		{ modelId: 'o3', officialAPI: true },
		{ modelId: 'o3-pro', officialAPI: true },
		{ modelId: 'o4-mini', officialAPI: true },

		// Non-vision chat models → exclude on official API
		{ modelId: 'gpt-3.5-turbo', officialAPI: false },
		{ modelId: 'gpt-3.5-turbo-0125', officialAPI: false },
		{ modelId: 'o1-mini', officialAPI: false },
		{ modelId: 'o3-mini', officialAPI: false },
		{ modelId: 'gpt-oss-120b', officialAPI: false },

		// Non-vision specialized models → exclude on official API
		{ modelId: 'gpt-4o-audio-preview', officialAPI: false },
		{ modelId: 'gpt-4o-audio-preview-2024-12-17', officialAPI: false },
		{ modelId: 'gpt-4o-mini-audio-preview', officialAPI: false },
		{ modelId: 'gpt-4o-search-preview', officialAPI: false },
		{ modelId: 'gpt-4o-transcribe', officialAPI: false },
		{ modelId: 'gpt-4o-mini-transcribe', officialAPI: false },

		// Excluded by shouldIncludeModel base layer
		{ modelId: 'dall-e-3', officialAPI: false },
		{ modelId: 'whisper-1', officialAPI: false },
		{ modelId: 'tts-1', officialAPI: false },
		{ modelId: 'gpt-4o-realtime-preview', officialAPI: false },
	];

	describe('Custom API behavior', () => {
		it.each(testCases)('should include "$modelId"', ({ modelId }) => {
			expect(shouldIncludeVisionModel(modelId, true)).toBe(true);
		});
	});

	describe('Official OpenAI API filtering', () => {
		const testCasesWithAction = testCases.map((tc) => ({
			...tc,
			action: tc.officialAPI ? 'include' : 'exclude',
		}));

		it.each(testCasesWithAction)('should $action "$modelId"', ({ modelId, officialAPI }) => {
			expect(shouldIncludeVisionModel(modelId, false)).toBe(officialAPI);
		});
	});
});
