import { extractAccountIdentifier, extractAccountIdentifierFromData } from '../account-identifier';

describe('extractAccountIdentifier', () => {
	it('returns email from direct token field', () => {
		expect(extractAccountIdentifier({ email: 'user@example.com', access_token: 'tok' })).toBe(
			'user@example.com',
		);
	});

	it('returns login from direct token field (GitHub-style)', () => {
		expect(extractAccountIdentifier({ login: 'octocat', access_token: 'tok' })).toBe('octocat');
	});

	it('extracts email from JWT id_token', () => {
		const payload = { email: 'user@gmail.com', sub: '123' };
		const idToken = `header.${Buffer.from(JSON.stringify(payload)).toString('base64url')}.sig`;
		expect(extractAccountIdentifier({ id_token: idToken })).toBe('user@gmail.com');
	});

	it('extracts preferred_username from JWT id_token when no email', () => {
		const payload = { preferred_username: 'admin@contoso.com', sub: '123' };
		const idToken = `header.${Buffer.from(JSON.stringify(payload)).toString('base64url')}.sig`;
		expect(extractAccountIdentifier({ id_token: idToken })).toBe('admin@contoso.com');
	});

	it('falls back to the display name when only the profile scope was granted', () => {
		// Google returns no `email` claim unless the email scope was requested.
		const payload = { sub: '10464857079', name: 'Ada Lovelace', given_name: 'Ada' };
		const idToken = `header.${Buffer.from(JSON.stringify(payload)).toString('base64url')}.sig`;
		expect(extractAccountIdentifier({ id_token: idToken })).toBe('Ada Lovelace');
	});

	it('never labels a connection with the opaque subject id', () => {
		const payload = { sub: '10464857079', iss: 'https://accounts.google.com' };
		const idToken = `header.${Buffer.from(JSON.stringify(payload)).toString('base64url')}.sig`;
		expect(extractAccountIdentifier({ id_token: idToken })).toBeUndefined();
	});

	it('returns undefined for token data without identifiers', () => {
		expect(extractAccountIdentifier({ access_token: 'tok', refresh_token: 'ref' })).toBeUndefined();
	});

	it('returns undefined for a Google token granted only resource scopes', () => {
		// A Drive-scoped grant carries no id_token at all.
		expect(
			extractAccountIdentifier({
				access_token: 'ya29.tok',
				refresh_token: '1//ref',
				scope: 'https://www.googleapis.com/auth/drive',
				token_type: 'Bearer',
				callbackQueryString: { iss: 'https://accounts.google.com' },
			}),
		).toBeUndefined();
	});

	it('handles malformed JWT gracefully', () => {
		expect(extractAccountIdentifier({ id_token: 'not.a.jwt' })).toBeUndefined();
	});

	it('prefers direct fields over id_token', () => {
		const payload = { email: 'jwt@example.com' };
		const idToken = `h.${Buffer.from(JSON.stringify(payload)).toString('base64url')}.s`;
		expect(extractAccountIdentifier({ email: 'direct@example.com', id_token: idToken })).toBe(
			'direct@example.com',
		);
	});

	it('falls back to the Slack-style authed_user id', () => {
		expect(extractAccountIdentifier({ authed_user: { id: 'U123' } })).toBe('U123');
	});
});

describe('extractAccountIdentifierFromData', () => {
	it('reads the identifier off a payload carrying a token', () => {
		expect(
			extractAccountIdentifierFromData({
				clientId: 'abc',
				oauthTokenData: { email: 'user@example.com' },
			}),
		).toBe('user@example.com');
	});

	it.each([
		['no payload', undefined],
		['a payload with no token', { clientId: 'abc' }],
		['a token that is not an object', { oauthTokenData: 'redacted' }],
		['a null token', { oauthTokenData: null }],
	])('returns undefined for %s', (_case, data) => {
		expect(extractAccountIdentifierFromData(data)).toBeUndefined();
	});
});
