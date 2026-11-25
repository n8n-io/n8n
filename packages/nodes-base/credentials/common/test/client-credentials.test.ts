import { OutboundHttp } from '@n8n/backend-network';
import { Container } from '@n8n/di';

import {
	createClientCredentialsTokenSource,
	requestClientCredentialsToken,
} from '../client-credentials';
import { TOKEN_REQUEST_TIMEOUT } from '../token-request';

/** Shaped like what the outbound client really rejects with on a non-2xx. */
const httpError = (data: unknown, status = 401) =>
	Object.assign(new Error(`Request failed with status code ${status}`), {
		[Symbol.for('n8n.backend-network.http-request-error')]: true,
		response: { status, data },
	});

const config = {
	tokenUrl: 'https://idp.example.com/token',
	clientId: 'id',
	clientSecret: 'secret',
};

const requestMock = vi.fn();
const requestsMock = vi.fn(() => ({ request: requestMock }));

const sentBody = () => new URLSearchParams((requestMock.mock.calls[0][0] as { body: string }).body);

describe('client credentials grant', () => {
	beforeEach(() => {
		requestMock.mockReset();
		requestsMock.mockClear();
		requestMock.mockResolvedValue({ access_token: 'tok' });
		vi.spyOn(Container, 'get').mockImplementation((token: unknown) => {
			if (token === OutboundHttp) return { requests: requestsMock };
			throw new Error('unexpected DI token');
		});
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe('requestClientCredentialsToken', () => {
		it('posts a form-encoded grant through the guarded client', async () => {
			await requestClientCredentialsToken({ ...config, scope: 'registry:read' });

			const options = requestMock.mock.calls[0][0] as {
				method: string;
				url: string;
				headers: Record<string, string>;
				timeout: number;
				disableFollowRedirect: boolean;
			};
			expect(requestsMock).toHaveBeenCalledWith();
			expect(options.method).toBe('POST');
			expect(options.url).toBe('https://idp.example.com/token');
			expect(options.headers['Content-Type']).toBe('application/x-www-form-urlencoded');
			expect(options.timeout).toBe(TOKEN_REQUEST_TIMEOUT);
			expect(options.disableFollowRedirect).toBe(true);
		});

		it.each([
			['sends HTTP Basic by default, which RFC 6749 requires a server to accept', undefined, true],
			['sends HTTP Basic when the header mode is chosen', 'header', true],
			['sends the pair in the form when the body mode is chosen', 'body', false],
		])('%s', async (_case, sendCredentialsIn, expectBasic) => {
			await requestClientCredentialsToken({ ...config, sendCredentialsIn });

			const options = requestMock.mock.calls[0][0] as {
				auth?: { username: string; password: string };
			};
			expect(options.auth).toEqual(
				expectBasic ? { username: 'id', password: 'secret' } : undefined,
			);
			expect(sentBody().get('client_secret')).toBe(expectBasic ? null : 'secret');
		});

		it('passes the credential allow-list on to the token request', async () => {
			await requestClientCredentialsToken({ ...config, allowedDomains: 'idp.example.com' });

			expect((requestMock.mock.calls[0][0] as { allowedDomains?: string }).allowedDomains).toBe(
				'idp.example.com',
			);
		});

		it.each([
			[
				'names the description the endpoint gave',
				{ error: 'invalid_client', error_description: 'Client authentication failed' },
				'Client authentication failed',
			],
			['falls back to the code', { error: 'invalid_scope' }, 'invalid_scope'],
			['takes a plain-text body', 'unauthorized_client', 'unauthorized_client'],
		])('%s when the grant is refused', async (_case, data, expected) => {
			requestMock.mockRejectedValue(httpError(data));

			await expect(requestClientCredentialsToken(config)).rejects.toThrow(
				`The token endpoint refused the grant: ${expected}`,
			);
		});

		it('keeps the secret out of a refusal that echoes it back', async () => {
			requestMock.mockRejectedValue(
				httpError({ error_description: 'client_secret secret is not valid' }),
			);

			const failure = await requestClientCredentialsToken(config).then(
				() => new Error('the grant was accepted'),
				(error: Error) => error,
			);

			expect(failure.message).not.toContain('secret');
			expect(failure.message).toContain('***');
		});

		it.each([
			['a token of only spaces', { access_token: '   ' }],
			['no token at all', {}],
		])('refuses %s', async (_case, response) => {
			requestMock.mockResolvedValue(response);

			await expect(requestClientCredentialsToken(config)).rejects.toThrow(
				'returned no access token',
			);
		});

		it('percent-encodes the Basic pair, so a secret with reserved characters survives', async () => {
			await requestClientCredentialsToken({ ...config, clientSecret: 'a+b c%d' });

			expect((requestMock.mock.calls[0][0] as { auth: { password: string } }).auth.password).toBe(
				'a%2Bb%20c%25d',
			);
		});

		// A 429 or a 5xx is the endpoint having a bad day, and reading either as a refusal
		// would send the user off to check a correct client ID and secret
		it.each([429, 500, 503])('does not call a %i a refusal', async (status) => {
			requestMock.mockRejectedValue(httpError({ error: 'server_error' }, status));

			const failure = await requestClientCredentialsToken(config).then(
				() => new Error('the grant was accepted'),
				(error: Error) => error,
			);

			expect(failure.message).not.toContain('refused the grant');
			expect(failure.message).toContain(String(status));
		});

		it('keeps the secret out of a failure that is not a refusal', async () => {
			requestMock.mockRejectedValue(
				httpError({ error_description: 'upstream said secret is not valid' }, 502),
			);

			const failure = await requestClientCredentialsToken(config).then(
				() => new Error('the grant was accepted'),
				(error: Error) => error,
			);

			expect(failure.message).not.toContain('secret');
			expect(failure.message).toContain('***');
		});

		it('rethrows an error that is not an HTTP refusal', async () => {
			requestMock.mockRejectedValue(new Error('getaddrinfo ENOTFOUND'));

			await expect(requestClientCredentialsToken(config)).rejects.toThrow('ENOTFOUND');
		});

		it.each([
			['no scope is set', undefined],
			['the scope is empty', ''],
			['the scope is only spaces', '   '],
		])('omits the scope when %s', async (_case, scope) => {
			await requestClientCredentialsToken({ ...config, scope });

			expect(sentBody().has('scope')).toBe(false);
		});

		it.each([
			['the token URL is missing', { ...config, tokenUrl: undefined }],
			['the client ID is empty', { ...config, clientId: '' }],
			['the client secret is only spaces', { ...config, clientSecret: '  ' }],
		])('refuses to ask when %s', async (_case, incomplete) => {
			await expect(requestClientCredentialsToken(incomplete)).rejects.toThrow(
				'Set the token URL, client ID and client secret',
			);
			expect(requestMock).not.toHaveBeenCalled();
		});

		it.each([
			['the token is empty', { access_token: '' }],
			['the response is not an object', 'denied'],
		])('fails when %s', async (_case, response) => {
			requestMock.mockResolvedValue(response);

			await expect(requestClientCredentialsToken(config)).rejects.toThrow(
				'returned no access token',
			);
		});

		it.each([
			['the endpoint states one', { access_token: 'tok', expires_in: 120 }, 120],
			['it states none', { access_token: 'tok' }, 3600],
			['it states nonsense', { access_token: 'tok', expires_in: 'soon' }, 3600],
			['it states zero', { access_token: 'tok', expires_in: 0 }, 3600],
			['it states a negative', { access_token: 'tok', expires_in: -60 }, 3600],
		])('takes the lifetime when %s', async (_case, response, expectedSeconds) => {
			requestMock.mockResolvedValue(response);

			const { lifetimeMs } = await requestClientCredentialsToken(config);

			expect(lifetimeMs).toBe(expectedSeconds * 1000);
		});
	});

	describe('createClientCredentialsTokenSource', () => {
		it('asks once while the token is alive', async () => {
			requestMock.mockResolvedValue({ access_token: 'tok', expires_in: 3600 });
			const source = createClientCredentialsTokenSource(config, () => 0);

			expect(await source.getToken()).toBe('tok');
			expect(await source.getToken()).toBe('tok');

			expect(requestMock).toHaveBeenCalledTimes(1);
		});

		it.each([
			['the token has expired', 60_000],
			['the renewal margin has been reached', 35_000],
		])('asks again once %s', async (_case, elapsed) => {
			requestMock
				.mockResolvedValueOnce({ access_token: 'first', expires_in: 60 })
				.mockResolvedValueOnce({ access_token: 'second', expires_in: 60 });
			let now = 0;
			const source = createClientCredentialsTokenSource(config, () => now);

			await source.getToken();
			now = elapsed;

			expect(await source.getToken()).toBe('second');
		});
	});
});
