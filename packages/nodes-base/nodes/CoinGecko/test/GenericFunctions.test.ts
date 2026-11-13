import { mockDeep } from 'vitest-mock-extended';
import type { IExecuteFunctions } from 'n8n-workflow';
import { requestPath } from 'n8n-workflow';

import { coinGeckoApiRequest } from '../GenericFunctions';

describe('coinGeckoApiRequest', () => {
	it('should encode path values as one segment', async () => {
		const context = mockDeep<IExecuteFunctions>();
		context.helpers.request.mockResolvedValue({});

		const coinId = 'bitcoin/tickers?page=2';
		await coinGeckoApiRequest.call(context, 'GET', requestPath`/coins/${coinId}`);

		expect(context.helpers.request).toHaveBeenCalledWith(
			expect.objectContaining({
				uri: expect.objectContaining({
					value: 'https://api.coingecko.com/api/v3/coins/bitcoin%2Ftickers%3Fpage=2',
				}),
			}),
		);
	});
});
