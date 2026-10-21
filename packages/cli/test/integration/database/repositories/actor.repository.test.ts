import { testDb } from '@n8n/backend-test-utils';
import {
	Actor,
	ActorRepository,
	GLOBAL_MEMBER_ROLE,
	isServiceAccount,
	isUser,
	ServiceAccount,
	ServiceAccountRepository,
	User,
	UserRepository,
} from '@n8n/db';
import { Container } from '@n8n/di';
import { DataSource } from '@n8n/typeorm';

import { createMember } from '../../shared/db/users';

describe('ActorRepository', () => {
	let actorRepository: ActorRepository;
	let userRepository: UserRepository;
	let serviceAccountRepository: ServiceAccountRepository;

	beforeAll(async () => {
		await testDb.init();
		actorRepository = Container.get(ActorRepository);
		userRepository = Container.get(UserRepository);
		serviceAccountRepository = Container.get(ServiceAccountRepository);
	});

	beforeEach(async () => {
		await testDb.truncate(['User']);
	});

	afterAll(async () => {
		await testDb.terminate();
	});

	async function createServiceAccount() {
		return await serviceAccountRepository.save(
			serviceAccountRepository.create({ role: GLOBAL_MEMBER_ROLE }),
		);
	}

	it('stores each account with its kind and loads it as its child entity', async () => {
		const human = await createMember();
		const serviceAccount = await createServiceAccount();

		const actors = await actorRepository.find({ relations: ['role'] });
		const byId = new Map(actors.map((actor) => [actor.id, actor]));

		expect(byId.get(human.id)).toBeInstanceOf(User);
		expect(byId.get(human.id)?.kind).toBe('human');
		expect(byId.get(serviceAccount.id)).toBeInstanceOf(ServiceAccount);
		expect(byId.get(serviceAccount.id)?.kind).toBe('service');
		expect(byId.get(serviceAccount.id)?.role.slug).toBe(GLOBAL_MEMBER_ROLE.slug);
	});

	it('saves an instance with the kind of its class', async () => {
		const saved = await actorRepository.save(
			Object.assign(new ServiceAccount(), { role: GLOBAL_MEMBER_ROLE }),
		);

		const loaded = await actorRepository.findOneBy({ id: saved.id });

		expect(loaded).toBeInstanceOf(ServiceAccount);
		expect(loaded?.kind).toBe('service');
	});

	it('rejects a plain object on save', async () => {
		const plainObject = { role: GLOBAL_MEMBER_ROLE } as unknown as ServiceAccount;

		await expect(actorRepository.save(plainObject)).rejects.toThrow(
			'ActorRepository.save accepts only User or ServiceAccount instances',
		);
	});

	it('sets the kind on a newly saved account', async () => {
		const serviceAccount = await createServiceAccount();
		const human = await userRepository.save(userRepository.create({ role: GLOBAL_MEMBER_ROLE }));

		expect(serviceAccount.kind).toBe('service');
		expect(human.kind).toBe('human');
	});

	it('rejects insert and upsert', async () => {
		await expect(actorRepository.insert()).rejects.toThrow(
			'Use UserRepository or ServiceAccountRepository to insert',
		);
		await expect(actorRepository.upsert()).rejects.toThrow(
			'Use UserRepository or ServiceAccountRepository to upsert',
		);
	});

	it('does not change the kind on update', async () => {
		const serviceAccount = await createServiceAccount();

		await actorRepository.update({ id: serviceAccount.id }, {
			kind: 'human',
			disabled: true,
		} as Partial<Actor>);

		const loaded = await actorRepository.findOneBy({ id: serviceAccount.id });
		expect(loaded).toBeInstanceOf(ServiceAccount);
		expect(loaded?.disabled).toBe(true);
	});

	it('returns a bare Actor for a partial select, which neither guard accepts', async () => {
		const serviceAccount = await createServiceAccount();

		const [partial] = await actorRepository.find({
			select: { id: true },
			where: { id: serviceAccount.id },
		});

		expect(isUser(partial)).toBe(false);
		expect(isServiceAccount(partial)).toBe(false);
		expect(JSON.stringify(Object.assign(partial, { password: 'secret' }))).not.toContain('secret');
	});

	it('declares every lifecycle hook on Actor, so it runs on both kinds', () => {
		const { ownListeners } = Container.get(DataSource).getMetadata(Actor);

		// A hook declared on a child runs on rows of the other child too, and fails there.
		const declaredOnChild = ownListeners.filter(
			({ target }) =>
				target !== Actor && !(typeof target === 'function' && Actor.prototype instanceof target),
		);
		expect(declaredOnChild.map(({ propertyName }) => propertyName)).toEqual([]);
	});

	describe('UserRepository', () => {
		it('saves a plain object twice without a NOT NULL error', async () => {
			const human = await createMember();
			const partial: Partial<User> = { id: human.id, firstName: 'Ada' };

			await userRepository.save(partial);
			partial.firstName = 'Grace';

			await expect(userRepository.save(partial)).resolves.toBeDefined();
		});

		it('does not return service accounts', async () => {
			const human = await createMember();
			const serviceAccount = await createServiceAccount();

			const users = await userRepository.find();
			const fromQueryBuilder = await userRepository.createQueryBuilder('user').getMany();

			expect(users.map((user) => user.id)).toEqual([human.id]);
			expect(fromQueryBuilder.map((user) => user.id)).toEqual([human.id]);
			expect(await userRepository.findOneBy({ id: serviceAccount.id })).toBeNull();
			expect(await userRepository.count()).toBe(1);
			expect(await userRepository.countUsersByRole()).toEqual({ [GLOBAL_MEMBER_ROLE.slug]: 1 });
		});

		it('does not delete service accounts', async () => {
			const serviceAccount = await createServiceAccount();

			await userRepository.delete({});

			expect(await serviceAccountRepository.existsBy({ id: serviceAccount.id })).toBe(true);
		});
	});

	describe('testDb.truncate', () => {
		it("clears humans and service accounts for 'User'", async () => {
			await createMember();
			await createServiceAccount();

			await testDb.truncate(['User']);

			expect(await actorRepository.count()).toBe(0);
		});

		it("clears only service accounts for 'ServiceAccount'", async () => {
			const human = await createMember();
			await createServiceAccount();

			await testDb.truncate(['ServiceAccount']);

			const actors = await actorRepository.find();
			expect(actors.map((actor) => actor.id)).toEqual([human.id]);
		});
	});

	describe('ServiceAccountRepository', () => {
		it('does not return users', async () => {
			await createMember();
			const serviceAccount = await createServiceAccount();

			const serviceAccounts = await serviceAccountRepository.find();

			expect(serviceAccounts.map((account) => account.id)).toEqual([serviceAccount.id]);
		});
	});
});
