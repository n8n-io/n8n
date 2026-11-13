import type { Request } from 'express';
import { mock, mockDeep } from 'jest-mock-extended';
import { returnJsonArray } from 'n8n-core';
import type {
	IDataObject,
	IHookFunctions,
	ILoadOptionsFunctions,
	INode,
	IRequestOptions,
	IWebhookFunctions,
} from 'n8n-workflow';
import * as GenericFunctions from '../GenericFunctions';

import { EventbriteTrigger } from '../EventbriteTrigger.node';

describe('EventbriteTrigger node', () => {
	describe('webhook', () => {
		const mockWebhookFunctions = mockDeep<IWebhookFunctions>();

		beforeEach(() => {
			jest.resetAllMocks();
			mockWebhookFunctions.getNode.mockReturnValue(mock<INode>());
			mockWebhookFunctions.helpers.returnJsonArray.mockImplementation(returnJsonArray);
		});

		it('should throw an error when the `api_url` is not provided', async () => {
			mockWebhookFunctions.getRequestObject.mockReturnValue({
				body: {
					api_url: undefined,
				},
			} as Request);
			const eventbriteTrigger = new EventbriteTrigger();

			await expect(eventbriteTrigger.webhook.call(mockWebhookFunctions)).rejects.toThrow(
				'The received data does not contain a valid Eventbrite API URL!',
			);
		});

		it('should throw an error when the `api_url` is not a valid Eventbrite API URL', async () => {
			mockWebhookFunctions.getRequestObject.mockReturnValue({
				body: {
					api_url: 'https://www.google.com',
				},
			} as Request);
			const eventbriteTrigger = new EventbriteTrigger();

			await expect(eventbriteTrigger.webhook.call(mockWebhookFunctions)).rejects.toThrow(
				'The received data does not contain a valid Eventbrite API URL!',
			);
		});

		it('should return data as is when the `resolveData` is false', async () => {
			mockWebhookFunctions.getRequestObject.mockReturnValue({
				body: {
					api_url: 'https://www.eventbriteapi.com/v3/events/1234567890',
					data: {
						foo: 'bar',
					},
				},
			} as Request);
			mockWebhookFunctions.getNodeParameter.mockImplementation((parameterName: string) => {
				switch (parameterName) {
					case 'resolveData':
						return false;
					default:
						return undefined;
				}
			});
			const eventbriteTrigger = new EventbriteTrigger();

			const result = await eventbriteTrigger.webhook.call(mockWebhookFunctions);
			expect(result.workflowData).toEqual([
				[
					{
						json: {
							api_url: 'https://www.eventbriteapi.com/v3/events/1234567890',
							data: {
								foo: 'bar',
							},
						},
					},
				],
			]);
		});

		it('should call the `api_url` and return the response when the `resolveData` is true', async () => {
			mockWebhookFunctions.getRequestObject.mockReturnValue({
				body: {
					api_url: 'https://www.eventbriteapi.com/v3/events/1234567890',
					data: {
						foo: 'bar',
					},
				},
			} as Request);
			mockWebhookFunctions.getNodeParameter.mockImplementation((parameterName: string) => {
				switch (parameterName) {
					case 'resolveData':
						return true;
					default:
						return undefined;
				}
			});
			const spy = jest.spyOn(GenericFunctions, 'eventbriteApiRequest');
			spy.mockResolvedValue({
				test: 123,
			});
			const eventbriteTrigger = new EventbriteTrigger();

			const result = await eventbriteTrigger.webhook.call(mockWebhookFunctions);
			expect(result.workflowData).toEqual([
				[
					{
						json: {
							test: 123,
						},
					},
				],
			]);
		});

		it.each([
			['https://www.eventbriteapi.com/v3/events/1234567890/', '/events/1234567890/'],
			['https://www.eventbriteapi.com/v3/orders/42/', '/orders/42/'],
			['https://www.eventbriteapi.com/v3/events/7/attendees/9/', '/events/7/attendees/9/'],
		])('should request only the object path of %s', async (apiUrl, expectedPath) => {
			mockWebhookFunctions.getRequestObject.mockReturnValue({
				body: { api_url: apiUrl },
			} as Request);
			mockWebhookFunctions.getNodeParameter.mockReturnValue(true);
			const spy = jest.spyOn(GenericFunctions, 'eventbriteApiRequest').mockResolvedValue({});

			await new EventbriteTrigger().webhook.call(mockWebhookFunctions);

			expect(spy).toHaveBeenCalledWith('GET', expect.objectContaining({ value: expectedPath }));
		});

		it.each([
			'https://www.eventbriteapi.com/v3/../v3/users/me/',
			'https://www.eventbriteapi.com/v3/%2e%2e/v3/users/me/',
			'https://www.eventbriteapi.com/v3/users/me/',
			'https://www.eventbriteapi.com/v3/events/1/../../users/me/',
			'https://www.eventbriteapi.com/v3/events/1/?expand=venue',
			'https://www.eventbriteapi.com/v3/orders/1/attendees/2/',
		])('should not send a request for %s', async (apiUrl) => {
			mockWebhookFunctions.getRequestObject.mockReturnValue({
				body: { api_url: apiUrl },
			} as Request);
			mockWebhookFunctions.getNodeParameter.mockReturnValue(true);
			const spy = jest.spyOn(GenericFunctions, 'eventbriteApiRequest').mockResolvedValue({});

			await expect(new EventbriteTrigger().webhook.call(mockWebhookFunctions)).rejects.toThrow(
				'The received data does not contain a valid Eventbrite API URL!',
			);
			expect(spy).not.toHaveBeenCalled();
		});
	});

	describe('requests', () => {
		const trigger = new EventbriteTrigger();
		const webhookUrl = 'https://n8n.example.com/webhook/abc';
		let staticData: IDataObject;
		let requests: Array<{ method?: string; url: string }>;
		let request: (options: IRequestOptions) => Promise<IDataObject>;

		const parameters: IDataObject = {
			authentication: 'privateKey',
			organization: '1234567890123',
			actions: ['order.placed'],
			event: 'all',
		};

		const getNodeParameter = (name: string) => parameters[name];

		afterEach(() => {
			parameters.organization = '1234567890123';
		});

		beforeEach(() => {
			jest.restoreAllMocks();
			staticData = {};
			requests = [];
			request = jest.fn(async (options: IRequestOptions) => {
				const url = new URL(String(options.uri));
				for (const [key, value] of Object.entries(options.qs ?? {})) {
					url.searchParams.append(key, String(value));
				}
				requests.push({ method: options.method, url: url.toString() });
				if (options.method === 'POST') return { id: '987654' };
				if (options.method === 'DELETE') return { success: true };
				return {
					webhooks: [{ id: '987654', endpoint_url: webhookUrl, actions: ['order.placed'] }],
					organizations: [{ id: '1234567890123', name: 'n8n' }],
					events: [{ id: '555666777', name: { text: 'Meetup' } }],
					pagination: { has_more_items: false },
				};
			});
		});

		const hookFunctions = () => {
			const functions = mock<IHookFunctions>({ helpers: { request } });
			jest.mocked(functions.getCredentials).mockResolvedValue({ apiKey: 'fake-api-key' });
			jest.mocked(functions.getWorkflowStaticData).mockReturnValue(staticData);
			jest.mocked(functions.getNodeWebhookUrl).mockReturnValue(webhookUrl);
			jest.mocked(functions.getNodeParameter).mockImplementation(getNodeParameter);
			return functions;
		};

		const loadOptionsFunctions = () => {
			const functions = mock<ILoadOptionsFunctions>({ helpers: { request } });
			jest.mocked(functions.getCredentials).mockResolvedValue({ apiKey: 'fake-api-key' });
			jest.mocked(functions.getNodeParameter).mockImplementation(getNodeParameter);
			jest.mocked(functions.getCurrentNodeParameter).mockImplementation(getNodeParameter);
			return functions;
		};

		it('should request the webhooks of the organization', async () => {
			const result = await trigger.webhookMethods.default.checkExists.call(hookFunctions());

			expect(result).toBe(true);
			expect(requests).toEqual([
				{
					method: 'GET',
					url: 'https://www.eventbriteapi.com/v3/organizations/1234567890123/webhooks/',
				},
			]);
		});

		it('should create a webhook for the organization', async () => {
			const result = await trigger.webhookMethods.default.create.call(hookFunctions());

			expect(result).toBe(true);
			expect(requests).toEqual([
				{
					method: 'POST',
					url: 'https://www.eventbriteapi.com/v3/organizations/1234567890123/webhooks/',
				},
			]);
		});

		it('should delete the webhook by ID', async () => {
			staticData.webhookId = '987654';

			const result = await trigger.webhookMethods.default.delete.call(hookFunctions());

			expect(result).toBe(true);
			expect(requests).toEqual([
				{ method: 'DELETE', url: 'https://www.eventbriteapi.com/v3/webhooks/987654/' },
			]);
		});

		it('should encode the organization ID in the request URL', async () => {
			parameters.organization = '123/users/me';

			await trigger.webhookMethods.default.checkExists.call(hookFunctions());

			expect(requests).toEqual([
				{
					method: 'GET',
					url: 'https://www.eventbriteapi.com/v3/organizations/123%2Fusers%2Fme/webhooks/',
				},
			]);
		});

		it('should reject an organization ID with a dot segment', async () => {
			parameters.organization = '123/../users/me';

			await expect(
				trigger.webhookMethods.default.checkExists.call(hookFunctions()),
			).rejects.toThrow('Invalid identifier');

			expect(requests).toEqual([]);
		});

		it('should load the organizations', async () => {
			await trigger.methods.loadOptions.getOrganizations.call(loadOptionsFunctions());

			expect(requests).toEqual([
				{ method: 'GET', url: 'https://www.eventbriteapi.com/v3/users/me/organizations' },
			]);
		});

		it('should load the events of the organization', async () => {
			await trigger.methods.loadOptions.getEvents.call(loadOptionsFunctions());

			expect(requests).toEqual([
				{
					method: 'GET',
					url: 'https://www.eventbriteapi.com/v3/organizations/1234567890123/events',
				},
			]);
		});
	});
});
