import { ListProjectsQueryDto } from '../list-projects-query.dto';

describe('ListProjectsQueryDto', () => {
	describe('Valid requests', () => {
		test.each([
			{
				name: 'no parameters (defaults)',
				request: {},
				expected: {},
			},
			{
				name: 'with skip and take',
				request: { skip: '10', take: '5' },
				expected: { skip: 10, take: 5 },
			},
			{
				name: 'with search',
				request: { search: ' my project ' },
				expected: { search: 'my project' },
			},
			{
				name: 'with type personal',
				request: { type: 'personal' },
				expected: { type: 'personal' },
			},
			{
				name: 'with type team',
				request: { type: 'team' },
				expected: { type: 'team' },
			},
			{
				name: 'with activated true',
				request: { activated: 'true' },
				expected: { activated: true },
			},
			{
				name: 'with activated false',
				request: { activated: 'false' },
				expected: { activated: false },
			},
			{
				name: 'with all parameters',
				request: { skip: '20', take: '10', search: 'test', type: 'team', activated: 'true' },
				expected: { skip: 20, take: 10, search: 'test', type: 'team', activated: true },
			},
		])('should validate $name', ({ request, expected }) => {
			const result = ListProjectsQueryDto.safeParse(request);
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data).toMatchObject(expected);
			}
		});

		it('should cap take at 250', () => {
			const result = ListProjectsQueryDto.safeParse({ take: '999' });
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.take).toBe(250);
			}
		});

		it('should default take to undefined when not provided', () => {
			const result = ListProjectsQueryDto.safeParse({});
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.take).toBeUndefined();
			}
		});

		it('should default skip to undefined when not provided', () => {
			const result = ListProjectsQueryDto.safeParse({});
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.skip).toBeUndefined();
			}
		});
	});

	describe('Invalid requests', () => {
		test.each([
			{
				name: 'invalid type',
				request: { type: 'invalid' },
				expectedErrorPath: ['type'],
			},
			{
				name: 'negative skip',
				request: { skip: '-1' },
				expectedErrorPath: ['skip'],
			},
			{
				name: 'non-integer skip',
				request: { skip: 'abc' },
				expectedErrorPath: ['skip'],
			},
			{
				name: 'negative take',
				request: { take: '-1' },
				expectedErrorPath: ['take'],
			},
			{
				name: 'non-integer take',
				request: { take: 'abc' },
				expectedErrorPath: ['take'],
			},
		])('should fail validation for $name', ({ request, expectedErrorPath }) => {
			const result = ListProjectsQueryDto.safeParse(request);
			expect(result.success).toBe(false);
			if (expectedErrorPath) {
				expect(result.error?.issues[0].path).toEqual(expectedErrorPath);
			}
		});
	});
});
