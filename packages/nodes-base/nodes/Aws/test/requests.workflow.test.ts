import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

import { credentials } from '../__tests__/credentials';

describe('AWS Lambda and SNS > Workflows', () => {
	beforeAll(() => {
		nock('https://lambda.eu-central-1.amazonaws.com')
			.post(
				'/2015-03-31/functions/arn:aws:lambda:eu-central-1:123456789012:function:order-sync/invocations?Qualifier=$LATEST',
			)
			.reply(200, '{"status":"synced"}')
			.post('/2015-03-31/functions/order-sync/invocations?Qualifier=prod')
			.reply(202, '{}');

		nock('https://sns.eu-central-1.amazonaws.com')
			.get(
				'/?Action=CreateTopic&Name=orders.fifo&Attributes.entry.1.key=FifoTopic&Attributes.entry.1.value=true&Attributes.entry.2.key=DisplayName&Attributes.entry.2.value=Order%20events',
			)
			.reply(
				200,
				'<CreateTopicResponse><CreateTopicResult><TopicArn>arn:aws:sns:eu-central-1:123456789012:orders.fifo</TopicArn></CreateTopicResult></CreateTopicResponse>',
			)
			.get('/?Action=DeleteTopic&TopicArn=arn:aws:sns:eu-central-1:123456789012:legacy-orders')
			.reply(200, '<DeleteTopicResponse></DeleteTopicResponse>')
			.get(
				'/?Action=Publish&TopicArn=arn:aws:sns:eu-central-1:123456789012:orders&Subject=Order%20created&Message=Order%2042%20is%20ready',
			)
			.reply(
				200,
				'<PublishResponse><PublishResult><MessageId>5f1c7c2e-0a7b-4b1c-9f4e-6d1f0b7a9e21</MessageId></PublishResult></PublishResponse>',
			);
	});

	new NodeTestHarness().setupTests({
		credentials,
		workflowFiles: ['requests.workflow.json'],
		customAssertions: () => expect(nock.isDone()).toBe(true),
	});
});
