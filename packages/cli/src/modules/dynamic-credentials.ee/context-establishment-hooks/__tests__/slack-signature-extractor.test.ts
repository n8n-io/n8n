import type { ContextEstablishmentOptions } from '@n8n/decorators';
import type { Logger } from '@n8n/backend-common';
import type { INodeExecutionData } from 'n8n-workflow';

import { SlackSignatureExtractor } from '../slack-signature-extractor';

function createSlackTriggerItem(
	overrides: Partial<{
		headers: Record<string, unknown>;
		body: Record<string, string>;
	}> = {},
): INodeExecutionData {
	return {
		json: {
			headers: {
				'x-slack-request-timestamp': '1234567890',
				'x-slack-signature': 'v0=somesignature',
				...overrides.headers,
			},
			body: overrides.body ?? {
				user_id: 'U12345',
				team_id: 'T67890',
				command: '/connect',
				text: '',
			},
		},
		pairedItem: { item: 0 },
	};
}

function createOptions(
	overrides: Partial<ContextEstablishmentOptions> = {},
): ContextEstablishmentOptions {
	return {
		triggerItems: [createSlackTriggerItem()],
		options: {},
		...overrides,
	} as ContextEstablishmentOptions;
}

describe('SlackSignatureExtractor', () => {
	let extractor: SlackSignatureExtractor;
	let mockLogger: jest.Mocked<Logger>;

	beforeEach(() => {
		mockLogger = {
			debug: jest.fn(),
			info: jest.fn(),
			warn: jest.fn(),
			error: jest.fn(),
		} as unknown as jest.Mocked<Logger>;

		extractor = new SlackSignatureExtractor(mockLogger);
	});

	describe('hookDescription', () => {
		it('should have correct metadata', () => {
			expect(extractor.hookDescription).toEqual({
				name: 'SlackSignatureExtractor',
				displayName: 'Slack Identity Extractor',
				options: [],
			});
		});
	});

	describe('isApplicableToTriggerNode', () => {
		it('should return true for webhook node', () => {
			expect(extractor.isApplicableToTriggerNode('n8n-nodes-base.webhook')).toBe(true);
		});

		it('should return true for short webhook name', () => {
			expect(extractor.isApplicableToTriggerNode('webhook')).toBe(true);
		});

		it('should return false for non-webhook nodes', () => {
			expect(extractor.isApplicableToTriggerNode('n8n-nodes-base.httpRequest')).toBe(false);
			expect(extractor.isApplicableToTriggerNode('n8n-nodes-base.cron')).toBe(false);
		});
	});

	describe('execute', () => {
		it('should reconstruct form-encoded identity from parsed body', async () => {
			const triggerItem = createSlackTriggerItem({
				headers: {
					'x-slack-request-timestamp': '1700000000',
					'x-slack-signature': 'v0=abc123',
				},
				body: { user_id: 'U12345', team_id: 'T67890' },
			});

			const options = createOptions({ triggerItems: [triggerItem] });
			const result = await extractor.execute(options);

			expect(result.contextUpdate?.credentials?.identity).toBe('user_id=U12345&team_id=T67890');
			expect(result.contextUpdate?.credentials?.metadata?.timestamp).toBe('1700000000');
			expect(result.contextUpdate?.credentials?.metadata?.signature).toBe('v0=abc123');
		});

		it('should mask signature headers in trigger items', async () => {
			const options = createOptions();
			const result = await extractor.execute(options);

			const headers = result.triggerItems![0].json['headers'] as Record<string, unknown>;
			expect(headers['x-slack-signature']).toBe('**********');
			expect(headers['x-slack-request-timestamp']).toBe('**********');
		});

		it('should throw when no trigger items are present', async () => {
			const options = createOptions({ triggerItems: [] });

			await expect(extractor.execute(options)).rejects.toThrow('No trigger items found');
		});

		it('should throw when signature header is missing', async () => {
			const triggerItem: INodeExecutionData = {
				json: {
					headers: {
						'x-slack-request-timestamp': '1234567890',
						// no x-slack-signature
					},
					body: { user_id: 'U12345' },
				},
				pairedItem: { item: 0 },
			};

			const options = createOptions({ triggerItems: [triggerItem] });

			await expect(extractor.execute(options)).rejects.toThrow('Missing X-Slack-Signature header');
		});

		it('should throw when timestamp header is missing', async () => {
			const triggerItem: INodeExecutionData = {
				json: {
					headers: {
						'x-slack-signature': 'v0=fakesignature',
						// no x-slack-request-timestamp
					},
					body: { user_id: 'U12345' },
				},
				pairedItem: { item: 0 },
			};

			const options = createOptions({ triggerItems: [triggerItem] });

			await expect(extractor.execute(options)).rejects.toThrow(
				'Missing X-Slack-Request-Timestamp header',
			);
		});

		it('should throw when body is missing', async () => {
			const triggerItem: INodeExecutionData = {
				json: {
					headers: {
						'x-slack-request-timestamp': '1234567890',
						'x-slack-signature': 'v0=somesignature',
					},
				},
				pairedItem: { item: 0 },
			};

			const options = createOptions({ triggerItems: [triggerItem] });
			await expect(extractor.execute(options)).rejects.toThrow(
				'Could not retrieve raw body for Slack signature verification',
			);
		});

		it('should throw when headers are missing entirely', async () => {
			const triggerItem: INodeExecutionData = {
				json: {
					body: { user_id: 'U12345' },
				},
				pairedItem: { item: 0 },
			};

			const options = createOptions({ triggerItems: [triggerItem] });

			await expect(extractor.execute(options)).rejects.toThrow('No headers found');
		});
	});
});
