import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

describe('Affinity > Workflows', () => {
	const credentials = {
		affinityApi: {
			apiKey: 'test-api-key',
		},
	};

	beforeAll(() => {
		const mock = nock('https://api.affinity.co');
		mock.get('/lists/450').reply(200, { id: 450, name: 'Deals' });
		mock.get('/lists').reply(200, [{ id: 450, name: 'Deals' }]);
		mock.post('/lists/450/list-entries', { entity_id: 38706 }).reply(200, { id: 16367 });
		mock.get('/lists/450/list-entries/16367').reply(200, { id: 16367 });
		mock
			.get('/lists/450/list-entries')
			.query({ page_size: 500 })
			.reply(200, { list_entries: [{ id: 16368 }], page_token: null });
		mock.delete('/lists/450/list-entries/16369').reply(200, { success: true });
		mock.post('/persons').reply(200, { id: 38706 });
		mock.put('/persons/38707').reply(200, { id: 38707 });
		mock.get('/persons/38708').reply(200, { id: 38708 });
		mock
			.get('/persons')
			.query({ page_size: 500 })
			.reply(200, { persons: [{ id: 38709 }], page_token: null });
		mock.delete('/persons/38710').reply(200, { success: true });
		mock.post('/organizations').reply(200, { id: 64779 });
		mock.put('/organizations/64780', { name: 'Acme Inc' }).reply(200, { id: 64780 });
		mock.get('/organizations/64781').reply(200, { id: 64781 });
		mock
			.get('/organizations')
			.query({ page_size: 500 })
			.reply(200, { organizations: [{ id: 64782 }], page_token: null });
		mock.delete('/organizations/64783').reply(200, { success: true });
	});

	new NodeTestHarness().setupTests({
		credentials,
		customAssertions: () => expect(nock.isDone()).toBe(true),
	});
});
