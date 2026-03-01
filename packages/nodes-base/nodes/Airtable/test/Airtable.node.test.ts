import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import type { WorkflowTestData } from 'n8n-workflow';
import nock from 'nock';

const record = {
	id: 'rec2BWBoyS5QsS7pT',
	name: 'Tim',
	email: 'tim@email.com',
	createdTime: '2022-08-25T08:22:34.000Z',
};

describe('Execute Airtable Node', () => {
	const testHarness = new NodeTestHarness();

	beforeEach(() => {
		nock('https://api.airtable.com/v0')
			.get('/appIaXXdDqS5ORr4V/tbljyBEdYzCPF0NDh/rec2BWBoyS5QsS7pT')
			.reply(200, record);
	});

	const testData: WorkflowTestData = {
		description: 'List Airtable Records',
		input: {
			workflowData: testHarness.readWorkflowJSON('workflow.json'),
		},
		output: {
			nodeData: {
				Airtable: [[{ json: record }]],
			},
		},
	};

	testHarness.setupTest(testData, { credentials: { airtableTokenApi: {} } });
});
