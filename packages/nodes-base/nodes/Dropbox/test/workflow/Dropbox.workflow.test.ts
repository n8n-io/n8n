import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

const pathRoot = JSON.stringify({ '.tag': 'root', root: '3235641' });

describe('Dropbox > Workflows', () => {
	const credentials = {
		dropboxApi: { accessToken: 'fake-access-token', accessType: 'full' },
	};
	const api = nock('https://api.dropboxapi.com/2');
	const content = nock('https://content.dropboxapi.com/2').matchHeader(
		'dropbox-api-path-root',
		pathRoot,
	);

	beforeAll(() => {
		api
			.post('/users/get_current_account')
			.times(8)
			.reply(200, { root_info: { root_namespace_id: '3235641' } });

		content
			.post('/files/download')
			.query({ arg: JSON.stringify({ path: '/Reports/q1.pdf' }) })
			.reply(200, 'file-content');
		content
			.post('/files/upload', 'hello')
			.query({ arg: JSON.stringify({ mode: 'overwrite', path: '/Reports/notes.txt' }) })
			.reply(200, JSON.stringify({ id: 'id:u1', name: 'notes.txt' }));

		api
			.post('/files/create_folder_v2', { path: '/Reports/2024' })
			.matchHeader('dropbox-api-path-root', pathRoot)
			.reply(200, { metadata: { id: 'id:f1', name: '2024' } });
		api
			.post('/files/list_folder', { path: '/Reports', limit: 1000 })
			.matchHeader('dropbox-api-path-root', pathRoot)
			.reply(200, {
				entries: [{ '.tag': 'file', id: 'id:a1', name: 'q1.pdf' }],
				cursor: 'list-cursor-1',
				has_more: true,
			});
		api
			.post('/files/list_folder/continue', { cursor: 'list-cursor-1' })
			.matchHeader('dropbox-api-path-root', pathRoot)
			.reply(200, {
				entries: [{ '.tag': 'file', id: 'id:a2', name: 'q2.pdf' }],
				cursor: 'list-cursor-2',
				has_more: false,
			});
		api
			.post('/files/search_v2', { query: 'invoice', options: { filename_only: true } })
			.matchHeader('dropbox-api-path-root', pathRoot)
			.reply(200, {
				matches: [{ match_type: { '.tag': 'filename' }, metadata: { id: 'id:s1' } }],
				cursor: 'search-cursor-1',
				has_more: true,
			});
		api
			.post('/files/search/continue_v2', { cursor: 'search-cursor-1' })
			.matchHeader('dropbox-api-path-root', pathRoot)
			.reply(200, {
				matches: [{ match_type: { '.tag': 'filename' }, metadata: { id: 'id:s2' } }],
				has_more: false,
			});
		api
			.post('/files/copy_v2', { from_path: '/Reports/q1.pdf', to_path: '/Archive/q1.pdf' })
			.matchHeader('dropbox-api-path-root', pathRoot)
			.reply(200, { metadata: { id: 'id:c1' } });
		api
			.post('/files/delete_v2', { path: '/Archive/q1.pdf' })
			.matchHeader('dropbox-api-path-root', pathRoot)
			.reply(200, { metadata: { id: 'id:a1' } });
		api
			.post('/files/move_v2', { from_path: '/Reports/q2.pdf', to_path: '/Archive/q2.pdf' })
			.matchHeader('dropbox-api-path-root', pathRoot)
			.reply(200, { metadata: { id: 'id:m1' } });
	});

	afterAll(() => {
		expect(api.isDone()).toBe(true);
		expect(content.isDone()).toBe(true);
	});

	new NodeTestHarness().setupTests({ credentials, workflowFiles: ['requests.workflow.json'] });
});
