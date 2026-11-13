import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

const image = { uid: 'kG39R5XbvPQpLENKBW', status: 'completed' };
const template = { uid: 'A89wavQyY3Bebk3djP', name: 'Promo banner' };

describe('Bannerbear > Workflows', () => {
	const credentials = {
		bannerbearApi: {
			apiKey: 'fake-api-key',
		},
	};

	beforeAll(() => {
		const api = nock('https://api.bannerbear.com/v2').matchHeader(
			'authorization',
			'Bearer fake-api-key',
		);
		api
			.post('/images', { template: 'A89wavQyY3Bebk3djP' })
			.reply(202, { uid: 'kG39R5XbvPQpLENKBW', status: 'pending' });
		api.get('/images/kG39R5XbvPQpLENKBW').times(2).reply(200, image);
		api.get('/templates/A89wavQyY3Bebk3djP').reply(200, template);
		api.get('/templates').reply(200, [template]);
	});

	new NodeTestHarness().setupTests({
		credentials,
		workflowFiles: ['requests.workflow.json'],
		customAssertions: () => expect(nock.pendingMocks()).toEqual([]),
	});
});
