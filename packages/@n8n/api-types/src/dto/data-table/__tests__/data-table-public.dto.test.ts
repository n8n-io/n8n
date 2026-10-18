import { UpdateDataTableColumnPublicDto } from '../data-table-public.dto';

describe('UpdateDataTableColumnPublicDto', () => {
	describe('Valid requests', () => {
		test.each([
			{ name: 'name only', request: { name: 'renamed' } },
			{ name: 'index only', request: { index: 0 } },
			{ name: 'both fields', request: { name: 'renamed', index: 1 } },
		])('should validate $name', ({ request }) => {
			expect(UpdateDataTableColumnPublicDto.safeParse(request).success).toBe(true);
		});
	});

	describe('Invalid requests', () => {
		test.each([
			{ name: 'an empty body', request: {} },
			{ name: 'a non-string name', request: { name: 0 } },
			{ name: 'a negative index', request: { index: -1 } },
			{ name: 'an unknown property', request: { name: 'renamed', unknown: true } },
		])('should fail validation for $name', ({ request }) => {
			expect(UpdateDataTableColumnPublicDto.safeParse(request).success).toBe(false);
		});
	});

	it('rejects an empty body through the constructor and .parse(), not only .safeParse()', () => {
		expect(() => new UpdateDataTableColumnPublicDto({})).toThrow();
		expect(() => UpdateDataTableColumnPublicDto.parse({})).toThrow();
	});
});
