import { createHmac, timingSafeEqual } from 'crypto';

import { verifySignature } from '../CustomerIoTriggerHelpers';

jest.mock('crypto', () => ({
	...jest.requireActual('crypto'),
	createHmac: jest.fn().mockReturnValue({
		update: jest.fn().mockReturnThis(),
		digest: jest
			.fn()
			.mockReturnValue('a2114d57b48eac39b9ad189dd8316235a7b4a8d21a10bd27519666489c69b503'),
	}),
	timingSafeEqual: jest.fn(),
}));

describe('CustomerIoTriggerHelpers', () => {
	let mockWebhookFunctions: any;
	const testSigningKey = 'test-signing-key';
	const testTimestamp = '1531420618';
	const testBody = '{"event_id":"01E4E0XXXXXXXXX","event_type":"email_delivered"}';
	const testSignature = 'a2114d57b48eac39b9ad189dd8316235a7b4a8d21a10bd27519666489c69b503';

	beforeEach(() => {
		jest.clearAllMocks();

		// Mock Date.now() to return a fixed timestamp within the replay window
		const fixedDate = new Date(parseInt(testTimestamp, 10) * 1000);
		jest.spyOn(Date, 'now').mockImplementation(() => fixedDate.getTime());

		mockWebhookFunctions = {
			getCredentials: jest.fn(),
			getRequestObject: jest.fn(),
			getNode: jest.fn().mockReturnValue({ name: 'Customer.io Trigger' }),
		};

		mockWebhookFunctions.getRequestObject.mockReturnValue({
			header: jest.fn().mockImplementation((header) => {
				if (header === 'x-cio-signature') return testSignature;
				if (header === 'x-cio-timestamp') return testTimestamp;
				return null;
			}),
			rawBody: testBody,
		});
	});

	describe('verifySignature', () => {
		it('should return true when no signing key is configured (backward compatibility)', async () => {
			mockWebhookFunctions.getCredentials.mockResolvedValue({});

			const result = await verifySignature.call(mockWebhookFunctions);

			expect(result).toBe(true);
			expect(mockWebhookFunctions.getCredentials).toHaveBeenCalledWith('customerIoApi');
		});

		it('should return true when signing key is empty string (backward compatibility)', async () => {
			mockWebhookFunctions.getCredentials.mockResolvedValue({
				webhookSigningKey: '',
			});

			const result = await verifySignature.call(mockWebhookFunctions);

			expect(result).toBe(true);
		});

		it('should return true when signature is valid', async () => {
			mockWebhookFunctions.getCredentials.mockResolvedValue({
				webhookSigningKey: testSigningKey,
			});

			(timingSafeEqual as jest.Mock).mockReturnValue(true);

			const result = await verifySignature.call(mockWebhookFunctions);

			expect(result).toBe(true);
			expect(createHmac).toHaveBeenCalledWith('sha256', testSigningKey);
			expect(timingSafeEqual).toHaveBeenCalled();
		});

		it('should return false when signature is invalid', async () => {
			mockWebhookFunctions.getCredentials.mockResolvedValue({
				webhookSigningKey: testSigningKey,
			});

			(timingSafeEqual as jest.Mock).mockReturnValue(false);

			const result = await verifySignature.call(mockWebhookFunctions);

			expect(result).toBe(false);
			expect(createHmac).toHaveBeenCalledWith('sha256', testSigningKey);
			expect(timingSafeEqual).toHaveBeenCalled();
		});

		it('should return false when signature header is missing', async () => {
			mockWebhookFunctions.getCredentials.mockResolvedValue({
				webhookSigningKey: testSigningKey,
			});

			mockWebhookFunctions.getRequestObject.mockReturnValue({
				header: jest.fn().mockImplementation((header) => {
					if (header === 'x-cio-timestamp') return testTimestamp;
					return null;
				}),
				rawBody: testBody,
			});

			const result = await verifySignature.call(mockWebhookFunctions);

			expect(result).toBe(false);
		});

		it('should return false when timestamp header is missing', async () => {
			mockWebhookFunctions.getCredentials.mockResolvedValue({
				webhookSigningKey: testSigningKey,
			});

			mockWebhookFunctions.getRequestObject.mockReturnValue({
				header: jest.fn().mockImplementation((header) => {
					if (header === 'x-cio-signature') return testSignature;
					return null;
				}),
				rawBody: testBody,
			});

			const result = await verifySignature.call(mockWebhookFunctions);

			expect(result).toBe(false);
		});

		it('should return false when timestamp is too old', async () => {
			mockWebhookFunctions.getCredentials.mockResolvedValue({
				webhookSigningKey: testSigningKey,
			});

			const futureDate = new Date((parseInt(testTimestamp, 10) + 301) * 1000);
			jest.spyOn(Date, 'now').mockImplementation(() => futureDate.getTime());

			const result = await verifySignature.call(mockWebhookFunctions);

			expect(result).toBe(false);
		});

		it('should build the signing string as v0:<timestamp>:<body>', async () => {
			mockWebhookFunctions.getCredentials.mockResolvedValue({
				webhookSigningKey: testSigningKey,
			});

			(timingSafeEqual as jest.Mock).mockReturnValue(true);

			await verifySignature.call(mockWebhookFunctions);

			expect(createHmac).toHaveBeenCalledWith('sha256', testSigningKey);
			const mockHmac = createHmac('sha256', testSigningKey);
			expect(mockHmac.update).toHaveBeenCalledWith(`v0:${testTimestamp}:${testBody}`);
		});

		it('should update HMAC with raw buffer when rawBody is a Buffer', async () => {
			mockWebhookFunctions.getCredentials.mockResolvedValue({
				webhookSigningKey: testSigningKey,
			});

			const rawBuffer = Buffer.from(testBody);
			mockWebhookFunctions.getRequestObject.mockReturnValue({
				header: jest.fn().mockImplementation((header) => {
					if (header === 'x-cio-signature') return testSignature;
					if (header === 'x-cio-timestamp') return testTimestamp;
					return null;
				}),
				rawBody: rawBuffer,
			});

			(timingSafeEqual as jest.Mock).mockReturnValue(true);

			await verifySignature.call(mockWebhookFunctions);

			const mockHmac = createHmac('sha256', testSigningKey);
			expect(mockHmac.update).toHaveBeenCalledWith(`v0:${testTimestamp}:`);
			expect(mockHmac.update).toHaveBeenCalledWith(rawBuffer);
		});

		it('should return false when getCredentials throws', async () => {
			mockWebhookFunctions.getCredentials.mockRejectedValue(new Error('cred error'));

			const result = await verifySignature.call(mockWebhookFunctions);

			expect(result).toBe(false);
		});
	});
});
