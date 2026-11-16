import {
	ADMIN_API_KEY_SCOPES,
	API_KEY_SCOPES_FOR_IMPLICIT_PERSONAL_PROJECT,
	CHAT_USER_API_KEY_SCOPES,
	getApiKeyScopesForRole,
	MEMBER_API_KEY_SCOPES,
	OWNER_API_KEY_SCOPES,
} from '@/public-api-permissions.ee';

describe('getApiKeyScopesForRole', () => {
	test('returns no scopes for global:agent', () => {
		expect(getApiKeyScopesForRole({ role: { slug: 'global:agent', scopes: [] } })).toEqual([]);
	});

	test('adds the personal project scopes for a role without global scopes', () => {
		expect(
			getApiKeyScopesForRole({ role: { slug: 'custom:empty', scopes: [] } }).length,
		).toBeGreaterThan(0);
	});

	test('grants workflow:execute to a role without global scopes', () => {
		expect(getApiKeyScopesForRole({ role: { slug: 'custom:empty', scopes: [] } })).toContain(
			'workflow:execute',
		);
	});

	test('does not grant workflow:execute to a chat user', () => {
		expect(getApiKeyScopesForRole({ role: { slug: 'global:chatUser', scopes: [] } })).not.toContain(
			'workflow:execute',
		);
	});

	it.each(
		Object.entries({
			owner: OWNER_API_KEY_SCOPES,
			admin: ADMIN_API_KEY_SCOPES,
			member: MEMBER_API_KEY_SCOPES,
			personalProject: API_KEY_SCOPES_FOR_IMPLICIT_PERSONAL_PROJECT,
		}),
	)('allows workflow:execute on a %s API key', (_role, scopes) => {
		expect(scopes).toContain('workflow:execute');
	});

	it('keeps workflow:execute out of chat user API keys', () => {
		expect(CHAT_USER_API_KEY_SCOPES).not.toContain('workflow:execute');
	});
});
