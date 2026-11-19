import { OutboundHttp } from '@n8n/backend-network';
import { Container } from '@n8n/di';

import {
	createClientCredentialsTokenSource,
	requestClientCredentialsToken,
} from '../client-credentials';

const config = {
	tokenUrl: 'https://idp.example.com/token',
	clientId: 'id',
	clientSecret: 'secret',
};

const requestMock = vi.fn();

const sentBody = () => new URLSearchParams((requestMock.mock.calls[0][0] as { body: string }).body);

describe('client credentials grant', () => {
	beforeEach(() => {
		requestMock.mockReset();
		requestMock.mockResolvedValue({ access_token: 'tok' });
		vi.spyOn(Container, 'get').mockImplementation((token: unknown) => {
			if (token === OutboundHttp) return { requests: () => ({ request: requestMock }) };
			throw new Error('unexpected DI token');
		});
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe('requestClientCredentialsToken', () => {
		it('posts a form-encoded grant, which is what a token endpoint reads', async () => {
			await requestClientCredentialsToken({ ...config, scope: 'registry:read' });

			const options = requestMock.mock.calls[0][0] as {
				method: string;
				url: string;
				headers: Record<string, string>;
			};
			expect(options.method).toBe('POST');
			expect(options.url).toBe('https://idp.example.com/token');
			expect(options.headers['Content-Type']).toBe('application/x-www-form-urlencoded');
			expect(Object.fromEntries(sentBody())).toEqual({
				grant_type: 'client_credentials',
				client_id: 'id',
				client_secret: 'secret',
				scope: 'registry:read',
			});
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
			['the response has no token', {}],
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
		])('takes the lifetime when %s', async (_case, response, expected) => {
			requestMock.mockResolvedValue(response);

			const { expiresInSeconds } = await requestClientCredentialsToken(config);

			expect(expiresInSeconds).toBe(expected);
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
