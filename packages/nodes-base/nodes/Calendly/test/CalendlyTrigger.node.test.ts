import { createHmac } from 'crypto';
import type { IWebhookFunctions, JsonObject, IDataObject, INode } from 'n8n-workflow';

import { CalendlyTrigger } from '../CalendlyTrigger.node';

describe('CalendlyTrigger', () => {
	const trigger = new CalendlyTrigger();
	const webhookSigningKey = 'test-secret-key';
	const testBody = { event: 'invitee.created', payload: { name: 'Alice' } };
	const rawBody = Buffer.from(JSON.stringify(testBody));

	function generateSignature(t: string, bodyObj: IDataObject, secret: string): string {
		const payload = `${t}.${JSON.stringify(bodyObj)}`;
		return createHmac('sha256', secret).update(payload).digest('hex');
	}

	afterEach(() => {
		jest.restoreAllMocks();
	});

	it('should return body data when signature is valid', async () => {
		const t = Math.floor(Date.now() / 1000).toString();
		const v1 = generateSignature(t, testBody, webhookSigningKey);

		const mockWebhookFunctions = {
			getBodyData: () => testBody,
			getHeaderData: () => ({
				'calendly-webhook-signature': `t=${t},v1=${v1}`,
			}),
			getNodeParameter: () => 'apiKey', // Simulate auth method select
			getCredentials: jest.fn().mockResolvedValue({ webhookSigningKey }),
			getRequestObject: () => ({ rawBody }),
			getNode: () => ({ name: 'Calendly Trigger' }) as unknown as INode,
			helpers: {
				returnJsonArray: (data: unknown) => [data] as unknown as IDataObject[],
			},
		} as unknown as IWebhookFunctions;

		const result = await trigger.webhook.call(mockWebhookFunctions);

		expect(result).toEqual({ workflowData: [[testBody]] });
	});

	it('should throw NodeApiError for replay attack (timestamp older than 5 mins)', async () => {
		const fixedTimeMs = 1700000000000;
		jest.spyOn(Date, 'now').mockReturnValue(fixedTimeMs);

		// Extremely old timestamp compared to the mock time
		const staleT = '1600000000';
		const v1 = generateSignature(staleT, testBody, webhookSigningKey);

		const mockWebhookFunctions = {
			getBodyData: () => testBody,
			getHeaderData: () => ({
				'calendly-webhook-signature': `t=${staleT},v1=${v1}`,
			}),
			getNodeParameter: () => 'apiKey',
			getCredentials: jest.fn().mockResolvedValue({ webhookSigningKey }),
			getRequestObject: () => ({ rawBody }),
			getNode: () => ({ name: 'Calendly Trigger' }) as unknown as INode,
		} as unknown as IWebhookFunctions;

		await expect(trigger.webhook.call(mockWebhookFunctions)).rejects.toMatchObject({
			description: 'Webhook timestamp is too old \u2014 possible replay attack',
			httpCode: '401',
		} as JsonObject);
	});

	it('should throw NodeApiError for signature mismatch', async () => {
		const t = Math.floor(Date.now() / 1000).toString();
		// Valid length (64 characters) but wrong hash
		const invalidV1 = 'a'.repeat(64);

		const mockWebhookFunctions = {
			getBodyData: () => testBody,
			getHeaderData: () => ({
				'calendly-webhook-signature': `t=${t},v1=${invalidV1}`,
			}),
			getNodeParameter: () => 'apiKey',
			getCredentials: jest.fn().mockResolvedValue({ webhookSigningKey }),
			getRequestObject: () => ({ rawBody }),
			getNode: () => ({ name: 'Calendly Trigger' }) as unknown as INode,
		} as unknown as IWebhookFunctions;

		await expect(trigger.webhook.call(mockWebhookFunctions)).rejects.toMatchObject({
			description: 'Calendly Webhook Signature Mismatch - Please check your Signing Key.',
			httpCode: '401',
		} as JsonObject);
	});

	it('should throw NodeApiError if no calendly-webhook-signature header is provided', async () => {
		const mockWebhookFunctions = {
			getBodyData: () => testBody,
			getHeaderData: () => ({}),
			getNodeParameter: () => 'apiKey',
			getCredentials: jest.fn().mockResolvedValue({ webhookSigningKey }),
			getRequestObject: () => ({ rawBody }),
			getNode: () => ({ name: 'Calendly Trigger' }) as unknown as INode,
		} as unknown as IWebhookFunctions;

		await expect(trigger.webhook.call(mockWebhookFunctions)).rejects.toMatchObject({
			description: 'Missing Calendly-Webhook-Signature header',
			httpCode: '401',
		} as JsonObject);
	});

	it('should pass through when no webhookSigningKey is configured', async () => {
		const mockWebhookFunctions = {
			getBodyData: () => testBody,
			getHeaderData: () => ({}), // Should not fail since no keys are checked
			getNodeParameter: () => 'apiKey',
			getCredentials: jest.fn().mockResolvedValue({}), // No signing key configured
			getRequestObject: () => ({ rawBody }),
			getNode: () => ({ name: 'Calendly Trigger' }) as unknown as INode,
			helpers: {
				returnJsonArray: (data: unknown) => [data] as unknown as IDataObject[],
			},
		} as unknown as IWebhookFunctions;

		const result = await trigger.webhook.call(mockWebhookFunctions);

		expect(result).toEqual({ workflowData: [[testBody]] });
	});
});
