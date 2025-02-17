import { GenerateCredentialNameRequestQuery } from '../generate-credential-name.dto';

describe('GenerateCredentialNameRequestQuery', () => {
	describe('should pass validation', () => {
		it('with valid name', () => {
			const data = { name: 'My Credential' };

			const result = GenerateCredentialNameRequestQuery.safeParse(data);

			expect(result.success).toBe(true);
			expect(result.data?.name).toBe('My Credential');
		});
	});

	describe('should fail validation', () => {
		test.each([
			{ value: null },
			{ value: undefined },
			{ value: 123 },
			{ value: true },
			{ value: {} },
			{ value: [] },
		])('with invalid value $value', ({ value }) => {
			const data = { name: value };

			const result = GenerateCredentialNameRequestQuery.safeParse(data);

			expect(result.success).toBe(false);
			expect(result.error?.issues[0].path[0]).toBe('name');
		});
	});
});
