import { UpdateCredentialDto } from '../update-credential.dto';

describe('UpdateCredentialDto', () => {
	describe('Valid requests', () => {
		test.each([
			{
				name: 'with name only',
				request: {
					name: 'New Credential Name',
				},
			},
			{
				name: 'with data only',
				request: {
					data: { apiKey: 'new-key' },
				},
			},
			{
				name: 'with isGlobal only',
				request: {
					isGlobal: true,
				},
			},
			{
				name: 'with isResolvable only',
				request: {
					isResolvable: false,
				},
			},
			{
				name: 'with all fields',
				request: {
					name: 'Updated Credential',
					type: 'apiKey',
					data: { apiKey: 'value', secret: 'secret' },
					isGlobal: true,
					isResolvable: true,
				},
			},
			{
				name: 'with empty object',
				request: {},
			},
		])('should validate $name', ({ request }) => {
			const result = UpdateCredentialDto.safeParse(request);
			expect(result.success).toBe(true);
		});

		test('should not strip out properties from the data object', () => {
			const result = UpdateCredentialDto.safeParse({
				data: {
					apiKey: '123',
					customProperty: 'customValue',
				},
			});

			expect(result.success).toBe(true);
			expect(result.data).toEqual({
				data: {
					apiKey: '123',
					customProperty: 'customValue',
				},
			});
		});
	});

	describe('Invalid requests', () => {
		test.each([
			{
				name: 'empty name',
				request: {
					name: '',
				},
				expectedErrorPath: ['name'],
			},
			{
				name: 'name too long',
				request: {
					name: 'a'.repeat(129),
				},
				expectedErrorPath: ['name'],
			},
			{
				name: 'empty type',
				request: {
					type: '',
				},
				expectedErrorPath: ['type'],
			},
			{
				name: 'type too long',
				request: {
					type: 'a'.repeat(129),
				},
				expectedErrorPath: ['type'],
			},
			{
				name: 'invalid data type',
				request: {
					data: 'invalid',
				},
				expectedErrorPath: ['data'],
			},
			{
				name: 'isGlobal not a boolean',
				request: {
					isGlobal: 'true',
				},
				expectedErrorPath: ['isGlobal'],
			},
			{
				name: 'isResolvable not a boolean',
				request: {
					isResolvable: 1,
				},
				expectedErrorPath: ['isResolvable'],
			},
		])('should fail validation for $name', ({ request, expectedErrorPath }) => {
			const result = UpdateCredentialDto.safeParse(request);

			expect(result.success).toBe(false);

			if (expectedErrorPath) {
				expect(result.error?.issues[0].path).toEqual(expectedErrorPath);
			}
		});
	});
});
