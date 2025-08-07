'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const backend_test_utils_1 = require('@n8n/backend-test-utils');
const db_1 = require('@n8n/db');
const di_1 = require('@n8n/di');
const jest_mock_extended_1 = require('jest-mock-extended');
const bad_request_error_1 = require('@/errors/response-errors/bad-request.error');
const not_found_error_1 = require('@/errors/response-errors/not-found.error');
const event_service_1 = require('@/events/event.service');
const project_service_ee_1 = require('@/services/project.service.ee');
const email_1 = require('@/user-management/email');
const project_controller_1 = require('../project.controller');
jest.mock('@n8n/permissions', () => ({
	combineScopes: jest.fn().mockReturnValue(['mocked:scope']),
	getRoleScopes: jest.fn().mockReturnValue(['role:scope']),
	hasGlobalScope: jest.fn().mockReturnValue(true),
}));
describe('ProjectController', () => {
	const projectsService = (0, backend_test_utils_1.mockInstance)(
		project_service_ee_1.ProjectService,
	);
	const projectRepository = (0, backend_test_utils_1.mockInstance)(db_1.ProjectRepository);
	const eventService = (0, backend_test_utils_1.mockInstance)(event_service_1.EventService);
	const userManagementMailer = (0, backend_test_utils_1.mockInstance)(email_1.UserManagementMailer);
	const controller = di_1.Container.get(project_controller_1.ProjectController);
	let mockUser;
	let mockProject;
	let mockResponse;
	beforeEach(() => {
		jest.clearAllMocks();
		mockUser = (0, jest_mock_extended_1.mock)({
			id: 'user-123',
			email: 'test@example.com',
			role: 'global:member',
			firstName: 'Test',
			lastName: 'User',
		});
		mockProject = (0, jest_mock_extended_1.mock)({
			id: 'project-123',
			name: 'Test Project',
			type: 'team',
			description: 'A test project',
			icon: 'project',
		});
		mockResponse = (0, jest_mock_extended_1.mock)();
	});
	describe('getAllProjects', () => {
		it('should return all accessible projects for user', async () => {
			const req = (0, jest_mock_extended_1.mock)({ user: mockUser });
			const expectedProjects = [mockProject];
			projectsService.getAccessibleProjects.mockResolvedValue(expectedProjects);
			const result = await controller.getAllProjects(req);
			expect(projectsService.getAccessibleProjects).toHaveBeenCalledWith(mockUser);
			expect(result).toEqual(expectedProjects);
		});
		it('should return empty array when user has no accessible projects', async () => {
			const req = (0, jest_mock_extended_1.mock)({ user: mockUser });
			projectsService.getAccessibleProjects.mockResolvedValue([]);
			const result = await controller.getAllProjects(req);
			expect(result).toEqual([]);
		});
	});
	describe('getProjectCounts', () => {
		it('should return project counts', async () => {
			const expectedCounts = { total: 5, team: 3, personal: 2 };
			projectsService.getProjectCounts.mockResolvedValue(expectedCounts);
			const result = await controller.getProjectCounts();
			expect(projectsService.getProjectCounts).toHaveBeenCalled();
			expect(result).toEqual(expectedCounts);
		});
	});
	describe('createProject', () => {
		it('should create a new team project successfully', async () => {
			const req = (0, jest_mock_extended_1.mock)({ user: mockUser });
			const payload = {
				name: 'New Project',
				icon: 'project',
			};
			projectsService.createTeamProject.mockResolvedValue(mockProject);
			const result = await controller.createProject(req, mockResponse, payload);
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
			const req = (0, jest_mock_extended_1.mock)({ user: mockUser });
			const payload = { name: 'New Project' };
			const quotaError = new project_service_ee_1.TeamProjectOverQuotaError('Quota exceeded');
			projectsService.createTeamProject.mockRejectedValue(quotaError);
			await expect(controller.createProject(req, mockResponse, payload)).rejects.toThrow(
				bad_request_error_1.BadRequestError,
			);
			expect(eventService.emit).not.toHaveBeenCalled();
		});
		it('should rethrow other errors', async () => {
			const req = (0, jest_mock_extended_1.mock)({ user: mockUser });
			const payload = { name: 'New Project' };
			const genericError = new Error('Generic error');
			projectsService.createTeamProject.mockRejectedValue(genericError);
			await expect(controller.createProject(req, mockResponse, payload)).rejects.toThrow(
				'Generic error',
			);
		});
	});
	describe('getMyProjects', () => {
		it('should return user projects with relations and scopes', async () => {
			const req = (0, jest_mock_extended_1.mock)({ user: mockUser });
			const projectRelations = [
				{
					projectId: 'project-1',
					userId: mockUser.id,
					role: 'project:admin',
					project: mockProject,
				},
			];
			projectsService.getProjectRelationsForUser.mockResolvedValue(projectRelations);
			projectRepository.findBy.mockResolvedValue([]);
			projectRepository.create.mockReturnValue(mockProject);
			const result = await controller.getMyProjects(req, mockResponse);
			expect(projectsService.getProjectRelationsForUser).toHaveBeenCalledWith(mockUser);
			expect(result).toHaveLength(1);
			expect(result[0]).toMatchObject({
				...mockProject,
				role: 'project:admin',
				scopes: ['mocked:scope'],
			});
		});
		it('should include other team projects for users with global project:read scope', async () => {
			const req = (0, jest_mock_extended_1.mock)({ user: mockUser });
			const projectRelations = [];
			const otherTeamProjects = [mockProject];
			projectsService.getProjectRelationsForUser.mockResolvedValue(projectRelations);
			projectRepository.findBy.mockResolvedValue(otherTeamProjects);
			projectRepository.create.mockReturnValue(mockProject);
			const result = await controller.getMyProjects(req, mockResponse);
			expect(result).toHaveLength(1);
			expect(result[0]).toMatchObject({
				...mockProject,
				role: mockUser.role,
			});
		});
		it('should deduplicate and sort scopes', async () => {
			const req = (0, jest_mock_extended_1.mock)({ user: mockUser });
			const projectRelations = [
				{
					projectId: 'project-1',
					userId: mockUser.id,
					role: 'project:admin',
					project: mockProject,
				},
			];
			const { combineScopes } = require('@n8n/permissions');
			combineScopes.mockReturnValue(['scope:b', 'scope:a', 'scope:b']);
			projectsService.getProjectRelationsForUser.mockResolvedValue(projectRelations);
			projectRepository.findBy.mockResolvedValue([]);
			projectRepository.create.mockReturnValue(mockProject);
			const result = await controller.getMyProjects(req, mockResponse);
			expect(result[0].scopes).toEqual(['scope:a', 'scope:b']);
		});
	});
	describe('getPersonalProject', () => {
		it('should return personal project with scopes', async () => {
			const req = (0, jest_mock_extended_1.mock)({ user: mockUser });
			const personalProject = { ...mockProject, type: 'personal' };
			projectsService.getPersonalProject.mockResolvedValue(personalProject);
			const result = await controller.getPersonalProject(req);
			expect(projectsService.getPersonalProject).toHaveBeenCalledWith(mockUser);
			expect(result).toEqual({
				...personalProject,
				scopes: ['mocked:scope'],
			});
		});
		it('should throw NotFoundError when personal project does not exist', async () => {
			const req = (0, jest_mock_extended_1.mock)({ user: mockUser });
			projectsService.getPersonalProject.mockResolvedValue(null);
			await expect(controller.getPersonalProject(req)).rejects.toThrow(
				not_found_error_1.NotFoundError,
			);
		});
	});
	describe('getProject', () => {
		it('should return project with relations and scopes', async () => {
			const req = (0, jest_mock_extended_1.mock)({ user: mockUser });
			const projectId = 'project-123';
			const relations = [
				{
					userId: mockUser.id,
					role: 'project:admin',
					user: mockUser,
				},
			];
			projectsService.getProject.mockResolvedValue(mockProject);
			projectsService.getProjectRelations.mockResolvedValue(relations);
			const result = await controller.getProject(req, mockResponse, projectId);
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
			const req = (0, jest_mock_extended_1.mock)({ user: mockUser });
			const projectId = 'project-123';
			const payload = {
				name: 'Updated Project',
				description: 'Updated description',
				icon: 'updated-icon',
			};
			await controller.updateProject(req, mockResponse, payload, projectId);
			expect(projectsService.updateProject).toHaveBeenCalledWith(projectId, {
				name: 'Updated Project',
				description: 'Updated description',
				icon: 'updated-icon',
			});
			expect(projectsService.syncProjectRelations).not.toHaveBeenCalled();
		});
		it('should update project relations and send notifications', async () => {
			const req = (0, jest_mock_extended_1.mock)({ user: mockUser });
			const projectId = 'project-123';
			const relations = [{ userId: 'user-456', role: 'project:viewer' }];
			const payload = { relations };
			const syncResult = {
				project: mockProject,
				newRelations: [{ user: mockUser, role: 'project:viewer' }],
			};
			projectsService.syncProjectRelations.mockResolvedValue(syncResult);
			await controller.updateProject(req, mockResponse, payload, projectId);
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
			const req = (0, jest_mock_extended_1.mock)({ user: mockUser });
			const projectId = 'project-123';
			const payload = {
				relations: [{ userId: 'user-456', role: 'project:admin' }],
			};
			const unlicensedError = new project_service_ee_1.UnlicensedProjectRoleError(
				'Unlicensed role',
			);
			projectsService.syncProjectRelations.mockRejectedValue(unlicensedError);
			await expect(controller.updateProject(req, mockResponse, payload, projectId)).rejects.toThrow(
				bad_request_error_1.BadRequestError,
			);
		});
	});
	describe('deleteProject', () => {
		it('should delete project without transfer', async () => {
			const req = (0, jest_mock_extended_1.mock)({ user: mockUser });
			const projectId = 'project-123';
			const query = {};
			await controller.deleteProject(req, mockResponse, query, projectId);
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
			const req = (0, jest_mock_extended_1.mock)({ user: mockUser });
			const projectId = 'project-123';
			const transferId = 'project-456';
			const query = { transferId };
			await controller.deleteProject(req, mockResponse, query, projectId);
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
			const req = (0, jest_mock_extended_1.mock)({ user: mockUser });
			const serviceError = new Error('Service error');
			projectsService.getAccessibleProjects.mockRejectedValue(serviceError);
			await expect(controller.getAllProjects(req)).rejects.toThrow('Service error');
		});
		it('should handle concurrent access scenarios', async () => {
			const user1 = (0, jest_mock_extended_1.mock)({ id: 'user-1' });
			const user2 = (0, jest_mock_extended_1.mock)({ id: 'user-2' });
			const req1 = (0, jest_mock_extended_1.mock)({ user: user1 });
			const req2 = (0, jest_mock_extended_1.mock)({ user: user2 });
			projectsService.getAccessibleProjects
				.mockResolvedValueOnce([mockProject])
				.mockResolvedValueOnce([]);
			const [result1, result2] = await Promise.all([
				controller.getAllProjects(req1),
				controller.getAllProjects(req2),
			]);
			expect(result1).toEqual([mockProject]);
			expect(result2).toEqual([]);
			expect(projectsService.getAccessibleProjects).toHaveBeenCalledTimes(2);
		});
	});
});
//# sourceMappingURL=project.controller.test.js.map
