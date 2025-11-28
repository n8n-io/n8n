import type { Logger } from '@n8n/backend-common';
import type { ContextEstablishmentOptions } from '@n8n/decorators';
import type { INodeExecutionData } from 'n8n-workflow';

import { HttpHeaderExtractor } from '../http-header-extractor';

describe('HttpHeaderExtractor', () => {
	let extractor: HttpHeaderExtractor;
	let mockLogger: jest.Mocked<Logger>;

	// Factory functions for test data
	const createTriggerItem = (headers?: Record<string, unknown>): INodeExecutionData => ({
		json: { headers },
		pairedItem: { item: 0 },
	});

	const createOptions = (
		overrides?: Partial<ContextEstablishmentOptions>,
	): ContextEstablishmentOptions =>
		({
			triggerItems: [createTriggerItem({ authorization: 'Bearer test-token-123' })],
			options: {},
			...overrides,
		}) as ContextEstablishmentOptions;

	beforeAll(() => {
		mockLogger = {
			debug: jest.fn(),
			info: jest.fn(),
			warn: jest.fn(),
			error: jest.fn(),
		} as unknown as jest.Mocked<Logger>;

		extractor = new HttpHeaderExtractor(mockLogger);
	});

	beforeEach(() => {
		jest.clearAllMocks();
	});

	describe('isApplicableToTriggerNode', () => {
		it('returns true for n8n-nodes-base.webhook', () => {
			expect(extractor.isApplicableToTriggerNode('n8n-nodes-base.webhook')).toBe(true);
		});

		it('returns true for shorthand webhook type', () => {
			expect(extractor.isApplicableToTriggerNode('webhook')).toBe(true);
		});

		it.each([
			'n8n-nodes-base.httpRequest',
			'n8n-nodes-base.cron',
			'',
			'WEBHOOK',
			'n8n-nodes-base.Webhook',
		])('returns false for "%s"', (nodeType) => {
			expect(extractor.isApplicableToTriggerNode(nodeType)).toBe(false);
		});
	});

	describe('execute', () => {
		describe('input validation', () => {
			it('returns empty when triggerItems is undefined', async () => {
				const result = await extractor.execute(createOptions({ triggerItems: undefined }));

				expect(result).toEqual({});
			});

			it('returns empty when triggerItems is empty', async () => {
				const result = await extractor.execute(createOptions({ triggerItems: [] }));

				expect(result).toEqual({});
			});

			it('returns empty when options validation fails', async () => {
				const result = await extractor.execute(
					createOptions({
						options: {
							headerName: 123, // Invalid: should be string
						},
					}),
				);

				expect(result).toEqual({});
				expect(mockLogger.error).toHaveBeenCalledWith(
					'Invalid options for HttpHeaderExtractor hook.',
					expect.objectContaining({ error: expect.anything() }),
				);
			});
		});

		describe('pattern safety', () => {
			it.each([
				['(a+)+', 'nested quantifier'],
				['(a*)+', 'nested quantifier variant'],
				['(a+)*', 'nested quantifier variant 2'],
				['(a|a)+', 'overlapping alternation'],
				['(foo|foo)*', 'overlapping alternation with words'],
			])('rejects unsafe pattern "%s" (%s)', async (pattern) => {
				const result = await extractor.execute(
					createOptions({
						options: { headerValue: pattern },
					}),
				);

				expect(result).toEqual({});
				expect(mockLogger.warn).toHaveBeenCalledWith('Potentially unsafe regex pattern rejected', {
					pattern,
				});
			});

			it.each([
				'Bearer (.+)',
				'[Bb][Ee][Aa][Rr][Ee][Rr]\\s+(.+)',
				'^token-(.*)$',
				'api_key=([^&]+)',
			])('accepts safe pattern "%s"', async (pattern) => {
				await extractor.execute(
					createOptions({
						triggerItems: [createTriggerItem({ authorization: 'Bearer abc123' })],
						options: { headerValue: pattern },
					}),
				);

				// Should not warn about unsafe pattern
				expect(mockLogger.warn).not.toHaveBeenCalled();
			});
		});

		describe('regex compilation', () => {
			it('returns triggerItems with masked header for invalid regex syntax', async () => {
				const result = await extractor.execute(
					createOptions({
						options: { headerValue: '[invalid' },
					}),
				);

				expect(result.triggerItems).toBeDefined();
				expect(result.triggerItems?.[0].json.headers).toEqual({
					authorization: '**********',
				});
				expect(result.contextUpdate).toBeUndefined();
				expect(mockLogger.error).toHaveBeenCalledWith(
					'Invalid regex pattern',
					expect.objectContaining({
						pattern: '[invalid',
						error: expect.anything(),
					}),
				);
			});
		});

		describe('header extraction', () => {
			it('returns empty when headers is missing', async () => {
				const result = await extractor.execute(
					createOptions({
						triggerItems: [{ json: {}, pairedItem: { item: 0 } }],
					}),
				);

				expect(result).toEqual({});
			});

			it('returns empty when headers is undefined', async () => {
				const result = await extractor.execute(
					createOptions({
						triggerItems: [createTriggerItem(undefined)],
					}),
				);

				expect(result).toEqual({});
			});

			it('returns empty when headers is not an object', async () => {
				const result = await extractor.execute(
					createOptions({
						triggerItems: [{ json: { headers: 'not-an-object' }, pairedItem: { item: 0 } }],
					}),
				);

				expect(result).toEqual({});
			});

			it('returns empty when headers is an array', async () => {
				const result = await extractor.execute(
					createOptions({
						triggerItems: [{ json: { headers: ['item1', 'item2'] }, pairedItem: { item: 0 } }],
					}),
				);

				expect(result).toEqual({});
			});

			it('returns empty when target header is not found', async () => {
				const result = await extractor.execute(
					createOptions({
						triggerItems: [createTriggerItem({ 'x-custom-header': 'value' })],
						options: { headerName: 'authorization' },
					}),
				);

				expect(result).toEqual({});
			});

			it('returns empty when header value is not a string', async () => {
				const result = await extractor.execute(
					createOptions({
						triggerItems: [createTriggerItem({ authorization: 12345 })],
					}),
				);

				expect(result).toEqual({});
			});

			it('returns triggerItems with masked header when pattern does not match', async () => {
				const result = await extractor.execute(
					createOptions({
						triggerItems: [createTriggerItem({ authorization: 'Basic dXNlcjpwYXNz' })],
						options: { headerValue: 'Bearer (.+)' },
					}),
				);

				expect(result.triggerItems).toBeDefined();
				expect(result.triggerItems?.[0].json.headers).toEqual({
					authorization: '**********',
				});
				expect(result.contextUpdate).toBeUndefined();
			});

			it('returns triggerItems with masked header when pattern has no capture group', async () => {
				const result = await extractor.execute(
					createOptions({
						triggerItems: [createTriggerItem({ authorization: 'Bearer token123' })],
						options: { headerValue: 'Bearer .+' }, // No capture group
					}),
				);

				expect(result.triggerItems).toBeDefined();
				expect(result.triggerItems?.[0].json.headers).toEqual({
					authorization: '**********',
				});
				expect(result.contextUpdate).toBeUndefined();
			});
		});

		describe('successful extraction', () => {
			it('extracts Bearer token with default pattern', async () => {
				const result = await extractor.execute(
					createOptions({
						triggerItems: [createTriggerItem({ authorization: 'Bearer my-jwt-token' })],
					}),
				);

				expect(result.contextUpdate).toEqual({
					credentials: {
						version: 1,
						identity: 'my-jwt-token',
						metadata: { source: 'http-header', headerName: 'authorization' },
					},
				});
				expect(result.triggerItems).toBeDefined();
			});

			it('handles case-insensitive Bearer with default pattern', async () => {
				const result = await extractor.execute(
					createOptions({
						triggerItems: [createTriggerItem({ authorization: 'BEARER uppercase-token' })],
					}),
				);

				expect(result.contextUpdate).toEqual({
					credentials: {
						version: 1,
						identity: 'uppercase-token',
						metadata: { source: 'http-header', headerName: 'authorization' },
					},
				});
				expect(result.triggerItems).toBeDefined();
			});

			it('extracts from custom header with custom pattern', async () => {
				const result = await extractor.execute(
					createOptions({
						triggerItems: [createTriggerItem({ 'x-api-key': 'key_abc123xyz' })],
						options: {
							headerName: 'x-api-key',
							headerValue: 'key_(.+)',
						},
					}),
				);

				expect(result.contextUpdate).toEqual({
					credentials: {
						version: 1,
						identity: 'abc123xyz',
						metadata: { source: 'http-header', headerName: 'x-api-key' },
					},
				});
				expect(result.triggerItems).toBeDefined();
			});

			it('normalizes header name to lowercase', async () => {
				const result = await extractor.execute(
					createOptions({
						triggerItems: [createTriggerItem({ authorization: 'Bearer token123' })],
						options: { headerName: 'AUTHORIZATION' },
					}),
				);

				expect(result.contextUpdate).toEqual({
					credentials: {
						version: 1,
						identity: 'token123',
						metadata: { source: 'http-header', headerName: 'authorization' },
					},
				});
				expect(result.triggerItems).toBeDefined();
			});

			it('masks the extracted header value in returned triggerItems', async () => {
				const result = await extractor.execute(
					createOptions({
						triggerItems: [createTriggerItem({ authorization: 'Bearer secret-token' })],
					}),
				);

				expect(result.triggerItems?.[0].json.headers).toEqual({
					authorization: '**********',
				});
			});

			it('truncates long header values before matching', async () => {
				// Create a header value longer than MAX_HEADER_LENGTH (8192)
				const longToken = 'x'.repeat(10000);
				const headerValue = `Bearer ${longToken}`;

				const result = await extractor.execute(
					createOptions({
						triggerItems: [createTriggerItem({ authorization: headerValue })],
						options: { headerValue: 'Bearer (.+)' },
					}),
				);

				// Should match but token should be truncated
				expect(result.contextUpdate?.credentials?.identity).toBeDefined();
				// The extracted value should be less than original due to truncation
				// 8192 - 7 (length of "Bearer ") = 8185 max for token
				expect((result.contextUpdate?.credentials?.identity as string).length).toBeLessThanOrEqual(
					8185,
				);
			});

			it('uses first trigger item when multiple provided', async () => {
				const result = await extractor.execute(
					createOptions({
						triggerItems: [
							createTriggerItem({ authorization: 'Bearer first-token' }),
							createTriggerItem({ authorization: 'Bearer second-token' }),
						],
					}),
				);

				expect(result.contextUpdate?.credentials?.identity).toBe('first-token');
			});
		});
	});
});
