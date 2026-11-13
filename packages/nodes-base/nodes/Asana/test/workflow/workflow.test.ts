import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

describe('Asana > Workflows', () => {
	const credentials = {
		asanaApi: {
			accessToken: 'test-access-token',
		},
	};

	const workspaceId = '1201234567890001';
	const taskId = '1204000000000001';
	const projectId = '1205000000000001';

	beforeAll(() => {
		const mock = nock('https://app.asana.com/api/1.0');
		mock
			.post(`/tasks/${taskId}/subtasks`, { data: { name: 'Draft' } })
			.reply(200, { data: { gid: '1204000000000101' } });
		mock.get(`/tasks/${taskId}/subtasks`).reply(200, { data: [{ gid: '1204000000000102' }] });
		mock
			.post('/tasks', { data: { name: 'Write report', workspace: workspaceId } })
			.reply(200, { data: { gid: '1204000000000002' } });
		mock.delete('/tasks/1204000000000003').reply(200, { data: {} });
		mock.get('/tasks/1204000000000004').reply(200, { data: { gid: '1204000000000004' } });
		mock
			.get('/tasks')
			.query({ project: projectId, limit: 100 })
			.reply(200, {
				data: [{ gid: '1204000000000005' }],
				next_page: {
					offset: 'eyJ0eXAiOiJKV1QifQ',
					uri: `https://app.asana.com/api/1.0/tasks?project=${projectId}&limit=100&offset=eyJ0eXAiOiJKV1QifQ`,
				},
			});
		mock
			.get('/tasks')
			.query({ project: projectId, limit: 100, offset: 'eyJ0eXAiOiJKV1QifQ' })
			.reply(200, { data: [{ gid: '1204000000000006' }], next_page: null });
		mock
			.post('/sections/1206000000000001/addTask', { data: { task: '1204000000000007' } })
			.reply(200, { data: {} });
		mock
			.put('/tasks/1204000000000008', { data: { name: 'Renamed' } })
			.reply(200, { data: { gid: '1204000000000008' } });
		mock
			.get(`/workspaces/${workspaceId}/tasks/search`)
			.reply(200, { data: [{ gid: '1204000000000009' }] });
		mock
			.post(`/tasks/${taskId}/stories`, { data: { text: 'Looks good' } })
			.reply(200, { data: { gid: '1207000000000001' } });
		mock.delete('/stories/1207000000000002').reply(200, { data: {} });
		mock
			.post(`/tasks/${taskId}/addTag`, { data: { tag: '1208000000000001' } })
			.reply(200, { data: {} });
		mock
			.post(`/tasks/${taskId}/removeTag`, { data: { tag: '1208000000000001' } })
			.reply(200, { data: {} });
		mock
			.post(`/tasks/${taskId}/addProject`, { data: { project: projectId } })
			.reply(200, { data: {} });
		mock
			.post(`/tasks/${taskId}/removeProject`, { data: { project: projectId } })
			.reply(200, { data: {} });
		mock.get('/users/1209000000000001').reply(200, { data: { gid: '1209000000000001' } });
		mock
			.get(`/workspaces/${workspaceId}/users`)
			.reply(200, { data: [{ gid: '1209000000000002' }] });
		mock
			.post('/teams/1210000000000001/projects', {
				data: { name: 'Launch', workspace: workspaceId },
			})
			.reply(200, { data: { gid: '1205000000000002' } });
		mock.delete('/projects/1205000000000003').reply(200, { data: {} });
		mock.get('/projects/1205000000000004').reply(200, { data: { gid: '1205000000000004' } });
		mock
			.get('/projects')
			.query({ workspace: workspaceId, limit: 100 })
			.reply(200, { data: [{ gid: '1205000000000005' }], next_page: null });
		mock
			.put('/projects/1205000000000006', { data: { name: 'Relaunch' } })
			.reply(200, { data: { gid: '1205000000000006' } });
	});

	new NodeTestHarness().setupTests({
		credentials,
		customAssertions: () => expect(nock.isDone()).toBe(true),
	});
});
