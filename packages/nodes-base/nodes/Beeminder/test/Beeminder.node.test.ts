import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import type { WorkflowTestData } from 'n8n-workflow';
import nock from 'nock';

const userInfo = {
	username: 'test',
	timezone: 'Europe/Zurich',
	goals: ['test3333', 'test333'],
	created_at: 1520089425,
	updated_at: 1753992556,
	urgency_load: 43,
	deadbeat: false,
	has_authorized_fitbit: false,
	default_leadtime: 0,
	default_alertstart: 34200,
	default_deadline: -43260,
	subscription: 'infinibee',
	subs_downto: 'infinibee',
	subs_freq: 24,
	subs_lifetime: null,
	remaining_subs_credit: 31,
	id: '35555555555',
};

const chargeInfo = {
	amount: 10,
	id: {
		$oid: '688bcd7cf0168a11bee246ffff',
	},
	note: 'Created by test-test-oauth2',
	status: null,
	username: 'test',
};

const goalInfo = {
	slug: 'test3333',
	title: 'test title',
	description: null,
	goalval: 1000,
	rate: 1,
	rah: null,
	callback_url: null,
	tags: [],
	recent_data: [
		{
			id: '688bc5fef0168a11bee24691',
			timestamp: 1754042339,
			daystamp: '20250801',
			value: 0,
			comment: 'initial datapoint of 0 on the 1st',
			updated_at: 1753990654,
			requestid: null,
			origin: 'nihilo',
			creator: '',
			is_dummy: false,
			is_initial: true,
			urtext: null,
			fulltext: '2025-Aug-01 entered at 21:37 on 2025-Jul-31 ex nihilo',
			canonical: '01 0 "initial datapoint of 0 on the 1st"',
			created_at: '2025-07-31T19:37:34.000Z',
		},
	],
	dueby: null,
};

const newDatapoint = {
	id: '688bc54ef0168a11bee2468b',
	timestamp: 1753990478,
	daystamp: '20250801',
	value: 1,
	comment: '',
	updated_at: 1753990478,
	requestid: null,
	origin: 'test-test-oauth2',
	creator: 'testuser',
	is_dummy: false,
	is_initial: false,
	urtext: null,
	fulltext: '2025-Aug-01 entered at 21:34 on 2025-Jul-31 by test-ser via test-test-oauth2',
	canonical: '01 1',
	created_at: '2025-07-31T19:34:38.000Z',
	status: 'created',
};

describe('Execute Beeminder Node', () => {
	const testHarness = new NodeTestHarness();

	beforeEach(() => {
		const beeminderNock = nock('https://www.beeminder.com');
		beeminderNock.get('/api/v1/users/me.json').reply(200, userInfo);
		beeminderNock.post('/api/v1/charges.json').reply(200, chargeInfo);
		beeminderNock.get('/api/v1/users/me/goals.json').reply(200, [goalInfo]);
		beeminderNock.post('/api/v1/users/me/goals.json').reply(200, goalInfo);
		beeminderNock
			.post(`/api/v1/users/me/goals/${goalInfo.slug}/datapoints.json`)
			.reply(200, newDatapoint);
		beeminderNock
			.put(`/api/v1/users/me/goals/${goalInfo.slug}/datapoints/${newDatapoint.id}.json`)
			.reply(200, newDatapoint);
		beeminderNock
			.delete(`/api/v1/users/me/goals/${goalInfo.slug}/datapoints/${newDatapoint.id}.json`)
			.reply(200, newDatapoint);
	});

	const testData: WorkflowTestData = {
		description: 'Execute operations',
		input: {
			workflowData: testHarness.readWorkflowJSON('workflow.json'),
		},
		output: {
			nodeData: {
				'Get user information': [[{ json: userInfo }]],
				'Create a charge': [[{ json: chargeInfo }]],
				'Get many goals': [[{ json: goalInfo }]],
				'Create a new goal': [[{ json: goalInfo }]],
				'Create datapoint for goal': [[{ json: newDatapoint }]],
				'Update a datapoint': [[{ json: newDatapoint }]],
				'Delete a datapoint': [[{ json: newDatapoint }]],
			},
		},
	};

	testHarness.setupTest(testData, { credentials: { beeminderApi: {} } });
});
