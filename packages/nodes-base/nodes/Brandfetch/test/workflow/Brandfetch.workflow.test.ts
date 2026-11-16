import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

const brand = {
	name: 'n8n',
	domain: 'n8n.io',
	colors: [{ hex: '#ea4b71', type: 'brand' }],
};
const tickerColors = [{ hex: '#000000', type: 'dark' }];
const logos = [
	{
		type: 'logo',
		theme: 'light',
		formats: [{ src: 'https://cdn.brandfetch.io/idbrand/logo.png', format: 'png' }],
	},
];
const context = { domain: 'n8n.io', identity: { name: 'n8n' } };
const markdown = '# Example\n\nExample brand context.';

describe('Brandfetch > Workflows', () => {
	const credentials = { brandfetchApi: { apiKey: 'test-api-key' } };

	beforeAll(() => {
		const api = nock('https://api.brandfetch.io/v2');
		api.get('/brands/domain/n8n.io').reply(200, brand);
		api.get('/brands/ticker/AAPL').reply(200, { colors: tickerColors });
		api.get('/brands/isin/US0378331005').reply(200, { logos });
		api.get('/context/n8n.io').query({ cachedOnly: 'true' }).reply(200, context);
		api
			.get('/context/example.com')
			.matchHeader('accept', 'text/markdown')
			.reply(200, markdown, { 'content-type': 'text/markdown' });
		api.get('/brands/n8n.io').reply(200, brand);
		api.get('/brands/example.com').reply(200, { logos });

		nock('https://cdn.brandfetch.io')
			.get('/idbrand/logo.png')
			.times(2)
			.reply(200, Buffer.from('png'), { 'content-type': 'image/png' });
	});

	new NodeTestHarness().setupTests({
		credentials,
		workflowFiles: ['requests.workflow.json'],
		customAssertions: () => expect(nock.pendingMocks()).toEqual([]),
	});
});
