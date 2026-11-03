import jwt from 'jsonwebtoken';

import { authenticateWebhookRequest } from '../platforms/webhook/webhook-auth';

const headerCredential = { name: 'X-Api-Key', value: 'key-1' };
const jwtCredential = { keyType: 'passphrase', secret: 'secret-1', algorithm: 'HS256' };

const expectStatus = (run: () => void, status: number) =>
	expect(run).toThrow(expect.objectContaining({ status }) as Error);

describe('authenticateWebhookRequest with header auth', () => {
	it('accepts the configured header value, with any header-name case', () => {
		expect(() =>
			authenticateWebhookRequest({ 'x-api-key': 'key-1' }, 'headerAuth', headerCredential),
		).not.toThrow();
	});

	it.each([
		['a missing header', {}],
		['a wrong value', { 'x-api-key': 'key-2' }],
		['a value of another length', { 'x-api-key': 'key-10' }],
	])('rejects %s with 403', (_, headers) => {
		expectStatus(() => authenticateWebhookRequest(headers, 'headerAuth', headerCredential), 403);
	});

	it('returns 500 for a credential without a name or value', () => {
		expectStatus(() => authenticateWebhookRequest({}, 'headerAuth', { name: 'X-Api-Key' }), 500);
	});
});

describe('authenticateWebhookRequest with JWT auth', () => {
	const bearer = (token: string) => ({ authorization: `Bearer ${token}` });

	it('accepts a token signed with the credential secret', () => {
		const token = jwt.sign({ sub: 'caller' }, 'secret-1', { algorithm: 'HS256' });
		expect(() => authenticateWebhookRequest(bearer(token), 'jwtAuth', jwtCredential)).not.toThrow();
	});

	it('rejects a missing token with 401', () => {
		expectStatus(() => authenticateWebhookRequest({}, 'jwtAuth', jwtCredential), 401);
	});

	it.each([
		['another secret', jwt.sign({ sub: 'caller' }, 'secret-2', { algorithm: 'HS256' })],
		['an unsigned token', jwt.sign({ sub: 'caller' }, '', { algorithm: 'none' })],
		['a malformed token', 'not-a-token'],
	])('rejects a token with %s with 403', (_, token) => {
		expectStatus(() => authenticateWebhookRequest(bearer(token), 'jwtAuth', jwtCredential), 403);
	});

	it('does not use a leftover secret for a PEM key credential', () => {
		const token = jwt.sign({ sub: 'caller' }, 'secret-1', { algorithm: 'HS256' });
		expectStatus(
			() =>
				authenticateWebhookRequest(bearer(token), 'jwtAuth', {
					...jwtCredential,
					keyType: 'pemKey',
				}),
			500,
		);
	});

	it('returns 500 for a credential that accepts unsigned tokens', () => {
		const token = jwt.sign({ sub: 'caller' }, '', { algorithm: 'none' });
		expectStatus(
			() =>
				authenticateWebhookRequest(bearer(token), 'jwtAuth', {
					...jwtCredential,
					algorithm: 'none',
				}),
			500,
		);
	});
});
