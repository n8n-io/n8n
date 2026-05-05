import type { IHookFunctions, IDataObject } from 'n8n-workflow';

import { CalendlyTrigger } from '../CalendlyTrigger.node';

describe('CalendlyTrigger', () => {
	const webhookUrl = 'https://example.com/webhook/calendly';
	const organizationUri = 'https://api.calendly.com/organizations/ORGANIZATION_ID';
	const userUri = 'https://api.calendly.com/users/USER_ID';
	const webhookUri = 'https://api.calendly.com/webhook_subscriptions/WEBHOOK_ID';

	let trigger: CalendlyTrigger;
	let requestWithAuthentication: jest.Mock;
	let webhookData: IDataObject;
	let mockHookFunctions: jest.Mocked<IHookFunctions>;

	beforeEach(() => {
		trigger = new CalendlyTrigger();
		requestWithAuthentication = jest.fn();
		webhookData = {};

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
		});

		it('should return true when no webhook subscription is stored', async () => {
			const result = await trigger.webhookMethods.default.delete.call(mockHookFunctions);

			expect(result).toBe(true);
			expect(requestWithAuthentication).not.toHaveBeenCalled();
		});
	});
});
