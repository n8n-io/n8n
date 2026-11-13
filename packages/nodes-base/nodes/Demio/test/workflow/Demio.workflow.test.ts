import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

const event = { id: 1288, name: 'Product Demo' };

describe('Demio > Workflows', () => {
	beforeAll(() => {
		const mock = nock('https://my.demio.com/api/v1')
			.matchHeader('api-key', 'fake-api-key')
			.matchHeader('api-secret', 'fake-api-secret');
		mock.get('/event/1288').reply(200, event);
		mock.get('/event/1288/date/5432').reply(200, { ...event, date_id: 5432 });
		mock.get('/events').reply(200, [event]);
		mock
			.put('/event/register', { name: 'Nathan', email: 'nathan@example.com', id: '1288' })
			.reply(200, { hash: 'abc123', join_link: 'https://event.demio.com/ref/abc123' });
		mock
			.get('/report/5432/participants')
			.reply(200, { participants: [{ name: 'Nathan', email: 'nathan@example.com' }] });
	});

	new NodeTestHarness().setupTests({
		credentials: { demioApi: { apiKey: 'fake-api-key', apiSecret: 'fake-api-secret' } },
		workflowFiles: ['requests.workflow.json'],
	});
});
