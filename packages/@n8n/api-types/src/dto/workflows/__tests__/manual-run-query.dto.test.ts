import { ManualRunQueryDto } from '../manual-run-query.dto';

describe('ManualRunQueryDto', () => {
	describe('Valid requests', () => {
		test.each([
			{ name: 'version number 1', partialExecutionVersion: '1' },
			{ name: 'version number 2', partialExecutionVersion: '2' },
			{ name: 'missing version' },
		])('should validate $name', ({ partialExecutionVersion }) => {
			const result = ManualRunQueryDto.safeParse({ partialExecutionVersion });

			if (!result.success) {
				return fail('expected validation to succeed');
			}
			expect(result.success).toBe(true);
			expect(typeof result.data.partialExecutionVersion).toBe('number');
		});
	});

	describe('Invalid requests', () => {
		test.each([
			{
				name: 'invalid version 0',
				partialExecutionVersion: '0',
				expectedErrorPath: ['partialExecutionVersion'],
			},
			{
				name: 'invalid type (boolean)',
				partialExecutionVersion: true,
				expectedErrorPath: ['partialExecutionVersion'],
			},
			{
				name: 'invalid type (number)',
				partialExecutionVersion: 1,
				expectedErrorPath: ['partialExecutionVersion'],
			},
		])('should fail validation for $name', ({ partialExecutionVersion, expectedErrorPath }) => {
			const result = ManualRunQueryDto.safeParse({ partialExecutionVersion });

			if (result.success) {
				return fail('expected validation to fail');
			}

			expect(result.error.issues[0].path).toEqual(expectedErrorPath);
		});
	});
});
