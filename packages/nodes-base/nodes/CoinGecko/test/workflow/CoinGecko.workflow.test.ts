import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

const contract = '0xdac17f958d2ee523a2206206994597c13d831ec7';
const time = 1705276800000;
const coinQuery = {
	community_data: false,
	developer_data: false,
	localization: false,
	market_data: false,
	sparkline: false,
	tickers: false,
};

describe('CoinGecko > Workflows', () => {
	beforeAll(() => {
		const api = nock('https://api.coingecko.com/api/v3');
		api.get('/coins/bitcoin').query(coinQuery).reply(200, { id: 'bitcoin', symbol: 'btc' });
		api
			.get(`/coins/ethereum/contract/${contract}`)
			.query(coinQuery)
			.reply(200, { id: 'tether', symbol: 'usdt' });
		api.get('/coins/list').reply(200, [
			{ id: 'bitcoin', symbol: 'btc' },
			{ id: 'ethereum', symbol: 'eth' },
		]);
		api
			.get('/coins/markets')
			.query({ vs_currency: 'usd', per_page: 1 })
			.reply(200, [{ id: 'bitcoin', current_price: 42000 }]);
		api
			.get('/simple/price')
			.query({ vs_currencies: 'usd', ids: 'bitcoin' })
			.reply(200, { bitcoin: { usd: 42000 } });
		api
			.get('/simple/token_price/ethereum')
			.query({ vs_currencies: 'usd', contract_addresses: contract })
			.reply(200, { [contract]: { usd: 1 } });
		api.get('/coins/bitcoin/tickers').reply(200, { tickers: [{ base: 'BTC', target: 'USD' }] });
		api
			.get('/coins/bitcoin/history')
			.query({ date: '15-01-2024' })
			.reply(200, { id: 'bitcoin', symbol: 'btc' });
		api
			.get('/coins/bitcoin/market_chart')
			.query({ vs_currency: 'usd', days: '1' })
			.reply(200, {
				prices: [[time, 42000]],
				market_caps: [[time, 800000]],
				total_volumes: [[time, 20000]],
			});
		api
			.get(`/coins/ethereum/contract/${contract}/market_chart`)
			.query({ vs_currency: 'usd', days: '1' })
			.reply(200, {
				prices: [[time, 1]],
				market_caps: [[time, 900]],
				total_volumes: [[time, 300]],
			});
		api
			.get('/coins/bitcoin/ohlc')
			.query({ vs_currency: 'usd', days: '1' })
			.reply(200, [[time, 42000, 43000, 41000, 42500]]);
		api
			.get('/events')
			.query({ per_page: 1 })
			.reply(200, { data: [{ title: 'Bitcoin Conference' }] });
	});

	new NodeTestHarness().setupTests({
		workflowFiles: ['requests.workflow.json'],
		customAssertions: () => expect(nock.pendingMocks()).toEqual([]),
	});
});
