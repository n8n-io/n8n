import { createHmac } from 'crypto';
import { mock } from 'jest-mock-extended';
import type { IWebhookFunctions } from 'n8n-workflow';

import { verifySignature } from '../AcuitySchedulingTriggerHelpers';

describe('AcuitySchedulingTriggerHelpers', () => {
	describe('verifySignature', () => {
		const apiKey = 'test-acuity-api-key';
		const rawBody = '{"action":"appointment.scheduled","id":"123","calendarID":"1"}';
		const validSignature = createHmac('sha256', apiKey)
			.update(Buffer.from(rawBody))
			.digest('base64');

		type BuildOpts = {
			authentication?: string;
			credentials?: Record<string, unknown>;
			signatureHeader?: string | null;
			body?: Buffer | string | undefined;
			throwOnGetCredentials?: boolean;
		};
		const buildContext = (opts: BuildOpts = {}) => {
			const authentication = opts.authentication ?? 'apiKey';
			const signatureHeader = opts.signatureHeader ?? null;
			const body = 'body' in opts ? opts.body : Buffer.from(rawBody);
			const ctx = mock<IWebhookFunctions>();
			ctx.getNodeParameter.mockReturnValue(authentication);
			if (opts.throwOnGetCredentials) {
				ctx.getCredentials.mockRejectedValue(new Error('not found'));
			} else {
				ctx.getCredentials.mockResolvedValue(opts.credentials ?? { apiKey });
			}
			ctx.getRequestObject.mockReturnValue({
				header: jest.fn().mockImplementation((name: string) => {
					if (name === 'x-acuity-signature') return signatureHeader;
					return null;
				}),
				rawBody: body,
			} as never);
			return ctx;
		};

		it('returns true when no api key is configured (backward compat)', async () => {
			const ctx = buildContext({ credentials: { apiKey: '' } });

			expect(await verifySignature.call(ctx)).toBe(true);
		});

		it('returns true when authentication is OAuth2 (no api key available)', async () => {
			const ctx = buildContext({ authentication: 'oAuth2' });

			expect(await verifySignature.call(ctx)).toBe(true);
			// eslint-disable-next-line @typescript-eslint/unbound-method
			expect(ctx.getCredentials).not.toHaveBeenCalled();
		});

		it('returns true when signature is valid', async () => {
			const ctx = buildContext({ signatureHeader: validSignature });

			expect(await verifySignature.call(ctx)).toBe(true);
		});

		it('returns false when signature is invalid', async () => {
			const ctx = buildContext({ signatureHeader: 'invalid-signature' });

			expect(await verifySignature.call(ctx)).toBe(false);
		});

		it('returns false when signature header is missing', async () => {
			const ctx = buildContext({ signatureHeader: null });

			expect(await verifySignature.call(ctx)).toBe(false);
		});

		it('returns false when raw body is missing', async () => {
			const ctx = buildContext({ signatureHeader: validSignature, body: undefined });

			expect(await verifySignature.call(ctx)).toBe(false);
		});

		it('returns true when getCredentials throws (backward compat)', async () => {
			const ctx = buildContext({ throwOnGetCredentials: true });

			expect(await verifySignature.call(ctx)).toBe(true);
		});

		it('handles string raw body the same as buffer', async () => {
			const ctx = buildContext({ signatureHeader: validSignature, body: rawBody });

			expect(await verifySignature.call(ctx)).toBe(true);
		});
	});
});
