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

			const axiosSpy = jest.spyOn(axios, 'request');

			await makeTokenCall();

			expect(axiosSpy).toHaveBeenCalledWith(
				expect.objectContaining({
					url: config.accessTokenUri,
					method: 'POST',
					data: 'refresh_token=test&grant_type=refresh_token',
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
});
