import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

const file = { id: '5000948880', type: 'file', name: 'report.txt' };
const folder = { id: '4000', type: 'folder', name: 'Reports' };
const collaboration = { id: '791293', type: 'collaboration', role: 'editor' };

describe('Box > Workflows', () => {
	const credentials = {
		boxOAuth2Api: {
			oauthTokenData: { access_token: 'fake-access-token' },
		},
	};

	beforeAll(() => {
		const api = nock('https://api.box.com/2.0').matchHeader(
			'authorization',
			'Bearer fake-access-token',
		);
		api
			.post('/files/5000948880/copy', { parent: { id: '4000' } })
			.reply(200, { id: '5000948881', type: 'file', name: 'report.txt' });
		api.delete('/files/5000948880').reply(204);
		api.get('/files/5000948880').times(2).reply(200, file);
		api.get('/files/5000948880/content').reply(200, 'Hello', { 'content-type': 'text/plain' });
		api
			.get('/search')
			.query({ type: 'file', query: 'report', limit: 5 })
			.reply(200, {
				entries: [file],
			});
		api
			.post('/collaborations', {
				accessible_by: { login: 'nathan@example.com' },
				item: { id: '5000948880', type: 'file' },
				role: 'editor',
			})
			.reply(200, collaboration);
		api.post('/folders', { name: 'Reports', parent: { id: 0 } }).reply(200, folder);
		api.delete('/folders/4000', { recursive: true }).reply(204);
		api.get('/folders/4000').reply(200, folder);
		api
			.get('/search')
			.query({ type: 'folder', query: 'Reports', limit: 5 })
			.reply(200, {
				entries: [folder],
			});
		api
			.post('/collaborations', {
				accessible_by: { login: 'nathan@example.com' },
				item: { id: '4000', type: 'folder' },
				role: 'editor',
			})
			.reply(200, collaboration);
		api
			.put('/folders/4000', { name: 'Q3 Reports' })
			.reply(200, { id: '4000', type: 'folder', name: 'Q3 Reports' });

		nock('https://upload.box.com/api/2.0')
			.matchHeader('authorization', 'Bearer fake-access-token')
			.post('/files/content', /name="file"; filename="notes.txt"/)
			.reply(201, { entries: [{ id: '5000948882', type: 'file', name: 'notes.txt' }] });
	});

	new NodeTestHarness().setupTests({
		credentials,
		workflowFiles: ['requests.workflow.json'],
		customAssertions: () => expect(nock.pendingMocks()).toEqual([]),
	});
});
