import { createHmac } from 'crypto';
import type {
	IDataObject,
	IHookFunctions,
	INode,
	INodeTypeBaseDescription,
	IWebhookFunctions,
	JsonObject,
} from 'n8n-workflow';

import { CalendlyApi } from '../../../credentials/CalendlyApi.credentials';
import { CalendlyTrigger as CalendlyTriggerV1 } from '../v1/CalendlyTriggerV1.node';
import { CalendlyTriggerV2 } from '../v2/CalendlyTriggerV2.node';

const baseDescription: INodeTypeBaseDescription = {
	displayName: 'Calendly Trigger',
	name: 'calendlyTrigger',
	icon: 'file:calendly.svg',
	group: ['trigger'],
	description: 'Starts the workflow when Calendly events occur',
	defaultVersion: 2,
};

describe('Calendly Trigger - Version 1', () => {
	const trigger = new CalendlyTriggerV1(baseDescription);

	afterEach(() => {
		jest.restoreAllMocks();
	});

	it('should use legacy calendly.com/api/v1 endpoint and expect legacy X-TOKEN logic when using old API keys', async () => {
		const requestMock = jest.fn().mockResolvedValue({
			data: [
				{
					attributes: { url: 'https://n8n.webhook.url/webhook', events: ['invitee.created'] },
					id: 'old-hook-id',
				},
			],
		});

		const mockHookFunctions = {
			getNodeWebhookUrl: () => 'https://n8n.webhook.url/webhook',
			getWorkflowStaticData: () => ({}),
			getNodeParameter: (name: string) => {
				if (name === 'events') return ['invitee.created'];
				return 'apiKey';
			},
			getCredentials: jest.fn().mockResolvedValue({ apiKey: 'legacy-key-without-dots' }),
			getNode: () => ({ name: 'Calendly Trigger' }) as unknown as INode,
			helpers: {
				requestWithAuthentication: requestMock,
			},
		} as unknown as IHookFunctions;

		await trigger.webhookMethods.default.checkExists.call(mockHookFunctions);

		expect(requestMock).toHaveBeenCalledWith(
			'calendlyApi',
			expect.objectContaining({
				uri: 'https://calendly.com/api/v1/hooks',
				method: 'GET',
			}),
		);
	});
});

