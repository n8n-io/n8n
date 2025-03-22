import { testWebhookTriggerNode } from '@test/nodes/TriggerHelpers';
import { FacebookTrigger } from './FacebookTrigger.node';
import type { IDataObject } from 'n8n-workflow';
import { returnJsonArray } from 'n8n-core';

describe('FacebookTrigger', () => {
	beforeAll(() => {
		jest.resetAllMocks();
	});

	it('should validate webhook setup request', async () => {
		const verifyToken = 'test-verify-token';
		const challenge = 'test-challenge';

		const { responseData } = await testWebhookTriggerNode(FacebookTrigger, {
			webhookName: 'setup',
			node: {
				parameters: {
					appId: '123456789',
					object: 'page',
					verifyToken,
				},
			},
			request: {
				query: {
					'hub.mode': 'subscribe',
					'hub.verify_token': verifyToken,
					'hub.challenge': challenge,
				},
			},
			credential: {
				facebookGraphAppApi: {
					appSecret: 'appSecret',
					accessToken: 'accessToken',
				},
			},
		});

		expect(responseData).toEqual({
			noWebhookResponse: true,
		});
	});

	it("should process webhook page's message events", async () => {
		const mockEvent: IDataObject = {
			object: 'page',
			entry: [
				{
					id: '123456789',
					time: 1625097600,
					changes: [
						{
							field: 'feed',
							value: {
								post_id: '123_456',
								message: 'Test post',
							},
						},
					],
				},
			],
		};

		const { responseData } = await testWebhookTriggerNode(FacebookTrigger, {
			webhookName: 'default',
			node: {
				parameters: {
					appId: '123456789',
					object: 'page',
				},
			},
			bodyData: mockEvent,
			credential: {
				facebookGraphAppApi: {
					appSecret: '',
				},
			},
		});

		expect(responseData?.workflowData).toEqual([returnJsonArray(mockEvent.entry as IDataObject)]);
	});
});
