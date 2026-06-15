import { createHmac } from 'crypto';

import { verifySignature } from '../AsanaTriggerHelpers';

describe('AsanaTriggerHelpers', () => {
	let mockWebhookFunctions: any;
	const testSecret = 'test-secret-key-12345';
	const testPayload = Buffer.from('{"events":[{"action":"changed"}]}');

	beforeEach(() => {
		jest.clearAllMocks();

		mockWebhookFunctions = {
			getRequestObject: jest.fn(),
			getWorkflowStaticData: jest.fn(),
		};
	});

	describe('verifySignature', () => {
		it('should return true if no secret is configured (backward compatibility)', () => {
			mockWebhookFunctions.getWorkflowStaticData.mockReturnValue({});
			mockWebhookFunctions.getRequestObject.mockReturnValue({
				header: jest.fn().mockReturnValue(null),
				rawBody: testPayload,
			});

			const result = verifySignature.call(mockWebhookFunctions);

			expect(result).toBe(true);
		});

		it('should return true if signatures match', () => {
			const hmac = createHmac('sha256', testSecret);
			hmac.update(testPayload);
			const expectedSignature = hmac.digest('hex');

			mockWebhookFunctions.getWorkflowStaticData.mockReturnValue({
				hookSecret: testSecret,
			});
			mockWebhookFunctions.getRequestObject.mockReturnValue({
				header: jest.fn().mockImplementation((header) => {
					if (header === 'x-hook-signature') return expectedSignature;
					return null;
				}),
				rawBody: testPayload,
			});

			const result = verifySignature.call(mockWebhookFunctions);

			expect(result).toBe(true);
		});

		it('should return false if signatures do not match', () => {
			const wrongSignature = '0'.repeat(64);

			mockWebhookFunctions.getWorkflowStaticData.mockReturnValue({
				hookSecret: testSecret,
			});
			mockWebhookFunctions.getRequestObject.mockReturnValue({
				header: jest.fn().mockImplementation((header) => {
					if (header === 'x-hook-signature') return wrongSignature;
					return null;
				}),
				rawBody: testPayload,
			});

			const result = verifySignature.call(mockWebhookFunctions);

			expect(result).toBe(false);
		});

		it('should return false if signature header is missing', () => {
			mockWebhookFunctions.getWorkflowStaticData.mockReturnValue({
				hookSecret: testSecret,
			});
			mockWebhookFunctions.getRequestObject.mockReturnValue({
				header: jest.fn().mockReturnValue(null),
				rawBody: testPayload,
			});

			const result = verifySignature.call(mockWebhookFunctions);

			expect(result).toBe(false);
		});

		it('should return true if rawBody is a string and signature matches', () => {
			const stringPayload = '{"events":[{"action":"changed"}]}';
			const hmac = createHmac('sha256', testSecret);
			hmac.update(Buffer.from(stringPayload));
			const expectedSignature = hmac.digest('hex');

			mockWebhookFunctions.getWorkflowStaticData.mockReturnValue({
				hookSecret: testSecret,
			});
			mockWebhookFunctions.getRequestObject.mockReturnValue({
				header: jest.fn().mockImplementation((header: string) => {
					if (header === 'x-hook-signature') return expectedSignature;
					return null;
				}),
				rawBody: stringPayload,
			});

			const result = verifySignature.call(mockWebhookFunctions);

			expect(result).toBe(true);
		});

		it('should return false if raw body is missing when secret is set', () => {
			mockWebhookFunctions.getWorkflowStaticData.mockReturnValue({
				hookSecret: testSecret,
			});
			mockWebhookFunctions.getRequestObject.mockReturnValue({
				header: jest.fn().mockReturnValue('any'),
				rawBody: undefined,
			});

			const result = verifySignature.call(mockWebhookFunctions);

			expect(result).toBe(false);
		});
	});
});
