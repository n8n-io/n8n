import { AuthIdentity } from '../auth-identity';
import { type Role } from '../role';
import { User } from '../user';

describe('User Entity', () => {
	describe('computeIsPending', () => {
		const createUser = (overrides: Partial<User> = {}) => {
			const user = new User();
			user.password = null;
			user.role = { slug: 'global:member' } as Role;
			user.authIdentities = [];
			return Object.assign(user, overrides);
		};

		const createAuthIdentity = (providerType: 'email' | 'saml' | 'oidc' | 'ldap'): AuthIdentity => {
			const identity = new AuthIdentity();
			identity.providerType = providerType;
			identity.providerId = 'test-provider-id';
			return identity;
		};

		it('should be pending when password is null and no auth identities', () => {
			const user = createUser();
			user.computeIsPending();
			expect(user.isPending).toBe(true);
		});

		it('should NOT be pending when password is set', () => {
			const user = createUser({ password: 'hashed-password' });
			user.computeIsPending();
			expect(user.isPending).toBe(false);
		});

		it('should NOT be pending when user is global owner (even without password)', () => {
			const user = createUser({ role: { slug: 'global:owner' } as Role });
			user.computeIsPending();
			expect(user.isPending).toBe(false);
		});

		it('should NOT be pending when user has SAML auth identity', () => {
			const user = createUser({ authIdentities: [createAuthIdentity('saml')] });
			user.computeIsPending();
			expect(user.isPending).toBe(false);
		});

		it('should NOT be pending when user has OIDC auth identity', () => {
			const user = createUser({ authIdentities: [createAuthIdentity('oidc')] });
			user.computeIsPending();
			expect(user.isPending).toBe(false);
		});

		it('should NOT be pending when user has LDAP auth identity', () => {
			const user = createUser({ authIdentities: [createAuthIdentity('ldap')] });
			user.computeIsPending();
			expect(user.isPending).toBe(false);
		});

		it('should be pending when user only has email auth identity (no password)', () => {
			const user = createUser({ authIdentities: [createAuthIdentity('email')] });
			user.computeIsPending();
			expect(user.isPending).toBe(true);
		});

		it('should handle undefined authIdentities gracefully', () => {
			const user = createUser();
			user.authIdentities = undefined as unknown as AuthIdentity[];
			user.computeIsPending();
			expect(user.isPending).toBe(true);
		});
	});

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
