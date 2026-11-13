import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

describe('Bitly > Workflows > Request URLs', () => {
	const credentials = { bitlyApi: { accessToken: 'fake-access-token' } };

	beforeAll(() => {
		const mock = nock('https://api-ssl.bitly.com/v4');
		mock
			.post('/bitlinks', { long_url: 'https://n8n.io/' })
			.reply(200, { id: 'bit.ly/22u3ypK', long_url: 'https://n8n.io/' });
		mock
			.get('/bitlinks/bit.ly/22u3ypK')
			.reply(200, { id: 'bit.ly/22u3ypK', long_url: 'https://n8n.io/' });
		mock
			.patch('/bitlinks/bit.ly/22u3ypK', { title: 'n8n' })
			.reply(200, { id: 'bit.ly/22u3ypK', title: 'n8n' });
	});

	new NodeTestHarness().setupTests({
		credentials,
		workflowFiles: ['requests.workflow.json'],
		customAssertions: () => expect(nock.pendingMocks()).toEqual([]),
	});
});
