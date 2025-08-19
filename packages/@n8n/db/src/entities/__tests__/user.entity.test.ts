import { UserError } from 'n8n-workflow';

import { User } from '../user';

describe('User Entity', () => {
	describe('JSON.stringify', () => {
		it('should not serialize sensitive data', () => {
			const user = Object.assign(new User(), {
				email: 'test@example.com',
				firstName: 'Don',
				lastName: 'Joe',
				password: '123456789',
			});
			expect(JSON.stringify(user)).toEqual(
				'{"email":"test@example.com","firstName":"Don","lastName":"Joe"}',
			);
		});
	});

	describe('createPersonalProjectName', () => {
		test.each([
			['Nathan', 'Nathaniel', 'nathan@nathaniel.n8n', 'Nathan Nathaniel <nathan@nathaniel.n8n>'],
			[undefined, 'Nathaniel', 'nathan@nathaniel.n8n', '<nathan@nathaniel.n8n>'],
			['Nathan', undefined, 'nathan@nathaniel.n8n', '<nathan@nathaniel.n8n>'],
			[undefined, undefined, 'nathan@nathaniel.n8n', '<nathan@nathaniel.n8n>'],
			[undefined, undefined, undefined, 'Unnamed Project'],
			['Nathan', 'Nathaniel', undefined, 'Unnamed Project'],
		])(
			'given fistName: %s, lastName: %s and email: %s this gives the projectName: "%s"',
			async (firstName, lastName, email, projectName) => {
				const user = new User();
				Object.assign(user, { firstName, lastName, email });
				expect(user.createPersonalProjectName()).toBe(projectName);
			},
		);
	});

	describe('preUpsertHook email validation', () => {
		describe('valid email scenarios', () => {
			it('should allow null email', () => {
				const user = new User();
				(user as { email: string | null }).email = null;

				expect(() => user.preUpsertHook()).not.toThrow();
				expect(user.email).toBeNull();
			});

			it('should allow undefined email', () => {
				const user = new User();
				(user as { email: string | undefined }).email = undefined;

				expect(() => user.preUpsertHook()).not.toThrow();
				expect(user.email).toBeNull();
			});

			it('should lowercase valid emails', () => {
				const user = new User();
				user.email = 'TEST@EXAMPLE.COM';

				expect(() => user.preUpsertHook()).not.toThrow();
				expect(user.email).toBe('test@example.com');
			});

			it('should accept standard valid email formats', () => {
				const validEmails = [
					'test@example.com',
					'user.name@example.com',
					'user+tag@example.com',
					'user123@example123.com',
					'test@sub.example.com',
					'a@b.co',
				];

				validEmails.forEach((email) => {
					const user = new User();
					user.email = email;

					expect(() => user.preUpsertHook()).not.toThrow();
					expect(user.email).toBe(email.toLowerCase());
				});
			});
		});

		describe('invalid email scenarios', () => {
			it('should throw UserError for invalid email format', () => {
				const user = new User();
				user.email = 'invalid-email';

				expect(() => user.preUpsertHook()).toThrow(UserError);
				expect(() => user.preUpsertHook()).toThrow('Invalid email address: invalid-email');
			});

			it('should throw UserError for email without domain', () => {
				const user = new User();
				user.email = 'test@';

				expect(() => user.preUpsertHook()).toThrow(UserError);
				expect(() => user.preUpsertHook()).toThrow('Invalid email address: test@');
			});

			it('should throw UserError for email without @ symbol', () => {
				const user = new User();
				user.email = 'testexample.com';

				expect(() => user.preUpsertHook()).toThrow(UserError);
				expect(() => user.preUpsertHook()).toThrow('Invalid email address: testexample.com');
			});

			it('should throw UserError for email without local part', () => {
				const user = new User();
				user.email = '@example.com';

				expect(() => user.preUpsertHook()).toThrow(UserError);
				expect(() => user.preUpsertHook()).toThrow('Invalid email address: @example.com');
			});

			it('should throw UserError for various invalid formats', () => {
				const invalidEmails = [
					'test..email@example.com',
					'test@',
					'@example.com',
					'test@@example.com',
					'test @example.com',
					'test@ example.com',
					'.test@example.com',
					'test.@example.com',
					'test@example.',
					'test@.example.com',
				];

				invalidEmails.forEach((email) => {
					const user = new User();
					user.email = email;

					expect(() => user.preUpsertHook()).toThrow(UserError);
					expect(() => user.preUpsertHook()).toThrow(`Invalid email address: ${email}`);
				});
			});
		});

		describe('edge cases', () => {
			it('should throw UserError for empty string email', () => {
				const user = new User();
				user.email = '';

				expect(() => user.preUpsertHook()).toThrow(UserError);
				expect(() => user.preUpsertHook()).toThrow('Invalid email address: ');
			});

			it('should throw UserError for whitespace-only email', () => {
				const user = new User();
				user.email = '   ';

				expect(() => user.preUpsertHook()).toThrow(UserError);
				expect(() => user.preUpsertHook()).toThrow('Invalid email address:    ');
			});

			it('should throw UserError for very long invalid email', () => {
				const user = new User();
				const longInvalidEmail = 'a'.repeat(300) + '@invalid';
				user.email = longInvalidEmail;

				expect(() => user.preUpsertHook()).toThrow(UserError);
				expect(() => user.preUpsertHook()).toThrow(`Invalid email address: ${longInvalidEmail}`);
			});

			it('should throw UserError for emails with special characters that should fail', () => {
				const invalidEmailsWithSpecialChars = [
					'test<>@example.com',
					'test[]@example.com',
					'test()@example.com',
					'test,@example.com',
					'test;@example.com',
					'test:@example.com',
					'test"@example.com',
					'test\\@example.com',
				];

				invalidEmailsWithSpecialChars.forEach((email) => {
					const user = new User();
					user.email = email;

					expect(() => user.preUpsertHook()).toThrow(UserError);
					expect(() => user.preUpsertHook()).toThrow(`Invalid email address: ${email}`);
				});
			});
		});

		describe('BeforeInsert and BeforeUpdate triggers', () => {
			it('should validate email during entity creation (BeforeInsert)', () => {
				const user = new User();
				user.email = 'invalid-email-format';

				// The preUpsertHook is decorated with @BeforeInsert, so it should be called
				expect(() => user.preUpsertHook()).toThrow(UserError);
				expect(() => user.preUpsertHook()).toThrow('Invalid email address: invalid-email-format');
			});

			it('should validate email during entity update (BeforeUpdate)', () => {
				const user = new User();
				user.email = 'valid@example.com';

				// First call should succeed
				expect(() => user.preUpsertHook()).not.toThrow();

				// Change to invalid email
				user.email = 'invalid-email';

				// The preUpsertHook is decorated with @BeforeUpdate, so it should be called
				expect(() => user.preUpsertHook()).toThrow(UserError);
				expect(() => user.preUpsertHook()).toThrow('Invalid email address: invalid-email');
			});

			it('should preserve email lowercasing functionality during lifecycle events', () => {
				const user = new User();
				user.email = 'VALID@EXAMPLE.COM';

				expect(() => user.preUpsertHook()).not.toThrow();
				expect(user.email).toBe('valid@example.com');
			});

			it('should handle null/undefined to valid email transitions', () => {
				const user = new User();
				(user as { email: string | null }).email = null;

				// First call with null should succeed
				expect(() => user.preUpsertHook()).not.toThrow();
				expect(user.email).toBeNull();

				// Change to valid email should succeed
				user.email = 'valid@example.com';
				expect(() => user.preUpsertHook()).not.toThrow();
				expect(user.email).toBe('valid@example.com');
			});

			it('should handle valid to invalid email transitions', () => {
				const user = new User();
				user.email = 'valid@example.com';

				// First call with valid email should succeed
				expect(() => user.preUpsertHook()).not.toThrow();
				expect(user.email).toBe('valid@example.com');

				// Change to invalid email should throw
				user.email = 'invalid-email';
				expect(() => user.preUpsertHook()).toThrow(UserError);
				expect(() => user.preUpsertHook()).toThrow('Invalid email address: invalid-email');
			});
		});
	});
});
