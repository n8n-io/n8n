import type { IWebhookFunctions } from 'n8n-workflow';

import { isTimestampValid, verifyWebhook } from '../CurrentsTriggerHelpers';

describe('CurrentsTriggerHelpers', () => {
	describe('isTimestampValid', () => {
		it('should return true for current timestamp in milliseconds', () => {
			const nowSec = Math.floor(Date.now() / 1000);
			const nowMs = nowSec * 1000;
			expect(isTimestampValid(nowMs, nowSec)).toBe(true);
		});

		it('should return true for timestamp within 5 minutes', () => {
			const nowSec = Math.floor(Date.now() / 1000);
			const fourMinutesAgoMs = (nowSec - 240) * 1000;
			expect(isTimestampValid(fourMinutesAgoMs, nowSec)).toBe(true);
		});

		it('should return false for timestamp older than 5 minutes', () => {
			const nowSec = Math.floor(Date.now() / 1000);
			const sixMinutesAgoMs = (nowSec - 360) * 1000;
			expect(isTimestampValid(sixMinutesAgoMs, nowSec)).toBe(false);
		});

		it('should return false for timestamp from the future beyond tolerance', () => {
			const nowSec = Math.floor(Date.now() / 1000);
			const sixMinutesInFutureMs = (nowSec + 360) * 1000;
			expect(isTimestampValid(sixMinutesInFutureMs, nowSec)).toBe(false);
		});

		it('should return true for timestamp at exactly 5 minutes', () => {
			const nowSec = Math.floor(Date.now() / 1000);
			const fiveMinutesAgoMs = (nowSec - 300) * 1000;
			expect(isTimestampValid(fiveMinutesAgoMs, nowSec)).toBe(true);
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
			const nowMs = Date.now();

			(mockWebhookFunctions.getRequestObject as jest.Mock).mockReturnValue({
				headers: { 'x-timestamp': String(nowMs) },
			});
			(mockWebhookFunctions.getHeaderData as jest.Mock).mockReturnValue({});
			(mockWebhookFunctions.getNodeParameter as jest.Mock).mockReturnValue({});

			const result = verifyWebhook.call(mockWebhookFunctions as IWebhookFunctions);
			expect(result).toBe(true);
		});

		it('should return false when timestamp is stale', () => {
			const tenMinutesAgoMs = Date.now() - 600 * 1000;

			(mockWebhookFunctions.getRequestObject as jest.Mock).mockReturnValue({
				headers: { 'x-timestamp': String(tenMinutesAgoMs) },
			});
			(mockWebhookFunctions.getHeaderData as jest.Mock).mockReturnValue({});
			(mockWebhookFunctions.getNodeParameter as jest.Mock).mockReturnValue({});

			const result = verifyWebhook.call(mockWebhookFunctions as IWebhookFunctions);
			expect(result).toBe(false);
		});

		it('should return false when timestamp is invalid/non-numeric', () => {
			(mockWebhookFunctions.getRequestObject as jest.Mock).mockReturnValue({
				headers: { 'x-timestamp': 'not-a-number' },
			});
			(mockWebhookFunctions.getHeaderData as jest.Mock).mockReturnValue({});
			(mockWebhookFunctions.getNodeParameter as jest.Mock).mockReturnValue({});

			const result = verifyWebhook.call(mockWebhookFunctions as IWebhookFunctions);
			expect(result).toBe(false);
		});

		it('should return true when secret header matches', () => {
			const nowMs = Date.now();

			(mockWebhookFunctions.getRequestObject as jest.Mock).mockReturnValue({
				headers: { 'x-timestamp': String(nowMs) },
			});
			(mockWebhookFunctions.getHeaderData as jest.Mock).mockReturnValue({
				'x-webhook-secret': 'my-secret',
			});
			(mockWebhookFunctions.getNodeParameter as jest.Mock).mockReturnValue({
				webhookSecret: 'my-secret',
				validationHeaderName: 'x-webhook-secret',
			});

			const result = verifyWebhook.call(mockWebhookFunctions as IWebhookFunctions);
			expect(result).toBe(true);
		});

		it('should return false when secret header does not match', () => {
			const nowMs = Date.now();

			(mockWebhookFunctions.getRequestObject as jest.Mock).mockReturnValue({
				headers: { 'x-timestamp': String(nowMs) },
			});
			(mockWebhookFunctions.getHeaderData as jest.Mock).mockReturnValue({
				'x-webhook-secret': 'wrong-secret',
			});
			(mockWebhookFunctions.getNodeParameter as jest.Mock).mockReturnValue({
				webhookSecret: 'my-secret',
				validationHeaderName: 'x-webhook-secret',
			});

			const result = verifyWebhook.call(mockWebhookFunctions as IWebhookFunctions);
			expect(result).toBe(false);
		});

		it('should return false when secret header is missing', () => {
			const nowMs = Date.now();

			(mockWebhookFunctions.getRequestObject as jest.Mock).mockReturnValue({
				headers: { 'x-timestamp': String(nowMs) },
			});
			(mockWebhookFunctions.getHeaderData as jest.Mock).mockReturnValue({});
			(mockWebhookFunctions.getNodeParameter as jest.Mock).mockReturnValue({
				webhookSecret: 'my-secret',
				validationHeaderName: 'x-webhook-secret',
			});

			const result = verifyWebhook.call(mockWebhookFunctions as IWebhookFunctions);
			expect(result).toBe(false);
		});

		it('should handle missing timestamp header gracefully', () => {
			(mockWebhookFunctions.getRequestObject as jest.Mock).mockReturnValue({
				headers: {},
			});
			(mockWebhookFunctions.getHeaderData as jest.Mock).mockReturnValue({});
			(mockWebhookFunctions.getNodeParameter as jest.Mock).mockReturnValue({});

			const result = verifyWebhook.call(mockWebhookFunctions as IWebhookFunctions);
			expect(result).toBe(true);
		});

		it('should use custom secret header name', () => {
			const nowMs = Date.now();

			(mockWebhookFunctions.getRequestObject as jest.Mock).mockReturnValue({
				headers: { 'x-timestamp': String(nowMs) },
			});
			(mockWebhookFunctions.getHeaderData as jest.Mock).mockReturnValue({
				'x-custom-header': 'my-secret',
			});
			(mockWebhookFunctions.getNodeParameter as jest.Mock).mockReturnValue({
				webhookSecret: 'my-secret',
				validationHeaderName: 'x-custom-header',
			});

			const result = verifyWebhook.call(mockWebhookFunctions as IWebhookFunctions);
			expect(result).toBe(true);
		});

		it('should use default header name when not specified', () => {
			const nowMs = Date.now();

			(mockWebhookFunctions.getRequestObject as jest.Mock).mockReturnValue({
				headers: { 'x-timestamp': String(nowMs) },
			});
			(mockWebhookFunctions.getHeaderData as jest.Mock).mockReturnValue({
				'x-webhook-secret': 'my-secret',
			});
			(mockWebhookFunctions.getNodeParameter as jest.Mock).mockReturnValue({
				webhookSecret: 'my-secret',
				// validationHeaderName not set - should use default 'x-webhook-secret'
			});

			const result = verifyWebhook.call(mockWebhookFunctions as IWebhookFunctions);
			expect(result).toBe(true);
		});
	});
});
