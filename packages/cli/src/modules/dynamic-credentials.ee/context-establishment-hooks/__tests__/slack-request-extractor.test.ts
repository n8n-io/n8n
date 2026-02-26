import { mockLogger } from '@n8n/backend-test-utils';
import crypto from 'node:crypto';

import { SlackRequestExtractor } from '../slack-request-extractor';
import { createOptions, createTriggerItem } from './utils';

describe('SlackRequestExtractor', () => {
	const logger = mockLogger();
	let extractor: SlackRequestExtractor;

	const signingSecret = 'test-signing-secret-abc123';

	function createSlackTimestamp(): string {
		return String(Math.floor(Date.now() / 1000));
	}

	function createSlackSignature(
		secret: string,
		timestamp: string,
		body: Record<string, string>,
	): string {
		const rawBody = new URLSearchParams(body).toString();
		const basestring = `v0:${timestamp}:${rawBody}`;
		return 'v0=' + crypto.createHmac('sha256', secret).update(basestring).digest('hex');
	}

	function createSlackBody(overrides?: Record<string, string>): Record<string, string> {
		return {
			token: '5YVrvec1AlN4osaQq6o23ojI',
			team_id: 'TG9695PUK',
			team_domain: 'n8nio',
			channel_id: 'D0A2DDSREKY',
			channel_name: 'directmessage',
			user_id: 'U0A293J0RFV',
			user_name: 'phyllis.noester',
			command: '/test',
			text: '',
			...overrides,
		};
	}

	function createSlackTriggerItem(
		body?: Record<string, string>,
		headerOverrides?: Record<string, string>,
	) {
		const slackBody = body ?? createSlackBody();
		const timestamp = createSlackTimestamp();
		const signature = createSlackSignature(signingSecret, timestamp, slackBody);

		return createTriggerItem(
			{
				'content-type': 'application/x-www-form-urlencoded',
				'x-slack-request-timestamp': timestamp,
				'x-slack-signature': signature,
				...headerOverrides,
			},
			slackBody,
		);
	}

	beforeEach(() => {
		jest.clearAllMocks();
		extractor = new SlackRequestExtractor(logger);
	});

	describe('hookDescription', () => {
		it('should have correct metadata', () => {
			expect(extractor.hookDescription.name).toBe('SlackRequestExtractor');
			expect(extractor.hookDescription.displayName).toBe('Slack Request Extractor');
			expect(extractor.hookDescription.options).toHaveLength(1);
			expect(extractor.hookDescription.options![0].name).toBe('signingSecret');
		});
	});

	describe('isApplicableToTriggerNode', () => {
		it('should return true for webhook nodes', () => {
			expect(extractor.isApplicableToTriggerNode('n8n-nodes-base.webhook')).toBe(true);
			expect(extractor.isApplicableToTriggerNode('webhook')).toBe(true);
		});

		it('should return false for non-webhook nodes', () => {
			expect(extractor.isApplicableToTriggerNode('n8n-nodes-base.httpRequest')).toBe(false);
			expect(extractor.isApplicableToTriggerNode('n8n-nodes-base.slack')).toBe(false);
		});
	});

	describe('execute', () => {
		describe('Happy Path', () => {
			it('should extract user_id from valid Slack request', async () => {
				const options = createOptions({
					triggerItems: [createSlackTriggerItem()],
					options: { signingSecret },
				});

				const result = await extractor.execute(options);

				expect(result.contextUpdate).toBeDefined();
				expect(result.contextUpdate!.credentials).toEqual({
					version: 1,
					identity: 'U0A293J0RFV',
					metadata: {
						source: 'slack-request',
						teamId: 'TG9695PUK',
					},
				});
			});

			it('should mask sensitive fields in trigger items', async () => {
				const triggerItem = createSlackTriggerItem();
				const options = createOptions({
					triggerItems: [triggerItem],
					options: { signingSecret },
				});

				await extractor.execute(options);

				const body = triggerItem.json['body'] as Record<string, unknown>;
				const headers = triggerItem.json['headers'] as Record<string, unknown>;
				expect(body['token']).toBe('**********');
				expect(headers['x-slack-signature']).toBe('**********');
			});

			it('should work without team_id in body', async () => {
				const body = createSlackBody();
				delete (body as Record<string, string | undefined>).team_id;
				const options = createOptions({
					triggerItems: [createSlackTriggerItem(body)],
					options: { signingSecret },
				});

				const result = await extractor.execute(options);

				expect(result.contextUpdate!.credentials).toEqual({
					version: 1,
					identity: 'U0A293J0RFV',
					metadata: {
						source: 'slack-request',
					},
				});
			});
		});

		describe('Signature Verification', () => {
			it('should reject requests with invalid signature', async () => {
				const body = createSlackBody();
				const timestamp = createSlackTimestamp();

				const triggerItem = createTriggerItem(
					{
						'content-type': 'application/x-www-form-urlencoded',
						'x-slack-request-timestamp': timestamp,
						'x-slack-signature': 'v0=invalid_signature_here',
					},
					body,
				);

				const options = createOptions({
					triggerItems: [triggerItem],
					options: { signingSecret },
				});

				await expect(extractor.execute(options)).rejects.toThrow(
					'Slack request signature verification failed',
				);
			});

			it('should reject requests with wrong signing secret', async () => {
				const options = createOptions({
					triggerItems: [createSlackTriggerItem()],
					options: { signingSecret: 'wrong-secret' },
				});

				await expect(extractor.execute(options)).rejects.toThrow(
					'Slack request signature verification failed',
				);
			});
		});

		describe('Timestamp Validation', () => {
			it('should reject requests with stale timestamp (>5 minutes old)', async () => {
				const body = createSlackBody();
				const staleTimestamp = String(Math.floor(Date.now() / 1000) - 400); // 6+ min ago
				const signature = createSlackSignature(signingSecret, staleTimestamp, body);

				const triggerItem = createTriggerItem(
					{
						'x-slack-request-timestamp': staleTimestamp,
						'x-slack-signature': signature,
					},
					body,
				);

				const options = createOptions({
					triggerItems: [triggerItem],
					options: { signingSecret },
				});

				await expect(extractor.execute(options)).rejects.toThrow(
					'Slack request timestamp is too old',
				);
			});

			it('should reject requests with missing timestamp', async () => {
				const body = createSlackBody();
				const triggerItem = createTriggerItem(
					{
						'x-slack-signature': 'v0=abc',
					},
					body,
				);

				const options = createOptions({
					triggerItems: [triggerItem],
					options: { signingSecret },
				});

				await expect(extractor.execute(options)).rejects.toThrow(
					'Missing x-slack-request-timestamp header',
				);
			});

			it('should reject requests with non-numeric timestamp', async () => {
				const body = createSlackBody();
				const triggerItem = createTriggerItem(
					{
						'x-slack-request-timestamp': 'not-a-number',
						'x-slack-signature': 'v0=abc',
					},
					body,
				);

				const options = createOptions({
					triggerItems: [triggerItem],
					options: { signingSecret },
				});

				await expect(extractor.execute(options)).rejects.toThrow(
					'Invalid x-slack-request-timestamp header',
				);
			});
		});

		describe('Missing Data', () => {
			it('should throw when no trigger items', async () => {
				const options = createOptions({
					triggerItems: [],
					options: { signingSecret },
				});

				await expect(extractor.execute(options)).rejects.toThrow('No trigger items found');
			});

			it('should throw when trigger items are null', async () => {
				const options = createOptions({
					options: { signingSecret },
				});
				options.triggerItems = null;

				await expect(extractor.execute(options)).rejects.toThrow('No trigger items found');
			});

			it('should throw when signing secret is missing', async () => {
				const options = createOptions({
					triggerItems: [createSlackTriggerItem()],
					options: {},
				});

				await expect(extractor.execute(options)).rejects.toThrow(
					'Invalid options for SlackRequestExtractor hook',
				);
			});

			it('should throw when body is missing', async () => {
				const triggerItem = { json: { headers: {} }, pairedItem: { item: 0 } };
				const options = createOptions({
					triggerItems: [triggerItem],
					options: { signingSecret },
				});

				await expect(extractor.execute(options)).rejects.toThrow(
					'Slack request must contain headers and body',
				);
			});

			it('should throw when user_id is missing from body', async () => {
				const body = createSlackBody();
				delete (body as Record<string, string | undefined>).user_id;
				const options = createOptions({
					triggerItems: [createSlackTriggerItem(body)],
					options: { signingSecret },
				});

				await expect(extractor.execute(options)).rejects.toThrow(
					'Missing user_id in Slack request body',
				);
			});

			it('should throw when x-slack-signature is missing', async () => {
				const body = createSlackBody();
				const timestamp = createSlackTimestamp();

				const triggerItem = createTriggerItem(
					{
						'x-slack-request-timestamp': timestamp,
					},
					body,
				);

				const options = createOptions({
					triggerItems: [triggerItem],
					options: { signingSecret },
				});

				await expect(extractor.execute(options)).rejects.toThrow(
					'Missing x-slack-signature header',
				);
			});
		});
	});
});
