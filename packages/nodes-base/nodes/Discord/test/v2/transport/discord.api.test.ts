import type { IExecuteFunctions } from 'n8n-workflow';
import { sleep } from 'n8n-workflow';

import { discordApiMultiPartRequest, discordApiRequest } from '../../../v2/transport/discord.api';
import { handleRateLimitHeaders, requestApi } from '../../../v2/transport/helpers';

jest.mock('n8n-workflow', () => ({
	...jest.requireActual('n8n-workflow'),
	sleep: jest.fn().mockResolvedValue(undefined),
}));

const sleepMock = sleep as unknown as jest.Mock;

function createMockContext(authentication = 'botToken') {
	const requestWithAuthentication = jest.fn();
	const request = jest.fn();
	const context = {
		helpers: { requestWithAuthentication, request },
		getCredentials: jest.fn(),
		getNodeParameter: jest.fn().mockReturnValue(authentication),
		getNode: jest.fn().mockReturnValue({ type: 'n8n-nodes-base.discord', typeVersion: 2 }),
	} as unknown as jest.Mocked<IExecuteFunctions>;
	return { context, requestWithAuthentication, request };
}

describe('Discord v2 > transport', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	describe('handleRateLimitHeaders', () => {
		it('sleeps for reset-after converted from seconds to ms when remaining is 0', async () => {
			await handleRateLimitHeaders({
				'x-ratelimit-remaining': '0',
				'x-ratelimit-reset-after': '2',
			});
			expect(sleepMock).toHaveBeenCalledWith(2000);
		});

		it('handles fractional seconds', async () => {
			await handleRateLimitHeaders({
				'x-ratelimit-remaining': '0',
				'x-ratelimit-reset-after': '1.5',
			});
			expect(sleepMock).toHaveBeenCalledWith(1500);
		});

		it('caps the sleep at 60 seconds', async () => {
			await handleRateLimitHeaders({
				'x-ratelimit-remaining': '0',
				'x-ratelimit-reset-after': '9999',
			});
			expect(sleepMock).toHaveBeenCalledWith(60_000);
		});

		it('sleeps 20ms as a global-rate-limit guard when remaining is greater than 0', async () => {
			await handleRateLimitHeaders({
				'x-ratelimit-remaining': '4',
				'x-ratelimit-reset-after': '2',
			});
			expect(sleepMock).toHaveBeenCalledWith(20);
		});

		it('sleeps 20ms when headers are missing', async () => {
			await handleRateLimitHeaders({});
			expect(sleepMock).toHaveBeenCalledWith(20);
			sleepMock.mockClear();
			await handleRateLimitHeaders(undefined);
			expect(sleepMock).toHaveBeenCalledWith(20);
		});

		it('sleeps 0 when remaining is 0 but reset-after is missing or non-positive', async () => {
			await handleRateLimitHeaders({
				'x-ratelimit-remaining': '0',
			});
			expect(sleepMock).toHaveBeenCalledWith(0);
			sleepMock.mockClear();
			await handleRateLimitHeaders({
				'x-ratelimit-remaining': '0',
				'x-ratelimit-reset-after': '0',
			});
			expect(sleepMock).toHaveBeenCalledWith(0);
		});
	});

	describe('requestApi', () => {
		it('returns the response on success', async () => {
			const { context, requestWithAuthentication } = createMockContext();
			const response = { body: { ok: true }, headers: {} };
			requestWithAuthentication.mockResolvedValueOnce(response);

			const result = await requestApi.call(
				context,
				{ url: 'https://discord.com/api/v10/x', headers: {} },
				'discordBotApi',
				'/x',
			);

			expect(result).toBe(response);
			expect(requestWithAuthentication).toHaveBeenCalledTimes(1);
			expect(sleepMock).not.toHaveBeenCalled();
		});

		it('retries once after a 429 then returns the success response', async () => {
			const { context, requestWithAuthentication } = createMockContext();
			const response = { body: { ok: true }, headers: {} };
			requestWithAuthentication
				.mockRejectedValueOnce({
					statusCode: 429,
					response: { headers: { 'retry-after': '1' } },
				})
				.mockResolvedValueOnce(response);

			const result = await requestApi.call(
				context,
				{ url: 'https://discord.com/api/v10/x', headers: {} },
				'discordBotApi',
				'/x',
			);

			expect(result).toBe(response);
			expect(requestWithAuthentication).toHaveBeenCalledTimes(2);
			expect(sleepMock).toHaveBeenCalledTimes(1);
			expect(sleepMock).toHaveBeenCalledWith(1000);
		});

		it('uses a 1s fallback when retry-after is missing on a 429', async () => {
			const { context, requestWithAuthentication } = createMockContext();
			const response = { body: { ok: true }, headers: {} };
			requestWithAuthentication
				.mockRejectedValueOnce({ statusCode: 429, response: { headers: {} } })
				.mockResolvedValueOnce(response);

			await requestApi.call(
				context,
				{ url: 'https://discord.com/api/v10/x', headers: {} },
				'discordBotApi',
				'/x',
			);

			expect(sleepMock).toHaveBeenCalledWith(1000);
		});

		it('throws after exhausting max retries on repeated 429s', async () => {
			const { context, requestWithAuthentication } = createMockContext();
			const error = {
				statusCode: 429,
				response: { headers: { 'retry-after': '1' } },
			};
			requestWithAuthentication.mockRejectedValue(error);

			await expect(
				requestApi.call(
					context,
					{ url: 'https://discord.com/api/v10/x', headers: {} },
					'discordBotApi',
					'/x',
				),
			).rejects.toBe(error);

			expect(requestWithAuthentication).toHaveBeenCalledTimes(4); // initial + 3 retries
			expect(sleepMock).toHaveBeenCalledTimes(3);
		});

		it('does not retry on non-429 errors', async () => {
			const { context, requestWithAuthentication } = createMockContext();
			const error = { statusCode: 500, response: { headers: {} } };
			requestWithAuthentication.mockRejectedValueOnce(error);

			await expect(
				requestApi.call(
					context,
					{ url: 'https://discord.com/api/v10/x', headers: {} },
					'discordBotApi',
					'/x',
				),
			).rejects.toBe(error);

			expect(requestWithAuthentication).toHaveBeenCalledTimes(1);
			expect(sleepMock).not.toHaveBeenCalled();
		});

		it('fetches OAuth2 credentials once even across retries', async () => {
			const { context, request } = createMockContext('oAuth2');
			const getCredentials = context.getCredentials as jest.Mock;
			getCredentials.mockResolvedValue({ botToken: 'abc' });
			request
				.mockRejectedValueOnce({
					statusCode: 429,
					response: { headers: { 'retry-after': '1' } },
				})
				.mockResolvedValueOnce({ body: {}, headers: {} });

			await requestApi.call(
				context,
				{ url: 'https://discord.com/api/v10/x', headers: {} },
				'discordOAuth2Api',
				'/x',
			);

			expect(getCredentials).toHaveBeenCalledTimes(1);
			expect(request).toHaveBeenCalledTimes(2);
		});
	});

	describe('discordApiRequest', () => {
		it('sleeps for reset-after (in ms) when remaining is 0 on a successful response', async () => {
			const { context, requestWithAuthentication } = createMockContext();
			requestWithAuthentication.mockResolvedValueOnce({
				body: { id: '1' },
				headers: {
					'x-ratelimit-remaining': '0',
					'x-ratelimit-reset-after': '2',
				},
			});

			const result = await discordApiRequest.call(context, 'POST', '/channels/1/messages', {
				content: 'hi',
			});

			expect(result).toEqual({ id: '1' });
			expect(sleepMock).toHaveBeenCalledWith(2000);
		});

		it('sleeps 20ms as a global-rate-limit guard on happy-path responses with remaining > 0', async () => {
			const { context, requestWithAuthentication } = createMockContext();
			requestWithAuthentication.mockResolvedValueOnce({
				body: { id: '1' },
				headers: {
					'x-ratelimit-remaining': '5',
					'x-ratelimit-reset-after': '2',
				},
			});

			await discordApiRequest.call(context, 'POST', '/channels/1/messages', { content: 'hi' });

			expect(sleepMock).toHaveBeenCalledWith(20);
		});

		it('retries on 429 and then respects the success-response reset-after', async () => {
			const { context, requestWithAuthentication } = createMockContext();
			requestWithAuthentication
				.mockRejectedValueOnce({
					statusCode: 429,
					response: { headers: { 'retry-after': '1' } },
				})
				.mockResolvedValueOnce({
					body: { id: '1' },
					headers: {
						'x-ratelimit-remaining': '0',
						'x-ratelimit-reset-after': '3',
					},
				});

			const result = await discordApiRequest.call(context, 'POST', '/channels/1/messages', {
				content: 'hi',
			});

			expect(result).toEqual({ id: '1' });
			expect(sleepMock).toHaveBeenNthCalledWith(1, 1000); // retry-after
			expect(sleepMock).toHaveBeenNthCalledWith(2, 3000); // post-success reset-after
		});

		it('wraps non-429 errors as NodeApiError', async () => {
			const { context, requestWithAuthentication } = createMockContext();
			requestWithAuthentication.mockRejectedValueOnce({ statusCode: 400, message: 'bad request' });

			await expect(
				discordApiRequest.call(context, 'POST', '/channels/1/messages', { content: 'hi' }),
			).rejects.toThrow();
		});
	});

	describe('discordApiMultiPartRequest', () => {
		it('sleeps for reset-after (in ms) when remaining is 0 on a successful response', async () => {
			const { context, requestWithAuthentication } = createMockContext();
			requestWithAuthentication.mockResolvedValueOnce({
				body: JSON.stringify({ id: '1' }),
				headers: {
					'x-ratelimit-remaining': '0',
					'x-ratelimit-reset-after': '2',
				},
			});

			const result = await discordApiMultiPartRequest.call(
				context,
				'POST',
				'/channels/1/messages',
				{} as never,
			);

			expect(result).toEqual({ id: '1' });
			expect(sleepMock).toHaveBeenCalledWith(2000);
		});

		it('retries on 429 then parses the success body', async () => {
			const { context, requestWithAuthentication } = createMockContext();
			requestWithAuthentication
				.mockRejectedValueOnce({
					statusCode: 429,
					response: { headers: { 'retry-after': '1' } },
				})
				.mockResolvedValueOnce({
					body: JSON.stringify({ id: '1' }),
					headers: {
						'x-ratelimit-remaining': '5',
					},
				});

			const result = await discordApiMultiPartRequest.call(
				context,
				'POST',
				'/channels/1/messages',
				{} as never,
			);

			expect(result).toEqual({ id: '1' });
			expect(sleepMock).toHaveBeenCalledWith(1000);
			expect(sleepMock).toHaveBeenCalledWith(20);
			expect(sleepMock).toHaveBeenCalledTimes(2);
		});
	});
});
