import axios from 'axios';
import nock from 'nock';

import { ClientOAuth2, ResponseError } from '@/client-oauth2';
import { ERROR_RESPONSES } from '@/constants';
import { auth, AuthError } from '@/utils';

import * as config from './config';

describe('ClientOAuth2', () => {
	const client = new ClientOAuth2({
		clientId: config.clientId,
		clientSecret: config.clientSecret,
		accessTokenUri: config.accessTokenUri,
		authentication: 'header',
	});

	beforeAll(async () => {
		nock.disableNetConnect();
	});

	afterAll(() => {
		nock.restore();
	});

	describe('accessTokenRequest', () => {
		const authHeader = auth(config.clientId, config.clientSecret);

		const makeTokenCall = async () =>
			await client.accessTokenRequest({
				url: config.accessTokenUri,
				method: 'POST',
				headers: {
					Authorization: authHeader,
					Accept: 'application/json',
					'Content-Type': 'application/x-www-form-urlencoded',
				},
				body: {
					refresh_token: 'test',
					grant_type: 'refresh_token',
				},
			});

		const mockTokenResponse = ({
			status = 200,
			headers,
			body,
		}: {
			status: number;
			body: string;
			headers: Record<string, string>;
		}) =>
			nock(config.baseUrl).post('/login/oauth/access_token').once().reply(status, body, headers);

		it('should send the correct request based on given options', async () => {
			mockTokenResponse({
				status: 200,
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					access_token: config.accessToken,
					refresh_token: config.refreshToken,
				}),
			});

			const axiosSpy = vi.spyOn(axios, 'request');

			await makeTokenCall();

			expect(axiosSpy).toHaveBeenCalledWith(
				expect.objectContaining({
					url: config.accessTokenUri,
					method: 'POST',
					data: 'refresh_token=test&grant_type=refresh_token',
					proxy: false,
					headers: {
						Authorization: authHeader,
						Accept: 'application/json',
						'Content-Type': 'application/x-www-form-urlencoded',
					},
				}),
			);
		});

		test.each([
			{
				contentType: 'application/json',
				body: JSON.stringify({
					access_token: config.accessToken,
					refresh_token: config.refreshToken,
				}),
			},
			{
				contentType: 'application/json; charset=utf-8',
				body: JSON.stringify({
					access_token: config.accessToken,
					refresh_token: config.refreshToken,
				}),
			},
			{
				contentType: 'application/x-www-form-urlencoded',
				body: `access_token=${config.accessToken}&refresh_token=${config.refreshToken}`,
			},
		])('should parse response with content type $contentType', async ({ contentType, body }) => {
			mockTokenResponse({
				status: 200,
				headers: { 'Content-Type': contentType },
				body,
			});

			const response = await makeTokenCall();

			expect(response).toEqual({
				access_token: config.accessToken,
				refresh_token: config.refreshToken,
			});
		});

		test.each([
			{
				contentType: 'text/html',
				body: '<html><body>Hello, world!</body></html>',
			},
			{
				contentType: 'application/xml',
				body: '<xml><body>Hello, world!</body></xml>',
			},
			{
				contentType: 'text/plain',
				body: 'Hello, world!',
			},
		])('should reject content type $contentType', async ({ contentType, body }) => {
			mockTokenResponse({
				status: 200,
				headers: { 'Content-Type': contentType },
				body,
			});

			const result = await makeTokenCall().catch((err) => err);
			expect(result).toBeInstanceOf(Error);
			expect(result.message).toEqual(`Unsupported content type: ${contentType}`);
		});

		it('should throw ResponseError when application/json response contains invalid JSON', async () => {
			const htmlBody = '<!DOCTYPE html><html><body>Service Unavailable</body></html>';
			mockTokenResponse({
				status: 200,
				headers: { 'Content-Type': 'application/json' },
				body: htmlBody,
			});

			const result = await makeTokenCall().catch((err) => err);
			expect(result).toBeInstanceOf(ResponseError);
			expect(result.status).toBe(200);
			expect(result.body).toBe(htmlBody);
			expect(result.message).toContain(
				'Expected JSON response from OAuth2 token endpoint but received:',
			);
			expect(result.message).toContain('<!DOCTYPE html>');
		});

		it('should truncate long invalid JSON response bodies in the error message', async () => {
			const longBody = 'x'.repeat(200);
			mockTokenResponse({
				status: 200,
				headers: { 'Content-Type': 'application/json' },
				body: longBody,
			});

			const result = await makeTokenCall().catch((err) => err);
			expect(result).toBeInstanceOf(ResponseError);
			expect(result.status).toBe(200);
			expect(result.message).toContain('x'.repeat(100) + '...');
		});

		it('should reject 4xx responses with auth errors', async () => {
			mockTokenResponse({
				status: 401,
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ error: 'access_denied' }),
			});

			const result = await makeTokenCall().catch((err) => err);
			expect(result).toBeInstanceOf(AuthError);
			expect(result.message).toEqual(ERROR_RESPONSES.access_denied);
			expect(result.body).toEqual({ error: 'access_denied' });
		});

		it('should reject 3xx responses with response errors', async () => {
			mockTokenResponse({
				status: 302,
				headers: {},
				body: 'Redirected',
			});

			const result = await makeTokenCall().catch((err) => err);
			expect(result).toBeInstanceOf(ResponseError);
			expect(result.message).toEqual('HTTP status 302');
			expect(result.body).toEqual('Redirected');
		});
	});

	describe('RFC 8707 resource parameter', () => {
		const resource = 'https://mcp.example.com/resource';

		afterEach(() => {
			nock.cleanAll();
			vi.restoreAllMocks();
		});

		const makeClient = (overrides: Partial<ConstructorParameters<typeof ClientOAuth2>[0]> = {}) =>
			new ClientOAuth2({
				clientId: config.clientId,
				clientSecret: config.clientSecret,
				accessTokenUri: config.accessTokenUri,
				authorizationUri: config.authorizationUri,
				redirectUri: config.redirectUri,
				authentication: 'header',
				state: config.state,
				...overrides,
			});

		const parseBody = (body: unknown) =>
			new URLSearchParams(typeof body === 'string' ? body : (body as Record<string, string>));

		const expectPostBody = (expected: Record<string, string>) =>
			nock(config.baseUrl)
				.post('/login/oauth/access_token', (body) => {
					const params = parseBody(body);
					return Object.entries(expected).every(([key, value]) => params.get(key) === value);
				})
				.reply(
					200,
					JSON.stringify({
						access_token: config.accessToken,
						refresh_token: config.refreshToken,
					}),
					{ 'Content-Type': 'application/json' },
				);

		it('should include resource in authorization URI when configured', () => {
			const uri = makeClient({ resource }).code.getUri();

			expect(new URL(uri).searchParams.get('resource')).toBe(resource);
		});

		it('should omit resource from authorization URI when not configured', () => {
			const uri = makeClient().code.getUri();

			expect(new URL(uri).searchParams.has('resource')).toBe(false);
		});

		it('should include resource in authorization code token request body when configured', async () => {
			const scope = expectPostBody({
				code: config.code,
				grant_type: 'authorization_code',
				redirect_uri: config.redirectUri,
				resource,
			});

			await makeClient({ resource }).code.getToken(
				`${config.redirectUri}?code=${config.code}&state=${config.state}`,
			);

			scope.done();
		});

		it('should omit resource from authorization code token request body when not configured', async () => {
			const scope = nock(config.baseUrl)
				.post('/login/oauth/access_token', (body) => {
					const params = parseBody(body);
					return !params.has('resource');
				})
				.reply(
					200,
					JSON.stringify({
						access_token: config.accessToken,
						refresh_token: config.refreshToken,
					}),
					{ 'Content-Type': 'application/json' },
				);

			await makeClient().code.getToken(
				`${config.redirectUri}?code=${config.code}&state=${config.state}`,
			);

			scope.done();
		});

		it('should include resource in refresh token request body when configured', async () => {
			const scope = expectPostBody({
				refresh_token: config.refreshToken,
				grant_type: 'refresh_token',
				resource,
			});

			await makeClient({ resource })
				.createToken({
					access_token: config.accessToken,
					refresh_token: config.refreshToken,
				})
				.refresh();

			scope.done();
		});

		it('should omit resource from refresh token request body when not configured', async () => {
			const scope = nock(config.baseUrl)
				.post('/login/oauth/access_token', (body) => {
					const params = parseBody(body);
					return !params.has('resource');
				})
				.reply(
					200,
					JSON.stringify({
						access_token: config.refreshedAccessToken,
						refresh_token: config.refreshedRefreshToken,
					}),
					{ 'Content-Type': 'application/json' },
				);

			await makeClient()
				.createToken({
					access_token: config.accessToken,
					refresh_token: config.refreshToken,
				})
				.refresh();

			scope.done();
		});
	});
});
