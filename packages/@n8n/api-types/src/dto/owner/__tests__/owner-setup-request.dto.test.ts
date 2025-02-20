import { OwnerSetupRequestDto } from '../owner-setup-request.dto';

describe('OwnerSetupRequestDto', () => {
	describe('Valid requests', () => {
		test.each([
			{
				name: 'complete valid setup request',
				request: {
					email: 'owner@example.com',
					firstName: 'John',
					lastName: 'Doe',
					password: 'SecurePassword123',
				},
			},
		])('should validate $name', ({ request }) => {
			const result = OwnerSetupRequestDto.safeParse(request);
			expect(result.success).toBe(true);
		});
	});

	describe('Invalid requests', () => {
		test.each([
			{
				name: 'invalid email',
				request: {
					email: 'invalid-email',
					firstName: 'John',
					lastName: 'Doe',
					password: 'SecurePassword123',
				},
				expectedErrorPath: ['email'],
			},
			{
				name: 'missing first name',
				request: {
					email: 'owner@example.com',
					firstName: '',
					lastName: 'Doe',
					password: 'SecurePassword123',
				},
				expectedErrorPath: ['firstName'],
			},
			{
				name: 'missing last name',
				request: {
					email: 'owner@example.com',
					firstName: 'John',
					lastName: '',
					password: 'SecurePassword123',
				},
				expectedErrorPath: ['lastName'],
			},
			{
				name: 'password too short',
				request: {
					email: 'owner@example.com',
					firstName: 'John',
					lastName: 'Doe',
					password: 'short',
				},
				expectedErrorPath: ['password'],
			},
			{
				name: 'password without number',
				request: {
					email: 'owner@example.com',
					firstName: 'John',
					lastName: 'Doe',
					password: 'NoNumberPassword',
				},
				expectedErrorPath: ['password'],
			},
			{
				name: 'password without uppercase letter',
				request: {
					email: 'owner@example.com',
					firstName: 'John',
					lastName: 'Doe',
					password: 'nouppercasepassword123',
				},
				expectedErrorPath: ['password'],
			},
		])('should fail validation for $name', ({ request, expectedErrorPath }) => {
			const result = OwnerSetupRequestDto.safeParse(request);

			expect(result.success).toBe(false);

			if (expectedErrorPath) {
				expect(result.error?.issues[0].path).toEqual(expectedErrorPath);
			}
		});
	});
});
