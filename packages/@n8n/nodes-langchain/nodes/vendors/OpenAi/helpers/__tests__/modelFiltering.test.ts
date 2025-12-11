import { shouldIncludeModel } from '../modelFiltering';

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
