/**
 * Tests for webhook utilities.
 */

import { jsonParse } from 'n8n-workflow';

import {
	validateWebhookUrl,
	sendWebhookNotification,
	generateWebhookSignature,
	verifyWebhookSignature,
	WEBHOOK_SIGNATURE_HEADER,
	WEBHOOK_TIMESTAMP_HEADER,
	type WebhookPayload,
} from '../cli/webhook';
import type { RunSummary } from '../harness/harness-types';

const mockFetch = jest.fn();
global.fetch = mockFetch;

jest.mock('node:dns/promises', () => ({
	resolve: jest.fn().mockResolvedValue(['93.184.216.34']),
	resolve6: jest.fn().mockRejectedValue(new Error('ENODATA')),
}));

/** Helper to create a mock logger */
function createMockLogger() {
	return {
		info: jest.fn(),
		error: jest.fn(),
		warn: jest.fn(),
		verbose: jest.fn(),
		debug: jest.fn(),
		success: jest.fn(),
		dim: jest.fn(),
		isVerbose: false,
	};
}

/** Helper to create a mock run summary */
function createMockSummary(overrides: Partial<RunSummary> = {}): RunSummary {
	return {
		totalExamples: 10,
		passed: 8,
		failed: 2,
		errors: 0,
		averageScore: 0.85,
		totalDurationMs: 5000,
		evaluatorAverages: {
			'llm-judge': 0.85,
			programmatic: 0.9,
		},
		langsmith: {
			experimentName: 'test-experiment-2024',
			experimentId: 'exp-uuid-123',
			datasetId: 'dataset-uuid-456',
		},
		...overrides,
	};
}

