import { UnexpectedError } from 'n8n-workflow';

import { AuthIdentity } from '../auth-identity';
import { type Role } from '../role';
import { Person } from '../person';
import { ServiceAccount } from '../service-account';
import { ServiceAccountDetails } from '../service-account-details';
import { User } from '../user';

describe('Person Entity', () => {
	describe('computeIsPending', () => {
		const createPerson = (overrides: Partial<Person> = {}) => {
			const person = new Person();
			person.password = null;
			person.role = { slug: 'global:member' } as Role;
			person.authIdentities = [];
			return Object.assign(person, overrides);
		};

		const createAuthIdentity = (providerType: 'email' | 'saml' | 'oidc' | 'ldap'): AuthIdentity => {
			const identity = new AuthIdentity();
			identity.providerType = providerType;
			identity.providerId = 'test-provider-id';
			return identity;
		};

		it('should be pending when password is null and no auth identities', () => {
			const person = createPerson();
			person.computeIsPending();
			expect(person.isPending).toBe(true);
		});

		it('should NOT be pending when password is set', () => {
			const person = createPerson({ password: 'hashed-password' });
			person.computeIsPending();
			expect(person.isPending).toBe(false);
		});

		it('should NOT be pending when user is global owner (even without password)', () => {
			const person = createPerson({ role: { slug: 'global:owner' } as Role });
			person.computeIsPending();
			expect(person.isPending).toBe(false);
		});

		it('should NOT be pending when user has SAML auth identity', () => {
			const person = createPerson({ authIdentities: [createAuthIdentity('saml')] });
			person.computeIsPending();
			expect(person.isPending).toBe(false);
		});

		it('should NOT be pending when user has OIDC auth identity', () => {
			const person = createPerson({ authIdentities: [createAuthIdentity('oidc')] });
			person.computeIsPending();
			expect(person.isPending).toBe(false);
		});

		it('should NOT be pending when user has LDAP auth identity', () => {
			const person = createPerson({ authIdentities: [createAuthIdentity('ldap')] });
			person.computeIsPending();
			expect(person.isPending).toBe(false);
		});

		it('should be pending when user only has email auth identity (no password)', () => {
			const person = createPerson({ authIdentities: [createAuthIdentity('email')] });
			person.computeIsPending();
			expect(person.isPending).toBe(true);
		});

		it('should handle undefined authIdentities gracefully', () => {
			const person = createPerson();
			person.authIdentities = undefined as unknown as AuthIdentity[];
			person.computeIsPending();
			expect(person.isPending).toBe(true);
		});
	});

	describe('JSON.stringify', () => {
		it('should not serialize sensitive data', () => {
			const person = Object.assign(new Person(), {
				email: 'test@example.com',
				firstName: 'Don',
				lastName: 'Joe',
				password: '123456789',
			});
			expect(JSON.stringify(person)).toEqual(
				'{"kind":"person","email":"test@example.com","firstName":"Don","lastName":"Joe"}',
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
				const person = new Person();
				Object.assign(person, { firstName, lastName, email });
				expect(person.createPersonalProjectName()).toBe(projectName);
			},
		);
	});

	describe('preUpsertHook email validation', () => {
		describe('valid email scenarios', () => {
			it('should allow null email', () => {
				const person = new Person();
				(person as { email: string | null }).email = null;

				expect(() => person.preUpsertHook()).not.toThrow();
				expect(person.email).toBeNull();
			});

			it('should allow undefined email', () => {
				const person = new Person();
				(person as { email: string | undefined }).email = undefined;

				expect(() => person.preUpsertHook()).not.toThrow();
				expect(person.email).toBeNull();
			});

			it('should lowercase valid emails', () => {
				const person = new Person();
				person.email = 'TEST@EXAMPLE.COM';

				expect(() => person.preUpsertHook()).not.toThrow();
				expect(person.email).toBe('test@example.com');
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
					const person = new Person();
					person.email = email;

					expect(() => person.preUpsertHook()).not.toThrow();
					expect(person.email).toBe(email.toLowerCase());
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
				const person = new Person();
				person.email = email;

				expect(() => person.preUpsertHook()).toThrow(Error);
				expect(() => person.preUpsertHook()).toThrow(
					`Cannot save user <${email}>: Provided email is invalid`,
				);
			});
		});
	});
});

describe('toIUser', () => {
	it('returns the email and names of a person', () => {
		const person = Object.assign(new Person(), {
			id: 'person-1',
			email: 'ada@example.com',
			firstName: 'Ada',
			lastName: 'Lovelace',
		});

		expect(person.toIUser()).toEqual({
			id: 'person-1',
			email: 'ada@example.com',
			firstName: 'Ada',
			lastName: 'Lovelace',
		});
	});

	it('returns the name of a service account as its first name, with no email', () => {
		const serviceAccount = Object.assign(new ServiceAccount(), {
			id: 'service-1',
			details: Object.assign(new ServiceAccountDetails(), { name: 'Deploy bot' }),
		});

		expect(serviceAccount.toIUser()).toEqual({
			id: 'service-1',
			email: '',
			firstName: 'Deploy bot',
			lastName: '',
		});
	});

	it('throws when the details of a service account were not loaded', () => {
		const serviceAccount = Object.assign(new ServiceAccount(), { id: 'service-1' });

		expect(() => serviceAccount.toIUser()).toThrow(UnexpectedError);
	});

	it('throws for an account of unknown kind', () => {
		const account = Object.assign(new User(), { id: 'user-1' });

		expect(() => account.toIUser()).toThrow(UnexpectedError);
	});
});

// Type-level test. The `typecheck` step catches a failure, not the test run.
describe('User type', () => {
	const personOnly = [
		'email',
		'firstName',
		'lastName',
		'password',
		'mfaSecret',
		'personalizationAnswers',
		'lastActiveAt',
		'isPending',
		'authIdentities',
		'apiKeys',
		'createPersonalProjectName',
	] as const;

	it('has none of the person columns, so code must narrow to Person to read them', () => {
		expectTypeOf<Extract<keyof User, (typeof personOnly)[number]>>().toEqualTypeOf<never>();
		expectTypeOf<Extract<keyof Person, (typeof personOnly)[number]>>().toEqualTypeOf<
			(typeof personOnly)[number]
		>();
	});
});
