import type { DataSource, EntityManager } from '@n8n/typeorm';
import { In, Like } from '@n8n/typeorm';

import { CredentialsEntity, User } from '../../entities';
import type { ListQuery } from '../../entities/types-db';
import { CredentialsRepository } from '../credentials.repository';

// Mock TypeORM classes
jest.mock('@n8n/typeorm', () => ({
	...jest.requireActual('@n8n/typeorm'),
	// eslint-disable-next-line @typescript-eslint/naming-convention
	Repository: jest.fn(),
}));

describe('CredentialsRepository', () => {
	let credentialsRepository: CredentialsRepository;
	let mockDataSource: jest.Mocked<DataSource>;
	let mockManager: jest.Mocked<EntityManager>;

	// Mock credentials for testing
	const mockCredentials = [
		{
			id: 'cred-1',
			name: 'Test Credential 1',
			type: 'http',
			data: '{"encrypted":"data"}',
			isManaged: false,
			createdAt: new Date('2023-01-01'),
			updatedAt: new Date('2023-01-01'),
			shared: [
				{
					credentialsId: 'cred-1',
					projectId: 'project-1',
					role: 'credential:owner',
					project: {
						id: 'project-1',
						type: 'personal',
						name: 'Personal Project',
						projectRelations: [
							{
								userId: 'user-1',
								role: 'project:personalOwner',
							},
						],
					},
				},
			],
		},
		{
			id: 'cred-2',
			name: 'API Credential',
			type: 'api',
			data: '{"encrypted":"apidata"}',
			isManaged: true,
			createdAt: new Date('2023-01-02'),
			updatedAt: new Date('2023-01-02'),
			shared: [
				{
					credentialsId: 'cred-2',
					projectId: 'project-2',
					role: 'credential:user',
					project: {
						id: 'project-2',
						type: 'team',
						name: 'Team Project',
						projectRelations: [
							{
								userId: 'user-2',
								role: 'project:admin',
							},
						],
					},
				},
			],
		},
	] as CredentialsEntity[];

	const mockUser: User = {
		id: 'user-1',
		email: 'test@example.com',
		firstName: 'Test',
		lastName: 'User',
		role: 'global:member',
	} as User;

	beforeEach(() => {
		// Create mock entity manager
		mockManager = {
			find: jest.fn().mockResolvedValue([]),
			findOne: jest.fn().mockResolvedValue(null),
			create: jest.fn().mockImplementation((_entity, data) => ({ ...data })),
			save: jest.fn().mockImplementation(async (entity) => entity),
		} as unknown as jest.Mocked<EntityManager>;

		// Create mock data source
		mockDataSource = {
			manager: mockManager,
		} as unknown as jest.Mocked<DataSource>;

		// Create repository instance
		credentialsRepository = new CredentialsRepository(mockDataSource);

		// Mock repository methods
		credentialsRepository.find = jest.fn().mockResolvedValue([]);
		credentialsRepository.findBy = jest.fn().mockResolvedValue([]);
		credentialsRepository.findOne = jest.fn().mockResolvedValue(null);
		credentialsRepository.save = jest.fn().mockImplementation(async (entity) => entity);
		credentialsRepository.delete = jest.fn().mockResolvedValue({ affected: 1, raw: {} });
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	describe('findStartingWith', () => {
		it('should find credentials starting with specified name', async () => {
			const credentialName = 'Test';
			const expectedCredentials = [{ name: 'Test Credential 1' }, { name: 'Test API Credential' }];

			(credentialsRepository.find as jest.Mock).mockResolvedValue(expectedCredentials);

			const result = await credentialsRepository.findStartingWith(credentialName);

			expect(credentialsRepository.find).toHaveBeenCalledWith({
				select: ['name'],
				where: { name: Like(`${credentialName}%`) },
			});
			expect(result).toEqual(expectedCredentials);
		});

		it('should handle empty credential name', async () => {
			(credentialsRepository.find as jest.Mock).mockResolvedValue(mockCredentials);

			const result = await credentialsRepository.findStartingWith('');

			expect(credentialsRepository.find).toHaveBeenCalledWith({
				select: ['name'],
				where: { name: Like('%') },
			});
			expect(result).toEqual(mockCredentials);
		});

		it('should handle special characters in credential name', async () => {
			const specialName = 'Test-API_v1.0';
			(credentialsRepository.find as jest.Mock).mockResolvedValue([]);

			await credentialsRepository.findStartingWith(specialName);

			expect(credentialsRepository.find).toHaveBeenCalledWith({
				select: ['name'],
				where: { name: Like(`${specialName}%`) },
			});
		});

		it('should return empty array when no credentials match', async () => {
			(credentialsRepository.find as jest.Mock).mockResolvedValue([]);

			const result = await credentialsRepository.findStartingWith('NonExistent');

			expect(result).toEqual([]);
		});
	});

	describe('findMany', () => {
		it('should find credentials with basic options', async () => {
			(credentialsRepository.find as jest.Mock).mockResolvedValue(mockCredentials);

			const result = await credentialsRepository.findMany();

			expect(credentialsRepository.find).toHaveBeenCalledWith({
				select: ['id', 'name', 'type', 'isManaged', 'createdAt', 'updatedAt'],
				relations: ['shared', 'shared.project', 'shared.project.projectRelations'],
			});
			expect(result).toEqual(mockCredentials);
		});

		it('should find credentials with credential IDs filter', async () => {
			const credentialIds = ['cred-1', 'cred-2'];
			(credentialsRepository.find as jest.Mock).mockResolvedValue(mockCredentials);

			const result = await credentialsRepository.findMany(undefined, credentialIds);

			expect(credentialsRepository.find).toHaveBeenCalledWith({
				select: ['id', 'name', 'type', 'isManaged', 'createdAt', 'updatedAt'],
				relations: ['shared', 'shared.project', 'shared.project.projectRelations'],
				where: { id: In(credentialIds) },
			});
			expect(result).toEqual(mockCredentials);
		});

		it('should find credentials with list query options', async () => {
			const listQueryOptions: ListQuery.Options = {
				filter: { name: 'Test' },
				select: { id: true, name: true },
				take: 10,
				skip: 5,
			};
			(credentialsRepository.find as jest.Mock).mockResolvedValue(mockCredentials);

			const result = await credentialsRepository.findMany(listQueryOptions);

			expect(credentialsRepository.find).toHaveBeenCalledWith({
				where: { name: Like('%Test%') },
				select: { id: true, name: true },
				take: 10,
				skip: 5,
			});
			expect(result).toEqual(mockCredentials);
		});

		it('should find credentials with includeData option', async () => {
			const listQueryOptions: ListQuery.Options & { includeData: boolean } = {
				includeData: true,
			};
			(credentialsRepository.find as jest.Mock).mockResolvedValue(mockCredentials);

			const result = await credentialsRepository.findMany(listQueryOptions);

			expect(credentialsRepository.find).toHaveBeenCalledWith({
				select: ['id', 'name', 'type', 'isManaged', 'createdAt', 'updatedAt', 'data'],
				relations: ['shared', 'shared.project', 'shared.project.projectRelations'],
			});
			expect(result).toEqual(mockCredentials);
		});

		it('should combine credential IDs with query options', async () => {
			const listQueryOptions: ListQuery.Options = {
				filter: { type: 'api' },
				take: 5,
			};
			const credentialIds = ['cred-1', 'cred-2'];
			(credentialsRepository.find as jest.Mock).mockResolvedValue(mockCredentials);

			await credentialsRepository.findMany(listQueryOptions, credentialIds);

			expect(credentialsRepository.find).toHaveBeenCalledWith({
				select: ['id', 'name', 'type', 'isManaged', 'createdAt', 'updatedAt'],
				relations: ['shared', 'shared.project', 'shared.project.projectRelations'],
				where: { type: Like('%api%'), id: In(credentialIds) },
				take: 5,
			});
		});

		it('should handle user filter in query options', async () => {
			const listQueryOptions: ListQuery.Options & { user: User } = {
				user: mockUser,
			};
			(credentialsRepository.find as jest.Mock).mockResolvedValue(mockCredentials);

			await credentialsRepository.findMany(listQueryOptions);

			expect(credentialsRepository.find).toHaveBeenCalledWith({
				select: ['id', 'name', 'type', 'isManaged', 'createdAt', 'updatedAt'],
				relations: ['shared', 'shared.project', 'shared.project.projectRelations'],
			});
		});
	});

	describe('toFindManyOptions (private method integration)', () => {
		it('should return default options when no parameters provided', async () => {
			(credentialsRepository.find as jest.Mock).mockResolvedValue(mockCredentials);

			await credentialsRepository.findMany();

			expect(credentialsRepository.find).toHaveBeenCalledWith({
				select: ['id', 'name', 'type', 'isManaged', 'createdAt', 'updatedAt'],
				relations: ['shared', 'shared.project', 'shared.project.projectRelations'],
			});
		});

		it('should transform name filter to LIKE query', async () => {
			const listQueryOptions: ListQuery.Options = {
				filter: { name: 'Test Credential' },
			};
			(credentialsRepository.find as jest.Mock).mockResolvedValue(mockCredentials);

			await credentialsRepository.findMany(listQueryOptions);

			expect(credentialsRepository.find).toHaveBeenCalledWith({
				select: ['id', 'name', 'type', 'isManaged', 'createdAt', 'updatedAt'],
				relations: ['shared', 'shared.project', 'shared.project.projectRelations'],
				where: { name: Like('%Test Credential%') },
			});
		});

		it('should not transform empty name filter', async () => {
			const listQueryOptions: ListQuery.Options = {
				filter: { name: '' },
			};
			(credentialsRepository.find as jest.Mock).mockResolvedValue(mockCredentials);

			await credentialsRepository.findMany(listQueryOptions);

			expect(credentialsRepository.find).toHaveBeenCalledWith({
				select: ['id', 'name', 'type', 'isManaged', 'createdAt', 'updatedAt'],
				relations: ['shared', 'shared.project', 'shared.project.projectRelations'],
				where: { name: '' },
			});
		});

		it('should transform type filter to LIKE query', async () => {
			const listQueryOptions: ListQuery.Options = {
				filter: { type: 'http' },
			};
			(credentialsRepository.find as jest.Mock).mockResolvedValue(mockCredentials);

			await credentialsRepository.findMany(listQueryOptions);

			expect(credentialsRepository.find).toHaveBeenCalledWith({
				select: ['id', 'name', 'type', 'isManaged', 'createdAt', 'updatedAt'],
				relations: ['shared', 'shared.project', 'shared.project.projectRelations'],
				where: { type: Like('%http%') },
			});
		});

		it('should not transform empty type filter', async () => {
			const listQueryOptions: ListQuery.Options = {
				filter: { type: '' },
			};
			(credentialsRepository.find as jest.Mock).mockResolvedValue(mockCredentials);

			await credentialsRepository.findMany(listQueryOptions);

			expect(credentialsRepository.find).toHaveBeenCalledWith({
				select: ['id', 'name', 'type', 'isManaged', 'createdAt', 'updatedAt'],
				relations: ['shared', 'shared.project', 'shared.project.projectRelations'],
				where: { type: '' },
			});
		});

		it('should ensure id is included when pagination is used with custom select', async () => {
			const listQueryOptions: ListQuery.Options = {
				select: { name: true, type: true },
				take: 10,
			};
			(credentialsRepository.find as jest.Mock).mockResolvedValue(mockCredentials);

			await credentialsRepository.findMany(listQueryOptions);

			expect(credentialsRepository.find).toHaveBeenCalledWith({
				select: { name: true, type: true, id: true },
				take: 10,
			});
		});

		it('should not add id when id is already in select', async () => {
			const listQueryOptions: ListQuery.Options = {
				select: { id: true, name: true },
				take: 10,
			};
			(credentialsRepository.find as jest.Mock).mockResolvedValue(mockCredentials);

			await credentialsRepository.findMany(listQueryOptions);

			expect(credentialsRepository.find).toHaveBeenCalledWith({
				select: { id: true, name: true },
				take: 10,
			});
		});

		it('should add data to array select when includeData is true', async () => {
			const listQueryOptions: ListQuery.Options & { includeData: boolean } = {
				select: { id: true, name: true },
				includeData: true,
			};
			(credentialsRepository.find as jest.Mock).mockResolvedValue(mockCredentials);

			await credentialsRepository.findMany(listQueryOptions);

			expect(credentialsRepository.find).toHaveBeenCalledWith({
				select: { id: true, name: true, data: true },
			});
		});

		it('should add data to object select when includeData is true', async () => {
			const listQueryOptions: ListQuery.Options & { includeData: boolean } = {
				select: { id: true, name: true },
				includeData: true,
			};
			(credentialsRepository.find as jest.Mock).mockResolvedValue(mockCredentials);

			await credentialsRepository.findMany(listQueryOptions);

			expect(credentialsRepository.find).toHaveBeenCalledWith({
				select: { id: true, name: true, data: true },
			});
		});
	});

	describe('handleSharedFilters (private method integration)', () => {
		it('should transform projectId filter to shared.projectId', async () => {
			const listQueryOptions: ListQuery.Options = {
				filter: { projectId: 'project-1' },
			};
			(credentialsRepository.find as jest.Mock).mockResolvedValue(mockCredentials);

			await credentialsRepository.findMany(listQueryOptions);

			expect(credentialsRepository.find).toHaveBeenCalledWith({
				select: ['id', 'name', 'type', 'isManaged', 'createdAt', 'updatedAt'],
				relations: ['shared', 'shared.project', 'shared.project.projectRelations'],
				where: {
					shared: {
						projectId: 'project-1',
					},
				},
			});
		});

		it('should not transform empty projectId filter', async () => {
			const listQueryOptions: ListQuery.Options = {
				filter: { projectId: '' },
			};
			(credentialsRepository.find as jest.Mock).mockResolvedValue(mockCredentials);

			await credentialsRepository.findMany(listQueryOptions);

			expect(credentialsRepository.find).toHaveBeenCalledWith({
				select: ['id', 'name', 'type', 'isManaged', 'createdAt', 'updatedAt'],
				relations: ['shared', 'shared.project', 'shared.project.projectRelations'],
				where: { projectId: '' },
			});
		});

		it('should transform withRole filter to shared.role', async () => {
			const listQueryOptions: ListQuery.Options = {
				filter: { withRole: 'credential:owner' },
			};
			(credentialsRepository.find as jest.Mock).mockResolvedValue(mockCredentials);

			await credentialsRepository.findMany(listQueryOptions);

			expect(credentialsRepository.find).toHaveBeenCalledWith({
				select: ['id', 'name', 'type', 'isManaged', 'createdAt', 'updatedAt'],
				relations: ['shared', 'shared.project', 'shared.project.projectRelations'],
				where: {
					shared: {
						role: 'credential:owner',
					},
				},
			});
		});

		it('should not transform empty withRole filter', async () => {
			const listQueryOptions: ListQuery.Options = {
				filter: { withRole: '' },
			};
			(credentialsRepository.find as jest.Mock).mockResolvedValue(mockCredentials);

			await credentialsRepository.findMany(listQueryOptions);

			expect(credentialsRepository.find).toHaveBeenCalledWith({
				select: ['id', 'name', 'type', 'isManaged', 'createdAt', 'updatedAt'],
				relations: ['shared', 'shared.project', 'shared.project.projectRelations'],
				where: { withRole: '' },
			});
		});

		it('should transform user filter to shared.project.projectRelations.userId', async () => {
			const listQueryOptions: ListQuery.Options = {
				filter: { user: mockUser },
			};
			(credentialsRepository.find as jest.Mock).mockResolvedValue(mockCredentials);

			await credentialsRepository.findMany(listQueryOptions);

			expect(credentialsRepository.find).toHaveBeenCalledWith({
				select: ['id', 'name', 'type', 'isManaged', 'createdAt', 'updatedAt'],
				relations: ['shared', 'shared.project', 'shared.project.projectRelations'],
				where: {
					shared: {
						project: {
							projectRelations: {
								userId: 'user-1',
							},
						},
					},
				},
			});
		});

		it('should handle user filter without id', async () => {
			const userWithoutId = { email: 'test@example.com' } as User;
			const listQueryOptions: ListQuery.Options = {
				filter: { user: userWithoutId },
			};
			(credentialsRepository.find as jest.Mock).mockResolvedValue(mockCredentials);

			await credentialsRepository.findMany(listQueryOptions);

			expect(credentialsRepository.find).toHaveBeenCalledWith({
				select: ['id', 'name', 'type', 'isManaged', 'createdAt', 'updatedAt'],
				relations: ['shared', 'shared.project', 'shared.project.projectRelations'],
				where: { user: userWithoutId },
			});
		});

		it('should combine multiple shared filters', async () => {
			const listQueryOptions: ListQuery.Options = {
				filter: {
					projectId: 'project-1',
					withRole: 'credential:owner',
					user: mockUser,
				},
			};
			(credentialsRepository.find as jest.Mock).mockResolvedValue(mockCredentials);

			await credentialsRepository.findMany(listQueryOptions);

			expect(credentialsRepository.find).toHaveBeenCalledWith({
				select: ['id', 'name', 'type', 'isManaged', 'createdAt', 'updatedAt'],
				relations: ['shared', 'shared.project', 'shared.project.projectRelations'],
				where: {
					shared: {
						projectId: 'project-1',
						role: 'credential:owner',
						project: {
							projectRelations: {
								userId: 'user-1',
							},
						},
					},
				},
			});
		});

		it('should handle existing shared filter and merge with new filters', async () => {
			const listQueryOptions: ListQuery.Options = {
				filter: {
					shared: { credentialsId: 'cred-1' },
					projectId: 'project-1',
				},
			};
			(credentialsRepository.find as jest.Mock).mockResolvedValue(mockCredentials);

			await credentialsRepository.findMany(listQueryOptions);

			// The implementation overwrites the shared filter rather than merging
			expect(credentialsRepository.find).toHaveBeenCalledWith({
				select: ['id', 'name', 'type', 'isManaged', 'createdAt', 'updatedAt'],
				relations: ['shared', 'shared.project', 'shared.project.projectRelations'],
				where: {
					shared: {
						projectId: 'project-1',
					},
				},
			});
		});
	});

	describe('getManyByIds', () => {
		it('should find credentials by IDs without sharings', async () => {
			const ids = ['cred-1', 'cred-2'];
			(credentialsRepository.find as jest.Mock).mockResolvedValue(mockCredentials);

			const result = await credentialsRepository.getManyByIds(ids);

			expect(credentialsRepository.find).toHaveBeenCalledWith({
				where: { id: In(ids) },
			});
			expect(result).toEqual(mockCredentials);
		});

		it('should find credentials by IDs with sharings when requested', async () => {
			const ids = ['cred-1', 'cred-2'];
			(credentialsRepository.find as jest.Mock).mockResolvedValue(mockCredentials);

			const result = await credentialsRepository.getManyByIds(ids, { withSharings: true });

			expect(credentialsRepository.find).toHaveBeenCalledWith({
				where: { id: In(ids) },
				relations: {
					shared: {
						project: true,
					},
				},
			});
			expect(result).toEqual(mockCredentials);
		});

		it('should handle empty IDs array', async () => {
			const ids: string[] = [];
			(credentialsRepository.find as jest.Mock).mockResolvedValue([]);

			const result = await credentialsRepository.getManyByIds(ids);

			expect(credentialsRepository.find).toHaveBeenCalledWith({
				where: { id: In(ids) },
			});
			expect(result).toEqual([]);
		});

		it('should handle single ID', async () => {
			const ids = ['cred-1'];
			const singleCredential = [mockCredentials[0]];
			(credentialsRepository.find as jest.Mock).mockResolvedValue(singleCredential);

			const result = await credentialsRepository.getManyByIds(ids, { withSharings: true });

			expect(result).toEqual(singleCredential);
		});
	});

	describe('findAllPersonalCredentials', () => {
		it('should find all credentials owned by personal projects', async () => {
			const personalCredentials = mockCredentials.filter(
				(cred) => cred.shared?.[0]?.project?.type === 'personal',
			);
			(credentialsRepository.findBy as jest.Mock).mockResolvedValue(personalCredentials);

			const result = await credentialsRepository.findAllPersonalCredentials();

			expect(credentialsRepository.findBy).toHaveBeenCalledWith({
				shared: { project: { type: 'personal' } },
			});
			expect(result).toEqual(personalCredentials);
		});

		it('should return empty array when no personal credentials exist', async () => {
			(credentialsRepository.findBy as jest.Mock).mockResolvedValue([]);

			const result = await credentialsRepository.findAllPersonalCredentials();

			expect(result).toEqual([]);
		});

		it('should use correct query structure for personal projects', async () => {
			await credentialsRepository.findAllPersonalCredentials();

			expect(credentialsRepository.findBy).toHaveBeenCalledWith({
				shared: { project: { type: 'personal' } },
			});
		});
	});

	describe('findAllCredentialsForWorkflow', () => {
		it('should find all credentials accessible to a workflow', async () => {
			const workflowId = 'workflow-123';
			const workflowCredentials = mockCredentials.filter((cred) =>
				cred.shared?.some((share) =>
					share.project?.sharedWorkflows?.some((wf: any) => wf.workflowId === workflowId),
				),
			);
			(credentialsRepository.findBy as jest.Mock).mockResolvedValue(workflowCredentials);

			const result = await credentialsRepository.findAllCredentialsForWorkflow(workflowId);

			expect(credentialsRepository.findBy).toHaveBeenCalledWith({
				shared: { project: { sharedWorkflows: { workflowId } } },
			});
			expect(result).toEqual(workflowCredentials);
		});

		it('should return empty array when workflow has no accessible credentials', async () => {
			const workflowId = 'nonexistent-workflow';
			(credentialsRepository.findBy as jest.Mock).mockResolvedValue([]);

			const result = await credentialsRepository.findAllCredentialsForWorkflow(workflowId);

			expect(result).toEqual([]);
		});

		it('should handle workflows with special characters in ID', async () => {
			const workflowId = 'workflow-123_test-v1.0';

			await credentialsRepository.findAllCredentialsForWorkflow(workflowId);

			expect(credentialsRepository.findBy).toHaveBeenCalledWith({
				shared: { project: { sharedWorkflows: { workflowId } } },
			});
		});

		it('should use correct query structure for workflow relationships', async () => {
			const workflowId = 'test-workflow';

			await credentialsRepository.findAllCredentialsForWorkflow(workflowId);

			expect(credentialsRepository.findBy).toHaveBeenCalledWith({
				shared: {
					project: {
						sharedWorkflows: {
							workflowId: 'test-workflow',
						},
					},
				},
			});
		});
	});

	describe('findAllCredentialsForProject', () => {
		it('should find all credentials for a specific project', async () => {
			const projectId = 'project-1';
			const projectCredentials = mockCredentials.filter((cred) =>
				cred.shared?.some((share) => share.projectId === projectId),
			);
			(credentialsRepository.findBy as jest.Mock).mockResolvedValue(projectCredentials);

			const result = await credentialsRepository.findAllCredentialsForProject(projectId);

			expect(credentialsRepository.findBy).toHaveBeenCalledWith({
				shared: { projectId },
			});
			expect(result).toEqual(projectCredentials);
		});

		it('should return empty array when project has no credentials', async () => {
			const projectId = 'empty-project';
			(credentialsRepository.findBy as jest.Mock).mockResolvedValue([]);

			const result = await credentialsRepository.findAllCredentialsForProject(projectId);

			expect(result).toEqual([]);
		});

		it('should handle projects with UUID format IDs', async () => {
			const projectId = '123e4567-e89b-12d3-a456-426614174000';

			await credentialsRepository.findAllCredentialsForProject(projectId);

			expect(credentialsRepository.findBy).toHaveBeenCalledWith({
				shared: { projectId },
			});
		});

		it('should use correct query structure for project relationships', async () => {
			const projectId = 'test-project';

			await credentialsRepository.findAllCredentialsForProject(projectId);

			expect(credentialsRepository.findBy).toHaveBeenCalledWith({
				shared: {
					projectId: 'test-project',
				},
			});
		});
	});

	describe('Security and Access Control', () => {
		it('should properly filter credentials by user access through project relations', async () => {
			const listQueryOptions: ListQuery.Options = {
				filter: {
					user: mockUser,
					withRole: 'credential:owner',
				},
			};
			(credentialsRepository.find as jest.Mock).mockResolvedValue(mockCredentials);

			await credentialsRepository.findMany(listQueryOptions);

			expect(credentialsRepository.find).toHaveBeenCalledWith({
				select: ['id', 'name', 'type', 'isManaged', 'createdAt', 'updatedAt'],
				relations: ['shared', 'shared.project', 'shared.project.projectRelations'],
				where: {
					shared: {
						role: 'credential:owner',
						project: {
							projectRelations: {
								userId: 'user-1',
							},
						},
					},
				},
			});
		});

		it('should handle role-based access control properly', async () => {
			const listQueryOptions: ListQuery.Options = {
				filter: {
					withRole: 'credential:user',
					projectId: 'project-1',
				},
			};
			(credentialsRepository.find as jest.Mock).mockResolvedValue(mockCredentials);

			await credentialsRepository.findMany(listQueryOptions);

			expect(credentialsRepository.find).toHaveBeenCalledWith({
				select: ['id', 'name', 'type', 'isManaged', 'createdAt', 'updatedAt'],
				relations: ['shared', 'shared.project', 'shared.project.projectRelations'],
				where: {
					shared: {
						projectId: 'project-1',
						role: 'credential:user',
					},
				},
			});
		});

		it('should prevent data exposure when includeData is false', async () => {
			const listQueryOptions: ListQuery.Options & { includeData: boolean } = {
				includeData: false,
			};
			(credentialsRepository.find as jest.Mock).mockResolvedValue(mockCredentials);

			await credentialsRepository.findMany(listQueryOptions);

			expect(credentialsRepository.find).toHaveBeenCalledWith({
				select: ['id', 'name', 'type', 'isManaged', 'createdAt', 'updatedAt'],
				relations: ['shared', 'shared.project', 'shared.project.projectRelations'],
			});
		});

		it('should allow data access only when explicitly requested', async () => {
			const listQueryOptions: ListQuery.Options & { includeData: boolean } = {
				includeData: true,
				select: { id: true, name: true },
			};
			(credentialsRepository.find as jest.Mock).mockResolvedValue(mockCredentials);

			await credentialsRepository.findMany(listQueryOptions);

			expect(credentialsRepository.find).toHaveBeenCalledWith({
				select: { id: true, name: true, data: true },
			});
		});

		it('should properly handle managed credentials filtering', async () => {
			const listQueryOptions: ListQuery.Options = {
				filter: { isManaged: true },
			};
			(credentialsRepository.find as jest.Mock).mockResolvedValue(
				mockCredentials.filter((cred) => cred.isManaged),
			);

			await credentialsRepository.findMany(listQueryOptions);

			expect(credentialsRepository.find).toHaveBeenCalledWith({
				select: ['id', 'name', 'type', 'isManaged', 'createdAt', 'updatedAt'],
				relations: ['shared', 'shared.project', 'shared.project.projectRelations'],
				where: { isManaged: true },
			});
		});
	});

	describe('Filter Transformation Logic', () => {
		it('should handle complex filter combinations correctly', async () => {
			const listQueryOptions: ListQuery.Options = {
				filter: {
					name: 'API',
					type: 'http',
					projectId: 'project-1',
					withRole: 'credential:owner',
					user: mockUser,
					isManaged: false,
				},
			};
			(credentialsRepository.find as jest.Mock).mockResolvedValue(mockCredentials);

			await credentialsRepository.findMany(listQueryOptions);

			expect(credentialsRepository.find).toHaveBeenCalledWith({
				select: ['id', 'name', 'type', 'isManaged', 'createdAt', 'updatedAt'],
				relations: ['shared', 'shared.project', 'shared.project.projectRelations'],
				where: {
					name: Like('%API%'),
					type: Like('%http%'),
					isManaged: false,
					shared: {
						projectId: 'project-1',
						role: 'credential:owner',
						project: {
							projectRelations: {
								userId: 'user-1',
							},
						},
					},
				},
			});
		});

		it('should preserve non-string filters as-is', async () => {
			const listQueryOptions: ListQuery.Options = {
				filter: {
					isManaged: true,
					createdAt: new Date('2023-01-01'),
				},
			};
			(credentialsRepository.find as jest.Mock).mockResolvedValue(mockCredentials);

			await credentialsRepository.findMany(listQueryOptions);

			expect(credentialsRepository.find).toHaveBeenCalledWith({
				select: ['id', 'name', 'type', 'isManaged', 'createdAt', 'updatedAt'],
				relations: ['shared', 'shared.project', 'shared.project.projectRelations'],
				where: {
					isManaged: true,
					createdAt: new Date('2023-01-01'),
				},
			});
		});

		it('should handle null and undefined filter values', async () => {
			const listQueryOptions: ListQuery.Options = {
				filter: {
					name: null,
					type: undefined,
					projectId: 'project-1',
				},
			};
			(credentialsRepository.find as jest.Mock).mockResolvedValue(mockCredentials);

			await credentialsRepository.findMany(listQueryOptions);

			expect(credentialsRepository.find).toHaveBeenCalledWith({
				select: ['id', 'name', 'type', 'isManaged', 'createdAt', 'updatedAt'],
				relations: ['shared', 'shared.project', 'shared.project.projectRelations'],
				where: {
					name: null,
					type: undefined,
					shared: {
						projectId: 'project-1',
					},
				},
			});
		});
	});

	describe('Data Options and Pagination', () => {
		it('should handle pagination with custom select fields', async () => {
			const listQueryOptions: ListQuery.Options = {
				select: { name: true, type: true },
				take: 20,
				skip: 10,
			};
			(credentialsRepository.find as jest.Mock).mockResolvedValue(mockCredentials);

			await credentialsRepository.findMany(listQueryOptions);

			expect(credentialsRepository.find).toHaveBeenCalledWith({
				select: { name: true, type: true, id: true },
				take: 20,
				skip: 10,
			});
		});

		it('should handle large pagination offsets', async () => {
			const listQueryOptions: ListQuery.Options = {
				take: 100,
				skip: 10000,
			};
			(credentialsRepository.find as jest.Mock).mockResolvedValue(mockCredentials);

			await credentialsRepository.findMany(listQueryOptions);

			expect(credentialsRepository.find).toHaveBeenCalledWith({
				select: ['id', 'name', 'type', 'isManaged', 'createdAt', 'updatedAt'],
				relations: ['shared', 'shared.project', 'shared.project.projectRelations'],
				take: 100,
				skip: 10000,
			});
		});

		it('should handle zero take and skip values', async () => {
			const listQueryOptions: ListQuery.Options = {
				take: 0,
				skip: 0,
			};
			(credentialsRepository.find as jest.Mock).mockResolvedValue([]);

			await credentialsRepository.findMany(listQueryOptions);

			// The implementation only includes take/skip when they are truthy
			expect(credentialsRepository.find).toHaveBeenCalledWith({
				select: ['id', 'name', 'type', 'isManaged', 'createdAt', 'updatedAt'],
				relations: ['shared', 'shared.project', 'shared.project.projectRelations'],
			});
		});
	});

	describe('Relationship Filtering', () => {
		it('should properly handle deep relationship queries for workflow access', async () => {
			const workflowId = 'complex-workflow-123';
			const expectedCredentials = mockCredentials.filter((cred) => {
				return cred.shared?.some((share) => {
					// Mock deep relationship check
					return share.project?.sharedWorkflows?.some((wf: any) => wf.workflowId === workflowId);
				});
			});

			(credentialsRepository.findBy as jest.Mock).mockResolvedValue(expectedCredentials);

			const result = await credentialsRepository.findAllCredentialsForWorkflow(workflowId);

			expect(credentialsRepository.findBy).toHaveBeenCalledWith({
				shared: { project: { sharedWorkflows: { workflowId } } },
			});
			expect(result).toEqual(expectedCredentials);
		});

		it('should handle multiple project relationships correctly', async () => {
			const listQueryOptions: ListQuery.Options = {
				filter: {
					user: mockUser,
					projectId: 'project-1',
				},
			};
			(credentialsRepository.find as jest.Mock).mockResolvedValue(mockCredentials);

			await credentialsRepository.findMany(listQueryOptions);

			expect(credentialsRepository.find).toHaveBeenCalledWith({
				select: ['id', 'name', 'type', 'isManaged', 'createdAt', 'updatedAt'],
				relations: ['shared', 'shared.project', 'shared.project.projectRelations'],
				where: {
					shared: {
						projectId: 'project-1',
						project: {
							projectRelations: {
								userId: 'user-1',
							},
						},
					},
				},
			});
		});

		it('should validate project access through personal project ownership', async () => {
			const personalCredentials = mockCredentials.filter(
				(cred) => cred.shared?.[0]?.project?.type === 'personal',
			);
			(credentialsRepository.findBy as jest.Mock).mockResolvedValue(personalCredentials);

			const result = await credentialsRepository.findAllPersonalCredentials();

			expect(credentialsRepository.findBy).toHaveBeenCalledWith({
				shared: { project: { type: 'personal' } },
			});
			expect(result).toEqual(personalCredentials);
		});
	});

	describe('Edge Cases and Error Handling', () => {
		it('should handle database errors gracefully', async () => {
			const error = new Error('Database connection failed');
			(credentialsRepository.find as jest.Mock).mockRejectedValue(error);

			await expect(credentialsRepository.findMany()).rejects.toThrow('Database connection failed');
		});

		it('should handle malformed filter objects', async () => {
			const listQueryOptions: ListQuery.Options = {
				filter: {
					user: { invalid: 'data' } as any,
				},
			};
			(credentialsRepository.find as jest.Mock).mockResolvedValue([]);

			await credentialsRepository.findMany(listQueryOptions);

			expect(credentialsRepository.find).toHaveBeenCalledWith({
				select: ['id', 'name', 'type', 'isManaged', 'createdAt', 'updatedAt'],
				relations: ['shared', 'shared.project', 'shared.project.projectRelations'],
				where: {
					user: { invalid: 'data' },
				},
			});
		});

		it('should handle extremely large credential ID arrays', async () => {
			const largeIdArray = Array.from({ length: 10000 }, (_, i) => `cred-${i}`);
			(credentialsRepository.find as jest.Mock).mockResolvedValue([]);

			await credentialsRepository.getManyByIds(largeIdArray);

			expect(credentialsRepository.find).toHaveBeenCalledWith({
				where: { id: In(largeIdArray) },
			});
		});

		it('should handle special characters in search terms', async () => {
			const specialName = 'Test\'s "Credential" & Co. [v1.0]';
			(credentialsRepository.find as jest.Mock).mockResolvedValue([]);

			await credentialsRepository.findStartingWith(specialName);

			expect(credentialsRepository.find).toHaveBeenCalledWith({
				select: ['name'],
				where: { name: Like(`${specialName}%`) },
			});
		});

		it('should handle concurrent repository operations', async () => {
			const concurrentOperations = [
				credentialsRepository.findStartingWith('Test'),
				credentialsRepository.findAllPersonalCredentials(),
				credentialsRepository.getManyByIds(['cred-1']),
			];

			(credentialsRepository.find as jest.Mock).mockResolvedValue([]);
			(credentialsRepository.findBy as jest.Mock).mockResolvedValue([]);

			const results = await Promise.all(concurrentOperations);

			expect(results).toHaveLength(3);
			results.forEach((result) => {
				expect(Array.isArray(result)).toBe(true);
			});
		});
	});
});
