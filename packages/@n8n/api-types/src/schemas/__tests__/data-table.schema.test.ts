import { dataTableNameSchema } from '../data-table.schema';

describe('dataTableNameSchema', () => {
	describe('Valid names', () => {
		test.each([
			'Customers',
			'Customer orders 2024',
			'orders-q1',
			"Q1 'Quarterly' Report",
			'orders & invoices',
			'a',
		])('accepts %p', (value) => {
			expect(dataTableNameSchema.safeParse(value).success).toBe(true);
		});

		test('trims surrounding whitespace', () => {
			const result = dataTableNameSchema.safeParse('  Customers  ');
			expect(result.success).toBe(true);
			expect(result.data).toBe('Customers');
		});
	});

	describe('Invalid names', () => {
		test.each([
			['empty string', ''],
			['only whitespace', '   '],
			['too long', 'a'.repeat(129)],
			['contains a script tag', '<script>alert(1)</script>'],
			['contains an img onerror payload', '<img src=x onerror=alert(1)>'],
			['contains inline HTML markup', 'Customers <b>bold</b>'],
			['contains an svg onload payload', '<svg onload=alert(1)>'],
		])('rejects %s', (_label, value) => {
			expect(dataTableNameSchema.safeParse(value).success).toBe(false);
		});
	});
});
