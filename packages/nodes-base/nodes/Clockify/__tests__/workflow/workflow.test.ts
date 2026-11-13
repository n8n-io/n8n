import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

describe('Clockify > Workflows', () => {
	const credentials = { clockifyApi: { apiKey: 'test-api-key' } };

	beforeAll(() => {
		nock('https://api.clockify.me')
			.post('/api/v1//workspaces/64a1b2c3d4e5f6a7b8c9d0e1/clients')
			.reply(200, { id: '64b2c3d4e5f6a7b8c9d0e1f2' })
			.delete('/api/v1//workspaces/64a1b2c3d4e5f6a7b8c9d0e1/clients/64b2c3d4e5f6a7b8c9d0e1f2')
			.reply(200, { id: '64b2c3d4e5f6a7b8c9d0e1f2' })
			.put('/api/v1//workspaces/64a1b2c3d4e5f6a7b8c9d0e1/clients/64b2c3d4e5f6a7b8c9d0e1f2')
			.reply(200, { id: '64b2c3d4e5f6a7b8c9d0e1f2' })
			.get('/api/v1//workspaces/64a1b2c3d4e5f6a7b8c9d0e1/clients/64b2c3d4e5f6a7b8c9d0e1f2')
			.reply(200, { id: '64b2c3d4e5f6a7b8c9d0e1f2' })
			.get('/api/v1//workspaces/64a1b2c3d4e5f6a7b8c9d0e1/clients')
			.query({ 'page-size': '50', page: '1', limit: '1' })
			.reply(200, [{ id: '64b2c3d4e5f6a7b8c9d0e1f2' }])
			.post('/api/v1//workspaces/64a1b2c3d4e5f6a7b8c9d0e1/projects')
			.reply(200, { id: '64c3d4e5f6a7b8c9d0e1f2a3' })
			.delete('/api/v1//workspaces/64a1b2c3d4e5f6a7b8c9d0e1/projects/64c3d4e5f6a7b8c9d0e1f2a3')
			.reply(200, { id: '64c3d4e5f6a7b8c9d0e1f2a3' })
			.get('/api/v1//workspaces/64a1b2c3d4e5f6a7b8c9d0e1/projects/64c3d4e5f6a7b8c9d0e1f2a3')
			.reply(200, { id: '64c3d4e5f6a7b8c9d0e1f2a3' })
			.get('/api/v1//workspaces/64a1b2c3d4e5f6a7b8c9d0e1/projects')
			.query({ 'page-size': '50', page: '1', limit: '1' })
			.reply(200, [{ id: '64c3d4e5f6a7b8c9d0e1f2a3' }])
			.put('/api/v1//workspaces/64a1b2c3d4e5f6a7b8c9d0e1/projects/64c3d4e5f6a7b8c9d0e1f2a3')
			.reply(200, { id: '64c3d4e5f6a7b8c9d0e1f2a3' })
			.post('/api/v1//workspaces/64a1b2c3d4e5f6a7b8c9d0e1/tags')
			.reply(200, { id: '64d4e5f6a7b8c9d0e1f2a3b4' })
			.delete('/api/v1//workspaces/64a1b2c3d4e5f6a7b8c9d0e1/tags/64d4e5f6a7b8c9d0e1f2a3b4')
			.reply(200, {})
			.get('/api/v1//workspaces/64a1b2c3d4e5f6a7b8c9d0e1/tags')
			.query({ 'page-size': '50', page: '1', limit: '1' })
			.reply(200, [{ id: '64d4e5f6a7b8c9d0e1f2a3b4' }])
			.put('/api/v1//workspaces/64a1b2c3d4e5f6a7b8c9d0e1/tags/64d4e5f6a7b8c9d0e1f2a3b4')
			.reply(200, { id: '64d4e5f6a7b8c9d0e1f2a3b4' })
			.post('/api/v1//workspaces/64a1b2c3d4e5f6a7b8c9d0e1/projects/64c3d4e5f6a7b8c9d0e1f2a3/tasks')
			.reply(200, { id: '64e5f6a7b8c9d0e1f2a3b4c5' })
			.delete(
				'/api/v1//workspaces/64a1b2c3d4e5f6a7b8c9d0e1/projects/64c3d4e5f6a7b8c9d0e1f2a3/tasks/64e5f6a7b8c9d0e1f2a3b4c5',
			)
			.reply(200, { id: '64e5f6a7b8c9d0e1f2a3b4c5' })
			.get(
				'/api/v1//workspaces/64a1b2c3d4e5f6a7b8c9d0e1/projects/64c3d4e5f6a7b8c9d0e1f2a3/tasks/64e5f6a7b8c9d0e1f2a3b4c5',
			)
			.reply(200, { id: '64e5f6a7b8c9d0e1f2a3b4c5' })
			.get('/api/v1//workspaces/64a1b2c3d4e5f6a7b8c9d0e1/projects/64c3d4e5f6a7b8c9d0e1f2a3/tasks')
			.query({ 'page-size': '1' })
			.reply(200, [{ id: '64e5f6a7b8c9d0e1f2a3b4c5' }])
			.put(
				'/api/v1//workspaces/64a1b2c3d4e5f6a7b8c9d0e1/projects/64c3d4e5f6a7b8c9d0e1f2a3/tasks/64e5f6a7b8c9d0e1f2a3b4c5',
			)
			.reply(200, { id: '64e5f6a7b8c9d0e1f2a3b4c5' })
			.post('/api/v1//workspaces/64a1b2c3d4e5f6a7b8c9d0e1/time-entries')
			.reply(200, { id: '64f6a7b8c9d0e1f2a3b4c5d6' })
			.delete('/api/v1//workspaces/64a1b2c3d4e5f6a7b8c9d0e1/time-entries/64f6a7b8c9d0e1f2a3b4c5d6')
			.reply(200, {})
			.get('/api/v1//workspaces/64a1b2c3d4e5f6a7b8c9d0e1/time-entries/64f6a7b8c9d0e1f2a3b4c5d6')
			.reply(200, { id: '64f6a7b8c9d0e1f2a3b4c5d6' })
			.get('/api/v1//workspaces/64a1b2c3d4e5f6a7b8c9d0e1/time-entries/64f6a7b8c9d0e1f2a3b4c5d6')
			.reply(200, { timeInterval: { start: '2024-05-01T09:00:00Z' } })
			.put('/api/v1//workspaces/64a1b2c3d4e5f6a7b8c9d0e1/time-entries/64f6a7b8c9d0e1f2a3b4c5d6')
			.reply(200, { id: '64f6a7b8c9d0e1f2a3b4c5d6' })
			.get('/api/v1//workspaces/64a1b2c3d4e5f6a7b8c9d0e1/users')
			.query({ 'page-size': '50', page: '1', limit: '1' })
			.reply(200, [{ id: '6501a2b3c4d5e6f7a8b9c0d1' }])
			.get('/api/v1//workspaces')
			.reply(200, [{ id: '64a1b2c3d4e5f6a7b8c9d0e1' }]);
	});

	new NodeTestHarness().setupTests({
		credentials,
		workflowFiles: ['workflow.json'],
		customAssertions: () => expect(nock.pendingMocks()).toEqual([]),
	});
});
