import { CreateCredentialDto } from '../create-credential.dto';

describe('CreateCredentialDto', () => {
	describe('Valid requests', () => {
		test.each([
			{
				name: 'with required fields',
				request: {
					name: 'My API Credentials',
					type: 'apiKey',
					data: {},
				},
			},
			{
				name: 'with optional projectId',
				request: {
					name: 'My API Credentials',
					type: 'apiKey',
					data: {
						apiKey: '123',
						isAdmin: true,
					},
					projectId: 'project123',
				},
			},
			{
				name: 'with data object',
				request: {
					name: 'My API Credentials',
					type: 'oauth2',
					data: {
						clientId: '123',
						clientSecret: 'secret',
					},
				},
			},
			{
				name: 'longer type',
				request: {
					name: 'LinkedIn Community Management OAuth2 API',
					type: 'linkedInCommunityManagementOAuth2Api',
					data: {
						clientId: '123',
						clientSecret: 'secret',
					},
				},
			},
		])('should validate $name', ({ request }) => {
			const result = CreateCredentialDto.safeParse(request);
			expect(result.success).toBe(true);
		});

		test('should not strip out properties from the data object', () => {
			const result = CreateCredentialDto.safeParse({
				name: 'My API Credentials',
				type: 'apiKey',
				data: {
					apiKey: '123',
					otherProperty: 'otherValue',
				},
			});

			expect(result.success).toBe(true);
			expect(result.data).toEqual({
				name: 'My API Credentials',
				type: 'apiKey',
				data: {
					apiKey: '123',
					otherProperty: 'otherValue',
				},
			});
		});
	});

	describe('Invalid requests', () => {
		test.each([
			{
				name: 'missing name',
				request: {
					type: 'apiKey',
					data: {},
				},
				expectedErrorPath: ['name'],
			},
			{
				name: 'empty name',
				request: {
					name: '',
					type: 'apiKey',
					data: {},
				},
				expectedErrorPath: ['name'],
			},
			{
				name: 'name too long',
				request: {
					name: 'a'.repeat(129),
					type: 'apiKey',
					data: {},
				},
				expectedErrorPath: ['name'],
			},
			{
				name: 'missing type',
				request: {
					name: 'My API Credentials',
					data: {},
				},
				expectedErrorPath: ['type'],
			},
			{
				name: 'empty type',
				request: {
					name: 'My API Credentials',
					type: '',
					data: {},
				},
				expectedErrorPath: ['type'],
			},
			{
				name: 'type too long',
				request: {
					name: 'My API Credentials',
					type: 'a'.repeat(129),
					data: {},
				},
				expectedErrorPath: ['type'],
			},
			{
				name: 'missing data',
				request: {
					name: 'My API Credentials',
					type: 'apiKey',
				},
				expectedErrorPath: ['data'],
			},
			{
				name: 'invalid data type',
				request: {
					name: 'My API Credentials',
					type: 'apiKey',
					data: 'invalid',
				},
				expectedErrorPath: ['data'],
			},
		])('should fail validation for $name', ({ request, expectedErrorPath }) => {
			const result = CreateCredentialDto.safeParse(request);

			expect(result.success).toBe(false);

			if (expectedErrorPath) {
				expect(result.error?.issues[0].path).toEqual(expectedErrorPath);
			}
		});
	});
});
