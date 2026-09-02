import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import { NodeConnectionTypes, type INodeParameters, type WorkflowTestData } from 'n8n-workflow';
import assert from 'node:assert';
import qs from 'node:querystring';

import { credentials } from '../../__tests__/credentials';

describe('AwsSes Node', () => {
	const testHarness = new NodeTestHarness();
	const email = 'test+user@example.com';
	const configurationSetName = 'config&segment=value';
	const returnPath = 'bounce+tag@example.com';
	const returnPathArn = 'arn:aws:ses:eu-central-1:123456789012:identity/bounce+tag@example.com';
	const sourceArn = 'arn:aws:ses:eu-central-1:123456789012:identity/example.com&segment=value';
	const templateName = 'Template&segment=value';
	const templateData = {
		Name: 'Special. Characters @#$%^&*()_-',
	};
	const createWorkflowData = (
		parameters: INodeParameters,
	): WorkflowTestData['input']['workflowData'] => ({
		nodes: [
			{
				parameters: {},
				id: 'b30ae9d4-6a92-4b62-92f4-5810b4718c66',
				name: 'When clicking ‘Execute workflow’',
				type: 'n8n-nodes-base.manualTrigger',
				typeVersion: 1,
				position: [720, 380],
			},
			{
				parameters,
				id: '07955ca4-e9c9-415a-8175-dda8ad3204fd',
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
	});
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
			description: 'should preserve reserved characters when sending email with a template',
			input: {
				workflowData: createWorkflowData({
					operation: 'sendTemplate',
					templateName,
					fromEmail: email,
					toAddresses: [email],
					templateDataUi: {
						templateDataValues: [
							{
								key: 'Name',
								value: templateData.Name,
							},
						],
					},
					additionalFields: {
						configurationSetName,
						returnPath,
						returnPathArn,
						sourceArn,
					},
				}),
			},
			output: {
				nodeData: { 'AWS SES': [[{ json: { success: 'true' } }]] },
			},
			nock: {
				baseUrl: 'https://email.eu-central-1.amazonaws.com',
				mocks: [
					{
						method: 'post',
						path: `/?Action=SendTemplatedEmail&Template=${encodeURIComponent(templateName)}&Source=${encodeURIComponent(email)}&Destination.ToAddresses.member.1=${encodeURIComponent(email)}&ConfigurationSetName=${encodeURIComponent(configurationSetName)}&ReturnPath=${encodeURIComponent(returnPath)}&ReturnPathArn=${encodeURIComponent(returnPathArn)}&SourceArn=${encodeURIComponent(sourceArn)}&TemplateData=${encodeURIComponent(JSON.stringify(templateData))}`,
						statusCode: 200,
						responseBody:
							'<SendTemplatedEmailResponse><success>true</success></SendTemplatedEmailResponse>',
					},
				],
			},
		},
		{
			description: 'should preserve reserved characters when sending an email',
			input: {
				workflowData: createWorkflowData({
					resource: 'email',
					operation: 'send',
					fromEmail: email,
					toAddresses: [email],
					subject: 'Test subject',
					body: 'Test body',
					isBodyHtml: false,
					additionalFields: {
						configurationSetName,
						returnPath,
						returnPathArn,
						sourceArn,
					},
				}),
			},
			output: {
				nodeData: {
					'AWS SES': [[{ json: { SendEmailResponse: { success: 'true' } } }]],
				},
			},
			nock: {
				baseUrl: 'https://email.eu-central-1.amazonaws.com',
				mocks: [
					{
						method: 'post',
						path: `/?Action=SendEmail&Message.Subject.Data=Test%20subject&Source=${encodeURIComponent(email)}&Message.Body.Text.Data=Test%20body&Destination.ToAddresses.member.1=${encodeURIComponent(email)}&ConfigurationSetName=${encodeURIComponent(configurationSetName)}&ReturnPath=${encodeURIComponent(returnPath)}&ReturnPathArn=${encodeURIComponent(returnPathArn)}&SourceArn=${encodeURIComponent(sourceArn)}`,
						statusCode: 200,
						responseBody: '<SendEmailResponse><success>true</success></SendEmailResponse>',
					},
				],
			},
		},
		{
			description: 'should preserve reserved characters when getting a template',
			input: {
				workflowData: createWorkflowData({
					resource: 'template',
					operation: 'get',
					templateName,
				}),
			},
			output: {
				nodeData: { 'AWS SES': [[{ json: { success: 'true' } }]] },
			},
			nock: {
				baseUrl: 'https://email.eu-central-1.amazonaws.com',
				mocks: [
					{
						method: 'post',
						path: `/?Action=GetTemplate&TemplateName=${encodeURIComponent(templateName)}`,
						statusCode: 200,
						responseBody: '<GetTemplateResponse><success>true</success></GetTemplateResponse>',
					},
				],
			},
		},
		{
			description: 'should preserve reserved characters when sending a custom verification email',
			input: {
				workflowData: createWorkflowData({
					resource: 'customVerificationEmail',
					operation: 'send',
					email,
					templateName,
					additionalFields: {
						configurationSetName,
					},
				}),
			},
			output: {
				nodeData: { 'AWS SES': [[{ json: { success: 'true' } }]] },
			},
			nock: {
				baseUrl: 'https://email.eu-central-1.amazonaws.com',
				mocks: [
					{
						method: 'post',
						path: '/',
						requestBody: (body: string) => {
							assert.deepEqual(qs.parse(body), {
								Action: 'SendCustomVerificationEmail',
								TemplateName: templateName,
								EmailAddress: email,
								ConfigurationSetName: configurationSetName,
							});
							return true;
						},
						statusCode: 200,
						responseBody:
							'<SendCustomVerificationEmailResponse><success>true</success></SendCustomVerificationEmailResponse>',
					},
				],
			},
		},
	];

	for (const testData of tests) {
		testHarness.setupTest(testData, { credentials });
	}
});
