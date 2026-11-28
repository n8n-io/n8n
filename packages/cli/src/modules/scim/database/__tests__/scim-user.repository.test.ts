import {
	AuthIdentity,
	BaseRepository,
	Person,
	type OperationContext,
	type PersonRepository,
	type Project,
	type TransactionRunner,
} from '@n8n/db';
import { GLOBAL_MEMBER_ROLE_SLUG } from '@n8n/permissions';
import type { DataSource, EntityManager, SelectQueryBuilder } from '@n8n/typeorm';
import { mock } from 'vitest-mock-extended';

import { ScimUserRepository, type ProvisionedPersonInput } from '../scim-user.repository';

function createFixture() {
	const qb = mock<SelectQueryBuilder<Person>>();
	qb.leftJoinAndSelect.mockReturnThis();
	qb.orderBy.mockReturnThis();
	qb.addOrderBy.mockReturnThis();
	qb.where.mockReturnThis();
	qb.skip.mockReturnThis();
	qb.take.mockReturnThis();

	const manager = mock<EntityManager>({
		createQueryBuilder: vi.fn().mockReturnValue(qb),
	});

	const dataSource = mock<DataSource>({ manager });
	const transactionRunner = mock<TransactionRunner>();
	transactionRunner.run.mockImplementation(async (ctx, fn) => await fn(ctx));

	const personRepository = mock<PersonRepository>();
	const repository = new ScimUserRepository(dataSource, transactionRunner, personRepository);

	return { repository, dataSource, manager, qb, transactionRunner, personRepository };
}

const makePerson = (overrides: Partial<Person> = {}): Person =>
	Object.assign(new Person(), {
		id: 'person-1',
		email: 'alice@example.com',
		firstName: 'Alice',
		lastName: 'Smith',
		disabled: false,
		...overrides,
	});

const makeProvisionedInput = (): ProvisionedPersonInput => ({
	email: 'alice@example.com',
	firstName: 'Alice',
	lastName: 'Smith',
	password: 'hashed-password',
	disabled: false,
	role: { slug: GLOBAL_MEMBER_ROLE_SLUG },
});

describe('ScimUserRepository', () => {
	it('composes BaseRepository instead of extending it', () => {
		const { repository } = createFixture();

		expect(repository).not.toBeInstanceOf(BaseRepository);
	});

	describe('findPage', () => {
		it('queries people ordered by createdAt and id without a filter', async () => {
			const { repository, manager, qb } = createFixture();
			const people = [makePerson()];
			qb.getCount.mockResolvedValue(1);
			qb.getMany.mockResolvedValue(people);

			const result = await repository.findPage({ skip: 10, take: 25 }, {});

			expect(result).toEqual([people, 1]);
			expect(manager.createQueryBuilder).toHaveBeenCalledWith(Person, 'user');
			expect(qb.leftJoinAndSelect).toHaveBeenCalledWith('user.authIdentities', 'authIdentity');
			expect(qb.orderBy).toHaveBeenCalledWith('user.createdAt', 'ASC');
			expect(qb.addOrderBy).toHaveBeenCalledWith('user.id', 'ASC');
			expect(qb.where).not.toHaveBeenCalled();
			expect(qb.skip).toHaveBeenCalledWith(10);
			expect(qb.take).toHaveBeenCalledWith(25);
			expect(qb.getMany).toHaveBeenCalledTimes(1);
		});

		it('filters case-insensitively by email when filter attribute is userName', async () => {
			const { repository, qb } = createFixture();
			const people = [makePerson()];
			qb.getCount.mockResolvedValue(1);
			qb.getMany.mockResolvedValue(people);

			const result = await repository.findPage(
				{ skip: 0, take: 10, filter: { attribute: 'userName', value: 'Alice@Example.com' } },
				{},
			);

			expect(result).toEqual([people, 1]);
			expect(qb.where).toHaveBeenCalledWith('LOWER(user.email) = LOWER(:email)', {
				email: 'Alice@Example.com',
			});
		});

		it('filters by providerId and providerTypes when filter attribute is externalId', async () => {
			const { repository, qb } = createFixture();
			const people = [makePerson()];
			qb.getCount.mockResolvedValue(1);
			qb.getMany.mockResolvedValue(people);

			const result = await repository.findPage(
				{
					skip: 0,
					take: 10,
					filter: {
						attribute: 'externalId',
						value: 'idp-ext-1',
						providerTypes: ['saml', 'oidc'],
					},
				},
				{},
			);

			expect(result).toEqual([people, 1]);
			expect(qb.where).toHaveBeenCalledWith(
				'authIdentity.providerId = :externalId AND authIdentity.providerType IN (:...providerTypes)',
				{ externalId: 'idp-ext-1', providerTypes: ['saml', 'oidc'] },
			);
		});

		it('returns an empty list with the total count when take is 0', async () => {
			const { repository, qb } = createFixture();
			qb.getCount.mockResolvedValue(42);

			const result = await repository.findPage({ skip: 0, take: 0 }, {});

			expect(result).toEqual([[], 42]);
			expect(qb.getCount).toHaveBeenCalledTimes(1);
			expect(qb.skip).not.toHaveBeenCalled();
			expect(qb.take).not.toHaveBeenCalled();
			expect(qb.getMany).not.toHaveBeenCalled();
		});
	});

	describe('createProvisioned', () => {
		it('creates the person and links the auth identity inside a transaction', async () => {
			const { repository, manager, transactionRunner, personRepository } = createFixture();
			const input = makeProvisionedInput();
			const created = makePerson();
			const authIdentity = AuthIdentity.create(created, 'idp-ext-1', 'saml');
			const ctx: OperationContext = {};

			personRepository.createPersonWithProject.mockResolvedValue({
				user: created,
				project: mock<Project>(),
			});
			manager.create.mockReturnValue(authIdentity);
			manager.save.mockResolvedValue(authIdentity);

			const result = await repository.createProvisioned(
				input,
				{ providerId: 'idp-ext-1', providerType: 'saml' },
				ctx,
			);

			expect(result).toBe(created);
			expect(transactionRunner.run).toHaveBeenCalledWith(ctx, expect.any(Function));
			expect(personRepository.createPersonWithProject).toHaveBeenCalledWith(input, manager);
			expect(manager.create).toHaveBeenCalledWith(AuthIdentity, {
				providerId: 'idp-ext-1',
				providerType: 'saml',
				userId: created.id,
			});
			expect(manager.save).toHaveBeenCalledWith(authIdentity);
		});

		it('creates the person without saving an auth identity when identity is undefined', async () => {
			const { repository, manager, transactionRunner, personRepository } = createFixture();
			const input = makeProvisionedInput();
			const created = makePerson();
			const ctx: OperationContext = {};

			personRepository.createPersonWithProject.mockResolvedValue({
				user: created,
				project: mock<Project>(),
			});

			const result = await repository.createProvisioned(input, undefined, ctx);

			expect(result).toBe(created);
			expect(transactionRunner.run).toHaveBeenCalledWith(ctx, expect.any(Function));
			expect(personRepository.createPersonWithProject).toHaveBeenCalledWith(input, manager);
			expect(manager.create).not.toHaveBeenCalled();
			expect(manager.save).not.toHaveBeenCalled();
		});
	});
});
