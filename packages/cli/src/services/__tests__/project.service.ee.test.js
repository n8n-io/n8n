'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const jest_mock_extended_1 = require('jest-mock-extended');
const project_service_ee_1 = require('../project.service.ee');
describe('ProjectService', () => {
	const manager = (0, jest_mock_extended_1.mock)();
	const projectRepository = (0, jest_mock_extended_1.mock)();
	const projectRelationRepository = (0, jest_mock_extended_1.mock)({ manager });
	const roleService = (0, jest_mock_extended_1.mock)();
	const sharedCredentialsRepository = (0, jest_mock_extended_1.mock)();
	const cacheService = (0, jest_mock_extended_1.mock)();
	const projectService = new project_service_ee_1.ProjectService(
		(0, jest_mock_extended_1.mock)(),
		projectRepository,
		projectRelationRepository,
		roleService,
		sharedCredentialsRepository,
		cacheService,
		(0, jest_mock_extended_1.mock)(),
		(0, jest_mock_extended_1.mock)({ type: 'postgresdb' }),
	);
	describe('addUsersToProject', () => {
		it('throws if called with a personal project', async () => {
			const projectId = '12345';
			projectRepository.findOne.mockResolvedValueOnce(
				(0, jest_mock_extended_1.mock)({ type: 'personal', projectRelations: [] }),
			);
			roleService.isRoleLicensed.mockReturnValueOnce(true);
			await expect(
				projectService.addUsersToProject(projectId, [{ userId: '1234', role: 'project:admin' }]),
			).rejects.toThrowError("Can't add users to personal projects.");
		});
		it('throws if trying to add a personalOwner to a team project', async () => {
			const projectId = '12345';
			projectRepository.findOne.mockResolvedValueOnce(
				(0, jest_mock_extended_1.mock)({ type: 'team', projectRelations: [] }),
			);
			roleService.isRoleLicensed.mockReturnValueOnce(true);
			await expect(
				projectService.addUsersToProject(projectId, [
					{ userId: '1234', role: 'project:personalOwner' },
				]),
			).rejects.toThrowError("Can't add a personalOwner to a team project.");
		});
	});
	describe('syncProjectRelations', () => {
		const projectId = '12345';
		const mockRelations = [
			{ userId: 'user1', role: 'project:admin' },
			{ userId: 'user2', role: 'project:viewer' },
		];
		beforeEach(() => {
			jest.clearAllMocks();
			manager.transaction.mockImplementation(async (arg1, arg2) => {
				const runInTransaction = arg2 ?? arg1;
				return await runInTransaction(manager);
			});
		});
		it('should successfully sync project relations', async () => {
			projectRepository.findOne.mockResolvedValueOnce(
				(0, jest_mock_extended_1.mock)({
					id: projectId,
					type: 'team',
					projectRelations: [],
				}),
			);
			roleService.isRoleLicensed.mockReturnValue(true);
			sharedCredentialsRepository.find.mockResolvedValueOnce([
				(0, jest_mock_extended_1.mock)({ credentialsId: 'cred1' }),
				(0, jest_mock_extended_1.mock)({ credentialsId: 'cred2' }),
			]);
			await projectService.syncProjectRelations(projectId, mockRelations);
			expect(projectRepository.findOne).toHaveBeenCalledWith({
				where: { id: projectId, type: 'team' },
				relations: { projectRelations: true },
			});
			expect(manager.delete).toHaveBeenCalled();
			expect(manager.insert).toHaveBeenCalled();
			expect(cacheService.deleteMany).toHaveBeenCalledWith([
				'credential-can-use-secrets:cred1',
				'credential-can-use-secrets:cred2',
			]);
		});
		it('should throw error if project not found', async () => {
			projectRepository.findOne.mockResolvedValueOnce(null);
			await expect(projectService.syncProjectRelations(projectId, mockRelations)).rejects.toThrow(
				`Could not find project with ID: ${projectId}`,
			);
		});
		it('should throw error if unlicensed role is used', async () => {
			projectRepository.findOne.mockResolvedValueOnce(
				(0, jest_mock_extended_1.mock)({
					id: projectId,
					type: 'team',
					projectRelations: [],
				}),
			);
			roleService.isRoleLicensed.mockReturnValue(false);
			await expect(projectService.syncProjectRelations(projectId, mockRelations)).rejects.toThrow(
				'Your instance is not licensed to use role "project:admin"',
			);
		});
		it('should not throw error for existing role even if unlicensed', async () => {
			projectRepository.findOne.mockResolvedValueOnce(
				(0, jest_mock_extended_1.mock)({
					id: projectId,
					type: 'team',
					projectRelations: [{ userId: 'user1', role: 'project:admin' }],
				}),
			);
			roleService.isRoleLicensed.mockReturnValue(false);
			sharedCredentialsRepository.find.mockResolvedValueOnce([]);
			await expect(
				projectService.syncProjectRelations(projectId, [
					{ userId: 'user1', role: 'project:admin' },
				]),
			).resolves.not.toThrow();
		});
	});
	describe('changeUserRoleInProject', () => {
		const projectId = '12345';
		const mockRelations = [
			{ userId: 'user1', role: 'project:admin' },
			{ userId: 'user2', role: 'project:viewer' },
		];
		beforeEach(() => {
			jest.clearAllMocks();
			manager.transaction.mockImplementation(async (arg1, arg2) => {
				const runInTransaction = arg2 ?? arg1;
				return await runInTransaction(manager);
			});
		});
		it('should successfully change the user role in the project', async () => {
			projectRepository.findOne.mockResolvedValueOnce(
				(0, jest_mock_extended_1.mock)({
					id: projectId,
					type: 'team',
					projectRelations: mockRelations,
				}),
			);
			roleService.isRoleLicensed.mockReturnValue(true);
			await projectService.changeUserRoleInProject(projectId, 'user2', 'project:admin');
			expect(projectRepository.findOne).toHaveBeenCalledWith({
				where: { id: projectId, type: 'team' },
				relations: { projectRelations: true },
			});
			expect(projectRelationRepository.update).toHaveBeenCalledWith(
				{ projectId, userId: 'user2' },
				{ role: 'project:admin' },
			);
		});
		it('should throw if the user is not part of the project', async () => {
			projectRepository.findOne.mockResolvedValueOnce(
				(0, jest_mock_extended_1.mock)({
					id: projectId,
					type: 'team',
					projectRelations: mockRelations,
				}),
			);
			roleService.isRoleLicensed.mockReturnValue(true);
			await expect(
				projectService.changeUserRoleInProject(projectId, 'user3', 'project:admin'),
			).rejects.toThrow(`Could not find project with ID: ${projectId}`);
			expect(projectRepository.findOne).toHaveBeenCalledWith({
				where: { id: projectId, type: 'team' },
				relations: { projectRelations: true },
			});
		});
		it('should throw if the role to be set is `project:personalOwner`', async () => {
			await expect(
				projectService.changeUserRoleInProject(projectId, 'user2', 'project:personalOwner'),
			).rejects.toThrow('Personal owner cannot be added to a team project.');
		});
		it('should throw if the project is not a team project', async () => {
			projectRepository.findOne.mockResolvedValueOnce(null);
			roleService.isRoleLicensed.mockReturnValue(true);
			await expect(
				projectService.changeUserRoleInProject(projectId, 'user2', 'project:admin'),
			).rejects.toThrow(`Could not find project with ID: ${projectId}`);
			expect(projectRepository.findOne).toHaveBeenCalledWith({
				where: { id: projectId, type: 'team' },
				relations: { projectRelations: true },
			});
		});
	});
});
//# sourceMappingURL=project.service.ee.test.js.map
