import type { ContextEstablishmentOptions } from '@n8n/decorators';
import type { Logger } from '@n8n/backend-common';
import type { INodeExecutionData } from 'n8n-workflow';

import { SlackSignatureExtractor } from '../slack-signature-extractor';

function createSlackTriggerItem(
	overrides: Partial<{
		headers: Record<string, unknown>;
		body: Record<string, unknown>;
		rawBody: string;
	}> = {},
): INodeExecutionData {
	const body = overrides.body ?? {
		user_id: 'U12345',
		team_id: 'T67890',
		command: '/connect',
		text: '',
	};
	const rawBody = overrides.rawBody ?? 'user_id=U12345&team_id=T67890&command=%2Fconnect&text=';

	return {
		json: {
			headers: {
				'x-slack-request-timestamp': '1234567890',
				'x-slack-signature': 'v0=somesignature',
				'content-type': 'application/x-www-form-urlencoded',
				...overrides.headers,
			},
			body,
			rawBody,
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
		it('should extract user_id from slash command payload', async () => {
			const options = createOptions();
			const result = await extractor.execute(options);

			expect(result.contextUpdate?.credentials).toEqual({
				version: 1,
				identity: 'U12345',
				metadata: expect.objectContaining({
					source: 'slack-signature',
					team_id: 'T67890',
				}),
			});
		});

		it('should extract user_id from interactive payload (nested user object)', async () => {
			const body = {
				user: { id: 'U99999', name: 'testuser' },
				team: { id: 'TAAAAA' },
				type: 'block_actions',
			};

			const triggerItem = createSlackTriggerItem({ body, rawBody: JSON.stringify(body) });
			const options = createOptions({ triggerItems: [triggerItem] });
			const result = await extractor.execute(options);

			expect(result.contextUpdate?.credentials?.identity).toBe('U99999');
			expect(result.contextUpdate?.credentials?.metadata?.team_id).toBe('TAAAAA');
		});

		it('should extract user from event payload', async () => {
			const body = {
				event: { type: 'message', user: 'UEVENT1' },
				team_id: 'TEVENT1',
			};

			const triggerItem = createSlackTriggerItem({ body, rawBody: JSON.stringify(body) });
			const options = createOptions({ triggerItems: [triggerItem] });
			const result = await extractor.execute(options);

			expect(result.contextUpdate?.credentials?.identity).toBe('UEVENT1');
			expect(result.contextUpdate?.credentials?.metadata?.team_id).toBe('TEVENT1');
		});

		it('should include enterprise_id in metadata when present', async () => {
			const body = {
				user_id: 'U12345',
				team_id: 'T67890',
				enterprise_id: 'E11111',
			};

			const triggerItem = createSlackTriggerItem({ body });
			const options = createOptions({ triggerItems: [triggerItem] });
			const result = await extractor.execute(options);

			expect(result.contextUpdate?.credentials?.metadata?.enterprise_id).toBe('E11111');
		});

		it('should carry raw verification data in metadata for resolver', async () => {
			const triggerItem = createSlackTriggerItem({
				headers: {
					'x-slack-request-timestamp': '1700000000',
					'x-slack-signature': 'v0=abc123',
				},
				rawBody: 'user_id=U12345&team_id=T67890',
			});

			const options = createOptions({ triggerItems: [triggerItem] });
			const result = await extractor.execute(options);

			const metadata = result.contextUpdate?.credentials?.metadata;
			expect(metadata?.timestamp).toBe('1700000000');
			expect(metadata?.rawBody).toBe('user_id=U12345&team_id=T67890');
			expect(metadata?.signature).toBe('v0=abc123');
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
					rawBody: 'user_id=U12345',
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
					rawBody: 'user_id=U12345',
				},
				pairedItem: { item: 0 },
			};

			const options = createOptions({ triggerItems: [triggerItem] });

			await expect(extractor.execute(options)).rejects.toThrow(
				'Missing X-Slack-Request-Timestamp header',
			);
		});

		it('should throw when user_id cannot be extracted', async () => {
			const body = { some_field: 'no user info' };

			const triggerItem = createSlackTriggerItem({ body, rawBody: JSON.stringify(body) });
			const options = createOptions({ triggerItems: [triggerItem] });

			await expect(extractor.execute(options)).rejects.toThrow('Could not extract user_id');
		});

		it('should extract enterprise_id from interactive payload', async () => {
			const body = {
				user: { id: 'U99999', name: 'testuser' },
				team: { id: 'TAAAAA' },
				enterprise: { id: 'EAAAAA' },
				type: 'block_actions',
			};

			const triggerItem = createSlackTriggerItem({ body, rawBody: JSON.stringify(body) });
			const options = createOptions({ triggerItems: [triggerItem] });
			const result = await extractor.execute(options);

			expect(result.contextUpdate?.credentials?.metadata?.enterprise_id).toBe('EAAAAA');
		});

		it('should extract enterprise_id from event payload', async () => {
			const body = {
				event: { type: 'message', user: 'UEVENT1' },
				team_id: 'TEVENT1',
				enterprise_id: 'EEVENT1',
			};

			const triggerItem = createSlackTriggerItem({ body, rawBody: JSON.stringify(body) });
			const options = createOptions({ triggerItems: [triggerItem] });
			const result = await extractor.execute(options);

			expect(result.contextUpdate?.credentials?.metadata?.enterprise_id).toBe('EEVENT1');
		});

		it('should throw when rawBody is not available and body is a parsed object', async () => {
			const triggerItem: INodeExecutionData = {
				json: {
					headers: {
						'x-slack-request-timestamp': '1234567890',
						'x-slack-signature': 'v0=somesignature',
					},
					body: { user_id: 'U12345', team_id: 'T67890' },
				},
				pairedItem: { item: 0 },
			};

			const options = createOptions({ triggerItems: [triggerItem] });
			await expect(extractor.execute(options)).rejects.toThrow(
				'Could not retrieve raw body for Slack signature verification',
			);
		});

		it('should throw when no raw body can be determined', async () => {
			const triggerItem: INodeExecutionData = {
				json: {
					headers: {
						'x-slack-request-timestamp': '1234567890',
						'x-slack-signature': 'v0=somesignature',
					},
					body: null,
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
					rawBody: 'user_id=U12345',
				},
				pairedItem: { item: 0 },
			};

			const options = createOptions({ triggerItems: [triggerItem] });

			await expect(extractor.execute(options)).rejects.toThrow('No headers found');
		});
	});
});
