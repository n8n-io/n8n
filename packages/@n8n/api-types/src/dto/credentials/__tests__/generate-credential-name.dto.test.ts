import { GenerateCredentialNameRequestQuery } from '../generate-credential-name.dto';

describe('GenerateCredentialNameRequestQuery', () => {
	describe('should pass validation', () => {
		it('with empty object', () => {
			const data = {};

			const result = GenerateCredentialNameRequestQuery.safeParse(data);

			expect(result.success).toBe(true);
			expect(result.data?.name).toBeUndefined();
		});

		it('with valid name', () => {
			const data = { name: 'My Credential' };

			const result = GenerateCredentialNameRequestQuery.safeParse(data);

			expect(result.success).toBe(true);
			expect(result.data?.name).toBe('My Credential');
		});
	});

	describe('should fail validation', () => {
		test.each([
			{ field: 'name', value: 123 },
			{ field: 'name', value: true },
			{ field: 'name', value: {} },
			{ field: 'name', value: [] },
		])('with invalid value $value for $field', ({ field, value }) => {
			const data = { [field]: value };

			const result = GenerateCredentialNameRequestQuery.safeParse(data);

			expect(result.success).toBe(false);
			expect(result.error?.issues[0].path[0]).toBe(field);
		});
	});
});
