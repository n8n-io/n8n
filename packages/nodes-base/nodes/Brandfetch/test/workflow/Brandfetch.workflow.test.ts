import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

const brand = {
	name: 'n8n',
	domain: 'n8n.io',
	colors: [{ hex: '#ea4b71', type: 'brand' }],
};
const logos = [
	{
		type: 'logo',
		theme: 'light',
		formats: [{ src: 'https://cdn.brandfetch.io/idbrand/logo.png', format: 'png' }],
	},
];

describe('Brandfetch > Workflows', () => {
	const credentials = { brandfetchApi: { apiKey: 'test-api-key' } };

	beforeAll(() => {
		const api = nock('https://api.brandfetch.io/v2');
		api.get('/brands/n8n.io').reply(200, brand);
		api.get('/brands/example.com').reply(200, { logos });

		nock('https://cdn.brandfetch.io')
			.get('/idbrand/logo.png')
			.reply(200, Buffer.from('png'), { 'content-type': 'image/png' });
	});

	new NodeTestHarness().setupTests({
		credentials,
		workflowFiles: ['requests.workflow.json'],
		customAssertions: () => expect(nock.pendingMocks()).toEqual([]),
	});
});
