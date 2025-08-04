// Note: CreateProjectDto and related types have schema issues, using inline types for tests
type CreateProjectDto = { name: string; icon?: string; description?: string };
type UpdateProjectDto = { name?: string; icon?: string; description?: string; relations?: any[] };
type DeleteProjectDto = { transferId?: string };

import { mockInstance } from '@n8n/backend-test-utils';
import type { AuthenticatedRequest, Project, User } from '@n8n/db';
import { ProjectRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import { mock } from 'jest-mock-extended';
import type { Response } from 'express';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import { EventService } from '@/events/event.service';
import {
	ProjectService,
	TeamProjectOverQuotaError,
	UnlicensedProjectRoleError,
} from '@/services/project.service.ee';
import { UserManagementMailer } from '@/user-management/email';

import { ProjectController } from '../project.controller';

// Mock permissions module
jest.mock('@n8n/permissions', () => ({
	combineScopes: jest.fn().mockReturnValue(['mocked:scope']),
	getRoleScopes: jest.fn().mockReturnValue(['role:scope']),
	hasGlobalScope: jest.fn().mockReturnValue(true),
}));

describe('ProjectController', () => {
	const projectsService = mockInstance(ProjectService);
	const projectRepository = mockInstance(ProjectRepository);
	const eventService = mockInstance(EventService);
	const userManagementMailer = mockInstance(UserManagementMailer);

	const controller = Container.get(ProjectController);

	let mockUser: User;
	let mockProject: Project;
	let mockResponse: Response;

	beforeEach(() => {
		jest.clearAllMocks();

		mockUser = mock<User>({
			id: 'user-123',
			email: 'test@example.com',
			role: 'global:member',
			firstName: 'Test',
			lastName: 'User',
		});

		mockProject = mock<Project>({
			id: 'project-123',
			name: 'Test Project',
			type: 'team',
			description: 'A test project',
			icon: 'project',
		});

		mockResponse = mock<Response>();
	});

	describe('getAllProjects', () => {
		it('should return all accessible projects for user', async () => {
			// Arrange
			const req = mock<AuthenticatedRequest>({ user: mockUser });
			const expectedProjects = [mockProject];
			projectsService.getAccessibleProjects.mockResolvedValue(expectedProjects);

			// Act
			const result = await controller.getAllProjects(req);

			// Assert
			expect(projectsService.getAccessibleProjects).toHaveBeenCalledWith(mockUser);
			expect(result).toEqual(expectedProjects);
		});

		it('should return empty array when user has no accessible projects', async () => {
			// Arrange
			const req = mock<AuthenticatedRequest>({ user: mockUser });
			projectsService.getAccessibleProjects.mockResolvedValue([]);

			// Act
			const result = await controller.getAllProjects(req);

			// Assert
			expect(result).toEqual([]);
		});
	});

	describe('getProjectCounts', () => {
		it('should return project counts', async () => {
			// Arrange
			const expectedCounts = { total: 5, team: 3, personal: 2 };
			projectsService.getProjectCounts.mockResolvedValue(expectedCounts);

			// Act
			const result = await controller.getProjectCounts();

			// Assert
			expect(projectsService.getProjectCounts).toHaveBeenCalled();
			expect(result).toEqual(expectedCounts);
		});
	});

	describe('createProject', () => {
		it('should create a new team project successfully', async () => {
			// Arrange
			const req = mock<AuthenticatedRequest>({ user: mockUser });
			const payload: CreateProjectDto = {
				name: 'New Project',
				icon: 'project',
			};

			projectsService.createTeamProject.mockResolvedValue(mockProject);

			// Act
			const result = await controller.createProject(req, mockResponse, payload);

			// Assert
			expect(projectsService.createTeamProject).toHaveBeenCalledWith(mockUser, payload);
			expect(eventService.emit).toHaveBeenCalledWith('team-project-created', {
				userId: mockUser.id,
				role: mockUser.role,
			});
			expect(result).toEqual({
				...mockProject,
				role: 'project:admin',
				scopes: ['mocked:scope'],
			});
		});

		it('should handle team project over quota error', async () => {
			// Arrange
			const req = mock<AuthenticatedRequest>({ user: mockUser });
			const payload: CreateProjectDto = { name: 'New Project' };

			const quotaError = new TeamProjectOverQuotaError('Quota exceeded');
			projectsService.createTeamProject.mockRejectedValue(quotaError);

			// Act & Assert
			await expect(controller.createProject(req, mockResponse, payload)).rejects.toThrow(
				BadRequestError,
			);
			expect(eventService.emit).not.toHaveBeenCalled();
		});

		it('should rethrow other errors', async () => {
			// Arrange
			const req = mock<AuthenticatedRequest>({ user: mockUser });
			const payload: CreateProjectDto = { name: 'New Project' };

			const genericError = new Error('Generic error');
			projectsService.createTeamProject.mockRejectedValue(genericError);

			// Act & Assert
			await expect(controller.createProject(req, mockResponse, payload)).rejects.toThrow(
				'Generic error',
			);
		});
	});

	describe('getMyProjects', () => {
		it('should return user projects with relations and scopes', async () => {
			// Arrange
			const req = mock<AuthenticatedRequest>({ user: mockUser });
			const projectRelations = [
				{
					projectId: 'project-1',
					userId: mockUser.id,
					role: 'project:admin' as const,
					project: mockProject,
				},
			];

			projectsService.getProjectRelationsForUser.mockResolvedValue(projectRelations);
			projectRepository.findBy.mockResolvedValue([]);
			projectRepository.create.mockReturnValue(mockProject);

			// Act
			const result = await controller.getMyProjects(req, mockResponse);

			// Assert
			expect(projectsService.getProjectRelationsForUser).toHaveBeenCalledWith(mockUser);
			expect(result).toHaveLength(1);
			expect(result[0]).toMatchObject({
				...mockProject,
				role: 'project:admin',
				scopes: ['mocked:scope'],
			});
		});

		it('should include other team projects for users with global project:read scope', async () => {
			// Arrange
			const req = mock<AuthenticatedRequest>({ user: mockUser });
			const projectRelations = [];
			const otherTeamProjects = [mockProject];

			projectsService.getProjectRelationsForUser.mockResolvedValue(projectRelations);
			projectRepository.findBy.mockResolvedValue(otherTeamProjects);
			projectRepository.create.mockReturnValue(mockProject);

			// Act
			const result = await controller.getMyProjects(req, mockResponse);

			// Assert
			expect(result).toHaveLength(1);
			expect(result[0]).toMatchObject({
				...mockProject,
				role: mockUser.role,
			});
		});

		it('should deduplicate and sort scopes', async () => {
			// Arrange
			const req = mock<AuthenticatedRequest>({ user: mockUser });
			const projectRelations = [
				{
					projectId: 'project-1',
					userId: mockUser.id,
					role: 'project:admin' as const,
					project: mockProject,
				},
			];

			// Mock duplicate scopes
			const { combineScopes } = require('@n8n/permissions');
			combineScopes.mockReturnValue(['scope:b', 'scope:a', 'scope:b']);

			projectsService.getProjectRelationsForUser.mockResolvedValue(projectRelations);
			projectRepository.findBy.mockResolvedValue([]);
			projectRepository.create.mockReturnValue(mockProject);

			// Act
			const result = await controller.getMyProjects(req, mockResponse);

			// Assert
			expect(result[0].scopes).toEqual(['scope:a', 'scope:b']);
		});
	});

	describe('getPersonalProject', () => {
		it('should return personal project with scopes', async () => {
			// Arrange
			const req = mock<AuthenticatedRequest>({ user: mockUser });
			const personalProject = { ...mockProject, type: 'personal' as const };

			projectsService.getPersonalProject.mockResolvedValue(personalProject);

			// Act
			const result = await controller.getPersonalProject(req);

			// Assert
			expect(projectsService.getPersonalProject).toHaveBeenCalledWith(mockUser);
			expect(result).toEqual({
				...personalProject,
				scopes: ['mocked:scope'],
			});
		});

		it('should throw NotFoundError when personal project does not exist', async () => {
			// Arrange
			const req = mock<AuthenticatedRequest>({ user: mockUser });
			projectsService.getPersonalProject.mockResolvedValue(null);

			// Act & Assert
			await expect(controller.getPersonalProject(req)).rejects.toThrow(NotFoundError);
		});
	});

	describe('getProject', () => {
		it('should return project with relations and scopes', async () => {
			// Arrange
			const req = mock<AuthenticatedRequest>({ user: mockUser });
			const projectId = 'project-123';
			const relations = [
				{
					userId: mockUser.id,
					role: 'project:admin' as const,
					user: mockUser,
				},
			];

			projectsService.getProject.mockResolvedValue(mockProject);
			projectsService.getProjectRelations.mockResolvedValue(relations);

			// Act
			const result = await controller.getProject(req, mockResponse, projectId);

			// Assert
			expect(projectsService.getProject).toHaveBeenCalledWith(projectId);
			expect(projectsService.getProjectRelations).toHaveBeenCalledWith(projectId);
			expect(result).toMatchObject({
				id: mockProject.id,
				name: mockProject.name,
				relations: [
					{
						id: mockUser.id,
						email: mockUser.email,
						firstName: mockUser.firstName,
						lastName: mockUser.lastName,
						role: 'project:admin',
					},
				],
				scopes: ['mocked:scope'],
			});
		});
	});

	describe('updateProject', () => {
		it('should update project details only', async () => {
			// Arrange
			const req = mock<AuthenticatedRequest>({ user: mockUser });
			const projectId = 'project-123';
			const payload: UpdateProjectDto = {
				name: 'Updated Project',
				description: 'Updated description',
				icon: 'updated-icon',
			};

			// Act
			await controller.updateProject(req, mockResponse, payload, projectId);

			// Assert
			expect(projectsService.updateProject).toHaveBeenCalledWith(projectId, {
				name: 'Updated Project',
				description: 'Updated description',
				icon: 'updated-icon',
			});
			expect(projectsService.syncProjectRelations).not.toHaveBeenCalled();
		});

		it('should update project relations and send notifications', async () => {
			// Arrange
			const req = mock<AuthenticatedRequest>({ user: mockUser });
			const projectId = 'project-123';
			const relations = [{ userId: 'user-456', role: 'project:viewer' as const }];
			const payload: UpdateProjectDto = { relations };

			const syncResult = {
				project: mockProject,
				newRelations: [{ user: mockUser, role: 'project:viewer' as const }],
			};

			projectsService.syncProjectRelations.mockResolvedValue(syncResult);

			// Act
			await controller.updateProject(req, mockResponse, payload, projectId);

			// Assert
			expect(projectsService.syncProjectRelations).toHaveBeenCalledWith(projectId, relations);
			expect(userManagementMailer.notifyProjectShared).toHaveBeenCalledWith({
				sharer: mockUser,
				newSharees: syncResult.newRelations,
				project: { id: mockProject.id, name: mockProject.name },
			});
			expect(eventService.emit).toHaveBeenCalledWith('team-project-updated', {
				userId: mockUser.id,
				role: mockUser.role,
				members: relations,
				projectId,
			});
		});

		it('should handle unlicensed project role error', async () => {
			// Arrange
			const req = mock<AuthenticatedRequest>({ user: mockUser });
			const projectId = 'project-123';
			const payload: UpdateProjectDto = {
				relations: [{ userId: 'user-456', role: 'project:admin' as const }],
			};

			const unlicensedError = new UnlicensedProjectRoleError('Unlicensed role');
			projectsService.syncProjectRelations.mockRejectedValue(unlicensedError);

			// Act & Assert
			await expect(controller.updateProject(req, mockResponse, payload, projectId)).rejects.toThrow(
				BadRequestError,
			);
		});
	});

	describe('deleteProject', () => {
		it('should delete project without transfer', async () => {
			// Arrange
			const req = mock<AuthenticatedRequest>({ user: mockUser });
			const projectId = 'project-123';
			const query: DeleteProjectDto = {};

			// Act
			await controller.deleteProject(req, mockResponse, query, projectId);

			// Assert
			expect(projectsService.deleteProject).toHaveBeenCalledWith(mockUser, projectId, {
				migrateToProject: undefined,
			});
			expect(eventService.emit).toHaveBeenCalledWith('team-project-deleted', {
				userId: mockUser.id,
				role: mockUser.role,
				projectId,
				removalType: 'delete',
				targetProjectId: undefined,
			});
		});

		it('should delete project with transfer', async () => {
			// Arrange
			const req = mock<AuthenticatedRequest>({ user: mockUser });
			const projectId = 'project-123';
			const transferId = 'project-456';
			const query: DeleteProjectDto = { transferId };

			// Act
			await controller.deleteProject(req, mockResponse, query, projectId);

			// Assert
			expect(projectsService.deleteProject).toHaveBeenCalledWith(mockUser, projectId, {
				migrateToProject: transferId,
			});
			expect(eventService.emit).toHaveBeenCalledWith('team-project-deleted', {
				userId: mockUser.id,
				role: mockUser.role,
				projectId,
				removalType: 'transfer',
				targetProjectId: transferId,
			});
		});
	});

	describe('error handling', () => {
		it('should handle service errors in getAllProjects', async () => {
			// Arrange
			const req = mock<AuthenticatedRequest>({ user: mockUser });
			const serviceError = new Error('Service error');
			projectsService.getAccessibleProjects.mockRejectedValue(serviceError);

			// Act & Assert
			await expect(controller.getAllProjects(req)).rejects.toThrow('Service error');
		});

		it('should handle concurrent access scenarios', async () => {
			// Arrange
			const user1 = mock<User>({ id: 'user-1' });
			const user2 = mock<User>({ id: 'user-2' });
			const req1 = mock<AuthenticatedRequest>({ user: user1 });
			const req2 = mock<AuthenticatedRequest>({ user: user2 });

			projectsService.getAccessibleProjects
				.mockResolvedValueOnce([mockProject])
				.mockResolvedValueOnce([]);

			// Act
			const [result1, result2] = await Promise.all([
				controller.getAllProjects(req1),
				controller.getAllProjects(req2),
			]);

			// Assert
			expect(result1).toEqual([mockProject]);
			expect(result2).toEqual([]);
			expect(projectsService.getAccessibleProjects).toHaveBeenCalledTimes(2);
		});
	});
});
