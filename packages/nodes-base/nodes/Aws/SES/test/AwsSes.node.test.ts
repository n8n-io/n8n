import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import { NodeConnectionTypes, type WorkflowTestData } from 'n8n-workflow';
import assert from 'node:assert';
import qs from 'node:querystring';

import { credentials } from '../../__tests__/credentials';

describe('AwsSes Node', () => {
	const testHarness = new NodeTestHarness();
	const email = 'test+user@example.com';
	const templateData = {
		Name: 'Special. Characters @#$%^&*()_-',
	};
	const tests: WorkflowTestData[] = [
		{
			description: 'should create customVerificationEmail',
			input: {
				workflowData: {
					nodes: [
						{
							parameters: {},
							id: '61c910d6-9997-4bc0-b95d-2b2771c3110f',
							name: 'When clicking ‘Execute workflow’',
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
						'When clicking ‘Execute workflow’': {
							main: [
								[
									{
										node: 'AWS SES',
										type: NodeConnectionTypes.Main,
										index: 0,
									},
								],
							],
						},
					},
				},
			},
			output: {
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
		{
			description: 'should URIencode params for sending email with template',
			input: {
				workflowData: {
					nodes: [
						{
							parameters: {},
							type: 'n8n-nodes-base.manualTrigger',
							typeVersion: 1,
							position: [-180, 520],
							id: '363e874a-9054-4a64-bc3f-786719dde626',
							name: 'When clicking ‘Execute workflow’',
						},
						{
							parameters: {
								operation: 'sendTemplate',
								templateName: '=Template11',
								fromEmail: 'test+user@example.com',
								toAddresses: ['test+user@example.com'],
								templateDataUi: {
									templateDataValues: [
										{
											key: 'Name',
											value: '=Special. Characters @#$%^&*()_-',
										},
									],
								},
								additionalFields: {},
							},
							type: 'n8n-nodes-base.awsSes',
							typeVersion: 1,
							position: [60, 520],
							id: '13bbf4ef-8320-45d1-9210-61b62794a108',
							name: 'AWS SES',
							credentials: {
								aws: {
									id: 'Nz0QZhzu3MvfK4TQ',
									name: 'AWS account',
								},
							},
						},
					],
					connections: {
						'When clicking ‘Execute workflow’': {
							main: [
								[
									{
										node: 'AWS SES',
										type: NodeConnectionTypes.Main,
										index: 0,
									},
								],
							],
						},
					},
				},
			},
			output: {
				nodeData: { 'AWS SES': [[{ json: { success: 'true' } }]] },
			},
			nock: {
				baseUrl: 'https://email.eu-central-1.amazonaws.com',
				mocks: [
					{
						method: 'post',
						path: `/?Action=SendTemplatedEmail&Template=Template11&Source=${encodeURIComponent(email)}&Destination.ToAddresses.member.1=${encodeURIComponent(email)}&TemplateData=${encodeURIComponent(JSON.stringify(templateData))}`,
						statusCode: 200,
						responseBody:
							'<SendTemplatedEmailResponse><success>true</success></SendTemplatedEmailResponse>',
					},
				],
			},
		},
	];

	for (const testData of tests) {
		testHarness.setupTest(testData, { credentials });
	}
});
