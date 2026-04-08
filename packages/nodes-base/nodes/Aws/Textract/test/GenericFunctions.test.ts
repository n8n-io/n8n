import { simplify, type IExpenseDocument } from '../GenericFunctions';

describe('AWS Textract Generic Functions', () => {
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
