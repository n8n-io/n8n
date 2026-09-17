import { shouldIncludeAlibabaModel } from '../providers/alibaba';

describe('shouldIncludeAlibabaModel', () => {
	const testCases: Array<{ id: string; include: boolean }> = [
		// Excluded: embedding models
		{ id: 'text-embedding-v4', include: false },
		{ id: 'multimodal-embedding-v1', include: false },

		// Excluded: reranking models
		{ id: 'gte-rerank-v2', include: false },
		{ id: 'gte-rerank', include: false },

		// Excluded: image-generation models
		{ id: 'qwen-image-3.0', include: false },
		{ id: 'qwen-image-3.0-pro', include: false },

		// Excluded: machine-translation models
		{ id: 'qwen-mt-flash', include: false },
		{ id: 'qwen-mt-lite', include: false },
		{ id: 'qwen-mt-plus', include: false },

		// Excluded: Wan media models (modality token in the id)
		{ id: 'wan2.6-t2i', include: false },
		{ id: 'wan2.2-i2i', include: false },
		{ id: 'wan2.6-t2v', include: false },
		{ id: 'wan2.6-i2v', include: false },

		// Included: standard chat models
		{ id: 'qwen-plus', include: true },
		{ id: 'qwen-turbo', include: true },
		{ id: 'qwen3.6-max-preview', include: true },
		{ id: 'qwen-vl-plus', include: true },
		{ id: 'qwen3-coder-flash', include: true },
	];

	const testCasesWithAction = testCases.map((tc) => ({
		...tc,
		action: tc.include ? 'include' : 'exclude',
	}));

	it.each(testCasesWithAction)('should $action "$id"', ({ id, include }) => {
		expect(shouldIncludeAlibabaModel(id)).toBe(include);
	});
});