describe('Calendly Trigger - Version 2', () => {
	const calendlyWebhookSignatureHeader = 'calendly-webhook-signature';
	const trigger = new CalendlyTriggerV2(baseDescription);
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

	describe('Authentication (PAT Fix)', () => {
		it('should set Authorization: Bearer for V2 API requests', async () => {
			const credential = new CalendlyApi();
			const result = await credential.authenticate(
				{ accessToken: 'my-pat', apiKey: '' },
				{ url: 'https://api.calendly.com/users/me', headers: {} },
			);
			expect(result.headers).toMatchObject({ ['Authorization']: 'Bearer my-pat' });
		});

		it('should fall back to apiKey when accessToken is absent', async () => {
			const credential = new CalendlyApi();
			const result = await credential.authenticate(
				{ accessToken: '', apiKey: 'legacy-key' },
				{ url: 'https://calendly.com/api/v1/hooks', headers: {} },
			);
			expect(result.headers).toMatchObject({ ['X-TOKEN']: 'legacy-key' });
		});

		it('should use the V2 base URL for credential test', () => {
			const credential = new CalendlyApi();
			expect(credential.test?.request?.baseURL).toBe('https://api.calendly.com');
		});

		it('should strictly use https://api.calendly.com base URL', async () => {
			const requestMock = jest.fn().mockResolvedValue({
				collection: [],
			});

			const mockHookFunctions = {
				getNodeWebhookUrl: () => 'https://n8n.webhook.url/webhook',
				getWorkflowStaticData: () => ({}),
				getNodeParameter: (name: string) => {
					if (name === 'scope') return 'organization';
					if (name === 'events') return ['invitee.created'];
					return 'apiKey';
				},
				getCredentials: jest.fn().mockResolvedValue({ apiKey: 'some.valid.jwt' }),
				getNode: () => ({ name: 'Calendly Trigger' }) as unknown as INode,
				helpers: {
					requestWithAuthentication: requestMock,
				},
			} as unknown as IHookFunctions;

			await trigger.webhookMethods.default.checkExists.call(mockHookFunctions).catch(() => {});

			expect(requestMock).toHaveBeenCalledWith(
				'calendlyApi',
				expect.objectContaining({
					uri: 'https://api.calendly.com/users/me',
					method: 'GET',
				}),
			);
		});
	});

	describe('Identity & Scopes', () => {
		it('should hit /users/me to resolve identity and use URIs in webhook payload', async () => {
			const mockUserUri = 'https://api.calendly.com/users/123';
			const mockOrgUri = 'https://api.calendly.com/orgs/456';

			const requestMock = jest.fn().mockImplementation(async (_authType, options) => {
				if (options.uri === 'https://api.calendly.com/users/me') {
					return {
						resource: {
							uri: mockUserUri,
							current_organization: mockOrgUri,
						},
					};
				}
				if (options.uri === 'https://api.calendly.com/webhook_subscriptions') {
					return { resource: { uri: 'new-webhook-uri' } };
				}
				return { collection: [] };
			});

			const staticData: IDataObject = {};
			const mockHookFunctions = {
				getNodeWebhookUrl: () => 'https://n8n.webhook.url/webhook',
				getWorkflowStaticData: () => staticData,
				getNodeParameter: (name: string) => {
					if (name === 'scope') return 'organization';
					if (name === 'events') return ['invitee.created'];
					return 'apiKey';
				},
				getCredentials: jest.fn().mockResolvedValue({ webhookSigningKey }),
				getNode: () => ({ name: 'Calendly Trigger' }) as unknown as INode,
				helpers: {
					requestWithAuthentication: requestMock,
				},
			} as unknown as IHookFunctions;

			await trigger.webhookMethods.default.create.call(mockHookFunctions);

			expect(requestMock).toHaveBeenCalledWith(
				'calendlyApi',
				expect.objectContaining({
					uri: 'https://api.calendly.com/users/me',
				}),
			);

			expect(requestMock).toHaveBeenCalledWith(
				'calendlyApi',
				expect.objectContaining({
					method: 'POST',
					uri: 'https://api.calendly.com/webhook_subscriptions',
					body: {
						url: 'https://n8n.webhook.url/webhook',
						events: ['invitee.created'],
						organization: mockOrgUri,
						scope: 'organization',
						signing_key: webhookSigningKey,
					},
				}),
			);

			expect(staticData.userUri).toBe(mockUserUri);
			expect(staticData.organizationUri).toBe(mockOrgUri);
		});

		it('should throw hinting about user:read scope on 403 Forbidden', async () => {
			const requestMock = jest.fn().mockRejectedValue({
				response: { status: 403 },
				httpCode: '403',
				status: 403,
			});

			const mockHookFunctions = {
				getNodeWebhookUrl: () => 'https://n8n.webhook.url/webhook',
				getWorkflowStaticData: () => ({}),
				getNodeParameter: (name: string) => {
					if (name === 'scope') return 'organization';
					if (name === 'events') return ['invitee.created'];
					return 'apiKey';
				},
				getCredentials: jest.fn().mockResolvedValue({ webhookSigningKey }),
				getNode: () => ({ name: 'Calendly Trigger' }) as unknown as INode,
				helpers: {
					requestWithAuthentication: requestMock,
				},
			} as unknown as IHookFunctions;

			await expect(
				trigger.webhookMethods.default.create.call(mockHookFunctions),
			).rejects.toMatchObject({
				message: 'Calendly credentials need the "user:read" scope to register webhooks.',
			});
		});
	});

	describe('Signature Verification', () => {
		it('should return body data when signature is valid', async () => {
			const t = Math.floor(Date.now() / 1000).toString();
			const v1 = generateSignature(t, testBody, webhookSigningKey);

			const mockWebhookFunctions = {
				getBodyData: () => testBody,
				getHeaderData: () => ({
					[calendlyWebhookSignatureHeader]: `t=${t},v1=${v1}`,
				}),
				getNodeParameter: () => 'apiKey',
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

			const staleT = '1600000000';
			const v1 = generateSignature(staleT, testBody, webhookSigningKey);

			const mockWebhookFunctions = {
				getBodyData: () => testBody,
				getHeaderData: () => ({
					[calendlyWebhookSignatureHeader]: `t=${staleT},v1=${v1}`,
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
			const invalidV1 = 'a'.repeat(64);

			const mockWebhookFunctions = {
				getBodyData: () => testBody,
				getHeaderData: () => ({
					[calendlyWebhookSignatureHeader]: `t=${t},v1=${invalidV1}`,
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

		it('should throw NodeApiError if rawBody is missing while verifying a signature', async () => {
			const t = Math.floor(Date.now() / 1000).toString();
			const v1 = generateSignature(t, testBody, webhookSigningKey);

			const mockWebhookFunctions = {
				getBodyData: () => testBody,
				getHeaderData: () => ({
					[calendlyWebhookSignatureHeader]: `t=${t},v1=${v1}`,
				}),
				getNodeParameter: () => 'apiKey',
				getCredentials: jest.fn().mockResolvedValue({ webhookSigningKey }),
				getRequestObject: () => ({}),
				getNode: () => ({ name: 'Calendly Trigger' }) as unknown as INode,
			} as unknown as IWebhookFunctions;

			await expect(trigger.webhook.call(mockWebhookFunctions)).rejects.toMatchObject({
				description: 'Missing raw request body for Calendly webhook signature verification.',
				httpCode: '401',
			} as JsonObject);
		});

		it('should pass through when no webhookSigningKey is configured', async () => {
			const mockWebhookFunctions = {
				getBodyData: () => testBody,
				getHeaderData: () => ({}),
				getNodeParameter: () => 'apiKey',
				getCredentials: jest.fn().mockResolvedValue({}),
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
});
