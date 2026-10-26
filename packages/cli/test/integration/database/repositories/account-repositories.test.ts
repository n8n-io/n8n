import { testDb } from '@n8n/backend-test-utils';
import {
	User,
	UserRepository,
	GLOBAL_MEMBER_ROLE,
	isServiceAccount,
	isPerson,
	ServiceAccount,
	ServiceAccountRepository,
	Person,
	PersonRepository,
} from '@n8n/db';
import { Container } from '@n8n/di';
import { DataSource, type Repository } from '@n8n/typeorm';

import { createMember } from '../../shared/db/users';

describe('UserRepository (both kinds)', () => {
	let userRepository: UserRepository;
	// TypeORM repositories of the child entities. They show the `kind` filter on each query.
	let personTable: Repository<Person>;
	let serviceAccountTable: Repository<ServiceAccount>;

	beforeAll(async () => {
		await testDb.init();
		userRepository = Container.get(UserRepository);
		const dataSource = Container.get(DataSource);
		personTable = dataSource.getRepository(Person);
		serviceAccountTable = dataSource.getRepository(ServiceAccount);
	});

	beforeEach(async () => {
		await testDb.truncate(['User']);
	});

	afterAll(async () => {
		await testDb.terminate();
	});

	async function createServiceAccount() {
		return await serviceAccountTable.save(serviceAccountTable.create({ role: GLOBAL_MEMBER_ROLE }));
	}

	it('stores each account with its kind and loads it as its child entity', async () => {
		const person = await createMember();
		const serviceAccount = await createServiceAccount();

		const users = await userRepository.find({ relations: ['role'] });
		const byId = new Map(users.map((user) => [user.id, user]));

		expect(byId.get(person.id)).toBeInstanceOf(Person);
		expect(byId.get(person.id)?.kind).toBe('person');
		expect(byId.get(serviceAccount.id)).toBeInstanceOf(ServiceAccount);
		expect(byId.get(serviceAccount.id)?.kind).toBe('service');
		expect(byId.get(serviceAccount.id)?.role.slug).toBe(GLOBAL_MEMBER_ROLE.slug);
	});

	it('saves an instance with the kind of its class', async () => {
		const saved = await userRepository.save(
			Object.assign(new ServiceAccount(), { role: GLOBAL_MEMBER_ROLE }),
		);

		const loaded = await userRepository.findOneBy({ id: saved.id });

		expect(loaded).toBeInstanceOf(ServiceAccount);
		expect(loaded?.kind).toBe('service');
	});

	it('saves a new User() as a person', async () => {
		const saved = await userRepository.save(
			Object.assign(new User(), { role: GLOBAL_MEMBER_ROLE }),
		);

		const loaded = await userRepository.findOneBy({ id: saved.id });

		expect(loaded).toBeInstanceOf(Person);
		expect(loaded?.kind).toBe('person');
	});

	it('saves a created User as a person', async () => {
		const saved = await userRepository.save(userRepository.create({ role: GLOBAL_MEMBER_ROLE }));

		const loaded = await userRepository.findOneBy({ id: saved.id });

		expect(loaded).toBeInstanceOf(Person);
		expect(loaded?.kind).toBe('person');
	});

	it('sets the kind on a newly saved account', async () => {
		const serviceAccount = await createServiceAccount();
		const person = await personTable.save(personTable.create({ role: GLOBAL_MEMBER_ROLE }));

		expect(serviceAccount.kind).toBe('service');
		expect(person.kind).toBe('person');
	});

	it('does not change the kind on update', async () => {
		const serviceAccount = await createServiceAccount();

		await userRepository.update({ id: serviceAccount.id }, {
			kind: 'person',
			disabled: true,
		} as Partial<User>);

		const loaded = await userRepository.findOneBy({ id: serviceAccount.id });
		expect(loaded).toBeInstanceOf(ServiceAccount);
		expect(loaded?.disabled).toBe(true);
	});

	it('returns a bare User for a partial select, which neither guard accepts', async () => {
		const serviceAccount = await createServiceAccount();

		const [partial] = await userRepository.find({
			select: { id: true },
			where: { id: serviceAccount.id },
		});

		expect(isPerson(partial)).toBe(false);
		expect(isServiceAccount(partial)).toBe(false);
		expect(JSON.stringify(Object.assign(partial, { password: 'secret' }))).not.toContain('secret');
	});

	it('declares every lifecycle hook on User, so it runs on both kinds', () => {
		const { ownListeners } = Container.get(DataSource).getMetadata(User);

		// A hook declared on a child runs on rows of the other child too, and fails there.
		const declaredOnChild = ownListeners.filter(
			({ target }) =>
				target !== User && !(typeof target === 'function' && User.prototype instanceof target),
		);
		expect(declaredOnChild.map(({ propertyName }) => propertyName)).toEqual([]);
	});

	describe('Person entity', () => {
		it('saves a plain object twice without a NOT NULL error', async () => {
			const person = await createMember();
			const partial: Partial<Person> = { id: person.id, firstName: 'Ada' };

			await personTable.save(partial);
			partial.firstName = 'Grace';

			await expect(personTable.save(partial)).resolves.toBeDefined();
		});

		it('does not return service accounts', async () => {
			const person = await createMember();
			const serviceAccount = await createServiceAccount();

			const users = await personTable.find();
			const fromQueryBuilder = await personTable.createQueryBuilder('user').getMany();

			expect(users.map((user) => user.id)).toEqual([person.id]);
			expect(fromQueryBuilder.map((user) => user.id)).toEqual([person.id]);
			expect(await personTable.findOneBy({ id: serviceAccount.id })).toBeNull();
			expect(await personTable.count()).toBe(1);
		});

		it('does not delete service accounts', async () => {
			const serviceAccount = await createServiceAccount();

			await personTable.delete({});

			expect(await serviceAccountTable.existsBy({ id: serviceAccount.id })).toBe(true);
		});
	});

	describe('PersonRepository', () => {
		it('finds a person by id, but not a service account', async () => {
			const personRepository = Container.get(PersonRepository);
			const person = await createMember();
			const serviceAccount = await createServiceAccount();

			expect(await personRepository.findById(person.id)).toBeInstanceOf(Person);
			expect(await personRepository.findById(serviceAccount.id)).toBeNull();
		});
	});

	describe('testDb.truncate', () => {
		it("clears people and service accounts for 'User'", async () => {
			await createMember();
			await createServiceAccount();

			await testDb.truncate(['User']);

			expect(await userRepository.count()).toBe(0);
		});

		it("clears only service accounts for 'ServiceAccount'", async () => {
			const person = await createMember();
			await createServiceAccount();

			await testDb.truncate(['ServiceAccount']);

			const users = await userRepository.find();
			expect(users.map((user) => user.id)).toEqual([person.id]);
		});
	});

	describe('ServiceAccount entity', () => {
		it('does not return people', async () => {
			await createMember();
			const serviceAccount = await createServiceAccount();

			const serviceAccounts = await serviceAccountTable.find();

			expect(serviceAccounts.map((account) => account.id)).toEqual([serviceAccount.id]);
		});
	});

	describe('ServiceAccountRepository', () => {
		it('finds a service account by id, but not a person', async () => {
			const serviceAccountRepository = Container.get(ServiceAccountRepository);
			const person = await createMember();
			const serviceAccount = await createServiceAccount();

			expect(await serviceAccountRepository.findById(serviceAccount.id)).toBeInstanceOf(
				ServiceAccount,
			);
			expect(await serviceAccountRepository.findById(person.id)).toBeNull();
		});
	});
});
