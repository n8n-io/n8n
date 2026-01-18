import type { IWebhookFunctions } from 'n8n-workflow';

import { isTimestampValid, verifyWebhook } from '../CurrentsTriggerHelpers';

describe('CurrentsTriggerHelpers', () => {
	describe('isTimestampValid', () => {
		it('should return true for current timestamp', () => {
			const now = Math.floor(Date.now() / 1000);
			expect(isTimestampValid(now, now)).toBe(true);
		});

		it('should return true for timestamp within 5 minutes', () => {
			const now = Math.floor(Date.now() / 1000);
			const fourMinutesAgo = now - 240;
			expect(isTimestampValid(fourMinutesAgo, now)).toBe(true);
		});

		it('should return false for timestamp older than 5 minutes', () => {
			const now = Math.floor(Date.now() / 1000);
			const sixMinutesAgo = now - 360;
			expect(isTimestampValid(sixMinutesAgo, now)).toBe(false);
		});

		it('should return false for timestamp from the future beyond tolerance', () => {
			const now = Math.floor(Date.now() / 1000);
			const sixMinutesInFuture = now + 360;
			expect(isTimestampValid(sixMinutesInFuture, now)).toBe(false);
		});

		it('should return true for timestamp at exactly 5 minutes', () => {
			const now = Math.floor(Date.now() / 1000);
			const fiveMinutesAgo = now - 300;
			expect(isTimestampValid(fiveMinutesAgo, now)).toBe(true);
		});
	});

	describe('verifyWebhook', () => {
		let mockWebhookFunctions: Partial<IWebhookFunctions>;

		beforeEach(() => {
			mockWebhookFunctions = {
				getRequestObject: jest.fn(),
				getHeaderData: jest.fn(),
				getNodeParameter: jest.fn(),
			};
		});

		it('should return true when no verification is configured', () => {
			const now = Math.floor(Date.now() / 1000);

			(mockWebhookFunctions.getRequestObject as jest.Mock).mockReturnValue({
				headers: { 'x-timestamp': String(now) },
			});
			(mockWebhookFunctions.getHeaderData as jest.Mock).mockReturnValue({});
			(mockWebhookFunctions.getNodeParameter as jest.Mock).mockReturnValue('');

			const result = verifyWebhook.call(mockWebhookFunctions as IWebhookFunctions);
			expect(result).toBe(true);
		});

		it('should return false when timestamp is stale', () => {
			const staleTimestamp = Math.floor(Date.now() / 1000) - 600; // 10 minutes ago

			(mockWebhookFunctions.getRequestObject as jest.Mock).mockReturnValue({
				headers: { 'x-timestamp': String(staleTimestamp) },
			});
			(mockWebhookFunctions.getHeaderData as jest.Mock).mockReturnValue({});
			(mockWebhookFunctions.getNodeParameter as jest.Mock).mockReturnValue('');

			const result = verifyWebhook.call(mockWebhookFunctions as IWebhookFunctions);
			expect(result).toBe(false);
		});

		it('should return true when secret header matches', () => {
			const now = Math.floor(Date.now() / 1000);

			(mockWebhookFunctions.getRequestObject as jest.Mock).mockReturnValue({
				headers: { 'x-timestamp': String(now) },
			});
			(mockWebhookFunctions.getHeaderData as jest.Mock).mockReturnValue({
				'x-webhook-secret': 'my-secret',
			});
			(mockWebhookFunctions.getNodeParameter as jest.Mock).mockImplementation(
				(param: string, defaultValue: unknown) => {
					if (param === 'webhookSecret') return 'my-secret';
					if (param === 'secretHeaderName') return 'x-webhook-secret';
					return defaultValue;
				},
			);

			const result = verifyWebhook.call(mockWebhookFunctions as IWebhookFunctions);
			expect(result).toBe(true);
		});

		it('should return false when secret header does not match', () => {
			const now = Math.floor(Date.now() / 1000);

			(mockWebhookFunctions.getRequestObject as jest.Mock).mockReturnValue({
				headers: { 'x-timestamp': String(now) },
			});
			(mockWebhookFunctions.getHeaderData as jest.Mock).mockReturnValue({
				'x-webhook-secret': 'wrong-secret',
			});
			(mockWebhookFunctions.getNodeParameter as jest.Mock).mockImplementation(
				(param: string, defaultValue: unknown) => {
					if (param === 'webhookSecret') return 'my-secret';
					if (param === 'secretHeaderName') return 'x-webhook-secret';
					return defaultValue;
				},
			);

			const result = verifyWebhook.call(mockWebhookFunctions as IWebhookFunctions);
			expect(result).toBe(false);
		});

		it('should return false when secret header is missing', () => {
			const now = Math.floor(Date.now() / 1000);

			(mockWebhookFunctions.getRequestObject as jest.Mock).mockReturnValue({
				headers: { 'x-timestamp': String(now) },
			});
			(mockWebhookFunctions.getHeaderData as jest.Mock).mockReturnValue({});
			(mockWebhookFunctions.getNodeParameter as jest.Mock).mockImplementation(
				(param: string, defaultValue: unknown) => {
					if (param === 'webhookSecret') return 'my-secret';
					if (param === 'secretHeaderName') return 'x-webhook-secret';
					return defaultValue;
				},
			);

			const result = verifyWebhook.call(mockWebhookFunctions as IWebhookFunctions);
			expect(result).toBe(false);
		});

		it('should handle missing timestamp header gracefully', () => {
			(mockWebhookFunctions.getRequestObject as jest.Mock).mockReturnValue({
				headers: {},
			});
			(mockWebhookFunctions.getHeaderData as jest.Mock).mockReturnValue({});
			(mockWebhookFunctions.getNodeParameter as jest.Mock).mockReturnValue('');

			const result = verifyWebhook.call(mockWebhookFunctions as IWebhookFunctions);
			expect(result).toBe(true);
		});

		it('should use custom secret header name', () => {
			const now = Math.floor(Date.now() / 1000);

			(mockWebhookFunctions.getRequestObject as jest.Mock).mockReturnValue({
				headers: { 'x-timestamp': String(now) },
			});
			(mockWebhookFunctions.getHeaderData as jest.Mock).mockReturnValue({
				'x-custom-header': 'my-secret',
			});
			(mockWebhookFunctions.getNodeParameter as jest.Mock).mockImplementation(
				(param: string, defaultValue: unknown) => {
					if (param === 'webhookSecret') return 'my-secret';
					if (param === 'secretHeaderName') return 'x-custom-header';
					return defaultValue;
				},
			);

			const result = verifyWebhook.call(mockWebhookFunctions as IWebhookFunctions);
			expect(result).toBe(true);
		});
	});
});
