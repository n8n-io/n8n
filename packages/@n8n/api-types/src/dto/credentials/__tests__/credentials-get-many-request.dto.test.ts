import { CredentialsGetManyRequestQuery } from '../credentials-get-many-request.dto';

describe('CredentialsGetManyRequestQuery', () => {
	describe('should pass validation', () => {
		it('with empty object', () => {
			const data = {};

			const result = CredentialsGetManyRequestQuery.safeParse(data);

			expect(result.success).toBe(true);
		});

		test.each([
			{ field: 'includeScopes', value: 'true' },
			{ field: 'includeScopes', value: 'false' },
			{ field: 'includeData', value: 'true' },
			{ field: 'includeData', value: 'false' },
		])('with $field set to $value', ({ field, value }) => {
			const data = { [field]: value };

			const result = CredentialsGetManyRequestQuery.safeParse(data);

			expect(result.success).toBe(true);
		});

		it('with both parameters set', () => {
			const data = {
				includeScopes: 'true',
				includeData: 'true',
			};

			const result = CredentialsGetManyRequestQuery.safeParse(data);

			expect(result.success).toBe(true);
		});
	});

	describe('should fail validation', () => {
		test.each([
			{ field: 'includeScopes', value: true },
			{ field: 'includeScopes', value: false },
			{ field: 'includeScopes', value: 'invalid' },
			{ field: 'includeData', value: true },
			{ field: 'includeData', value: false },
			{ field: 'includeData', value: 'invalid' },
		])('with invalid value $value for $field', ({ field, value }) => {
			const data = { [field]: value };

			const result = CredentialsGetManyRequestQuery.safeParse(data);

			expect(result.success).toBe(false);
			expect(result.error?.issues[0].path[0]).toBe(field);
		});
	});
});
