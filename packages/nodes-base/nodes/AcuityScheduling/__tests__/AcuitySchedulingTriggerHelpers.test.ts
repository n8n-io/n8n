import { createHmac } from 'crypto';
import type { IWebhookFunctions } from 'n8n-workflow';

import { verifySignature } from '../AcuitySchedulingTriggerHelpers';

describe('AcuitySchedulingTriggerHelpers', () => {
	describe('verifySignature', () => {
		let mockWebhookFunctions: IWebhookFunctions;
		const apiKey = 'test-api-key-123';
		const testBody = { action: 'appointment.scheduled', id: '123', calendarID: '1' };
		const rawBody = JSON.stringify(testBody);

		function generateValidSignature(body: string, secret: string): string {
			return createHmac('sha256', secret).update(body).digest('base64');
		}

		beforeEach(() => {
			mockWebhookFunctions = {
				getCredentials: jest.fn().mockResolvedValue({
					userId: 'test-user',
					apiKey,
				}),
				getNodeParameter: jest.fn().mockReturnValue('apiKey'),
				getRequestObject: jest.fn().mockReturnValue({
					header: jest.fn(),
					rawBody: Buffer.from(rawBody),
				}),
			} as unknown as IWebhookFunctions;
		});

		it('should return true when signature is valid', async () => {
			const validSignature = generateValidSignature(rawBody, apiKey);
			const mockHeader = jest.fn().mockReturnValue(validSignature);
			(mockWebhookFunctions.getRequestObject as jest.Mock).mockReturnValue({
				header: mockHeader,
				rawBody: Buffer.from(rawBody),
			});

			const result = await verifySignature.call(mockWebhookFunctions);

			expect(result).toBe(true);
			expect(mockHeader).toHaveBeenCalledWith('x-acuity-signature');
		});

		it('should return false when signature is invalid', async () => {
			const invalidSignature = generateValidSignature(rawBody, 'wrong-api-key');
			const mockHeader = jest.fn().mockReturnValue(invalidSignature);
			(mockWebhookFunctions.getRequestObject as jest.Mock).mockReturnValue({
				header: mockHeader,
				rawBody: Buffer.from(rawBody),
			});

			const result = await verifySignature.call(mockWebhookFunctions);

			expect(result).toBe(false);
		});

		it('should return false when x-acuity-signature header is missing', async () => {
			const mockHeader = jest.fn().mockReturnValue(undefined);
			(mockWebhookFunctions.getRequestObject as jest.Mock).mockReturnValue({
				header: mockHeader,
				rawBody: Buffer.from(rawBody),
			});

			const result = await verifySignature.call(mockWebhookFunctions);

			expect(result).toBe(false);
			expect(mockHeader).toHaveBeenCalledWith('x-acuity-signature');
		});

		it('should return true when authentication is OAuth2 (no API key available)', async () => {
			(mockWebhookFunctions.getNodeParameter as jest.Mock).mockReturnValue('oAuth2');

			const result = await verifySignature.call(mockWebhookFunctions);

			expect(result).toBe(true);
		});

		it('should return true when credentials cannot be retrieved', async () => {
			(mockWebhookFunctions.getCredentials as jest.Mock).mockRejectedValue(
				new Error('Credentials error'),
			);

			const result = await verifySignature.call(mockWebhookFunctions);

			expect(result).toBe(true);
		});

		it('should return true when API key is not available in credentials', async () => {
			(mockWebhookFunctions.getCredentials as jest.Mock).mockResolvedValue({
				userId: 'test-user',
				// No apiKey
			});

			const result = await verifySignature.call(mockWebhookFunctions);

			expect(result).toBe(true);
		});

		it('should handle string rawBody', async () => {
			const validSignature = generateValidSignature(rawBody, apiKey);
			const mockHeader = jest.fn().mockReturnValue(validSignature);
			(mockWebhookFunctions.getRequestObject as jest.Mock).mockReturnValue({
				header: mockHeader,
				rawBody, // String instead of Buffer
			});

			const result = await verifySignature.call(mockWebhookFunctions);

			expect(result).toBe(true);
		});

		it('should return true when rawBody is missing and no API key', async () => {
			(mockWebhookFunctions.getCredentials as jest.Mock).mockResolvedValue({
				userId: 'test-user',
			});
			const mockHeader = jest.fn().mockReturnValue('some-signature');
			(mockWebhookFunctions.getRequestObject as jest.Mock).mockReturnValue({
				header: mockHeader,
				rawBody: null,
			});

			const result = await verifySignature.call(mockWebhookFunctions);

			expect(result).toBe(true);
		});

		it('should return false when rawBody is missing but API key is present', async () => {
			const mockHeader = jest.fn().mockReturnValue('some-signature');
			(mockWebhookFunctions.getRequestObject as jest.Mock).mockReturnValue({
				header: mockHeader,
				rawBody: null,
			});

			const result = await verifySignature.call(mockWebhookFunctions);

			// Should return false because we can't compute expected signature without body
			// but we have an API key so we don't skip
			expect(result).toBe(false);
		});
	});
});
