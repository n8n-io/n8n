import type { UsersListFilterDto } from '@n8n/api-types';
import { createTeamProject, linkUserToProject, randomEmail, testDb } from '@n8n/backend-test-utils';
import { ProjectRelationRepository, type User, UserRepository } from '@n8n/db';
import { Container } from '@n8n/di';

import {
	createAdmin,
	createChatUser,
	createLdapUser,
	createMember,
	createOwner,
	createUser,
} from './shared/db/users';

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

	describe('findMany()', () => {
		let users: User[];

		beforeAll(async () => {
			await testDb.truncate(['User']);
			users = await Promise.all([createMember(), createMember(), createMember()]);
		});

		test('should return offset pages in stable id order', async () => {
			const expectedIds = users.map((user) => user.id).sort();

			const page1 = await userRepository.findMany({ offset: 0, limit: 2 });
			const page2 = await userRepository.findMany({ offset: 2, limit: 2 });

			expect(page1.map((user) => user.id)).toEqual(expectedIds.slice(0, 2));
			expect(page2.map((user) => user.id)).toEqual(expectedIds.slice(2));
		});
	});

	describe('findManyByIds()', () => {
		let users: User[];

		beforeAll(async () => {
			await testDb.truncate(['User']);
			users = await Promise.all([createMember(), createMember(), createMember()]);
		});

		test('should return offset pages in stable id order', async () => {
			const expectedIds = users.map((user) => user.id).sort();
			const ids = [...expectedIds].reverse();

			const page1 = await userRepository.findManyByIds(ids, { offset: 0, limit: 2 });
			const page2 = await userRepository.findManyByIds(ids, { offset: 2, limit: 2 });

			expect(page1.map((user) => user.id)).toEqual(expectedIds.slice(0, 2));
			expect(page2.map((user) => user.id)).toEqual(expectedIds.slice(2));
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

		describe('projectId filter', () => {
			test('should return only users who are members of the project', async () => {
				await testDb.truncate(['ProjectRelation', 'Project', 'User']);
				const [u1, u2, u3] = await Promise.all([createMember(), createMember(), createMember()]);
				const project = await createTeamProject();
				await Promise.all([
					linkUserToProject(u1, project, 'project:admin'),
					linkUserToProject(u2, project, 'project:viewer'),
				]);

				const options: UsersListFilterDto = {
					filter: { projectId: project.id },
					take: 10,
					skip: 0,
				};

				const query = userRepository.buildUserQuery(options);
				const [users, count] = await query.getManyAndCount();

				expect(count).toBe(2);
				expect(users.map((u) => u.id).sort()).toStrictEqual([u1.id, u2.id].sort());
				expect(users.map((u) => u.id)).not.toContain(u3.id);
			});
		});
	});

	describe('users list status', () => {
		let disabledIds: string[];

		beforeAll(async () => {
			await testDb.truncate(['ProjectRelation', 'Project', 'User']);
			await createOwner();
			const users = await Promise.all(Array.from({ length: 9 }, async () => await createMember()));
			disabledIds = users.slice(0, 2).map(({ id }) => id);
			await userRepository.update(disabledIds, { disabled: true });
		});

		test('should apply the other filters to the counts', async () => {
			await expect(
				userRepository.countUsersListStatuses({ ids: [disabledIds[0], disabledIds[1]] }),
			).resolves.toEqual({ all: 2, active: 0, deactivated: 2 });
			await expect(userRepository.countUsersListStatuses({ isOwner: true })).resolves.toEqual({
				all: 1,
				active: 1,
				deactivated: 0,
			});
		});

		test('should count users in a project once each', async () => {
			const project = await createTeamProject();
			const [disabledUser] = await userRepository.findBy({ id: disabledIds[0] });
			const owner = await userRepository.findOneByOrFail({ role: { slug: 'global:owner' } });
			await linkUserToProject(disabledUser, project, 'project:viewer');
			await linkUserToProject(owner, project, 'project:admin');

			await expect(
				userRepository.countUsersListStatuses({ projectId: project.id }),
			).resolves.toEqual({ all: 2, active: 1, deactivated: 1 });
		});

		test('should count zero users without matches', async () => {
			await expect(
				userRepository.countUsersListStatuses({ email: 'nobody@example.com' }),
			).resolves.toEqual({ all: 0, active: 0, deactivated: 0 });
		});
	});

	describe('findAllWithRoleAndAuthIdentities()', () => {
		beforeEach(async () => {
			await testDb.truncate(['User', 'AuthIdentity']);
		});

		test('should load the role and the auth identities of every user without the role scopes', async () => {
			const owner = await createOwner();
			const member = await createMember();
			const ldapUser = await createLdapUser({ password: null }, 'ldap-user');
			const pendingUser = await createUser({ password: null });

			const findSpy = vi.spyOn(userRepository, 'find');
			const users = await userRepository.findAllWithRoleAndAuthIdentities();
			const findOptions = findSpy.mock.calls[0][0];
			findSpy.mockRestore();

			const byId = new Map(users.map((user) => [user.id, user]));
			expect([...byId.keys()].sort()).toEqual(
				[owner.id, member.id, ldapUser.id, pendingUser.id].sort(),
			);
			expect(byId.get(owner.id)?.role.slug).toBe('global:owner');
			expect(byId.get(member.id)?.role.slug).toBe('global:member');
			expect(byId.get(ldapUser.id)?.authIdentities).toHaveLength(1);
			expect(byId.get(ldapUser.id)?.isPending).toBe(false);
			expect(byId.get(pendingUser.id)?.isPending).toBe(true);
			expect(byId.get(owner.id)?.role.scopes).toBeUndefined();

			const [sql, parameters] = userRepository
				.createQueryBuilder('User')
				.setFindOptions(findOptions ?? {})
				.getQueryAndParameters();
			expect(sql).not.toContain('role_scope');
			expect(await userRepository.query(sql, parameters)).toHaveLength(4);
		});
	});
});
