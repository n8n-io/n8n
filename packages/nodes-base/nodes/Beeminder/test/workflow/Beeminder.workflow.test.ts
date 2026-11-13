import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

const datapoint = { id: '688bc54ef0168a11bee2468b', value: 1 };
const goal = { slug: 'weight' };

describe('Beeminder > Workflows', () => {
	const credentials = {
		beeminderApi: {
			authToken: 'fake-auth-token',
		},
	};

	beforeAll(() => {
		const api = nock('https://www.beeminder.com/api/v1/users/me');
		api
			.get('/goals/weight/datapoints.json')
			.query({ goalName: 'weight', count: 10 })
			.reply(200, [datapoint]);
		api
			.post('/goals/weight/datapoints/create_all.json', { datapoints: [{ value: 1 }] })
			.reply(200, [datapoint]);
		api.get('/goals/weight/datapoints/688bc54ef0168a11bee2468b.json').reply(200, datapoint);
		api.get('/goals/weight.json').query({ goalName: 'weight' }).reply(200, goal);
		api.get('/goals/archived.json').reply(200, [{ slug: 'reading' }]);
		api
			.put('/goals/weight.json', { goalName: 'weight', title: 'Daily weight' })
			.reply(200, { ...goal, title: 'Daily weight' });
		api.get('/goals/weight/refresh_graph.json').reply(200, goal);
		api.post('/goals/weight/shortcircuit.json').reply(200, goal);
		api.post('/goals/weight/stepdown.json').reply(200, goal);
		api.post('/goals/weight/cancel_stepdown.json').reply(200, goal);
		api.post('/goals/weight/uncleme.json').reply(200, goal);
	});

	new NodeTestHarness().setupTests({
		credentials,
		workflowFiles: ['requests.workflow.json'],
		customAssertions: () => expect(nock.pendingMocks()).toEqual([]),
	});
});
