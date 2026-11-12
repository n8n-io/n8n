import { getApiKeyScopesForRole } from '@/public-api-permissions.ee';

describe('getApiKeyScopesForRole', () => {
	test('returns no scopes for global:agent', () => {
		expect(getApiKeyScopesForRole({ role: { slug: 'global:agent', scopes: [] } })).toEqual([]);
	});

	test('adds the personal project scopes for a role without global scopes', () => {
		expect(
			getApiKeyScopesForRole({ role: { slug: 'custom:empty', scopes: [] } }).length,
		).toBeGreaterThan(0);
	});
});
