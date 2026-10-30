import { createClientCredentialsTokenSource } from './oauth2';
import type { OAuth2Login } from './types';

const TOKEN_URL = 'https://login.example.com/oauth2/token';
const SECRET = 'cs-9f2a71c4ab';

const login = (overrides: Partial<OAuth2Login> = {}): OAuth2Login => ({
	type: 'oauth2',
	tokenUrl: TOKEN_URL,
	clientId: 'client-1',
	clientSecret: SECRET,
	scope: '',
	sendCredentialsIn: 'header',
	...overrides,
});

const granting = (body: Record<string, unknown>, status = 200) => {
	const calls: Array<{ url: string; headers: Headers; body: URLSearchParams }> = [];
	const fetchImpl = async (url: RequestInfo | URL, init?: RequestInit) => {
		calls.push({
			url: url.toString(),
			headers: new Headers(init?.headers ?? {}),
			body: new URLSearchParams(String(init?.body ?? '')),
		});
		return new Response(JSON.stringify(body), { status });
	};
	return { calls, fetchImpl: fetchImpl as unknown as typeof fetch };
};

const GRANT = { access_token: 'tok-abc', expires_in: 3600, token_type: 'Bearer' };

describe('createClientCredentialsTokenSource', () => {
	it('asks the login server for a token and returns it', async () => {
		const { calls, fetchImpl } = granting(GRANT);

		const token = await createClientCredentialsTokenSource(login(), fetchImpl).getToken();

		expect(token).toBe('tok-abc');
		expect(calls[0].url).toBe(TOKEN_URL);
		expect(calls[0].body.get('grant_type')).toBe('client_credentials');
	});

	it.each<[string, OAuth2Login['sendCredentialsIn'], boolean]>([
		['the Authorization header', 'header', true],
		['the request body', 'body', false],
	])('sends the client credentials in %s', async (_name, sendCredentialsIn, inHeader) => {
		const { calls, fetchImpl } = granting(GRANT);

		await createClientCredentialsTokenSource(login({ sendCredentialsIn }), fetchImpl).getToken();

		const expected = `Basic ${Buffer.from(`client-1:${SECRET}`).toString('base64')}`;
		expect(calls[0].headers.get('authorization')).toBe(inHeader ? expected : null);
		expect(calls[0].body.get('client_secret')).toBe(inHeader ? null : SECRET);
	});

	it.each([
		['sends the scope when one is set', 'models.read', 'models.read'],
		['omits the scope when it is empty', '', null],
	])('%s', async (_name, scope, expected) => {
		const { calls, fetchImpl } = granting(GRANT);

		await createClientCredentialsTokenSource(login({ scope }), fetchImpl).getToken();

		expect(calls[0].body.get('scope')).toBe(expected);
	});

	it('reuses the token until it expires', async () => {
		const { calls, fetchImpl } = granting(GRANT);
		const source = createClientCredentialsTokenSource(login(), fetchImpl);

		await source.getToken();
		await source.getToken();

		expect(calls).toHaveLength(1);
	});

	it('asks again once the token has expired', async () => {
		const { calls, fetchImpl } = granting({ ...GRANT, expires_in: 1 });
		const source = createClientCredentialsTokenSource(login(), fetchImpl);

		await source.getToken();
		await source.getToken();

		expect(calls).toHaveLength(2);
	});

	it('asks again after the token is forgotten', async () => {
		const { calls, fetchImpl } = granting(GRANT);
		const source = createClientCredentialsTokenSource(login(), fetchImpl);

		await source.getToken();
		source.forgetToken();
		await source.getToken();

		expect(calls).toHaveLength(2);
	});

	it('asks once when several requests need a token at the same time', async () => {
		const { calls, fetchImpl } = granting(GRANT);
		const source = createClientCredentialsTokenSource(login(), fetchImpl);

		await Promise.all([source.getToken(), source.getToken(), source.getToken()]);

		expect(calls).toHaveLength(1);
	});

	describe('when the login server refuses', () => {
		it("gives the server's own reason", async () => {
			const { fetchImpl } = granting(
				{ error: 'invalid_client', error_description: 'Client authentication failed' },
				401,
			);
			const source = createClientCredentialsTokenSource(login(), fetchImpl);

			await expect(source.getToken()).rejects.toThrow('Client authentication failed');
		});

		it('falls back to the status when it gives no reason', async () => {
			const { fetchImpl } = granting({}, 503);
			const source = createClientCredentialsTokenSource(login(), fetchImpl);

			await expect(source.getToken()).rejects.toThrow('answered 503');
		});

		it('never repeats the client secret, even if the server echoes it', async () => {
			const { fetchImpl } = granting({ error_description: `Secret ${SECRET} is not valid` }, 401);
			const source = createClientCredentialsTokenSource(login(), fetchImpl);

			await expect(source.getToken()).rejects.toThrow('[redacted]');
			await expect(source.getToken()).rejects.not.toThrow(SECRET);
		});
	});

	it('fails when the answer carries no access token', async () => {
		const { fetchImpl } = granting({ token_type: 'Bearer' });
		const source = createClientCredentialsTokenSource(login(), fetchImpl);

		await expect(source.getToken()).rejects.toThrow('no access token');
	});
});
