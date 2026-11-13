import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

import { credentials } from '../../__tests__/credentials';

const sendMessageResponse = (messageId: string) =>
	`<SendMessageResponse><SendMessageResult><MessageId>${messageId}</MessageId></SendMessageResult></SendMessageResponse>`;

describe('AWS SQS > Workflows', () => {
	beforeAll(() => {
		nock('https://sqs.eu-central-1.amazonaws.com')
			.get(
				'/123456789012/orders?Version=2012-11-05&Action=SendMessage&MessageBody=Order%2042%20is%20ready&DelaySeconds=10',
			)
			.reply(200, sendMessageResponse('msg-delayed'))
			.get(
				'/123456789012/orders.fifo?Version=2012-11-05&Action=SendMessage&MessageBody=Order%2043%20is%20ready&MessageGroupId=orders',
			)
			.reply(200, sendMessageResponse('msg-fifo'));
	});

	new NodeTestHarness().setupTests({
		credentials,
		workflowFiles: ['requests.workflow.json'],
		customAssertions: () => expect(nock.isDone()).toBe(true),
	});
});
