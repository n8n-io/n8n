/**
 * TEMPLATE: Trigger Node Test
 *
 * Tests for trigger nodes (webhook, polling, event-based).
 * Uses TriggerHelpers from the test utilities for standardized trigger testing.
 * Also shows manual mock approach for more control.
 *
 * Replace all occurrences of:
 *   - __ServiceName__     → Your service class name (PascalCase)
 *   - __serviceName__     → Your service internal name (camelCase)
 *   - __serviceNameApi__  → Your credential name (camelCase)
 */
import nock from 'nock';
import { mock } from 'jest-mock-extended';
import type { IDataObject, ICredentialDataDecryptedObject } from 'n8n-workflow';

import {
	testTriggerNode,
	testWebhookTriggerNode,
	testPollingTriggerNode,
} from '@test/nodes/TriggerHelpers';

import { __ServiceName__Trigger } from '../__ServiceName__Trigger.node';

// ================================================================
// OPTION A: Webhook Trigger Tests (uses webhookMethods + webhook())
// ================================================================
describe('__ServiceName__ Webhook Trigger', () => {
	const defaultCredentials: ICredentialDataDecryptedObject = {
		apiKey: 'test-api-key',
		baseUrl: 'https://api.example.com',
	};

	afterEach(() => {
		nock.cleanAll();
	});

	describe('webhook()', () => {
		it('should process a standard webhook payload', async () => {
			const { responseData } = await testWebhookTriggerNode(
				__ServiceName__Trigger,
				{
					bodyData: {
						event: 'item.created',
						data: { id: '123', name: 'New Item' },
					},
					node: {
						parameters: {
							event: 'itemCreated',
						},
					},
					credential: defaultCredentials,
				},
			);

			expect(responseData).toBeDefined();
			expect(responseData?.workflowData).toBeDefined();
		});

		it('should handle challenge verification requests', async () => {
			const { responseData, response } = await testWebhookTriggerNode(
				__ServiceName__Trigger,
				{
					request: {
						query: { challenge: 'test-challenge-token' },
					},
					node: {
						parameters: {
							event: 'itemCreated',
						},
					},
					credential: defaultCredentials,
				},
			);

			expect(responseData?.noWebhookResponse).toBe(true);
		});

		it('should handle array of events in single payload', async () => {
			const { responseData } = await testWebhookTriggerNode(
				__ServiceName__Trigger,
				{
					bodyData: {
						events: [
							{ id: '1', type: 'item.created' },
							{ id: '2', type: 'item.created' },
						],
					},
					node: {
						parameters: {
							event: 'itemCreated',
						},
					},
					credential: defaultCredentials,
				},
			);

			expect(responseData?.workflowData?.[0]).toHaveLength(2);
		});
	});
});

// ================================================================
// OPTION B: Polling Trigger Tests (uses poll())
// ================================================================
describe('__ServiceName__ Polling Trigger', () => {
	const defaultCredentials: ICredentialDataDecryptedObject = {
		apiKey: 'test-api-key',
		baseUrl: 'https://api.example.com',
	};

	afterEach(() => {
		nock.cleanAll();
	});

	it('should return new items on poll', async () => {
		nock('https://api.example.com')
			.get('/api/v1/items')
			.query(true)
			.reply(200, {
				data: [
					{ id: '1', name: 'New Item', created_at: '2024-01-01T00:00:00Z' },
				],
			});

		const { response } = await testPollingTriggerNode(
			__ServiceName__Trigger,
			{
				node: {
					parameters: {
						event: 'newItem',
						simple: false,
						filters: {},
					},
				},
				credential: defaultCredentials,
				mode: 'manual',
			},
		);

		expect(response).not.toBeNull();
		expect(response![0]).toHaveLength(1);
	});

	it('should return null when no new items exist', async () => {
		nock('https://api.example.com')
			.get('/api/v1/items')
			.query(true)
			.reply(200, { data: [] });

		const { response } = await testPollingTriggerNode(
			__ServiceName__Trigger,
			{
				node: {
					parameters: {
						event: 'newItem',
						simple: false,
						filters: {},
					},
				},
				credential: defaultCredentials,
				mode: 'manual',
			},
		);

		expect(response).toBeNull();
	});
});

// ================================================================
// OPTION C: Event Trigger Tests (uses trigger())
// ================================================================
describe('__ServiceName__ Event Trigger', () => {
	const defaultCredentials: ICredentialDataDecryptedObject = {
		apiKey: 'test-api-key',
		host: 'localhost',
		port: 5672,
	};

	it('should return manual trigger function in manual mode', async () => {
		const { manualTriggerFunction, emit } = await testTriggerNode(
			__ServiceName__Trigger,
			{
				mode: 'manual',
				node: {
					parameters: {
						channel: 'test-channel',
						options: {},
					},
				},
				credential: defaultCredentials,
			},
		);

		expect(manualTriggerFunction).toBeInstanceOf(Function);
	});

	it('should clean up on close', async () => {
		const { close } = await testTriggerNode(
			__ServiceName__Trigger,
			{
				node: {
					parameters: {
						channel: 'test-channel',
						options: {},
					},
				},
				credential: defaultCredentials,
			},
		);

		// close() should not throw
		await expect(close()).resolves.not.toThrow();
	});
});
