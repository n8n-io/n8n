import { appNamespaceSchema } from '@n8n/api-types';

import { appNamespaceCandidates } from '../app-namespace-candidates';

describe('appNamespaceCandidates', () => {
	it('starts with the proposed namespace and then adds numbers', () => {
		const candidates = appNamespaceCandidates('film-blog');

		expect(candidates.slice(0, 3)).toEqual(['film-blog', 'film-blog-2', 'film-blog-3']);
		expect(candidates).toHaveLength(21);
		expect(candidates.at(-1)).toBe('film-blog-21');
	});

	it('cuts a long namespace so that each numbered one is still valid', () => {
		const longest = 'a'.repeat(50) + '-bcd';

		for (const candidate of appNamespaceCandidates(longest)) {
			expect(appNamespaceSchema.safeParse(candidate).success).toBe(true);
		}
		expect(appNamespaceCandidates(longest)[1]).toBe('a'.repeat(50) + '-b-2');
	});

	it('does not leave a double hyphen where the cut meets a hyphen', () => {
		const candidates = appNamespaceCandidates('a'.repeat(51) + '-cd');

		expect(candidates[1]).toBe('a'.repeat(51) + '-2');
		expect(candidates.every((candidate) => !candidate.includes('--'))).toBe(true);
	});
});
