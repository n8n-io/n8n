import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

describe('FileMaker > Workflows', () => {
	const credentials = {
		fileMaker: {
			host: 'fm.example.com:8443',
			db: 'CRM',
			login: 'admin',
			password: 'fake-password',
		},
	};

	const record = { fieldData: { name: 'Nathan' }, portalData: {}, recordId: '42', modId: '1' };
	const ok = { messages: [{ code: '0', message: 'OK' }] };

	describe('Run workflow', () => {
		beforeAll(() => {
			const mock = nock('https://fm.example.com:8443');
			const layout = '/fmi/data/v1/databases/CRM/layouts/Contacts';
			mock
				.persist()
				.post('/fmi/data/v1/databases/CRM/sessions')
				.reply(200, { response: { token: 'a1b2c3d4e5f6' }, ...ok });
			mock
				.persist()
				.delete('/fmi/data/v1/databases/CRM/sessions/a1b2c3d4e5f6')
				.reply(200, { response: {}, ...ok });
			mock
				.get(`${layout}/records/42`)
				.query({ portal: '[]' })
				.reply(200, { response: { data: [record] }, ...ok });
			mock
				.get(`${layout}/records`)
				.query({ _offset: '1', _limit: '10', portal: '[]' })
				.reply(200, { response: { data: [record] }, ...ok });
			mock.post(`${layout}/_find`).reply(200, { response: { data: [record] }, ...ok });
			mock
				.post(`${layout}/records`)
				.reply(200, { response: { recordId: '43', modId: '0' }, ...ok });
			mock.patch(`${layout}/records/42`).reply(200, { response: { modId: '2' }, ...ok });
			mock
				.post(`${layout}/records/42`)
				.reply(200, { response: { recordId: '44', modId: '0' }, ...ok });
			mock.delete(`${layout}/records/42`).reply(200, { response: {}, ...ok });
			mock
				.get(`${layout}/script/SendEmail`)
				.query({ 'script.param': 'hello' })
				.reply(200, { response: { scriptResult: 'done', scriptError: '0' }, ...ok });
		});

		afterAll(() => {
			nock.cleanAll();
		});

		new NodeTestHarness().setupTests({
			credentials,
			customAssertions: () => expect(nock.pendingMocks()).toEqual([]),
		});
	});
});
