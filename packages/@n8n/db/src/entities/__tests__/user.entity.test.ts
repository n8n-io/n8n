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
			it.each([
				['test..email@example.com'],
				['test@'],
				['@example.com'],
				['test@@example.com'],
				['test @example.com'],
				['test@ example.com'],
				['.test@example.com'],
				['test.@example.com'],
				['test@example.'],
				['test@.example.com'],
				['test<>@example.com'],
				['test[]@example.com'],
				['test()@example.com'],
				['test,@example.com'],
				['test;@example.com'],
				['test:@example.com'],
				['test"@example.com'],
				['test\\@example.com'],
				[''],
				['   '],
				['a'.repeat(300) + '@invalid'],
			])('should throw Error for invalid email <%s>', (email) => {
				const user = new User();
				user.email = email;

				expect(() => user.preUpsertHook()).toThrow(Error);
				expect(() => user.preUpsertHook()).toThrow(
					`Cannot save user <${email}>: Provided email is invalid`,
				);
			});
		});
	});
});