describe('webhook utilities', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	describe('generateWebhookSignature()', () => {
		it('generates consistent signatures for same payload and secret', () => {
			const payload = '{"test": "data"}';
			const secret = 'test-secret-key-1234';

			const sig1 = generateWebhookSignature(payload, secret);
			const sig2 = generateWebhookSignature(payload, secret);

			expect(sig1).toBe(sig2);
			expect(sig1).toMatch(/^sha256=[a-f0-9]{64}$/);
		});

		it('generates different signatures for different payloads', () => {
			const secret = 'test-secret-key-1234';

			const sig1 = generateWebhookSignature('payload1', secret);
			const sig2 = generateWebhookSignature('payload2', secret);

			expect(sig1).not.toBe(sig2);
		});

		it('generates different signatures for different secrets', () => {
			const payload = '{"test": "data"}';

			const sig1 = generateWebhookSignature(payload, 'secret1');
			const sig2 = generateWebhookSignature(payload, 'secret2');

			expect(sig1).not.toBe(sig2);
		});

		it('generates known signature for test vector', () => {
			// This provides a reference for receiver implementations
			const payload = '{"suite":"llm-judge","summary":{"totalExamples":10}}';
			const secret = 'test-webhook-secret-12345678';

			const signature = generateWebhookSignature(payload, secret);

			// Verify format
			expect(signature).toMatch(/^sha256=[a-f0-9]{64}$/);

			// This is the actual expected signature - useful for testing receiver implementations
			expect(signature).toBe(
				'sha256=0905f894294181ac73c6b2d61538c23dfbc5b023f4c2ab83513b1078a7fabe3c',
			);
		});
	});

	describe('verifyWebhookSignature()', () => {
		it('returns true for valid signature', () => {
			const payload = '{"test": "data"}';
			const secret = 'test-secret-key-1234';
			const signature = generateWebhookSignature(payload, secret);

			expect(verifyWebhookSignature(payload, signature, secret)).toBe(true);
		});

		it('returns false for invalid signature', () => {
			const payload = '{"test": "data"}';
			const secret = 'test-secret-key-1234';

			expect(verifyWebhookSignature(payload, 'sha256=invalid', secret)).toBe(false);
		});

		it('returns false for wrong secret', () => {
			const payload = '{"test": "data"}';
			const signature = generateWebhookSignature(payload, 'correct-secret');

			expect(verifyWebhookSignature(payload, signature, 'wrong-secret')).toBe(false);
		});

		it('returns false for tampered payload', () => {
			const secret = 'test-secret-key-1234';
			const signature = generateWebhookSignature('original payload', secret);

			expect(verifyWebhookSignature('tampered payload', signature, secret)).toBe(false);
		});

		it('returns false for signature with wrong length', () => {
			const payload = '{"test": "data"}';
			const secret = 'test-secret-key-1234';

			expect(verifyWebhookSignature(payload, 'sha256=tooshort', secret)).toBe(false);
		});
	});

	describe('validateWebhookUrl()', () => {
		describe('protocol validation', () => {
			it('accepts valid HTTPS URLs', () => {
				expect(() => validateWebhookUrl('https://example.com/webhook')).not.toThrow();
				expect(() => validateWebhookUrl('https://api.example.com/v1/hook')).not.toThrow();
				expect(() =>
					validateWebhookUrl('https://hooks.slack.com/services/T00/B00/xxx'),
				).not.toThrow();
			});

			it('rejects HTTP URLs', () => {
				expect(() => validateWebhookUrl('http://example.com/webhook')).toThrow(
					'Webhook URL must use HTTPS',
				);
			});

			it('rejects other protocols', () => {
				expect(() => validateWebhookUrl('ftp://example.com/webhook')).toThrow(
					'Webhook URL must use HTTPS',
				);
				expect(() => validateWebhookUrl('file:///etc/passwd')).toThrow(
					'Webhook URL must use HTTPS',
				);
			});
		});

		describe('localhost blocking', () => {
			it('rejects localhost', () => {
				expect(() => validateWebhookUrl('https://localhost/webhook')).toThrow(
					'Webhook URL cannot target localhost',
				);
				expect(() => validateWebhookUrl('https://localhost:3000/webhook')).toThrow(
					'Webhook URL cannot target localhost',
				);
			});

			it('rejects 127.0.0.1', () => {
				expect(() => validateWebhookUrl('https://127.0.0.1/webhook')).toThrow(
					'Webhook URL cannot target localhost',
				);
				expect(() => validateWebhookUrl('https://127.0.0.1:8080/webhook')).toThrow(
					'Webhook URL cannot target localhost',
				);
			});

			it('rejects IPv6 localhost (::1)', () => {
				expect(() => validateWebhookUrl('https://[::1]/webhook')).toThrow(
					'Webhook URL cannot target localhost',
				);
			});
		});

		describe('private IP blocking (SSRF prevention)', () => {
			it('rejects 10.x.x.x addresses', () => {
				expect(() => validateWebhookUrl('https://10.0.0.1/webhook')).toThrow(
					'Webhook URL cannot target private/internal IP addresses',
				);
				expect(() => validateWebhookUrl('https://10.255.255.255/webhook')).toThrow(
					'Webhook URL cannot target private/internal IP addresses',
				);
				expect(() => validateWebhookUrl('https://10.1.2.3:8080/webhook')).toThrow(
					'Webhook URL cannot target private/internal IP addresses',
				);
			});

			it('rejects 172.16-31.x.x addresses', () => {
				expect(() => validateWebhookUrl('https://172.16.0.1/webhook')).toThrow(
					'Webhook URL cannot target private/internal IP addresses',
				);
				expect(() => validateWebhookUrl('https://172.31.255.255/webhook')).toThrow(
					'Webhook URL cannot target private/internal IP addresses',
				);
				expect(() => validateWebhookUrl('https://172.20.10.5/webhook')).toThrow(
					'Webhook URL cannot target private/internal IP addresses',
				);
			});

			it('allows 172.x.x.x addresses outside private range', () => {
				expect(() => validateWebhookUrl('https://172.15.0.1/webhook')).not.toThrow();
				expect(() => validateWebhookUrl('https://172.32.0.1/webhook')).not.toThrow();
			});

			it('rejects 192.168.x.x addresses', () => {
				expect(() => validateWebhookUrl('https://192.168.0.1/webhook')).toThrow(
					'Webhook URL cannot target private/internal IP addresses',
				);
				expect(() => validateWebhookUrl('https://192.168.1.100/webhook')).toThrow(
					'Webhook URL cannot target private/internal IP addresses',
				);
				expect(() => validateWebhookUrl('https://192.168.255.255/webhook')).toThrow(
					'Webhook URL cannot target private/internal IP addresses',
				);
			});

			it('rejects 169.254.x.x link-local addresses', () => {
				expect(() => validateWebhookUrl('https://169.254.0.1/webhook')).toThrow(
					'Webhook URL cannot target private/internal IP addresses',
				);
				expect(() => validateWebhookUrl('https://169.254.169.254/webhook')).toThrow(
					'Webhook URL cannot target private/internal IP addresses',
				);
			});

			it('rejects 0.0.0.0', () => {
				expect(() => validateWebhookUrl('https://0.0.0.0/webhook')).toThrow(
					'Webhook URL cannot target private/internal IP addresses',
				);
			});
		});

		describe('internal hostname blocking', () => {
			it('rejects "internal" hostname', () => {
				expect(() => validateWebhookUrl('https://internal/webhook')).toThrow(
					'Webhook URL cannot target internal hostname',
				);
				expect(() => validateWebhookUrl('https://api.internal/webhook')).toThrow(
					'Webhook URL cannot target internal hostname',
				);
			});

			it('rejects "intranet" hostname', () => {
				expect(() => validateWebhookUrl('https://intranet/webhook')).toThrow(
					'Webhook URL cannot target internal hostname',
				);
				expect(() => validateWebhookUrl('https://app.intranet/webhook')).toThrow(
					'Webhook URL cannot target internal hostname',
				);
			});

			it('rejects "corp" hostname', () => {
				expect(() => validateWebhookUrl('https://corp/webhook')).toThrow(
					'Webhook URL cannot target internal hostname',
				);
				expect(() => validateWebhookUrl('https://api.corp/webhook')).toThrow(
					'Webhook URL cannot target internal hostname',
				);
			});

			it('rejects "private" hostname', () => {
				expect(() => validateWebhookUrl('https://private/webhook')).toThrow(
					'Webhook URL cannot target internal hostname',
				);
				expect(() => validateWebhookUrl('https://services.private/webhook')).toThrow(
					'Webhook URL cannot target internal hostname',
				);
			});

			it('rejects "local" hostname', () => {
				expect(() => validateWebhookUrl('https://local/webhook')).toThrow(
					'Webhook URL cannot target internal hostname',
				);
				expect(() => validateWebhookUrl('https://api.local/webhook')).toThrow(
					'Webhook URL cannot target internal hostname',
				);
			});

			it('allows hostnames containing blocked words but not ending with them', () => {
				expect(() => validateWebhookUrl('https://internal-api.example.com/webhook')).not.toThrow();
				expect(() =>
					validateWebhookUrl('https://my-intranet-app.example.com/webhook'),
				).not.toThrow();
			});
		});

		describe('valid URLs', () => {
			it('accepts various valid public URLs', () => {
				expect(() => validateWebhookUrl('https://hooks.slack.com/services/xxx')).not.toThrow();
				expect(() => validateWebhookUrl('https://api.github.com/webhooks')).not.toThrow();
				expect(() => validateWebhookUrl('https://webhook.site/unique-id')).not.toThrow();
				expect(() => validateWebhookUrl('https://n8n.io/webhook/abc123')).not.toThrow();
			});

			it('accepts URLs with paths, query params, and ports', () => {
				expect(() =>
					validateWebhookUrl('https://example.com:8443/api/v1/webhook?token=abc'),
				).not.toThrow();
				expect(() =>
					validateWebhookUrl('https://api.example.com/webhooks/eval/notify'),
				).not.toThrow();
			});
		});

		describe('invalid URL format', () => {
			it('throws on invalid URL strings', () => {
				expect(() => validateWebhookUrl('not-a-url')).toThrow();
				expect(() => validateWebhookUrl('')).toThrow();
				expect(() => validateWebhookUrl('://missing-protocol.com')).toThrow();
			});
		});
	});

	describe('sendWebhookNotification()', () => {
		it('sends POST request with correct payload', async () => {
			mockFetch.mockResolvedValueOnce({
				ok: true,
				status: 200,
				statusText: 'OK',
			});

			const logger = createMockLogger();
			const summary = createMockSummary();

			await sendWebhookNotification({
				webhookUrl: 'https://example.com/webhook',
				summary,
				dataset: 'test-dataset',
				suite: 'llm-judge',
				metadata: { source: 'ci', trigger: 'push' },
				logger,
			});

			expect(mockFetch).toHaveBeenCalledTimes(1);
			expect(mockFetch).toHaveBeenCalledWith('https://example.com/webhook', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: expect.any(String),
			});

			// Verify payload structure
			const callArgs = mockFetch.mock.calls[0] as [string, RequestInit];
			const payload = jsonParse<WebhookPayload>(callArgs[1].body as string);

			expect(payload).toEqual({
				suite: 'llm-judge',
				summary: {
					totalExamples: 10,
					passed: 8,
					failed: 2,
					errors: 0,
					averageScore: 0.85,
				},
				evaluatorAverages: {
					'llm-judge': 0.85,
					programmatic: 0.9,
				},
				totalDurationMs: 5000,
				metadata: { source: 'ci', trigger: 'push' },
				langsmith: {
					experimentName: 'test-experiment-2024',
					experimentId: 'exp-uuid-123',
					datasetId: 'dataset-uuid-456',
					datasetName: 'test-dataset',
				},
			});
		});

		it('logs info messages on success', async () => {
			mockFetch.mockResolvedValueOnce({
				ok: true,
				status: 200,
				statusText: 'OK',
			});

			const logger = createMockLogger();

			await sendWebhookNotification({
				webhookUrl: 'https://example.com/webhook',
				summary: createMockSummary(),
				dataset: 'test-dataset',
				suite: 'llm-judge',
				metadata: {},
				logger,
			});

			expect(logger.info).toHaveBeenCalledWith(
				'Sending results to webhook: https://example.com/***',
			);
			expect(logger.info).toHaveBeenCalledWith(
				'Webhook notification sent successfully (status: 200)',
			);
		});

		it('throws error when webhook URL validation fails', async () => {
			const logger = createMockLogger();

			await expect(
				sendWebhookNotification({
					webhookUrl: 'http://example.com/webhook', // HTTP not allowed
					summary: createMockSummary(),
					dataset: 'test-dataset',
					suite: 'llm-judge',
					metadata: {},
					logger,
				}),
			).rejects.toThrow('Webhook URL must use HTTPS');

			expect(mockFetch).not.toHaveBeenCalled();
		});

		it('throws error when fetch returns non-ok response', async () => {
			mockFetch.mockResolvedValueOnce({
				ok: false,
				status: 500,
				statusText: 'Internal Server Error',
			});

			const logger = createMockLogger();

			await expect(
				sendWebhookNotification({
					webhookUrl: 'https://example.com/webhook',
					summary: createMockSummary(),
					dataset: 'test-dataset',
					suite: 'llm-judge',
					metadata: {},
					logger,
				}),
			).rejects.toThrow('Webhook request failed: 500 Internal Server Error');
		});

		it('throws error when fetch returns 4xx response', async () => {
			mockFetch.mockResolvedValueOnce({
				ok: false,
				status: 401,
				statusText: 'Unauthorized',
			});

			const logger = createMockLogger();

			await expect(
				sendWebhookNotification({
					webhookUrl: 'https://example.com/webhook',
					summary: createMockSummary(),
					dataset: 'test-dataset',
					suite: 'llm-judge',
					metadata: {},
					logger,
				}),
			).rejects.toThrow('Webhook request failed: 401 Unauthorized');
		});

		it('throws error when fetch fails with network error', async () => {
			mockFetch.mockRejectedValueOnce(new Error('Network error'));

			const logger = createMockLogger();

			await expect(
				sendWebhookNotification({
					webhookUrl: 'https://example.com/webhook',
					summary: createMockSummary(),
					dataset: 'test-dataset',
					suite: 'llm-judge',
					metadata: {},
					logger,
				}),
			).rejects.toThrow('Network error');
		});

		it('handles summary without evaluatorAverages', async () => {
			mockFetch.mockResolvedValueOnce({
				ok: true,
				status: 200,
				statusText: 'OK',
			});

			const logger = createMockLogger();
			const summary = createMockSummary({ evaluatorAverages: undefined });

			await sendWebhookNotification({
				webhookUrl: 'https://example.com/webhook',
				summary,
				dataset: 'test-dataset',
				suite: 'llm-judge',
				metadata: {},
				logger,
			});

			const callArgs = mockFetch.mock.calls[0] as [string, RequestInit];
			const payload = jsonParse<WebhookPayload>(callArgs[1].body as string);

			expect(payload.evaluatorAverages).toBeUndefined();
		});

		it('handles summary without langsmith data (local mode)', async () => {
			mockFetch.mockResolvedValueOnce({
				ok: true,
				status: 200,
				statusText: 'OK',
			});

			const logger = createMockLogger();
			const summary = createMockSummary({ langsmith: undefined });

			await sendWebhookNotification({
				webhookUrl: 'https://example.com/webhook',
				summary,
				dataset: 'test-dataset',
				suite: 'llm-judge',
				metadata: {},
				logger,
			});

			const callArgs = mockFetch.mock.calls[0] as [string, RequestInit];
			const payload = jsonParse<WebhookPayload>(callArgs[1].body as string);

			expect(payload.langsmith).toBeUndefined();
		});

		it('validates URL before making fetch request (SSRF prevention)', async () => {
			const logger = createMockLogger();

			await expect(
				sendWebhookNotification({
					webhookUrl: 'https://192.168.1.1/webhook',
					summary: createMockSummary(),
					dataset: 'test-dataset',
					suite: 'llm-judge',
					metadata: {},
					logger,
				}),
			).rejects.toThrow('Webhook URL cannot target private/internal IP addresses');

			expect(mockFetch).not.toHaveBeenCalled();
		});

		describe('HMAC signature', () => {
			it('includes signature headers when webhookSecret is provided', async () => {
				mockFetch.mockResolvedValueOnce({
					ok: true,
					status: 200,
					statusText: 'OK',
				});

				const logger = createMockLogger();

				await sendWebhookNotification({
					webhookUrl: 'https://example.com/webhook',
					webhookSecret: 'test-secret-key-1234',
					summary: createMockSummary(),
					dataset: 'test-dataset',
					suite: 'llm-judge',
					metadata: {},
					logger,
				});

				expect(mockFetch).toHaveBeenCalledTimes(1);
				const callArgs = mockFetch.mock.calls[0] as [string, RequestInit];
				const headers = callArgs[1].headers as Record<string, string>;

				// Verify signature header is present and valid format
				expect(headers[WEBHOOK_SIGNATURE_HEADER]).toMatch(/^sha256=[a-f0-9]{64}$/);

				// Verify timestamp header is present and valid
				expect(headers[WEBHOOK_TIMESTAMP_HEADER]).toMatch(/^\d+$/);
				const timestamp = parseInt(headers[WEBHOOK_TIMESTAMP_HEADER], 10);
				expect(timestamp).toBeGreaterThan(Date.now() - 60000); // Within last minute
				expect(timestamp).toBeLessThanOrEqual(Date.now());
			});

			it('signature can be verified by receiver', async () => {
				mockFetch.mockResolvedValueOnce({
					ok: true,
					status: 200,
					statusText: 'OK',
				});

				const logger = createMockLogger();
				const secret = 'test-secret-key-1234';

				await sendWebhookNotification({
					webhookUrl: 'https://example.com/webhook',
					webhookSecret: secret,
					summary: createMockSummary(),
					dataset: 'test-dataset',
					suite: 'llm-judge',
					metadata: {},
					logger,
				});

				const callArgs = mockFetch.mock.calls[0] as [string, RequestInit];
				const headers = callArgs[1].headers as Record<string, string>;
				const body = callArgs[1].body as string;

				const signature = headers[WEBHOOK_SIGNATURE_HEADER];
				const timestamp = headers[WEBHOOK_TIMESTAMP_HEADER];

				// Verify that the receiver can validate the signature
				// Signature is computed as: timestamp.body
				const signaturePayload = `${timestamp}.${body}`;
				expect(verifyWebhookSignature(signaturePayload, signature, secret)).toBe(true);
			});

			it('does not include signature headers when webhookSecret is not provided', async () => {
				mockFetch.mockResolvedValueOnce({
					ok: true,
					status: 200,
					statusText: 'OK',
				});

				const logger = createMockLogger();

				await sendWebhookNotification({
					webhookUrl: 'https://example.com/webhook',
					summary: createMockSummary(),
					dataset: 'test-dataset',
					suite: 'llm-judge',
					metadata: {},
					logger,
				});

				const callArgs = mockFetch.mock.calls[0] as [string, RequestInit];
				const headers = callArgs[1].headers as Record<string, string>;

				expect(headers[WEBHOOK_SIGNATURE_HEADER]).toBeUndefined();
				expect(headers[WEBHOOK_TIMESTAMP_HEADER]).toBeUndefined();
			});

			it('logs warning when webhook secret is not provided', async () => {
				mockFetch.mockResolvedValueOnce({
					ok: true,
					status: 200,
					statusText: 'OK',
				});

				const logger = createMockLogger();

				await sendWebhookNotification({
					webhookUrl: 'https://example.com/webhook',
					summary: createMockSummary(),
					dataset: 'test-dataset',
					suite: 'llm-judge',
					metadata: {},
					logger,
				});

				expect(logger.warn).toHaveBeenCalledWith(
					expect.stringContaining('No webhook secret provided'),
				);
			});

			it('logs info when request is signed', async () => {
				mockFetch.mockResolvedValueOnce({
					ok: true,
					status: 200,
					statusText: 'OK',
				});

				const logger = createMockLogger();

				await sendWebhookNotification({
					webhookUrl: 'https://example.com/webhook',
					webhookSecret: 'test-secret-key-1234',
					summary: createMockSummary(),
					dataset: 'test-dataset',
					suite: 'llm-judge',
					metadata: {},
					logger,
				});

				expect(logger.info).toHaveBeenCalledWith(
					expect.stringContaining('signed with HMAC-SHA256'),
				);
			});
		});
	});
});
