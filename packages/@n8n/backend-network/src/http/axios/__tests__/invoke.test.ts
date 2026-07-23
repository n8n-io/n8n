import { AiConfig } from '@n8n/config';
import { Container } from '@n8n/di';
import nock from 'nock';

import { configureGlobalAxiosDefaults } from '../config';
import { invokeAxios } from '../invoke';

// Sets axios defaults and registers the vendor-header interceptor.
configureGlobalAxiosDefaults();

describe('invokeAxios', () => {
	const baseUrl = 'https://example.de';

	beforeEach(() => {
		nock.cleanAll();
		vi.clearAllMocks();
	});

	it('should throw error for non-401 status codes', async () => {
		nock(baseUrl).get('/test').reply(500, {});

		await expect(invokeAxios({ url: `${baseUrl}/test` })).rejects.toThrow(
			'Request failed with status code 500',
		);
	});

	it('should throw error on 401 without digest auth challenge', async () => {
		nock(baseUrl).get('/test').reply(401, {});

		await expect(
			invokeAxios(
				{
					url: `${baseUrl}/test`,
				},
				false,
			),
		).rejects.toThrow('Request failed with status code 401');
	});

	it('should make successful requests', async () => {
		nock(baseUrl).get('/test').reply(200, { success: true });

		const response = await invokeAxios({
			url: `${baseUrl}/test`,
		});

		expect(response.status).toBe(200);
		expect(response.data).toEqual({ success: true });
	});

	it('should handle digest auth when receiving 401 with nonce', async () => {
		nock(baseUrl)
			.get('/test')
			.matchHeader('authorization', 'Basic dXNlcjpwYXNz')
			.once()
			.reply(401, {}, { 'www-authenticate': 'Digest realm="test", nonce="abc123", qop="auth"' });

		nock(baseUrl)
			.get('/test')
			.matchHeader(
				'authorization',
				/^Digest username="user",realm="test",nonce="abc123",uri="\/test",qop="auth",algorithm="MD5",response="[0-9a-f]{32}"/,
			)
			.reply(200, { success: true });

		const response = await invokeAxios(
			{
				url: `${baseUrl}/test`,
				auth: {
					username: 'user',
					password: 'pass',
				},
			},
			false,
		);

		expect(response.status).toBe(200);
		expect(response.data).toEqual({ success: true });
	});

	it('should include vendor headers in requests to OpenAi', async () => {
		const { openAiDefaultHeaders } = Container.get(AiConfig);
		nock('https://api.openai.com', {
			reqheaders: openAiDefaultHeaders,
		})
			.get('/chat')
			.reply(200, { success: true });

		const response = await invokeAxios({
			url: 'https://api.openai.com/chat',
		});

		expect(response.status).toBe(200);
		expect(response.data).toEqual({ success: true });
	});
});
