import { randomBytes } from 'crypto';

import type { IHookFunctions, IDataObject, IWebhookFunctions } from 'n8n-workflow';

import { CalendlyTrigger } from '../CalendlyTrigger.node';
import { verifySignature } from '../CalendlyTriggerHelpers';

jest.mock('../CalendlyTriggerHelpers');
jest.mock('crypto', () => ({
	...jest.requireActual('crypto'),
	randomBytes: jest.fn(),
}));

describe('CalendlyTrigger', () => {
	const webhookUrl = 'https://example.com/webhook/calendly';
	const organizationUri = 'https://api.calendly.com/organizations/ORGANIZATION_ID';
	const userUri = 'https://api.calendly.com/users/USER_ID';
	const webhookUri = 'https://api.calendly.com/webhook_subscriptions/WEBHOOK_ID';
	const webhookSecret = 'a'.repeat(64);

	let trigger: CalendlyTrigger;
	let requestWithAuthentication: jest.Mock;
	let webhookData: IDataObject;
	let mockHookFunctions: jest.Mocked<IHookFunctions>;

	beforeEach(() => {
		jest.clearAllMocks();

		trigger = new CalendlyTrigger();
		requestWithAuthentication = jest.fn();
		webhookData = {};

		(randomBytes as jest.Mock).mockReturnValue({
			toString: jest.fn().mockReturnValue(webhookSecret),
		});

		mockHookFunctions = {
			getNode: jest.fn().mockReturnValue({ name: 'Calendly Trigger', type: 'calendlyTrigger' }),
			getNodeWebhookUrl: jest.fn().mockReturnValue(webhookUrl),
			getNodeParameter: jest.fn((name: string) => {
				if (name === 'authentication') return 'apiKey';
				if (name === 'events') return ['invitee.created'];
				if (name === 'scope') return 'user';
				return undefined;
			}),
			getWorkflowStaticData: jest.fn().mockReturnValue(webhookData),
			helpers: {
				requestWithAuthentication,
			},
		} as unknown as jest.Mocked<IHookFunctions>;

		requestWithAuthentication.mockImplementation(async (_credentialsType, requestOptions) => {
			if (requestOptions.uri === 'https://api.calendly.com/users/me') {
				return {
					resource: {
						uri: userUri,
						current_organization: organizationUri,
					},
				};
			}

			if (
				requestOptions.method === 'POST' &&
				requestOptions.uri === 'https://api.calendly.com/webhook_subscriptions'
			) {
				return {
					resource: {
						uri: webhookUri,
					},
				};
			}

			if (
				requestOptions.method === 'GET' &&
				requestOptions.uri === 'https://api.calendly.com/webhook_subscriptions'
			) {
				return { collection: [] };
			}

			return {};
		});
	});

	describe('webhookMethods.default.create', () => {
		it('should create a user-scoped webhook subscription', async () => {
			const result = await trigger.webhookMethods.default.create.call(mockHookFunctions);

			expect(result).toBe(true);
			expect(webhookData.webhookURI).toBe(webhookUri);
			expect(webhookData.webhookSecret).toBe(webhookSecret);
			expect(requestWithAuthentication).toHaveBeenLastCalledWith(
				'calendlyApi',
				expect.objectContaining({
					method: 'POST',
					uri: 'https://api.calendly.com/webhook_subscriptions',
					body: {
						url: webhookUrl,
						events: ['invitee.created'],
						organization: organizationUri,
						scope: 'user',
						signing_key: webhookSecret,
						user: userUri,
					},
				}),
			);
		});

		it('should create an organization-scoped webhook subscription', async () => {
			mockHookFunctions.getNodeParameter.mockImplementation((name: string) => {
				if (name === 'authentication') return 'apiKey';
				if (name === 'events') return ['invitee.created', 'invitee.canceled'];
				if (name === 'scope') return 'organization';
				return undefined;
			});

			const result = await trigger.webhookMethods.default.create.call(mockHookFunctions);

			expect(result).toBe(true);
			expect(webhookData.webhookSecret).toBe(webhookSecret);
			expect(requestWithAuthentication).toHaveBeenLastCalledWith(
				'calendlyApi',
				expect.objectContaining({
					method: 'POST',
					uri: 'https://api.calendly.com/webhook_subscriptions',
					body: {
						url: webhookUrl,
						events: ['invitee.created', 'invitee.canceled'],
						organization: organizationUri,
						scope: 'organization',
						signing_key: webhookSecret,
					},
				}),
			);
		});

		it('should reject non-HTTPS webhook URLs before calling Calendly', async () => {
			mockHookFunctions.getNodeWebhookUrl.mockReturnValue('http://localhost:5678/webhook/test');

			await expect(trigger.webhookMethods.default.create.call(mockHookFunctions)).rejects.toThrow(
				'Calendly requires a public HTTPS webhook URL',
			);
			expect(requestWithAuthentication).not.toHaveBeenCalled();
		});
	});

	describe('webhookMethods.default.checkExists', () => {
		it('should return true when matching webhook subscription exists', async () => {
			requestWithAuthentication.mockImplementation(async (_credentialsType, requestOptions) => {
				if (requestOptions.uri === 'https://api.calendly.com/users/me') {
					return {
						resource: {
							uri: userUri,
							current_organization: organizationUri,
						},
					};
				}

				return {
					collection: [
						{
							callback_url: webhookUrl,
							events: ['invitee.created'],
							uri: webhookUri,
						},
					],
				};
			});

			const result = await trigger.webhookMethods.default.checkExists.call(mockHookFunctions);

			expect(result).toBe(true);
			expect(webhookData.webhookURI).toBe(webhookUri);
			expect(requestWithAuthentication).toHaveBeenLastCalledWith(
				'calendlyApi',
				expect.objectContaining({
					method: 'GET',
					uri: 'https://api.calendly.com/webhook_subscriptions',
					qs: {
						scope: 'user',
						organization: organizationUri,
						user: userUri,
					},
				}),
			);
		});

		it('should return false when webhook subscription events do not match', async () => {
			requestWithAuthentication.mockImplementation(async (_credentialsType, requestOptions) => {
				if (requestOptions.uri === 'https://api.calendly.com/users/me') {
					return {
						resource: {
							uri: userUri,
							current_organization: organizationUri,
						},
					};
				}

				return {
					collection: [
						{
							callback_url: webhookUrl,
							events: ['invitee.canceled'],
							uri: webhookUri,
						},
					],
				};
			});

			const result = await trigger.webhookMethods.default.checkExists.call(mockHookFunctions);

			expect(result).toBe(false);
			expect(webhookData.webhookURI).toBeUndefined();
		});
	});

	describe('webhookMethods.default.delete', () => {
		it('should delete webhook subscription by stored URI', async () => {
			webhookData.webhookURI = webhookUri;
			webhookData.webhookSecret = webhookSecret;

			const result = await trigger.webhookMethods.default.delete.call(mockHookFunctions);

			expect(result).toBe(true);
			expect(requestWithAuthentication).toHaveBeenCalledWith(
				'calendlyApi',
				expect.objectContaining({
					method: 'DELETE',
					uri: webhookUri,
				}),
			);
			expect(webhookData.webhookURI).toBeUndefined();
			expect(webhookData.webhookSecret).toBeUndefined();
		});

		it('should return true when no webhook subscription is stored', async () => {
			const result = await trigger.webhookMethods.default.delete.call(mockHookFunctions);

			expect(result).toBe(true);
			expect(requestWithAuthentication).not.toHaveBeenCalled();
		});
	});

	describe('webhook', () => {
		it('should return 401 when signature verification fails', async () => {
			const mockRes = {
				status: jest.fn().mockReturnThis(),
				send: jest.fn().mockReturnThis(),
				end: jest.fn(),
			};
			(verifySignature as jest.Mock).mockReturnValue(false);

			const mockFn = {
				getResponseObject: jest.fn().mockReturnValue(mockRes),
			} as unknown as IWebhookFunctions;

			const result = await trigger.webhook.call(mockFn);

			expect(result).toEqual({ noWebhookResponse: true });
			expect(mockRes.status).toHaveBeenCalledWith(401);
		});

		it('should process the webhook when signature is valid', async () => {
			const bodyData = { event: 'invitee.created', payload: { foo: 'bar' } };
			(verifySignature as jest.Mock).mockReturnValue(true);

			const mockFn = {
				getBodyData: jest.fn().mockReturnValue(bodyData),
				helpers: { returnJsonArray: jest.fn((data) => data) },
			} as unknown as IWebhookFunctions;

			const result = await trigger.webhook.call(mockFn);

			expect(result).toEqual({ workflowData: [bodyData] });
		});
	});
});
