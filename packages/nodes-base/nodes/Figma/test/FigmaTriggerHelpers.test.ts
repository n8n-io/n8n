import type { IDataObject, IWebhookFunctions } from 'n8n-workflow';

import { verifySignature } from '../FigmaTriggerHelpers';

describe('FigmaTriggerHelpers', () => {
	describe('verifySignature', () => {
		let mockWebhookFunctions: Partial<IWebhookFunctions>;

		beforeEach(() => {
			mockWebhookFunctions = {
				getBodyData: jest.fn(),
				getWorkflowStaticData: jest.fn(),
			};
		});

		it('should return true when no passcode is stored (backward compatibility)', () => {
			(mockWebhookFunctions.getWorkflowStaticData as jest.Mock).mockReturnValue({});
			(mockWebhookFunctions.getBodyData as jest.Mock).mockReturnValue({
				event_type: 'FILE_UPDATE',
				passcode: 'whatever',
			});

			const result = verifySignature.call(mockWebhookFunctions as IWebhookFunctions);
			expect(result).toBe(true);
		});

		it('should return true when stored passcode is empty (backward compatibility)', () => {
			(mockWebhookFunctions.getWorkflowStaticData as jest.Mock).mockReturnValue({
				webhookSecret: '',
			} as IDataObject);
			(mockWebhookFunctions.getBodyData as jest.Mock).mockReturnValue({
				event_type: 'FILE_UPDATE',
				passcode: 'whatever',
			});

			const result = verifySignature.call(mockWebhookFunctions as IWebhookFunctions);
			expect(result).toBe(true);
		});

		it('should return true when passcode in body matches stored passcode', () => {
			const passcode = 'a1b2c3d4e5f6';
			(mockWebhookFunctions.getWorkflowStaticData as jest.Mock).mockReturnValue({
				webhookSecret: passcode,
			} as IDataObject);
			(mockWebhookFunctions.getBodyData as jest.Mock).mockReturnValue({
				event_type: 'FILE_UPDATE',
				passcode,
			});

			const result = verifySignature.call(mockWebhookFunctions as IWebhookFunctions);
			expect(result).toBe(true);
		});

		it('should return false when passcode in body does not match (same length)', () => {
			(mockWebhookFunctions.getWorkflowStaticData as jest.Mock).mockReturnValue({
				webhookSecret: 'correct-passcode',
			} as IDataObject);
			(mockWebhookFunctions.getBodyData as jest.Mock).mockReturnValue({
				event_type: 'FILE_UPDATE',
				passcode: 'wrongone-passcode',
			});

			const result = verifySignature.call(mockWebhookFunctions as IWebhookFunctions);
			expect(result).toBe(false);
		});

		it('should return false when passcode in body does not match (different length)', () => {
			(mockWebhookFunctions.getWorkflowStaticData as jest.Mock).mockReturnValue({
				webhookSecret: 'correct-passcode',
			} as IDataObject);
			(mockWebhookFunctions.getBodyData as jest.Mock).mockReturnValue({
				event_type: 'FILE_UPDATE',
				passcode: 'wrong',
			});

			const result = verifySignature.call(mockWebhookFunctions as IWebhookFunctions);
			expect(result).toBe(false);
		});

		it('should return false when passcode is missing from body', () => {
			(mockWebhookFunctions.getWorkflowStaticData as jest.Mock).mockReturnValue({
				webhookSecret: 'expected-passcode',
			} as IDataObject);
			(mockWebhookFunctions.getBodyData as jest.Mock).mockReturnValue({
				event_type: 'FILE_UPDATE',
			});

			const result = verifySignature.call(mockWebhookFunctions as IWebhookFunctions);
			expect(result).toBe(false);
		});

		it('should return false when passcode in body is not a string', () => {
			(mockWebhookFunctions.getWorkflowStaticData as jest.Mock).mockReturnValue({
				webhookSecret: 'expected-passcode',
			} as IDataObject);
			(mockWebhookFunctions.getBodyData as jest.Mock).mockReturnValue({
				event_type: 'FILE_UPDATE',
				passcode: 12345,
			});

			const result = verifySignature.call(mockWebhookFunctions as IWebhookFunctions);
			expect(result).toBe(false);
		});

		it('should return false when passcode in body is empty string', () => {
			(mockWebhookFunctions.getWorkflowStaticData as jest.Mock).mockReturnValue({
				webhookSecret: 'expected-passcode',
			} as IDataObject);
			(mockWebhookFunctions.getBodyData as jest.Mock).mockReturnValue({
				event_type: 'FILE_UPDATE',
				passcode: '',
			});

			const result = verifySignature.call(mockWebhookFunctions as IWebhookFunctions);
			expect(result).toBe(false);
		});
	});
});
