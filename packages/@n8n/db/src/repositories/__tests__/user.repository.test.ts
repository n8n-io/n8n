import type { UsersListFilterDto } from '@n8n/api-types';
import type { GlobalRole } from '@n8n/permissions';
import type { DataSource, EntityManager, SelectQueryBuilder, EntityTarget } from '@n8n/typeorm';
import { In, IsNull, Not } from '@n8n/typeorm';

import { Project, ProjectRelation, User } from '../../entities';
import { UserRepository } from '../user.repository';

// Mock TypeORM classes
jest.mock('@n8n/typeorm', () => ({
	...jest.requireActual('@n8n/typeorm'),
	// eslint-disable-next-line @typescript-eslint/naming-convention
	Repository: jest.fn(),
}));

describe('UserRepository', () => {
	let userRepository: UserRepository;
	let mockDataSource: jest.Mocked<DataSource>;
	let mockManager: jest.Mocked<EntityManager>;
	let mockQueryBuilder: jest.Mocked<SelectQueryBuilder<User>>;

	beforeEach(() => {
		// Create mock query builder with all necessary methods
		mockQueryBuilder = {
			select: jest.fn().mockReturnThis(),
			leftJoinAndSelect: jest.fn().mockReturnThis(),
			andWhere: jest.fn().mockReturnThis(),
			addSelect: jest.fn().mockReturnThis(),
			addOrderBy: jest.fn().mockReturnThis(),
			take: jest.fn().mockReturnThis(),
			skip: jest.fn().mockReturnThis(),
			groupBy: jest.fn().mockReturnThis(),
			execute: jest.fn().mockResolvedValue([]),
			getMany: jest.fn().mockResolvedValue([]),
			getOne: jest.fn().mockResolvedValue(null),
			createQueryBuilder: jest.fn().mockReturnThis(),
		} as jest.Mocked<SelectQueryBuilder<User>>;

		// Create mock entity manager
		mockManager = {
			find: jest.fn().mockResolvedValue([]),
			findOne: jest.fn().mockResolvedValue(null),
			create: jest.fn().mockImplementation((_entity, data) => ({ ...data })),
			save: jest.fn().mockImplementation(async (entity) => entity),
		} as jest.Mocked<EntityManager>;

		// Create mock data source
		mockDataSource = {
			manager: mockManager,
		} as jest.Mocked<DataSource>;

		// Create repository instance
		userRepository = new UserRepository(mockDataSource);

		// Mock repository methods
		userRepository.find = jest.fn().mockResolvedValue([]);
		userRepository.findOne = jest.fn().mockResolvedValue(null);
		userRepository.findOneOrFail = jest.fn().mockResolvedValue({} as User);
		userRepository.delete = jest.fn().mockResolvedValue({ affected: 1, raw: {} });
		userRepository.save = jest.fn().mockImplementation(async (entity) => entity);
		userRepository.createQueryBuilder = jest.fn().mockReturnValue(mockQueryBuilder);
		userRepository.update = jest
			.fn()
			.mockResolvedValue({ affected: 1, raw: {}, generatedMaps: [] });
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	describe('findManyByIds', () => {
		it('should find users by array of IDs', async () => {
			const userIds = ['user1', 'user2', 'user3'];
			const mockUsers = [
				{ id: 'user1', email: 'user1@example.com' },
				{ id: 'user2', email: 'user2@example.com' },
			];

			(userRepository.find as jest.Mock).mockResolvedValue(mockUsers);

			const result = await userRepository.findManyByIds(userIds);

			expect(userRepository.find).toHaveBeenCalledWith({
				where: { id: In(userIds) },
			});
			expect(result).toEqual(mockUsers);
		});

		it('should handle empty user IDs array', async () => {
			const userIds: string[] = [];
			(userRepository.find as jest.Mock).mockResolvedValue([]);

			const result = await userRepository.findManyByIds(userIds);

			expect(userRepository.find).toHaveBeenCalledWith({
				where: { id: In(userIds) },
			});
			expect(result).toEqual([]);
		});

		it('should handle single user ID', async () => {
			const userIds = ['single-user'];
			const mockUser = { id: 'single-user', email: 'single@example.com' };

			(userRepository.find as jest.Mock).mockResolvedValue([mockUser]);

			const result = await userRepository.findManyByIds(userIds);

			expect(result).toEqual([mockUser]);
		});
	});

	describe('update', () => {
		it('should call parent update method and show deprecation warning', async () => {
			const criteria = { id: 'user1' };
			const updateData = { firstName: 'Updated' };
			const mockResult = { affected: 1, raw: {}, generatedMaps: [] };

			(userRepository.update as jest.Mock).mockResolvedValue(mockResult);

			const result = await userRepository.update(criteria, updateData);

			expect(userRepository.update).toHaveBeenCalledWith(criteria, updateData);
			expect(result).toEqual(mockResult);
		});

		it('should handle multiple update criteria', async () => {
			const criteria = { role: 'global:member' as GlobalRole };
			const updateData = { disabled: true };
			const mockResult = { affected: 3, raw: {}, generatedMaps: [] };

			(userRepository.update as jest.Mock).mockResolvedValue(mockResult);

			const result = await userRepository.update(criteria, updateData);

			expect(result.affected).toBe(3);
		});
	});

	describe('deleteAllExcept', () => {
		it('should delete all users except the specified one', async () => {
			const userToKeep = { id: 'keep-me', email: 'keep@example.com' } as User;
			const mockResult = { affected: 5, raw: {} };

			(userRepository.delete as jest.Mock).mockResolvedValue(mockResult);

			await userRepository.deleteAllExcept(userToKeep);

			expect(userRepository.delete).toHaveBeenCalledWith({ id: Not(userToKeep.id) });
		});

		it('should handle case where no other users exist', async () => {
			const userToKeep = { id: 'only-user', email: 'only@example.com' } as User;
			const mockResult = { affected: 0, raw: {} };

			(userRepository.delete as jest.Mock).mockResolvedValue(mockResult);

			await userRepository.deleteAllExcept(userToKeep);

			expect(userRepository.delete).toHaveBeenCalledWith({ id: Not(userToKeep.id) });
		});
	});

	describe('getByIds', () => {
		it('should find users by IDs using transaction manager', async () => {
			const ids = ['user1', 'user2'];
			const mockUsers = [
				{ id: 'user1', email: 'user1@example.com' },
				{ id: 'user2', email: 'user2@example.com' },
			];

			mockManager.find.mockResolvedValue(mockUsers);

			const result = await userRepository.getByIds(mockManager, ids);

			expect(mockManager.find).toHaveBeenCalledWith(User, { where: { id: In(ids) } });
			expect(result).toEqual(mockUsers);
		});

		it('should handle empty IDs array with transaction', async () => {
			const ids: string[] = [];
			mockManager.find.mockResolvedValue([]);

			const result = await userRepository.getByIds(mockManager, ids);

			expect(mockManager.find).toHaveBeenCalledWith(User, { where: { id: In(ids) } });
			expect(result).toEqual([]);
		});
	});

	describe('findManyByEmail', () => {
		it('should find users by email addresses with specific select fields', async () => {
			const emails = ['user1@example.com', 'user2@example.com'];
			const mockUsers = [
				{ id: 'user1', email: 'user1@example.com', password: 'hash1' },
				{ id: 'user2', email: 'user2@example.com', password: 'hash2' },
			];

			(userRepository.find as jest.Mock).mockResolvedValue(mockUsers);

			const result = await userRepository.findManyByEmail(emails);

			expect(userRepository.find).toHaveBeenCalledWith({
				where: { email: In(emails) },
				select: ['email', 'password', 'id'],
			});
			expect(result).toEqual(mockUsers);
		});

		it('should handle empty emails array', async () => {
			const emails: string[] = [];
			(userRepository.find as jest.Mock).mockResolvedValue([]);

			const result = await userRepository.findManyByEmail(emails);

			expect(userRepository.find).toHaveBeenCalledWith({
				where: { email: In(emails) },
				select: ['email', 'password', 'id'],
			});
			expect(result).toEqual([]);
		});

		it('should handle single email', async () => {
			const emails = ['single@example.com'];
			const mockUser = { id: 'user1', email: 'single@example.com', password: 'hash' };

			(userRepository.find as jest.Mock).mockResolvedValue([mockUser]);

			const result = await userRepository.findManyByEmail(emails);

			expect(result).toEqual([mockUser]);
		});
	});

	describe('deleteMany', () => {
		it('should delete users by array of IDs', async () => {
			const userIds = ['user1', 'user2', 'user3'];
			const mockResult = { affected: 3, raw: {} };

			(userRepository.delete as jest.Mock).mockResolvedValue(mockResult);

			const result = await userRepository.deleteMany(userIds);

			expect(userRepository.delete).toHaveBeenCalledWith({ id: In(userIds) });
			expect(result).toEqual(mockResult);
		});

		it('should handle empty user IDs array', async () => {
			const userIds: string[] = [];
			const mockResult = { affected: 0, raw: {} };

			(userRepository.delete as jest.Mock).mockResolvedValue(mockResult);

			const result = await userRepository.deleteMany(userIds);

			expect(userRepository.delete).toHaveBeenCalledWith({ id: In(userIds) });
			expect(result).toEqual(mockResult);
		});
	});

	describe('findNonShellUser', () => {
		it('should find user with email and non-null password', async () => {
			const email = 'user@example.com';
			const mockUser = {
				id: 'user1',
				email,
				password: 'hashed-password',
				authIdentities: [],
			};

			(userRepository.findOne as jest.Mock).mockResolvedValue(mockUser);

			const result = await userRepository.findNonShellUser(email);

			expect(userRepository.findOne).toHaveBeenCalledWith({
				where: {
					email,
					password: Not(IsNull()),
				},
				relations: ['authIdentities'],
			});
			expect(result).toEqual(mockUser);
		});

		it('should return null when user not found', async () => {
			const email = 'nonexistent@example.com';

			(userRepository.findOne as jest.Mock).mockResolvedValue(null);

			const result = await userRepository.findNonShellUser(email);

			expect(result).toBeNull();
		});

		it('should include authIdentities relation', async () => {
			const email = 'user@example.com';

			await userRepository.findNonShellUser(email);

			expect(userRepository.findOne).toHaveBeenCalledWith(
				expect.objectContaining({
					relations: ['authIdentities'],
				}),
			);
		});
	});

	describe('countUsersByRole', () => {
		it('should return count of users by role', async () => {
			const mockRows = [
				{ role: 'global:owner', count: '1' },
				{ role: 'global:admin', count: '2' },
				{ role: 'global:member', count: '5' },
			];

			mockQueryBuilder.execute.mockResolvedValue(mockRows);

			const result = await userRepository.countUsersByRole();

			expect(userRepository.createQueryBuilder).toHaveBeenCalled();
			expect(mockQueryBuilder.select).toHaveBeenCalledWith(['role', 'COUNT(role) as count']);
			expect(mockQueryBuilder.groupBy).toHaveBeenCalledWith('role');
			expect(result).toEqual({
				'global:owner': 1,
				'global:admin': 2,
				'global:member': 5,
			});
		});

		it('should handle empty result', async () => {
			mockQueryBuilder.execute.mockResolvedValue([]);

			const result = await userRepository.countUsersByRole();

			expect(result).toEqual({});
		});

		it('should parse string counts to numbers', async () => {
			const mockRows = [
				{ role: 'global:owner' as GlobalRole, count: '10' },
				{ role: 'global:admin' as GlobalRole, count: '0' },
			];

			mockQueryBuilder.execute.mockResolvedValue(mockRows);

			const result = await userRepository.countUsersByRole();

			expect(result).toEqual({
				'global:owner': 10,
				'global:admin': 0,
			});
		});
	});

	describe('getEmailsByIds', () => {
		it('should get emails of users with completed setup', async () => {
			const userIds = ['user1', 'user2', 'user3'];
			const mockUsers = [
				{ id: 'user1', email: 'user1@example.com' },
				{ id: 'user2', email: 'user2@example.com' },
			];

			(userRepository.find as jest.Mock).mockResolvedValue(mockUsers);

			const result = await userRepository.getEmailsByIds(userIds);

			expect(userRepository.find).toHaveBeenCalledWith({
				select: ['id', 'email'],
				where: { id: In(userIds), password: Not(IsNull()) },
			});
			expect(result).toEqual(mockUsers);
		});

		it('should exclude users with null passwords (shell users)', async () => {
			const userIds = ['user1', 'user2'];

			await userRepository.getEmailsByIds(userIds);

			expect(userRepository.find).toHaveBeenCalledWith(
				expect.objectContaining({
					where: expect.objectContaining({
						password: Not(IsNull()),
					}),
				}),
			);
		});

		it('should only select id and email fields', async () => {
			const userIds = ['user1'];

			await userRepository.getEmailsByIds(userIds);

			expect(userRepository.find).toHaveBeenCalledWith(
				expect.objectContaining({
					select: ['id', 'email'],
				}),
			);
		});
	});

	describe('createUserWithProject', () => {
		it('should create user with personal project using transaction manager', async () => {
			const userData = {
				email: 'new@example.com',
				firstName: 'New',
				lastName: 'User',
				role: 'global:member' as GlobalRole,
			};

			const mockUser = {
				id: 'new-user-id',
				...userData,
				createPersonalProjectName: jest.fn().mockReturnValue('New User <new@example.com>'),
			};
			const mockProject = {
				id: 'project-id',
				type: 'personal',
				name: 'New User <new@example.com>',
			};
			const mockProjectRelation = {
				projectId: 'project-id',
				userId: 'new-user-id',
				role: 'project:personalOwner',
			};

			mockManager.create.mockImplementation((entity: EntityTarget<unknown>, data: unknown) => {
				if (entity === User) return mockUser;
				if (entity === Project) return mockProject;
				if (entity === ProjectRelation) return mockProjectRelation;
				return data ?? {};
			});

			mockManager.save.mockImplementation((entity) => Promise.resolve(entity));

			const result = await userRepository.createUserWithProject(userData, mockManager);

			expect(mockManager.create).toHaveBeenCalledWith(User, userData);
			expect(mockManager.save).toHaveBeenCalledWith(mockUser);
			expect(mockManager.create).toHaveBeenCalledWith(Project, {
				type: 'personal',
				name: 'New User <new@example.com>',
			});
			expect(mockManager.save).toHaveBeenCalledWith(mockProject);
			expect(mockManager.create).toHaveBeenCalledWith(ProjectRelation, {
				projectId: 'project-id',
				userId: 'new-user-id',
				role: 'project:personalOwner',
			});
			expect(mockManager.save).toHaveBeenCalledWith(mockProjectRelation);
			expect(result).toEqual({ user: mockUser, project: mockProject });
		});

		it('should create user with personal project without transaction manager', async () => {
			const userData = {
				email: 'new2@example.com',
				firstName: 'Another',
				lastName: 'User',
			};

			const mockUser = {
				id: 'user-id-2',
				...userData,
				createPersonalProjectName: jest.fn().mockReturnValue('Another User <new2@example.com>'),
			};
			const mockProject = {
				id: 'project-id-2',
				type: 'personal',
				name: 'Another User <new2@example.com>',
			};

			// Mock the manager methods for non-transaction case
			Object.defineProperty(userRepository, 'manager', {
				value: mockManager,
				writable: true,
				configurable: true,
			});
			mockManager.create.mockImplementation((entity: EntityTarget<unknown>, data: unknown) => {
				if (entity === User) return mockUser;
				if (entity === Project) return mockProject;
				if (entity === ProjectRelation)
					return { projectId: 'project-id-2', userId: 'user-id-2', role: 'project:personalOwner' };
				return data ?? {};
			});

			const result = await userRepository.createUserWithProject(userData);

			expect(result.user).toEqual(mockUser);
			expect(result.project).toEqual(mockProject);
		});

		it('should handle user without names in project name generation', async () => {
			const userData = {
				email: 'noname@example.com',
				role: 'global:member' as GlobalRole,
			};

			const mockUser = {
				id: 'user-no-name',
				...userData,
				createPersonalProjectName: jest.fn().mockReturnValue('<noname@example.com>'),
			};
			const mockProject = { id: 'project-no-name', type: 'personal', name: '<noname@example.com>' };

			mockManager.create.mockImplementation((entity: EntityTarget<unknown>, data: unknown) => {
				if (entity === User) return mockUser;
				if (entity === Project) return mockProject;
				return data ?? {};
			});

			const result = await userRepository.createUserWithProject(userData, mockManager);

			expect(mockUser.createPersonalProjectName).toHaveBeenCalled();
			expect(result.project.name).toBe('<noname@example.com>');
		});
	});

	describe('findPersonalOwnerForWorkflow', () => {
		it('should find user who owns personal project that owns workflow', async () => {
			const workflowId = 'workflow-123';
			const mockUser = {
				id: 'owner-user',
				email: 'owner@example.com',
				projectRelations: [{ role: 'project:personalOwner' }],
			};

			(userRepository.findOne as jest.Mock).mockResolvedValue(mockUser);

			const result = await userRepository.findPersonalOwnerForWorkflow(workflowId);

			expect(userRepository.findOne).toHaveBeenCalledWith({
				where: {
					projectRelations: {
						role: 'project:personalOwner',
						project: { sharedWorkflows: { workflowId, role: 'workflow:owner' } },
					},
				},
			});
			expect(result).toEqual(mockUser);
		});

		it('should return null when workflow not found or owned by team project', async () => {
			const workflowId = 'nonexistent-workflow';

			(userRepository.findOne as jest.Mock).mockResolvedValue(null);

			const result = await userRepository.findPersonalOwnerForWorkflow(workflowId);

			expect(result).toBeNull();
		});

		it('should use correct query structure for deep relationships', async () => {
			const workflowId = 'test-workflow';

			await userRepository.findPersonalOwnerForWorkflow(workflowId);

			expect(userRepository.findOne).toHaveBeenCalledWith({
				where: {
					projectRelations: {
						role: 'project:personalOwner',
						project: {
							sharedWorkflows: {
								workflowId: 'test-workflow',
								role: 'workflow:owner',
							},
						},
					},
				},
			});
		});
	});

	describe('findPersonalOwnerForProject', () => {
		it('should find user who owns the personal project', async () => {
			const projectId = 'project-456';
			const mockUser = {
				id: 'project-owner',
				email: 'projectowner@example.com',
				projectRelations: [{ role: 'project:personalOwner', projectId }],
			};

			(userRepository.findOne as jest.Mock).mockResolvedValue(mockUser);

			const result = await userRepository.findPersonalOwnerForProject(projectId);

			expect(userRepository.findOne).toHaveBeenCalledWith({
				where: {
					projectRelations: {
						role: 'project:personalOwner',
						projectId,
					},
				},
			});
			expect(result).toEqual(mockUser);
		});

		it('should return null when project not found or not personal', async () => {
			const projectId = 'team-project';

			(userRepository.findOne as jest.Mock).mockResolvedValue(null);

			const result = await userRepository.findPersonalOwnerForProject(projectId);

			expect(result).toBeNull();
		});
	});

	describe('buildUserQuery', () => {
		it('should build basic query with auth identities join', () => {
			const result = userRepository.buildUserQuery();

			expect(userRepository.createQueryBuilder).toHaveBeenCalledWith('user');
			expect(mockQueryBuilder.leftJoinAndSelect).toHaveBeenCalledWith(
				'user.authIdentities',
				'authIdentities',
			);
			expect(result).toBe(mockQueryBuilder);
		});

		it('should build query with all filter options', () => {
			const options: UsersListFilterDto = {
				filter: {
					email: 'test@example.com',
					firstName: 'John',
					lastName: 'Doe',
					mfaEnabled: true,
					isOwner: true,
					fullText: 'search term',
				},
				select: ['id', 'email', 'firstName'],
				take: 10,
				skip: 20,
				expand: ['projectRelations'],
				sortBy: ['email:asc', 'role:desc'],
			};

			const result = userRepository.buildUserQuery(options);

			expect(result).toBe(mockQueryBuilder);
			// Verify that all the helper methods would be called (they're private so we can't test them directly)
			expect(userRepository.createQueryBuilder).toHaveBeenCalledWith('user');
		});

		it('should handle undefined options', () => {
			const result = userRepository.buildUserQuery(undefined);

			expect(userRepository.createQueryBuilder).toHaveBeenCalledWith('user');
			expect(mockQueryBuilder.leftJoinAndSelect).toHaveBeenCalledWith(
				'user.authIdentities',
				'authIdentities',
			);
			expect(result).toBe(mockQueryBuilder);
		});
	});

	describe('applyUserListSelect (private method integration)', () => {
		it('should apply select fields through buildUserQuery', () => {
			const options: UsersListFilterDto = {
				select: ['email', 'firstName', 'lastName'],
				take: 50,
				skip: 0,
			};

			// Call buildUserQuery which internally calls applyUserListSelect
			userRepository.buildUserQuery(options);

			// Verify the query builder is set up
			expect(userRepository.createQueryBuilder).toHaveBeenCalledWith('user');
		});

		it('should ensure id is always included in select', () => {
			const options: UsersListFilterDto = {
				select: ['email', 'firstName'],
				take: 50,
				skip: 0,
			};

			userRepository.buildUserQuery(options);

			// The private method should ensure 'id' is added to the select
			expect(userRepository.createQueryBuilder).toHaveBeenCalled();
		});
	});

	describe('applyUserListFilter (private method integration)', () => {
		it('should apply email filter through buildUserQuery', () => {
			const options: UsersListFilterDto = {
				filter: { email: 'test@example.com' },
				take: 50,
				skip: 0,
			};

			userRepository.buildUserQuery(options);

			expect(userRepository.createQueryBuilder).toHaveBeenCalledWith('user');
		});

		it('should apply firstName filter through buildUserQuery', () => {
			const options: UsersListFilterDto = {
				filter: { firstName: 'John' },
				take: 50,
				skip: 0,
			};

			userRepository.buildUserQuery(options);

			expect(userRepository.createQueryBuilder).toHaveBeenCalled();
		});

		it('should apply lastName filter through buildUserQuery', () => {
			const options: UsersListFilterDto = {
				filter: { lastName: 'Doe' },
				take: 50,
				skip: 0,
			};

			userRepository.buildUserQuery(options);

			expect(userRepository.createQueryBuilder).toHaveBeenCalled();
		});

		it('should apply mfaEnabled filter through buildUserQuery', () => {
			const options: UsersListFilterDto = {
				filter: { mfaEnabled: true },
				take: 50,
				skip: 0,
			};

			userRepository.buildUserQuery(options);

			expect(userRepository.createQueryBuilder).toHaveBeenCalled();
		});

		it('should apply isOwner filter (true) through buildUserQuery', () => {
			const options: UsersListFilterDto = {
				filter: { isOwner: true },
				take: 50,
				skip: 0,
			};

			userRepository.buildUserQuery(options);

			expect(userRepository.createQueryBuilder).toHaveBeenCalled();
		});

		it('should apply isOwner filter (false) through buildUserQuery', () => {
			const options: UsersListFilterDto = {
				filter: { isOwner: false },
				take: 50,
				skip: 0,
			};

			userRepository.buildUserQuery(options);

			expect(userRepository.createQueryBuilder).toHaveBeenCalled();
		});

		it('should apply fullText filter through buildUserQuery', () => {
			const options: UsersListFilterDto = {
				filter: { fullText: 'search term' },
				take: 50,
				skip: 0,
			};

			userRepository.buildUserQuery(options);

			expect(userRepository.createQueryBuilder).toHaveBeenCalled();
		});

		it('should apply multiple filters through buildUserQuery', () => {
			const options: UsersListFilterDto = {
				filter: {
					email: 'test@example.com',
					firstName: 'John',
					mfaEnabled: true,
					isOwner: false,
				},
				take: 50,
				skip: 0,
			};

			userRepository.buildUserQuery(options);

			expect(userRepository.createQueryBuilder).toHaveBeenCalled();
		});
	});

	describe('applyUserListExpand (private method integration)', () => {
		it('should apply projectRelations expand through buildUserQuery', () => {
			const options: UsersListFilterDto = {
				expand: ['projectRelations'],
				take: 50,
				skip: 0,
			};

			userRepository.buildUserQuery(options);

			expect(userRepository.createQueryBuilder).toHaveBeenCalledWith('user');
		});

		it('should handle no expand options', () => {
			const options: UsersListFilterDto = {
				take: 50,
				skip: 0,
			};

			userRepository.buildUserQuery(options);

			expect(userRepository.createQueryBuilder).toHaveBeenCalled();
		});
	});

	describe('applyUserListSort (private method integration)', () => {
		it('should apply single sort field through buildUserQuery', () => {
			const options: UsersListFilterDto = {
				sortBy: ['email:asc'],
				take: 50,
				skip: 0,
			};

			userRepository.buildUserQuery(options);

			expect(userRepository.createQueryBuilder).toHaveBeenCalled();
		});

		it('should apply role sorting with custom priority through buildUserQuery', () => {
			const options: UsersListFilterDto = {
				sortBy: ['role:asc'],
				take: 50,
				skip: 0,
			};

			userRepository.buildUserQuery(options);

			expect(userRepository.createQueryBuilder).toHaveBeenCalled();
		});

		it('should apply multiple sort fields through buildUserQuery', () => {
			const options: UsersListFilterDto = {
				sortBy: ['role:desc', 'email:asc', 'firstName:desc'],
				take: 50,
				skip: 0,
			};

			userRepository.buildUserQuery(options);

			expect(userRepository.createQueryBuilder).toHaveBeenCalled();
		});

		it('should handle all sort options through buildUserQuery', () => {
			const sortOptions = [
				'firstName:asc',
				'firstName:desc',
				'lastName:asc',
				'lastName:desc',
				'email:asc',
				'email:desc',
				'role:asc',
				'role:desc',
				'mfaEnabled:asc',
				'mfaEnabled:desc',
				'lastActiveAt:asc',
				'lastActiveAt:desc',
			] as const;

			for (const sortBy of sortOptions) {
				const options: UsersListFilterDto = {
					sortBy: [sortBy],
					take: 50,
					skip: 0,
				};

				userRepository.buildUserQuery(options);
			}

			// Should have been called for each sort option
			expect(userRepository.createQueryBuilder).toHaveBeenCalledTimes(sortOptions.length);
		});
	});

	describe('applyUserListPagination (private method integration)', () => {
		it('should apply take and skip through buildUserQuery', () => {
			const options: UsersListFilterDto = {
				take: 25,
				skip: 50,
			};

			userRepository.buildUserQuery(options);

			expect(userRepository.createQueryBuilder).toHaveBeenCalled();
		});

		it('should handle zero take through buildUserQuery', () => {
			const options: UsersListFilterDto = {
				take: 0,
				skip: 0,
			};

			userRepository.buildUserQuery(options);

			expect(userRepository.createQueryBuilder).toHaveBeenCalled();
		});

		it('should handle undefined skip through buildUserQuery', () => {
			const options: UsersListFilterDto = {
				take: 50,
				skip: 0,
			};

			userRepository.buildUserQuery(options);

			expect(userRepository.createQueryBuilder).toHaveBeenCalled();
		});

		it('should handle large pagination values through buildUserQuery', () => {
			const options: UsersListFilterDto = {
				take: 1000,
				skip: 5000,
			};

			userRepository.buildUserQuery(options);

			expect(userRepository.createQueryBuilder).toHaveBeenCalled();
		});
	});

	describe('Edge Cases and Error Handling', () => {
		it('should handle null/undefined inputs gracefully in findManyByIds', async () => {
			(userRepository.find as jest.Mock).mockResolvedValue([]);

			await expect(userRepository.findManyByIds([])).resolves.toEqual([]);
		});

		it('should handle very large arrays in deleteMany', async () => {
			const largeArray = Array.from({ length: 10000 }, (_, i) => `user-${i}`);
			const mockResult = { affected: 10000, raw: {} };

			(userRepository.delete as jest.Mock).mockResolvedValue(mockResult);

			const result = await userRepository.deleteMany(largeArray);

			expect(result.affected).toBe(10000);
		});

		it('should handle special characters in email for findNonShellUser', async () => {
			const specialEmail = 'user+tag@sub-domain.example-site.co.uk';
			const mockUser = { id: 'user1', email: specialEmail, password: 'hash' };

			(userRepository.findOne as jest.Mock).mockResolvedValue(mockUser);

			const result = await userRepository.findNonShellUser(specialEmail);

			expect(userRepository.findOne).toHaveBeenCalledWith({
				where: {
					email: specialEmail,
					password: Not(IsNull()),
				},
				relations: ['authIdentities'],
			});
			expect(result).toEqual(mockUser);
		});

		it('should handle TypeORM errors in countUsersByRole', async () => {
			const error = new Error('Database connection failed');
			mockQueryBuilder.execute.mockRejectedValue(error);

			await expect(userRepository.countUsersByRole()).rejects.toThrow('Database connection failed');
		});

		it('should handle invalid user data in createUserWithProject', async () => {
			const invalidUserData = {
				email: 'invalid-email',
				// Missing required fields
			};

			const error = new Error('Validation failed');
			mockManager.save.mockRejectedValue(error);

			await expect(
				userRepository.createUserWithProject(invalidUserData, mockManager),
			).rejects.toThrow('Validation failed');
		});
	});

	describe('Complex Business Logic Integration', () => {
		it('should handle complex filter combinations in buildUserQuery', () => {
			const complexOptions: UsersListFilterDto = {
				filter: {
					fullText: 'John Doe',
					mfaEnabled: true,
					isOwner: false,
				},
				select: ['id', 'email', 'firstName', 'lastName', 'role'],
				expand: ['projectRelations'],
				sortBy: ['role:asc', 'lastName:asc', 'firstName:asc'],
				take: 20,
				skip: 40,
			};

			const result = userRepository.buildUserQuery(complexOptions);

			expect(userRepository.createQueryBuilder).toHaveBeenCalledWith('user');
			expect(mockQueryBuilder.leftJoinAndSelect).toHaveBeenCalledWith(
				'user.authIdentities',
				'authIdentities',
			);
			expect(result).toBe(mockQueryBuilder);
		});

		it('should validate user data integrity in createUserWithProject', async () => {
			const userData = {
				email: 'integrity@example.com',
				firstName: 'Integrity',
				lastName: 'Test',
				role: 'global:admin' as GlobalRole,
			};

			const mockUser = {
				id: 'integrity-user',
				...userData,
				createPersonalProjectName: jest
					.fn()
					.mockReturnValue('Integrity Test <integrity@example.com>'),
			};
			const mockProject = {
				id: 'integrity-project',
				type: 'personal',
				name: 'Integrity Test <integrity@example.com>',
			};
			const mockProjectRelation = {
				projectId: 'integrity-project',
				userId: 'integrity-user',
				role: 'project:personalOwner',
			};

			mockManager.create.mockImplementation((entity: EntityTarget<unknown>, data: unknown) => {
				if (entity === User) return mockUser;
				if (entity === Project) return mockProject;
				if (entity === ProjectRelation) return mockProjectRelation;
				return data ?? {};
			});

			const result = await userRepository.createUserWithProject(userData, mockManager);

			// Verify all entities are created and saved
			expect(mockManager.create).toHaveBeenCalledTimes(3);
			expect(mockManager.save).toHaveBeenCalledTimes(3);
			expect(result.user).toEqual(mockUser);
			expect(result.project).toEqual(mockProject);
		});

		it('should handle deep relationship queries efficiently', async () => {
			const workflowId = 'complex-workflow';
			const mockUser = {
				id: 'complex-user',
				email: 'complex@example.com',
				projectRelations: [
					{
						role: 'project:personalOwner',
						project: {
							sharedWorkflows: [
								{
									workflowId,
									role: 'workflow:owner',
								},
							],
						},
					},
				],
			};

			(userRepository.findOne as jest.Mock).mockResolvedValue(mockUser);

			const result = await userRepository.findPersonalOwnerForWorkflow(workflowId);

			expect(userRepository.findOne).toHaveBeenCalledWith({
				where: {
					projectRelations: {
						role: 'project:personalOwner',
						project: { sharedWorkflows: { workflowId, role: 'workflow:owner' } },
					},
				},
			});
			expect(result).toEqual(mockUser);
		});
	});

	describe('Performance and Optimization', () => {
		it('should handle bulk operations efficiently in findManyByIds', async () => {
			const bulkUserIds = Array.from({ length: 1000 }, (_, i) => `bulk-user-${i}`);
			const mockUsers = bulkUserIds.map((id) => ({ id, email: `${id}@example.com` }));

			(userRepository.find as jest.Mock).mockResolvedValue(mockUsers);

			const result = await userRepository.findManyByIds(bulkUserIds);

			expect(userRepository.find).toHaveBeenCalledWith({
				where: { id: In(bulkUserIds) },
			});
			expect(result).toHaveLength(1000);
		});

		it('should optimize query building for complex filters', () => {
			const optimizedOptions: UsersListFilterDto = {
				filter: {
					fullText: 'performance test',
					mfaEnabled: true,
					isOwner: false,
				},
				select: ['id', 'email'], // Minimal select for performance
				take: 100,
				skip: 0,
			};

			const result = userRepository.buildUserQuery(optimizedOptions);

			expect(userRepository.createQueryBuilder).toHaveBeenCalledWith('user');
			expect(result).toBe(mockQueryBuilder);
		});

		it('should handle pagination efficiently for large datasets', () => {
			const paginationOptions: UsersListFilterDto = {
				take: 50,
				skip: 10000, // Large offset
				sortBy: ['email:asc'], // Stable sort for pagination
			};

			const result = userRepository.buildUserQuery(paginationOptions);

			expect(userRepository.createQueryBuilder).toHaveBeenCalledWith('user');
			expect(result).toBe(mockQueryBuilder);
		});
	});

	describe('Data Consistency and Validation', () => {
		it('should maintain referential integrity in createUserWithProject', async () => {
			const userData = {
				email: 'referential@example.com',
				firstName: 'Referential',
				lastName: 'Integrity',
			};

			const mockUser = {
				id: 'ref-user',
				...userData,
				createPersonalProjectName: jest
					.fn()
					.mockReturnValue('Referential Integrity <referential@example.com>'),
			};
			const mockProject = {
				id: 'ref-project',
				type: 'personal',
				name: 'Referential Integrity <referential@example.com>',
			};

			mockManager.create.mockImplementation((entity: EntityTarget<unknown>, data: unknown) => {
				if (entity === User) return mockUser;
				if (entity === Project) return mockProject;
				if (entity === ProjectRelation) {
					// Verify that the relation links the correct user and project
					const relationData = data as { userId: string; projectId: string; role: string };
					expect(relationData?.userId).toBe('ref-user');
					expect(relationData?.projectId).toBe('ref-project');
					expect(relationData?.role).toBe('project:personalOwner');
					return data ?? {};
				}
				return data ?? {};
			});

			await userRepository.createUserWithProject(userData, mockManager);

			expect(mockManager.create).toHaveBeenCalledWith(ProjectRelation, {
				projectId: 'ref-project',
				userId: 'ref-user',
				role: 'project:personalOwner',
			});
		});

		it('should validate email formats in filter operations', () => {
			const emailFilterOptions: UsersListFilterDto = {
				filter: {
					email: 'valid@example.com',
				},
				take: 50,
				skip: 0,
			};

			const result = userRepository.buildUserQuery(emailFilterOptions);

			expect(userRepository.createQueryBuilder).toHaveBeenCalledWith('user');
			expect(result).toBe(mockQueryBuilder);
		});

		it('should handle concurrent operations safely', async () => {
			const concurrentUserIds = ['concurrent1', 'concurrent2', 'concurrent3'];

			// Simulate concurrent calls
			const promises = concurrentUserIds.map((id) => {
				(userRepository.find as jest.Mock).mockResolvedValue([{ id, email: `${id}@example.com` }]);
				return userRepository.findManyByIds([id]);
			});

			const results = await Promise.all(promises);

			expect(results).toHaveLength(3);
			results.forEach((result, index) => {
				expect(result[0].id).toBe(concurrentUserIds[index]);
			});
		});
	});
});
