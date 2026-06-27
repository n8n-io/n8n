import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

describe('AWS SQS Workflow Tests', () => {
	const credentials = {
		aws: {
			region: 'us-east-1',
			accessKeyId: 'test-access-key',
			secretAccessKey: 'test-secret-key',
		},
	};

	const baseUrl = 'https://sqs.us-east-1.amazonaws.com';
	const queuePath = '/123456789012/my-queue';

	describe('Send Message', () => {
		beforeAll(() => {
			nock(baseUrl)
				.get(new RegExp(`${queuePath}\\?.*Action=SendMessage`))
				.reply(
					200,
					`
					<SendMessageResponse>
						<SendMessageResult>
							<MessageId>msg-12345</MessageId>
							<MD5OfMessageBody>d41d8cd98f00b204e9800998ecf8427e</MD5OfMessageBody>
						</SendMessageResult>
					</SendMessageResponse>
				`,
				);
		});

		new NodeTestHarness().setupTests({
			credentials,
			workflowFiles: ['send-message.workflow.json'],
		});
	});

	describe('Delete Message', () => {
		beforeAll(() => {
			nock(baseUrl)
				.get(new RegExp(`${queuePath}\\?.*Action=DeleteMessage`))
				.reply(
					200,
					`
					<DeleteMessageResponse>
						<ResponseMetadata>
							<RequestId>req-delete-123</RequestId>
						</ResponseMetadata>
					</DeleteMessageResponse>
				`,
				);
		});

		new NodeTestHarness().setupTests({
			credentials,
			workflowFiles: ['delete-message.workflow.json'],
		});
	});

	describe('Purge Queue', () => {
		beforeAll(() => {
			nock(baseUrl)
				.get(new RegExp(`${queuePath}\\?.*Action=PurgeQueue`))
				.reply(
					200,
					`
					<PurgeQueueResponse>
						<ResponseMetadata>
							<RequestId>req-purge-456</RequestId>
						</ResponseMetadata>
					</PurgeQueueResponse>
				`,
				);
		});

		new NodeTestHarness().setupTests({
			credentials,
			workflowFiles: ['purge-queue.workflow.json'],
		});
	});
});
