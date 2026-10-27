import { Container } from '@n8n/di';
import type { EntityManager } from '@n8n/typeorm';
import { In, IsNull, Not, QueryFailedError } from '@n8n/typeorm';
import { mock } from 'vitest-mock-extended';

import { Person } from '../../entities';
import { mockEntityManager } from '../../utils/test-utils/mock-entity-manager';
import { PersonRepository } from '../person.repository';

describe('PersonRepository', () => {
	const entityManager = mockEntityManager(Person);
	const repository = Container.get(PersonRepository);

	beforeEach(() => {
		vi.resetAllMocks();
	});

	describe('lookups', () => {
		it('finds a person by id', async () => {
			await repository.findById('id-1');

			expect(entityManager.findOneBy).toHaveBeenCalledWith(Person, { id: 'id-1' });
		});

		it('finds a person by id with the role', async () => {
			await repository.findByIdWithRole('id-1');

			expect(entityManager.findOne).toHaveBeenCalledWith(Person, {
				where: { id: 'id-1' },
				relations: ['role'],
			});
		});

		it('finds a person by id with the auth identities and the role', async () => {
			await repository.findByIdWithAuthIdentities('id-1');

			expect(entityManager.findOne).toHaveBeenCalledWith(Person, {
				where: { id: 'id-1' },
				relations: ['authIdentities', 'role'],
			});
		});

		it('finds a person by email', async () => {
			await repository.findByEmail('a@b.c');

			expect(entityManager.findOneBy).toHaveBeenCalledWith(Person, { email: 'a@b.c' });
		});

		it('finds a person by email with the auth identities and the role', async () => {
			await repository.findByEmailWithAuthIdentities('a@b.c');

			expect(entityManager.findOne).toHaveBeenCalledWith(Person, {
				where: { email: 'a@b.c' },
				relations: ['authIdentities', 'role'],
			});
		});

		it('finds only a person who has set a password', async () => {
			await repository.findSetUpByEmail('a@b.c');

			expect(entityManager.findOne).toHaveBeenCalledWith(Person, {
				where: { email: 'a@b.c', password: Not(IsNull()) },
				relations: ['authIdentities', 'role'],
			});
		});

		it('finds a person by LDAP id', async () => {
			await repository.findByLdapId('ldap-1');

			expect(entityManager.findOne).toHaveBeenCalledWith(Person, {
				where: { authIdentities: { providerId: 'ldap-1', providerType: 'ldap' } },
				relations: { role: true },
			});
		});

		it('returns the emails of people who have set a password', async () => {
			await repository.getEmailsByIds(['id-1', 'id-2']);

			expect(entityManager.find).toHaveBeenCalledWith(Person, {
				select: ['id', 'email'],
				where: { id: In(['id-1', 'id-2']), password: Not(IsNull()) },
			});
		});

		it('finds people by ids in id order', async () => {
			await repository.findManyByIds(['id-2', 'id-1']);

			expect(entityManager.find).toHaveBeenCalledWith(Person, {
				where: { id: In(['id-2', 'id-1']) },
				order: { id: 'ASC' },
			});
		});

		it('counts people with MFA enabled', async () => {
			entityManager.count.mockResolvedValueOnce(3);

			expect(await repository.countWithMfaEnabled()).toBe(3);
			expect(entityManager.count).toHaveBeenCalledWith(Person, { where: { mfaEnabled: true } });
		});
	});

	describe('writes', () => {
		it('saves a person', async () => {
			const person = Object.assign(new Person(), { id: 'id-1' });

			await repository.save(person);

			expect(entityManager.save).toHaveBeenCalledWith(Person, person);
		});

		it('saves the survey answers', async () => {
			await repository.saveSurveyAnswers('id-1', { companySize: '20-99' });

			expect(entityManager.update).toHaveBeenCalledWith(
				Person,
				{ id: 'id-1' },
				{ personalizationAnswers: { companySize: '20-99' } },
			);
		});

		it('disables MFA', async () => {
			await repository.disableMfa('id-1');

			expect(entityManager.update).toHaveBeenCalledWith(
				Person,
				{ id: 'id-1' },
				{ mfaEnabled: false, mfaSecret: null, mfaRecoveryCodes: [] },
			);
		});
	});

	describe('changeEmail', () => {
		function mockTransaction(dbType: 'sqlite' | 'postgres') {
			const trx = mock<EntityManager>();
			Object.assign(trx, { connection: { options: { type: dbType } } });
			entityManager.transaction.mockImplementation(
				async (run: unknown) => await (run as (em: EntityManager) => Promise<unknown>)(trx),
			);
			return trx;
		}

		it('changes the email when the current email matches', async () => {
			const trx = mockTransaction('sqlite');
			const person = Object.assign(new Person(), { id: 'id-1', email: 'old@b.c' });
			trx.findOne.mockResolvedValueOnce(person);

			const result = await repository.changeEmail('id-1', 'old@b.c', 'new@b.c');

			expect(result).toBe('changed');
			expect(trx.findOne).toHaveBeenCalledWith(Person, { where: { id: 'id-1' } });
			expect(trx.save).toHaveBeenCalledWith(Person, expect.objectContaining({ email: 'new@b.c' }));
		});

		it('locks the row on PostgreSQL', async () => {
			const trx = mockTransaction('postgres');
			trx.findOne.mockResolvedValueOnce(
				Object.assign(new Person(), { id: 'id-1', email: 'old@b.c' }),
			);

			await repository.changeEmail('id-1', 'old@b.c', 'new@b.c');

			expect(trx.findOne).toHaveBeenCalledWith(Person, {
				where: { id: 'id-1' },
				lock: { mode: 'pessimistic_write' },
			});
		});

		it('returns stale when the current email does not match', async () => {
			const trx = mockTransaction('sqlite');
			trx.findOne.mockResolvedValueOnce(
				Object.assign(new Person(), { id: 'id-1', email: 'other@b.c' }),
			);

			expect(await repository.changeEmail('id-1', 'old@b.c', 'new@b.c')).toBe('stale');
			expect(trx.save).not.toHaveBeenCalled();
		});

		it('returns stale when no person has the id', async () => {
			const trx = mockTransaction('sqlite');
			trx.findOne.mockResolvedValueOnce(null);

			expect(await repository.changeEmail('id-1', 'old@b.c', 'new@b.c')).toBe('stale');
		});

		it('returns email-taken on a unique-constraint error', async () => {
			const trx = mockTransaction('sqlite');
			trx.findOne.mockResolvedValueOnce(
				Object.assign(new Person(), { id: 'id-1', email: 'old@b.c' }),
			);
			trx.save.mockRejectedValueOnce(
				new QueryFailedError(
					'Query',
					[],
					Object.assign(new Error('UNIQUE constraint failed'), {
						code: 'SQLITE_CONSTRAINT_UNIQUE',
					}),
				),
			);

			expect(await repository.changeEmail('id-1', 'old@b.c', 'new@b.c')).toBe('email-taken');
		});

		it('throws any other error', async () => {
			const trx = mockTransaction('sqlite');
			trx.findOne.mockResolvedValueOnce(
				Object.assign(new Person(), { id: 'id-1', email: 'old@b.c' }),
			);
			trx.save.mockRejectedValueOnce(new Error('connection lost'));

			await expect(repository.changeEmail('id-1', 'old@b.c', 'new@b.c')).rejects.toThrow(
				'connection lost',
			);
		});
	});

	describe('forCloudHooks', () => {
		it('returns a repository for people', () => {
			expect(repository.forCloudHooks().metadata.target).toBe(Person);
		});
	});
});
