import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

describe('Elastic Security', () => {
	const credentials = {
		elasticSecurityApi: {
			baseUrl: 'https://kibana.local:5601/',
			type: 'basicAuth',
			username: 'elastic',
			password: 'password',
		},
	};

	const caseA = '3b1e7c50-2f4a-11ee-9d1c-5f3e2a1b4c6d';
	const caseB = '7d2f8e61-3a5b-11ee-8e2d-6a4f3b2c5d7e';
	const commentId = 'a71c2d90-2f4b-11ee-9d1c-5f3e2a1b4c6d';
	const connectorId = 'b2f1a3c4-5d6e-4f70-8a9b-0c1d2e3f4a5b';

	const comment = {
		id: commentId,
		version: 'WzMsMV0=',
		comment: 'Checked the logs',
		type: 'user',
		owner: 'securitySolution',
	};
	const caseResponse = {
		id: caseA,
		version: 'WzEsMV0=',
		title: 'Suspicious login',
		description: '',
		owner: 'securitySolution',
		status: 'open',
		tags: [],
		settings: { syncAlerts: false },
		connector: { id: 'none', name: 'none', type: '.none', fields: null },
		comments: [comment],
	};
	const caseWithTag = { ...caseResponse, id: caseB, tags: ['phishing'], comments: [] };

	beforeAll(() => {
		const api = nock('https://kibana.local:5601');
		api
			.get(`/api/actions/connector/${connectorId}`)
			.reply(200, { id: connectorId, name: 'Jira', connector_type_id: '.jira' });
		api.post('/api/cases').reply(200, caseResponse);
		api
			.delete('/api/cases')
			.query({ ids: JSON.stringify([caseA]) })
			.reply(204);
		api.get(`/api/cases/${caseA}`).times(4).reply(200, caseResponse);
		api
			.get('/api/cases/_find')
			.query({ sortField: 'createdAt', sortOrder: 'asc' })
			.reply(200, { cases: [caseResponse], total: 1 });
		api.get('/api/cases/status').reply(200, {
			count_open_cases: 1,
			count_in_progress_cases: 0,
			count_closed_cases: 0,
		});
		api.patch('/api/cases').times(2).reply(200, [caseResponse]);
		api.get(`/api/cases/${caseB}`).times(2).reply(200, caseWithTag);
		api.patch('/api/cases').reply(200, [caseWithTag]);
		api.post(`/api/cases/${caseA}/comments`).reply(200, caseResponse);
		api.get(`/api/cases/${caseA}/comments/${commentId}`).times(2).reply(200, comment);
		api.get(`/api/cases/${caseA}/comments`).reply(200, [comment]);
		api.delete(`/api/cases/${caseA}/comments/${commentId}`).reply(204);
		api.patch(`/api/cases/${caseA}/comments`).reply(200, caseResponse);
		api
			.post('/api/actions/connector')
			.reply(200, { id: connectorId, name: 'Jira', connector_type_id: '.jira' });
	});

	new NodeTestHarness().setupTests({
		credentials,
		workflowFiles: ['requests.workflow.json'],
		customAssertions: () => expect(nock.isDone()).toBe(true),
	});
});
