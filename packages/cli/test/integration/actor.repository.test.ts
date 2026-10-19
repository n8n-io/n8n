import { createTeamProject, testDb } from '@n8n/backend-test-utils';
import {
	ActorRepository,
	GLOBAL_MEMBER_ROLE,
	ProjectRelationRepository,
	ServiceAccount,
	ServiceAccountRepository,
	User,
	UserRepository,
} from '@n8n/db';
import { Container } from '@n8n/di';
import { PROJECT_EDITOR_ROLE_SLUG } from '@n8n/permissions';

import { createMember } from './shared/db/users';

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

	test('stores a human with type human and a service account with type service', async () => {
		const human = await createMember();
		const serviceAccount = await createServiceAccount();

		const rows = await actorRepository.find({ order: { type: 'ASC' } });

		expect(rows.map((row) => [row.id, row.type])).toEqual([
			[human.id, 'human'],
			[serviceAccount.id, 'service'],
		]);
	});

	test('maps each row to its child entity', async () => {
		const human = await createMember();
		const serviceAccount = await createServiceAccount();

		const loadedHuman = await actorRepository.findByIdWithRole(human.id);
		const loadedServiceAccount = await actorRepository.findByIdWithRole(serviceAccount.id);

		expect(loadedHuman).toBeInstanceOf(User);
		expect(loadedHuman?.role.slug).toBe(GLOBAL_MEMBER_ROLE.slug);
		expect(loadedServiceAccount).toBeInstanceOf(ServiceAccount);
		expect(loadedServiceAccount?.role.slug).toBe(GLOBAL_MEMBER_ROLE.slug);
	});

	test('ActorRepository saves a service account instance with its own type', async () => {
		const saved = await actorRepository.save(
			Object.assign(new ServiceAccount(), { role: GLOBAL_MEMBER_ROLE }),
		);

		const loaded = await actorRepository.findByIdWithRole(saved.id);

		expect(loaded).toBeInstanceOf(ServiceAccount);
		expect(loaded?.type).toBe('service');
	});

	test('UserRepository returns humans only', async () => {
		const human = await createMember();
		const serviceAccount = await createServiceAccount();

		const users = await userRepository.find();
		const byId = await userRepository.findOneBy({ id: serviceAccount.id });

		expect(users.map((user) => user.id)).toEqual([human.id]);
		expect(await userRepository.count()).toBe(1);
		expect(byId).toBeNull();
	});

	test('a service account joins a project through the existing foreign key', async () => {
		const serviceAccount = await createServiceAccount();
		const project = await createTeamProject();
		const projectRelationRepository = Container.get(ProjectRelationRepository);

		await projectRelationRepository.save(
			projectRelationRepository.create({
				projectId: project.id,
				userId: serviceAccount.id,
				role: { slug: PROJECT_EDITOR_ROLE_SLUG },
			}),
		);

		const relation = await projectRelationRepository.findOne({
			where: { projectId: project.id, userId: serviceAccount.id },
			relations: ['user'],
		});

		expect(relation?.userId).toBe(serviceAccount.id);
		// The relation targets `Actor`, so TypeORM maps the row to its child class.
		expect(relation?.user).toBeInstanceOf(ServiceAccount);
		expect(relation?.user.type).toBe('service');
		expect(relation?.user.toIUser()).toEqual({
			id: serviceAccount.id,
			email: '',
			firstName: '',
			lastName: '',
		});
	});

	test('deleting a service account cascades like a user delete', async () => {
		const serviceAccount = await createServiceAccount();
		const project = await createTeamProject();
		const projectRelationRepository = Container.get(ProjectRelationRepository);
		await projectRelationRepository.save(
			projectRelationRepository.create({
				projectId: project.id,
				userId: serviceAccount.id,
				role: { slug: PROJECT_EDITOR_ROLE_SLUG },
			}),
		);

		await actorRepository.delete({ id: serviceAccount.id });

		expect(await projectRelationRepository.countBy({ userId: serviceAccount.id })).toBe(0);
	});
});
