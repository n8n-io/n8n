import type { IWebhookFunctions } from 'n8n-workflow';

import { AwsSnsTrigger } from '../AwsSnsTrigger.node';
import { verifySignature } from '../AwsSnsTriggerHelpers';
import { awsApiRequestSOAP } from '../GenericFunctions';
import type { Mock } from 'vitest';

vi.mock('../AwsSnsTriggerHelpers', () => ({
	verifySignature: vi.fn(),
}));

vi.mock('../GenericFunctions', () => ({
	awsApiRequestSOAP: vi.fn(),
}));

const topicArn = 'arn:aws:sns:us-east-1:123456789012:MyTopic';

describe('AwsSnsTrigger', () => {
	const notification = {
		Type: 'Notification',
		Message: 'Hello world!',
		MessageId: '22b80b92-fdea-4c2c-8f9d-bdfb0c7bf324',
		TopicArn: topicArn,
		Timestamp: '2012-05-02T00:54:06.655Z',
		SignatureVersion: '2',
		Signature: 'c2lnbmF0dXJl',
		SigningCertURL:
			'https://sns.us-east-1.amazonaws.com/SimpleNotificationService-1234567890abcdef1234567890abcdef.pem',
	};

	const verifySignatureMock = verifySignature as Mock;
	const awsApiRequestSOAPMock = awsApiRequestSOAP as Mock;

	beforeEach(() => {
		vi.clearAllMocks();
		verifySignatureMock.mockResolvedValue(true);
		awsApiRequestSOAPMock.mockResolvedValue({});
	});

	it('triggers the workflow for a valid notification', async () => {
		const node = new AwsSnsTrigger();
		const { webhookFunctions, returnJsonArray } = createWebhookFunctions(notification);

		const result = await node.webhook.call(webhookFunctions);

		expect(verifySignatureMock).toHaveBeenCalledWith(notification, topicArn);
		expect(returnJsonArray).toHaveBeenCalledWith(notification);
		expect(result).toEqual({ workflowData: [[{ json: notification }]] });
	});

	it('rejects requests with an invalid signature', async () => {
		verifySignatureMock.mockResolvedValue(false);
		const node = new AwsSnsTrigger();
		const { webhookFunctions, response, returnJsonArray } = createWebhookFunctions(notification);

		const result = await node.webhook.call(webhookFunctions);

		expect(response.status).toHaveBeenCalledWith(401);
		expect(response.send).toHaveBeenCalledWith('Unauthorized');
		expect(response.end).toHaveBeenCalled();
		expect(returnJsonArray).not.toHaveBeenCalled();
		expect(result).toEqual({ noWebhookResponse: true });
	});

	it('confirms the subscription after validating the request signature', async () => {
		const subscriptionConfirmation = {
			...notification,
			Type: 'SubscriptionConfirmation',
			Token: 'token',
		};
		const node = new AwsSnsTrigger();
		const { webhookFunctions } = createWebhookFunctions(subscriptionConfirmation);

		const result = await node.webhook.call(webhookFunctions);

		expect(verifySignatureMock).toHaveBeenCalledWith(subscriptionConfirmation, topicArn);
		expect(awsApiRequestSOAPMock.mock.contexts[0]).toBe(webhookFunctions);
		expect(awsApiRequestSOAPMock).toHaveBeenCalledWith(
			'sns',
			'GET',
			'/?Action=ConfirmSubscription&TopicArn=arn:aws:sns:us-east-1:123456789012:MyTopic&Token=token&Version=2010-03-31',
		);
		expect(result).toEqual({ noWebhookResponse: true });
	});

	it('does not process unsubscribe confirmations until the signature is valid', async () => {
		const unsubscribeConfirmation = {
			...notification,
			Type: 'UnsubscribeConfirmation',
			Token: 'token',
		};
		const node = new AwsSnsTrigger();
		const { webhookFunctions, response } = createWebhookFunctions(unsubscribeConfirmation);

		verifySignatureMock.mockResolvedValue(false);

		const result = await node.webhook.call(webhookFunctions);

		expect(response.status).toHaveBeenCalledWith(401);
		expect(result).toEqual({ noWebhookResponse: true });
	});
});

function createWebhookFunctions(body: object) {
	const response = {
		status: vi.fn().mockReturnThis(),
		send: vi.fn().mockReturnThis(),
		end: vi.fn(),
	};
	const returnJsonArray = vi.fn((data) => [{ json: data }]);
	const webhookFunctions = {
		getRequestObject: vi.fn().mockReturnValue({
			rawBody: Buffer.from(JSON.stringify(body)),
		}),
		getNodeParameter: vi.fn().mockReturnValue(topicArn),
		getResponseObject: vi.fn().mockReturnValue(response),
		helpers: {
			returnJsonArray,
		},
	} as unknown as IWebhookFunctions;

	return { webhookFunctions, response, returnJsonArray };
}
