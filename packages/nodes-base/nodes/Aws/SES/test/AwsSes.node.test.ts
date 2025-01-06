import { NodeConnectionType } from 'n8n-workflow';
import assert from 'node:assert';
import qs from 'node:querystring';

import { executeWorkflow } from '@test/nodes/ExecuteWorkflow';
import * as Helpers from '@test/nodes/Helpers';
import type { WorkflowTestData } from '@test/nodes/types';

describe('AwsSes Node', () => {
	const tests: WorkflowTestData[] = [
		{
			description: 'should create customVerificationEmail',
			input: {
				workflowData: {
					nodes: [
						{
							parameters: {},
							id: '61c910d6-9997-4bc0-b95d-2b2771c3110f',
							name: 'When clicking ‘Test workflow’',
							type: 'n8n-nodes-base.manualTrigger',
							typeVersion: 1,
							position: [720, 380],
						},
						{
							parameters: {
								resource: 'customVerificationEmail',
								fromEmailAddress: 'test+user@example.com',
								templateName: 'testTemplate',
								templateContent: 'testContent',
								templateSubject: 'testSubject',
								successRedirectionURL: 'http://success.url/',
								failureRedirectionURL: 'http://failure.url/',
							},
							id: '5780c7b2-7e7f-44d2-980d-a162d28bf152',
							name: 'AWS SES',
							type: 'n8n-nodes-base.awsSes',
							typeVersion: 1,
							position: [940, 380],
							credentials: {
								aws: {
									id: '1',
									name: 'AWS',
								},
							},
						},
					],
					connections: {
						'When clicking ‘Test workflow’': {
							main: [
								[
									{
										node: 'AWS SES',
										type: NodeConnectionType.Main,
										index: 0,
									},
								],
							],
						},
					},
				},
			},
			output: {
				nodeExecutionOrder: ['Start'],
				nodeData: {
					'AWS SES': [[{ json: { success: 'true' } }]],
				},
			},
			nock: {
				baseUrl: 'https://email.eu-central-1.amazonaws.com',
				mocks: [
					{
						method: 'post',
						path: '/',
						requestBody: (body: any) => {
							assert.deepEqual(qs.parse(body), {
								Action: 'CreateCustomVerificationEmailTemplate',
								FromEmailAddress: 'test+user@example.com',
								SuccessRedirectionURL: 'http://success.url/',
								FailureRedirectionURL: 'http://failure.url/',
								TemplateName: 'testTemplate',
								TemplateSubject: 'testSubject',
								TemplateContent: 'testContent',
							});
							return true;
						},
						statusCode: 200,
						responseBody:
							'<CreateCustomVerificationEmailTemplateResponse><success>true</success></CreateCustomVerificationEmailTemplateResponse>',
					},
				],
			},
		},
	];

	const nodeTypes = Helpers.setup(tests);

	test.each(tests)('$description', async (testData) => {
		const { result } = await executeWorkflow(testData, nodeTypes);
		const resultNodeData = Helpers.getResultNodeData(result, testData);
		resultNodeData.forEach(({ nodeName, resultData }) =>
			expect(resultData).toEqual(testData.output.nodeData[nodeName]),
		);
		expect(result.finished).toEqual(true);
	});
});
