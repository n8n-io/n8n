import { mock } from 'jest-mock-extended';
import type { ICredentialTestFunctions } from 'n8n-workflow';
import { ApplicationError } from 'n8n-workflow';

jest.mock('aws4', () => ({
	sign: jest.fn(),
}));

import { sign } from 'aws4';
import { simplify, validateCredentials, type IExpenseDocument } from '../GenericFunctions';

describe('AWS Textract Generic Functions', () => {
	const mockSign = sign as jest.MockedFunction<typeof sign>;

	beforeEach(() => {
		jest.clearAllMocks();
	});

	describe('validateCredentials region validation', () => {
		const buildContext = () => {
			const helpers = { request: jest.fn() };
			const context = mock<ICredentialTestFunctions>({
				helpers: helpers as never,
			});
			return { context, helpers };
		};

		const baseCredentials = {
			accessKeyId: 'AKIA-test',
			secretAccessKey: 'secret-test',
			temporaryCredentials: false,
		};

		it.each([
			'@example.com#',
			'us-fake-1',
			'',
			'us-east-1/foo',
			'us-east-1#frag',
			'us-east-1:8080',
			' us-east-1 ',
		])('rejects unsupported region value %s without signing or sending', async (region) => {
			const { context, helpers } = buildContext();
			const credentials = { ...baseCredentials, region };

			await expect(validateCredentials.call(context, credentials, 'textract')).rejects.toThrow(
				ApplicationError,
			);
			await expect(validateCredentials.call(context, credentials, 'textract')).rejects.toThrow(
				'Unsupported AWS region',
			);

			expect(mockSign).not.toHaveBeenCalled();
			expect(helpers.request).not.toHaveBeenCalled();
		});
	});

	describe('simplify function', () => {
		it('should simplify expense document response correctly', () => {
			const input = {
				ExpenseDocuments: [
					{
						SummaryFields: [
							{
								Type: {
									Text: 'VENDOR_NAME',
								},
								LabelDetection: {
									Text: 'Vendor',
								},
								ValueDetection: {
									Text: 'Acme Corporation',
								},
							},
							{
								Type: {
									Text: 'INVOICE_RECEIPT_DATE',
								},
								LabelDetection: {
									Text: 'Date',
								},
								ValueDetection: {
									Text: '2023-12-01',
								},
							},
							{
								Type: {
									Text: 'TOTAL',
								},
								LabelDetection: {
									Text: 'Total',
								},
								ValueDetection: {
									Text: '$125.50',
								},
							},
						],
					},
				],
			} as unknown as IExpenseDocument;

			const result = simplify(input);

			expect(result).toEqual({
				VENDOR_NAME: 'Acme Corporation',
				INVOICE_RECEIPT_DATE: '2023-12-01',
				TOTAL: '$125.50',
			});
		});

		it('should handle fields without Type but with LabelDetection', () => {
			const input = {
				ExpenseDocuments: [
					{
						SummaryFields: [
							{
								Type: undefined as any,
								LabelDetection: {
									Text: 'Custom Field',
								},
								ValueDetection: {
									Text: 'Custom Value',
								},
							},
						],
					},
				],
			} as unknown as IExpenseDocument;

			const result = simplify(input);

			expect(result).toEqual({
				'Custom Field': 'Custom Value',
			});
		});

		it('should handle empty expense documents', () => {
			const input = {
				ExpenseDocuments: [
					{
						SummaryFields: [],
					},
				],
			} as any;

			const result = simplify(input);

			expect(result).toEqual({});
		});

		it('should handle multiple expense documents', () => {
			const input = {
				ExpenseDocuments: [
					{
						SummaryFields: [
							{
								Type: {
									Text: 'VENDOR_NAME',
								},
								LabelDetection: {
									Text: 'Vendor',
								},
								ValueDetection: {
									Text: 'First Company',
								},
							},
						],
					},
					{
						SummaryFields: [
							{
								Type: {
									Text: 'TOTAL',
								},
								LabelDetection: {
									Text: 'Total',
								},
								ValueDetection: {
									Text: '$50.00',
								},
							},
						],
					},
				],
			} as any;

			const result = simplify(input);

			expect(result).toEqual({
				VENDOR_NAME: 'First Company',
				TOTAL: '$50.00',
			});
		});
	});
});
