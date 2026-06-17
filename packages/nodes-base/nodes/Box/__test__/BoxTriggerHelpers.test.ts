import { createHmac } from 'crypto';

import { verifySignature } from '../BoxTriggerHelpers';

describe('BoxTriggerHelpers', () => {
	const primaryKey = 'primary-test-signing-key';
	const secondaryKey = 'secondary-test-signing-key';
	const rawBody = Buffer.from('{"type":"webhook_event","trigger":"FILE.UPLOADED"}');
	// Fixed clock at 2024-01-01T00:05:00Z (300 seconds after the timestamp header)
	const fixedNow = Date.parse('2024-01-01T00:05:00Z');
	const deliveryTimestamp = '2024-01-01T00:00:00Z';

	const computeSignature = (key: string): string => {
		const hmac = createHmac('sha256', key);
		hmac.update(rawBody);
		hmac.update(deliveryTimestamp);
		return hmac.digest('base64');
	};

	const validPrimarySignature = computeSignature(primaryKey);
	const validSecondarySignature = computeSignature(secondaryKey);

	let mockWebhookFunctions: any;

	const buildRequest = (
		headers: Record<string, string | undefined>,
		body: Buffer | string | undefined | null = rawBody,
	) => ({
		header: jest.fn((name: string) => headers[name.toLowerCase()] ?? null),
		rawBody: body,
	});

	beforeEach(() => {
		jest.clearAllMocks();
		jest.spyOn(Date, 'now').mockImplementation(() => fixedNow);

		mockWebhookFunctions = {
			getCredentials: jest.fn(),
			getRequestObject: jest.fn(),
			getNode: jest.fn().mockReturnValue({ name: 'Box Trigger' }),
		};
	});

	afterEach(() => {
		jest.restoreAllMocks();
	});

	it('should return true when no signing keys are configured (backward compatibility)', async () => {
		mockWebhookFunctions.getCredentials.mockResolvedValue({});
		mockWebhookFunctions.getRequestObject.mockReturnValue(buildRequest({}));

		const result = await verifySignature.call(mockWebhookFunctions);

		expect(result).toBe(true);
	});

	it('should return true when signing keys are empty strings (backward compatibility)', async () => {
		mockWebhookFunctions.getCredentials.mockResolvedValue({
			signingKeyPrimary: '',
			signingKeySecondary: '',
		});
		mockWebhookFunctions.getRequestObject.mockReturnValue(buildRequest({}));

		const result = await verifySignature.call(mockWebhookFunctions);

		expect(result).toBe(true);
	});

	it('should return true when primary signature matches', async () => {
		mockWebhookFunctions.getCredentials.mockResolvedValue({
			signingKeyPrimary: primaryKey,
			signingKeySecondary: secondaryKey,
		});
		mockWebhookFunctions.getRequestObject.mockReturnValue(
			buildRequest({
				'box-delivery-timestamp': deliveryTimestamp,
				'box-signature-primary': validPrimarySignature,
				'box-signature-secondary': 'invalid',
			}),
		);

		const result = await verifySignature.call(mockWebhookFunctions);

		expect(result).toBe(true);
	});

	it('should return true when only secondary signature matches', async () => {
		mockWebhookFunctions.getCredentials.mockResolvedValue({
			signingKeyPrimary: primaryKey,
			signingKeySecondary: secondaryKey,
		});
		mockWebhookFunctions.getRequestObject.mockReturnValue(
			buildRequest({
				'box-delivery-timestamp': deliveryTimestamp,
				'box-signature-primary': 'invalid',
				'box-signature-secondary': validSecondarySignature,
			}),
		);

		const result = await verifySignature.call(mockWebhookFunctions);

		expect(result).toBe(true);
	});

	it('should return true when only primary key is configured and primary signature matches', async () => {
		mockWebhookFunctions.getCredentials.mockResolvedValue({
			signingKeyPrimary: primaryKey,
		});
		mockWebhookFunctions.getRequestObject.mockReturnValue(
			buildRequest({
				'box-delivery-timestamp': deliveryTimestamp,
				'box-signature-primary': validPrimarySignature,
			}),
		);

		const result = await verifySignature.call(mockWebhookFunctions);

		expect(result).toBe(true);
	});

	it('should return false when both signatures are invalid', async () => {
		mockWebhookFunctions.getCredentials.mockResolvedValue({
			signingKeyPrimary: primaryKey,
			signingKeySecondary: secondaryKey,
		});
		mockWebhookFunctions.getRequestObject.mockReturnValue(
			buildRequest({
				'box-delivery-timestamp': deliveryTimestamp,
				'box-signature-primary': 'invalid-primary',
				'box-signature-secondary': 'invalid-secondary',
			}),
		);

		const result = await verifySignature.call(mockWebhookFunctions);

		expect(result).toBe(false);
	});

	it('should return false when signature headers are missing', async () => {
		mockWebhookFunctions.getCredentials.mockResolvedValue({
			signingKeyPrimary: primaryKey,
			signingKeySecondary: secondaryKey,
		});
		mockWebhookFunctions.getRequestObject.mockReturnValue(
			buildRequest({
				'box-delivery-timestamp': deliveryTimestamp,
			}),
		);

		const result = await verifySignature.call(mockWebhookFunctions);

		expect(result).toBe(false);
	});

	it('should return false when delivery timestamp header is missing', async () => {
		mockWebhookFunctions.getCredentials.mockResolvedValue({
			signingKeyPrimary: primaryKey,
		});
		mockWebhookFunctions.getRequestObject.mockReturnValue(
			buildRequest({
				'box-signature-primary': validPrimarySignature,
			}),
		);

		const result = await verifySignature.call(mockWebhookFunctions);

		expect(result).toBe(false);
	});

	it('should return false when delivery timestamp is not parseable', async () => {
		mockWebhookFunctions.getCredentials.mockResolvedValue({
			signingKeyPrimary: primaryKey,
		});
		mockWebhookFunctions.getRequestObject.mockReturnValue(
			buildRequest({
				'box-delivery-timestamp': 'not-a-valid-date',
				'box-signature-primary': validPrimarySignature,
			}),
		);

		const result = await verifySignature.call(mockWebhookFunctions);

		expect(result).toBe(false);
	});

	it('should return false when delivery timestamp is older than 10 minutes', async () => {
		// 11 minutes after the delivery timestamp
		jest.spyOn(Date, 'now').mockImplementation(() => Date.parse('2024-01-01T00:11:00Z'));

		mockWebhookFunctions.getCredentials.mockResolvedValue({
			signingKeyPrimary: primaryKey,
		});
		mockWebhookFunctions.getRequestObject.mockReturnValue(
			buildRequest({
				'box-delivery-timestamp': deliveryTimestamp,
				'box-signature-primary': validPrimarySignature,
			}),
		);

		const result = await verifySignature.call(mockWebhookFunctions);

		expect(result).toBe(false);
	});

	it('should return false when raw body is missing', async () => {
		mockWebhookFunctions.getCredentials.mockResolvedValue({
			signingKeyPrimary: primaryKey,
		});
		mockWebhookFunctions.getRequestObject.mockReturnValue(
			buildRequest(
				{
					'box-delivery-timestamp': deliveryTimestamp,
					'box-signature-primary': validPrimarySignature,
				},
				null,
			),
		);

		const result = await verifySignature.call(mockWebhookFunctions);

		expect(result).toBe(false);
	});

	it('should return false when getCredentials throws', async () => {
		mockWebhookFunctions.getCredentials.mockRejectedValue(new Error('credential not found'));

		const result = await verifySignature.call(mockWebhookFunctions);

		expect(result).toBe(false);
	});
});
