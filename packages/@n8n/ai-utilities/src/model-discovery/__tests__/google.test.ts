import { shouldIncludeGoogleModel } from '../providers/google';

describe('shouldIncludeGoogleModel', () => {
	const chat = ['generateContent', 'countTokens'];

	const testCases: Array<{
		label: string;
		name: string;
		supportedGenerationMethods?: unknown;
		include: boolean;
	}> = [
		// Included: chat models expose generateContent
		{
			label: 'gemini flash',
			name: 'models/gemini-2.5-flash',
			supportedGenerationMethods: chat,
			include: true,
		},
		{
			label: 'gemini pro',
			name: 'models/gemini-2.5-pro',
			supportedGenerationMethods: chat,
			include: true,
		},
		{
			label: 'gemini preview',
			name: 'models/gemini-3-flash-preview',
			supportedGenerationMethods: chat,
			include: true,
		},

		// Excluded: no generateContent method
		{
			label: 'embedding',
			name: 'models/text-embedding-004',
			supportedGenerationMethods: ['embedContent'],
			include: false,
		},
		{
			label: 'veo',
			name: 'models/veo-2.0-generate-001',
			supportedGenerationMethods: ['predictLongRunning'],
			include: false,
		},
		{
			label: 'imagen',
			name: 'models/imagen-3.0-generate-002',
			supportedGenerationMethods: ['predict'],
			include: false,
		},
		{
			label: 'aqa',
			name: 'models/aqa',
			supportedGenerationMethods: ['generateAnswer'],
			include: false,
		},

		// Excluded: generateContent present but non-text output
		{
			label: 'gemini image',
			name: 'models/gemini-2.5-flash-image',
			supportedGenerationMethods: chat,
			include: false,
		},
		{
			label: 'gemini tts',
			name: 'models/gemini-2.5-flash-preview-tts',
			supportedGenerationMethods: chat,
			include: false,
		},
		{
			label: 'gemini embedding served through Gateway credits',
			name: 'models/gemini-embedding-001',
			supportedGenerationMethods: chat,
			include: false,
		},

		// Excluded: missing or malformed methods field
		{
			label: 'no methods',
			name: 'models/gemini-x',
			supportedGenerationMethods: undefined,
			include: false,
		},
		{
			label: 'non-array methods',
			name: 'models/gemini-y',
			supportedGenerationMethods: 'generateContent',
			include: false,
		},
	];

	const testCasesWithAction = testCases.map((tc) => ({
		...tc,
		action: tc.include ? 'include' : 'exclude',
	}));

	it.each(testCasesWithAction)(
		'should $action "$label"',
		({ name, supportedGenerationMethods, include }) => {
			expect(shouldIncludeGoogleModel({ name, supportedGenerationMethods })).toBe(include);
		},
	);
});
