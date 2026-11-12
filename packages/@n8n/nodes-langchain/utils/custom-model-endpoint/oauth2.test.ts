import { UserError } from 'n8n-workflow';

import { clientCredentialsTokenRequest, createClientCredentialsTokenSource } from './oauth2';
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

const redirectOf = (calls: Array<{ redirect?: RequestRedirect }>) => calls[0]?.redirect;

const granting = (body: Record<string, unknown>, status = 200) => {
	const calls: Array<{
		url: string;
		headers: Headers;
		body: URLSearchParams;
		redirect?: RequestRedirect;
		signal?: AbortSignal | null;
	}> = [];
	const fetchImpl = async (url: RequestInfo | URL, init?: RequestInit) => {
		calls.push({
			url: url.toString(),
			headers: new Headers(init?.headers ?? {}),
			body: new URLSearchParams(String(init?.body ?? '')),
			redirect: init?.redirect,
			signal: init?.signal,
		});
		return new Response(JSON.stringify(body), { status });
	};
	return { calls, fetchImpl: fetchImpl as unknown as typeof fetch };
};

const GRANT = { access_token: 'tok-abc-9f2a71c4', expires_in: 3600, token_type: 'Bearer' };

describe('createClientCredentialsTokenSource', () => {
	it('asks the login server for a token and returns it', async () => {
		const { calls, fetchImpl } = granting(GRANT);

		const token = await createClientCredentialsTokenSource(login(), fetchImpl).getToken();

		expect(token).toBe('tok-abc-9f2a71c4');
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

	describe('the lifetime the login server states', () => {
		beforeEach(() => vi.useFakeTimers());
		afterEach(() => vi.useRealTimers());

		it.each<[string, unknown, number]>([
			['one that outlives the wait, so the token is reused', 600, 1],
			['the same lifetime written as a string', '600', 1],
			['one alive on arrival that the skew margin retires before the wait ends', 70, 2],
			['one the wait outlives, so the token is minted again', 20, 2],
			['a token that is already dead on arrival', 0, 2],
			['a lifetime below zero, which is at least as dead as zero', -1, 2],
			['no lifetime at all, which falls back to the assumption', undefined, 1],
			['one that is not a number, which falls back to the assumption', 'soon', 1],
		])('mints %s', async (_name, expires_in, mints) => {
			const { calls, fetchImpl } = granting({ ...GRANT, expires_in });
			const source = createClientCredentialsTokenSource(login(), fetchImpl);

			await source.getToken();
			vi.setSystemTime(Date.now() + 60_000);
			await source.getToken();

			expect(calls).toHaveLength(mints);
		});
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
		const refusing = (body: string, status: number) =>
			(async () => new Response(body, { status })) as typeof fetch;

		it.each<[string, string, number, string]>([
			[
				'the description of the OAuth2 error',
				JSON.stringify({
					error: 'invalid_client',
					error_description: 'Client authentication failed',
				}),
				401,
				'Client authentication failed',
			],
			[
				'the bare error code when that is all there is',
				JSON.stringify({ error: 'invalid_scope' }),
				400,
				'invalid_scope',
			],
			[
				'the message of a body already shaped for the client',
				JSON.stringify({ error: { message: 'Client authentication failed' } }),
				401,
				'Client authentication failed',
			],
			[
				'the title of the page a proxy refused with',
				'<html><head><title>Access Denied: corporate proxy rule 42</title></head></html>',
				403,
				'Access Denied: corporate proxy rule 42',
			],
			['a plain text refusal', 'Unauthorized\n', 401, 'Unauthorized'],
			['the status when the body states no reason', JSON.stringify({}), 503, 'answered 503'],
			['the status when there is no body at all', '', 503, 'answered 503'],
		])('gives %s', async (_name, body, status, expected) => {
			const source = createClientCredentialsTokenSource(login(), refusing(body, status));

			await expect(source.getToken()).rejects.toThrow(expected);
		});
	});

	it('says so plainly when the login server answers 200 with something other than JSON', async () => {
		const notJson = (async () =>
			new Response('<html>Service Unavailable</html>', { status: 200 })) as typeof fetch;

		await expect(createClientCredentialsTokenSource(login(), notJson).getToken()).rejects.toThrow(
			'did not answer with JSON',
		);
	});

	// A login server that grants nothing usable is a credential to correct, not a blip to retry
	it.each<[string, Record<string, unknown>, string]>([
		['the field is missing', { token_type: 'Bearer' }, 'no access token'],
		['the field is empty', { access_token: '' }, 'no access token'],
		[
			'the field holds nothing but whitespace, which is sent as nothing at all',
			{ access_token: '  ' },
			'no access token',
		],
	])('reports what the user has to correct when %s', async (_name, grant, expected) => {
		const { fetchImpl } = granting(grant);

		const error = await createClientCredentialsTokenSource(login(), fetchImpl)
			.getToken()
			.then(
				() => undefined,
				(reason: Error) => reason,
			);

		expect(error).toBeInstanceOf(UserError);
		expect(error?.message).toContain(expected);
	});

	it('gives the token request a deadline of its own, not the one an inference request gets', async () => {
		const { calls, fetchImpl } = granting(GRANT);

		await createClientCredentialsTokenSource(login(), fetchImpl).getToken();

		expect(calls[0].signal).toBeInstanceOf(AbortSignal);
		expect(clientCredentialsTokenRequest(login()).timeout).toBe(30_000);
	});

	describe('when the deadline passes', () => {
		const expired = new DOMException('This operation was aborted', 'TimeoutError');

		/** Nothing arrives at all: the request is still waiting for the first byte. */
		const beforeAnyHeaders = (controller: AbortController) =>
			(async (_url: RequestInfo | URL, init?: RequestInit) =>
				await new Promise<Response>((_resolve, reject) => {
					init?.signal?.addEventListener('abort', () => reject(expired));
					controller.abort(expired);
				})) as typeof fetch;

		/** The headers arrive and the body then stalls, so the read is what the deadline cuts. */
		const afterHeaders = (controller: AbortController) =>
			(async (_url: RequestInfo | URL, init?: RequestInit) => {
				const body = new ReadableStream<Uint8Array>({
					start: (stream) => {
						init?.signal?.addEventListener('abort', () => stream.error(expired));
						setTimeout(() => controller.abort(expired), 0);
					},
				});
				return new Response(body, { status: 200 });
			}) as typeof fetch;

		it.each<[string, (controller: AbortController) => typeof fetch]>([
			['before any headers arrive', beforeAnyHeaders],
			['while the body is still being read', afterHeaders],
		])('says the deadline passed %s', async (_name, stalling) => {
			const controller = new AbortController();
			const deadline = vi.spyOn(AbortSignal, 'timeout').mockReturnValue(controller.signal);

			const error = await createClientCredentialsTokenSource(login(), stalling(controller))
				.getToken()
				.then(
					() => undefined,
					(reason: Error) => reason,
				);

			expect(deadline).toHaveBeenCalledWith(30_000);
			expect(error).toBeInstanceOf(UserError);
			expect(error?.message).toBe(
				'Could not sign in to the gateway: the login server did not answer within 30 seconds',
			);
			deadline.mockRestore();
		});
	});

	it('does not follow a redirect, which would replay the secret to another origin', async () => {
		const { calls, fetchImpl } = granting(GRANT);
		await createClientCredentialsTokenSource(login(), fetchImpl).getToken();

		expect(redirectOf(calls)).toBe('manual');
	});

	it('sends the token as the wire carries it, not as the login server padded it', async () => {
		const { calls, fetchImpl } = granting({ access_token: '  at-55119a7bd3c8e2066fab  ' });
		const source = createClientCredentialsTokenSource(login(), fetchImpl);

		const token = await source.getToken();

		expect(calls).toHaveLength(1);
		expect(token).toBe('at-55119a7bd3c8e2066fab');
	});
});
