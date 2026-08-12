import { CredentialsGetOneRequestQuery } from '../credentials-get-one-request.dto';

describe('CredentialsGetManyRequestQuery', () => {
	describe('should pass validation', () => {
		it('with empty object', () => {
			const data = {};

			const result = CredentialsGetOneRequestQuery.safeParse(data);

			expect(result.success).toBe(true);
			// defaults to false
			expect(result.data?.includeData).toBe(false);
		});

		test.each([
			{ field: 'includeData', value: 'true' },
			{ field: 'includeData', value: 'false' },
		])('with $field set to $value', ({ field, value }) => {
			const data = { [field]: value };

			const result = CredentialsGetOneRequestQuery.safeParse(data);

			expect(result.success).toBe(true);
		});

		it('with both parameters set', () => {
			const data = {
				includeScopes: 'true',
				includeData: 'true',
			};

			const result = CredentialsGetOneRequestQuery.safeParse(data);

			expect(result.success).toBe(true);
		});
	});

	describe('should fail validation', () => {
		test.each([
			{ field: 'includeData', value: true },
			{ field: 'includeData', value: false },
			{ field: 'includeData', value: 'invalid' },
		])('with invalid value $value for $field', ({ field, value }) => {
			const data = { [field]: value };

			const result = CredentialsGetOneRequestQuery.safeParse(data);

			expect(result.success).toBe(false);
			expect(result.error?.issues[0].path[0]).toBe(field);
		});
	});
});
