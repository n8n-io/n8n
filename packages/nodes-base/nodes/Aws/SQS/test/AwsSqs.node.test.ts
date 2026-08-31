import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import { NodeConnectionTypes, type WorkflowTestData } from 'n8n-workflow';

import { credentials } from '../../__tests__/credentials';

describe('AwsSqs Node', () => {
	const messageAttributeName = 'label&kind=primary';
	const messageAttributeValue = 'left&segment=value';
	const messageDeduplicationId = 'dedup&segment=value';
	const messageGroupId = 'group&segment=value';
	const queuePath = '/123456789012/n8n-node-test-fifo.fifo';

	const testData: WorkflowTestData = {
		description: 'should preserve reserved characters in request parameter values',
		input: {
			workflowData: {
				nodes: [
					{
						parameters: {},
						id: '5d4c45ed-1368-4ea3-a97c-2d46664f4656',
						name: 'When clicking ‘Execute workflow’',
						type: 'n8n-nodes-base.manualTrigger',
						typeVersion: 1,
						position: [720, 380],
					},
					{
						parameters: {
							queue: `https://sqs.eu-central-1.amazonaws.com${queuePath}`,
							queueType: 'fifo',
							sendInputData: false,
							message: 'test message',
							messageGroupId,
							options: {
								messageDeduplicationId,
								messageAttributes: {
									string: [
										{
											name: messageAttributeName,
											value: messageAttributeValue,
										},
									],
								},
							},
						},
						id: 'bf664a84-bd26-413b-94d3-7f2935883ce3',
						name: 'AWS SQS',
						type: 'n8n-nodes-base.awsSqs',
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
									node: 'AWS SQS',
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
				'AWS SQS': [[{ json: { MessageId: 'message-id' } }]],
			},
		},
		nock: {
			baseUrl: 'https://sqs.eu-central-1.amazonaws.com',
			mocks: [
				{
					method: 'get',
					path: `${queuePath}?Version=2012-11-05&Action=SendMessage&MessageBody=test%20message&MessageDeduplicationId=${encodeURIComponent(messageDeduplicationId)}&MessageGroupId=${encodeURIComponent(messageGroupId)}&MessageAttribute.1.Name=${encodeURIComponent(messageAttributeName)}&MessageAttribute.1.Value.StringValue=${encodeURIComponent(messageAttributeValue)}&MessageAttribute.1.Value.DataType=String`,
					statusCode: 200,
					responseBody:
						'<SendMessageResponse><SendMessageResult><MessageId>message-id</MessageId></SendMessageResult></SendMessageResponse>',
				},
			],
		},
	};

	new NodeTestHarness().setupTest(testData, { credentials });
});
