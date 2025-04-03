import type { WorkflowTestData } from 'n8n-workflow';
import nock from 'nock';

import { executeWorkflow } from '@test/nodes/ExecuteWorkflow';
import * as Helpers from '@test/nodes/Helpers';

const records = [
	{
		id: 'rec2BWBoyS5QsS7pT',
		createdTime: '2022-08-25T08:22:34.000Z',
		fields: {
			name: 'Tim',
			email: 'tim@email.com',
		},
	},
];

describe('Execute Airtable Node', () => {
	beforeEach(() => {
		nock('https://api.airtable.com/v0')
			.get('/appIaXXdDqS5ORr4V/tbljyBEdYzCPF0NDh?pageSize=100')
			.reply(200, { records });
	});

	const tests: WorkflowTestData[] = [
		{
			description: 'List Airtable Records',
			input: {
				workflowData: Helpers.readJsonFileSync('nodes/Airtable/test/workflow.json'),
			},
			output: {
				nodeData: {
					Airtable: [[...records.map((r) => ({ json: r }))]],
				},
			},
		},
	];

	for (const testData of tests) {
		test(testData.description, async () => {
			await executeWorkflow(testData);
		});
	}
});
