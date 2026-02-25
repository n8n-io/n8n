import type { UsersListFilterDto } from '@n8n/api-types';
import { randomEmail, testDb } from '@n8n/backend-test-utils';
import { ProjectRelationRepository, type User, UserRepository } from '@n8n/db';
import { Container } from '@n8n/di';

import { createAdmin, createChatUser, createMember, createOwner } from './shared/db/users';

describe('UserRepository', () => {
	let userRepository: UserRepository;

	beforeAll(async () => {
		await testDb.init();

		userRepository = Container.get(UserRepository);

		await testDb.truncate(['User']);
	});

	afterAll(async () => {
		await testDb.terminate();
	});

	describe('countUsersByRole()', () => {
		test('should return the number of users in each role', async () => {
			await Promise.all([
				createOwner(),
				createAdmin(),
				createAdmin(),
				createMember(),
				createMember(),
				createMember(),
				createChatUser(),
			]);

			const usersByRole = await userRepository.countUsersByRole();

			expect(usersByRole).toStrictEqual({
				'global:admin': 2,
				'global:member': 3,
				'global:owner': 1,
				'global:chatUser': 1,
			});
		});
	});

	describe('createUserWithProject()', () => {
		test('should create personal project for a user', async () => {
			const { user, project } = await userRepository.createUserWithProject({
				email: randomEmail(),
				role: { slug: 'global:member' },
			});

			const projectRelation = await Container.get(ProjectRelationRepository).findOneOrFail({
				where: {
					userId: user.id,
					project: {
						type: 'personal',
					},
				},
				relations: ['project'],
			});

			expect(projectRelation.project.id).toBe(project.id);
		});

		test('should create personal project for a chat user', async () => {
			const { user, project } = await userRepository.createUserWithProject({
				email: randomEmail(),
				role: { slug: 'global:chatUser' },
			});

			const projectRelation = await Container.get(ProjectRelationRepository).findOneOrFail({
				where: {
					userId: user.id,
					project: {
						type: 'personal',
					},
				},
				relations: ['project'],
			});

			expect(projectRelation.project.id).toBe(project.id);
		});
	});

	describe('buildUserQuery()', () => {
		let user1: User;
		let user2: User;
		let user3: User;

		beforeAll(async () => {
			await testDb.truncate(['User']);
			[user1, user2, user3] = await Promise.all([createMember(), createMember(), createMember()]);
		});

		describe('ids filter', () => {
			test('should return only users matching the provided ids', async () => {
				const options: UsersListFilterDto = {
					filter: { ids: [user1.id, user2.id] },
					take: 10,
					skip: 0,
				};

				const query = userRepository.buildUserQuery(options);
				const [users, count] = await query.getManyAndCount();

				expect(count).toBe(2);
				expect(users.map((u) => u.id).sort()).toStrictEqual([user1.id, user2.id].sort());
			});

			test('should return all users when ids is not provided', async () => {
				const options: UsersListFilterDto = {
					filter: {},
					take: 10,
					skip: 0,
				};

				const query = userRepository.buildUserQuery(options);
				const [users, count] = await query.getManyAndCount();

				expect(count).toBe(3);
				expect(users.map((u) => u.id).sort()).toStrictEqual([user1.id, user2.id, user3.id].sort());
			});

			test('should return all users when ids is an empty array', async () => {
				const options: UsersListFilterDto = {
					filter: { ids: [] },
					take: 10,
					skip: 0,
				};

				const query = userRepository.buildUserQuery(options);
				const [users, count] = await query.getManyAndCount();

				expect(count).toBe(3);
				expect(users.map((u) => u.id).sort()).toStrictEqual([user1.id, user2.id, user3.id].sort());
			});
		});
	});
});
