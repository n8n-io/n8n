import { testDb } from '@n8n/backend-test-utils';
import {
	ActorRepository,
	GLOBAL_MEMBER_ROLE,
	ServiceAccount,
	ServiceAccountRepository,
	User,
	UserRepository,
} from '@n8n/db';
import { Container } from '@n8n/di';

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
		// `User` would delete humans only.
		await testDb.truncate(['Actor']);
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

	describe('UserRepository', () => {
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

	describe('ServiceAccountRepository', () => {
		it('does not return users', async () => {
			await createMember();
			const serviceAccount = await createServiceAccount();

			const serviceAccounts = await serviceAccountRepository.find();

			expect(serviceAccounts.map((account) => account.id)).toEqual([serviceAccount.id]);
		});
	});
});
