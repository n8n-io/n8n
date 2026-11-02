import { randomEmail, testDb } from '@n8n/backend-test-utils';
import {
	AuthIdentity,
	AuthIdentityRepository,
	GLOBAL_MEMBER_ROLE,
	Person,
	PersonRepository,
	ProjectRepository,
	ServiceAccount,
	User,
} from '@n8n/db';
import { Container } from '@n8n/di';
import { DataSource } from '@n8n/typeorm';

import { ScimUserRepository } from '@/modules/scim/database/scim-user.repository';

import { createMember, createUserWithMfaEnabled } from '../../shared/db/users';

describe('PersonRepository', () => {
	let personRepository: PersonRepository;

	beforeAll(async () => {
		await testDb.init();
		personRepository = Container.get(PersonRepository);
	});

	beforeEach(async () => {
		await testDb.truncate(['AuthIdentity', 'User']);
	});

	afterAll(async () => {
		await testDb.terminate();
	});

	async function createServiceAccount(attributes: Partial<ServiceAccount> = {}) {
		const table = Container.get(DataSource).getRepository(ServiceAccount);
		return await table.save(table.create({ role: GLOBAL_MEMBER_ROLE, ...attributes }));
	}

	async function reloadPerson(id: string) {
		return await Container.get(DataSource).getRepository(Person).findOneByOrFail({ id });
	}

	/** `ServiceAccount` has no `email` property, so read the stored column directly. */
	async function readStoredEmail(id: string) {
		const row = await Container.get(DataSource)
			.getRepository(User)
			.createQueryBuilder('user')
			.select('user.email', 'email')
			.where('user.id = :id', { id })
			.getRawOne<{ email: string | null }>();
		return row?.email;
	}

	describe('lookups', () => {
		it('finds a person by id and by email, but not a service account by id', async () => {
			const person = await createMember();
			const serviceAccount = await createServiceAccount();

			expect(await personRepository.findByIdWithRole(person.id)).toBeInstanceOf(Person);
			expect(await personRepository.findByIdWithAuthIdentities(person.id)).toBeInstanceOf(Person);
			expect(await personRepository.findByEmailWithAuthIdentities(person.email)).toBeInstanceOf(
				Person,
			);

			expect(await personRepository.findByIdWithRole(serviceAccount.id)).toBeNull();
			expect(await personRepository.findByIdWithAuthIdentities(serviceAccount.id)).toBeNull();
		});

		it('finds a person by LDAP id, but not a service account', async () => {
			const person = await createMember();
			const serviceAccount = await createServiceAccount();
			const identities = Container.get(AuthIdentityRepository);
			await identities.save(AuthIdentity.create(person, 'ldap-person', 'ldap'));
			await identities.save(AuthIdentity.create(serviceAccount, 'ldap-service', 'ldap'));

			expect((await personRepository.findByLdapId('ldap-person'))?.id).toBe(person.id);
			expect(await personRepository.findByLdapId('ldap-service')).toBeNull();
		});

		it('returns the emails of people only', async () => {
			const person = await createMember();
			const serviceAccount = await createServiceAccount();

			const emails = await personRepository.getEmailsByIds([person.id, serviceAccount.id]);

			expect(emails.map((e) => e.id)).toEqual([person.id]);
		});

		it('counts people with MFA, but not service accounts', async () => {
			await createUserWithMfaEnabled();
			await createServiceAccount({ mfaEnabled: true });

			expect(await personRepository.countWithMfaEnabled()).toBe(1);
		});
	});

	describe('writes', () => {
		it('does not disable MFA of a service account', async () => {
			const serviceAccount = await createServiceAccount({ mfaEnabled: true });

			await personRepository.disableMfa(serviceAccount.id);

			const reloaded = await Container.get(DataSource)
				.getRepository(ServiceAccount)
				.findOneByOrFail({ id: serviceAccount.id });
			expect(reloaded.mfaEnabled).toBe(true);
		});

		it('saves survey answers of a person', async () => {
			const person = await createMember();

			await personRepository.saveSurveyAnswers(person.id, { companySize: '20-99' });

			const reloaded = await reloadPerson(person.id);
			expect(reloaded.personalizationAnswers).toEqual({ companySize: '20-99' });
		});
	});

	describe('changeEmail()', () => {
		it('changes the email and renames the personal project when the current email matches', async () => {
			const person = await createMember();
			const newEmail = randomEmail();

			const result = await personRepository.changeEmail(person.id, person.email, newEmail);

			expect(result).toBe('changed');
			const updated = await reloadPerson(person.id);
			expect(updated.email).toBe(newEmail);

			const project = await Container.get(ProjectRepository).getPersonalProjectForUserOrFail(
				person.id,
			);
			expect(project.name).toContain(newEmail);
		});

		it('does not change the email when the current email does not match', async () => {
			const person = await createMember();

			const result = await personRepository.changeEmail(
				person.id,
				'stale@example.com',
				randomEmail(),
			);

			expect(result).toBe('stale');
			const updated = await reloadPerson(person.id);
			expect(updated.email).toBe(person.email);
		});

		it('reports when another account already owns the target email', async () => {
			const person = await createMember();
			const otherPerson = await createMember();

			const result = await personRepository.changeEmail(person.id, person.email, otherPerson.email);

			expect(result).toBe('email-taken');
		});

		it('does not change the email of a service account', async () => {
			const serviceAccount = await createServiceAccount();

			// Pass the stored (null) email, so only the Person filter can return 'stale'.
			const result = await personRepository.changeEmail(
				serviceAccount.id,
				null as unknown as string,
				randomEmail(),
			);

			expect(result).toBe('stale');
			expect(await readStoredEmail(serviceAccount.id)).toBeNull();
		});
	});

	describe('forCloudHooks()', () => {
		it('returns people only', async () => {
			const person = await createMember();
			await createServiceAccount();

			const users = await personRepository.forCloudHooks().find();

			expect(users.map((u) => u.id)).toEqual([person.id]);
			expect(await personRepository.forCloudHooks().count()).toBe(1);
		});
	});

	describe('ScimUserRepository.findPage()', () => {
		it('lists people only', async () => {
			const person = await createMember();
			await createServiceAccount();

			const [users, total] = await Container.get(ScimUserRepository).findPage(
				{ skip: 0, take: 10 },
				{},
			);

			expect(users.map((u) => u.id)).toEqual([person.id]);
			expect(total).toBe(1);
		});
	});
});
