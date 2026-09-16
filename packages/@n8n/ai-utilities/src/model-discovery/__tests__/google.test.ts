import { shouldIncludeGoogleModel } from '../providers/google';

describe('shouldIncludeGoogleModel', () => {
	const testCases: Array<{ name: string; include: boolean }> = [
		// Excluded: embedding models
		{ name: 'models/embedding-001', include: false },
		{ name: 'models/text-embedding-004', include: false },
		{ name: 'models/gemini-embedding-001', include: false },

		// Excluded: image models (imagen-* and gemini-*-image)
		{ name: 'models/imagen-3.0-generate-002', include: false },
		{ name: 'models/gemini-2.5-flash-image', include: false },

		// Included: standard chat models
		{ name: 'models/gemini-2.5-flash', include: true },
		{ name: 'models/gemini-2.5-pro', include: true },
		{ name: 'models/gemini-3-flash-preview', include: true },
		{ name: 'models/gemini-1.5-pro', include: true },
	];

	const testCasesWithAction = testCases.map((tc) => ({
		...tc,
		action: tc.include ? 'include' : 'exclude',
	}));

	it.each(testCasesWithAction)('should $action "$name"', ({ name, include }) => {
		expect(shouldIncludeGoogleModel(name)).toBe(include);
	});
});
