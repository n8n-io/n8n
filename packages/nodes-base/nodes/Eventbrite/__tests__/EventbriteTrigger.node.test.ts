import type { Request } from 'express';
import { mock, mockDeep } from 'jest-mock-extended';
import { returnJsonArray } from 'n8n-core';
import type { INode, IWebhookFunctions } from 'n8n-workflow';
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
	});
});
