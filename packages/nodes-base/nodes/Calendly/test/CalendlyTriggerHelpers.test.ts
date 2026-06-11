import { createHmac } from 'crypto';

import type { IWebhookFunctions } from 'n8n-workflow';

import { verifySignature } from '../CalendlyTriggerHelpers';

describe('CalendlyTriggerHelpers', () => {
	const testSecret = 'test-secret-key-12345';
	const testPayload = Buffer.from('{"event":"invitee.created"}');

	function buildSignatureHeader(secret: string, timestamp: number, payload: Buffer) {
		const hmac = createHmac('sha256', secret);
		hmac.update(`${timestamp}.`);
		hmac.update(payload);
		return `t=${timestamp},v1=${hmac.digest('hex')}`;
	}

	function createMockContext(opts: {
		webhookSecret?: string;
		headerValue: string | null;
		rawBody: Buffer | string | undefined;
	}) {
		return {
			getWorkflowStaticData: jest
				.fn()
				.mockReturnValue(
					opts.webhookSecret !== undefined ? { webhookSecret: opts.webhookSecret } : {},
				),
			getRequestObject: jest.fn().mockReturnValue({
				header: jest
					.fn()
					.mockImplementation((name: string) =>
						name === 'calendly-webhook-signature' ? opts.headerValue : null,
					),
				rawBody: opts.rawBody,
			}),
		} as unknown as IWebhookFunctions;
	}

	describe('verifySignature', () => {
		it('should skip verification when no secret is stored (backward compatibility)', () => {
			const ctx = createMockContext({ headerValue: null, rawBody: testPayload });
			expect(verifySignature.call(ctx)).toBe(true);
		});

		it('should accept a valid signature and timestamp', () => {
			const timestamp = Math.floor(Date.now() / 1000);
			const header = buildSignatureHeader(testSecret, timestamp, testPayload);
			const ctx = createMockContext({
				webhookSecret: testSecret,
				headerValue: header,
				rawBody: testPayload,
			});
			expect(verifySignature.call(ctx)).toBe(true);
		});

		it('should reject an invalid signature', () => {
			const timestamp = Math.floor(Date.now() / 1000);
			const ctx = createMockContext({
				webhookSecret: testSecret,
				headerValue: `t=${timestamp},v1=invalidsignature`,
				rawBody: testPayload,
			});
			expect(verifySignature.call(ctx)).toBe(false);
		});

		it('should reject when signature header is missing', () => {
			const ctx = createMockContext({
				webhookSecret: testSecret,
				headerValue: null,
				rawBody: testPayload,
			});
			expect(verifySignature.call(ctx)).toBe(false);
		});

		it('should reject when timestamp is too old', () => {
			const oldTimestamp = Math.floor(Date.now() / 1000) - 600;
			const header = buildSignatureHeader(testSecret, oldTimestamp, testPayload);
			const ctx = createMockContext({
				webhookSecret: testSecret,
				headerValue: header,
				rawBody: testPayload,
			});
			expect(verifySignature.call(ctx)).toBe(false);
		});

		it('should reject a malformed header', () => {
			const ctx = createMockContext({
				webhookSecret: testSecret,
				headerValue: 'not-a-valid-header',
				rawBody: testPayload,
			});
			expect(verifySignature.call(ctx)).toBe(false);
		});

		it('should reject when raw body is missing', () => {
			const timestamp = Math.floor(Date.now() / 1000);
			const header = buildSignatureHeader(testSecret, timestamp, testPayload);
			const ctx = createMockContext({
				webhookSecret: testSecret,
				headerValue: header,
				rawBody: undefined,
			});
			expect(verifySignature.call(ctx)).toBe(false);
		});

		it('should handle raw body provided as a string', () => {
			const timestamp = Math.floor(Date.now() / 1000);
			const body = '{"event":"invitee.created"}';
			const header = buildSignatureHeader(testSecret, timestamp, Buffer.from(body));
			const ctx = createMockContext({
				webhookSecret: testSecret,
				headerValue: header,
				rawBody: body,
			});
			expect(verifySignature.call(ctx)).toBe(true);
		});
	});
});
