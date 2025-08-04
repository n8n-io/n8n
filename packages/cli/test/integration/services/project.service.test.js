'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const backend_test_utils_1 = require('@n8n/backend-test-utils');
const db_1 = require('@n8n/db');
const di_1 = require('@n8n/di');
const project_service_ee_1 = require('@/services/project.service.ee');
const users_1 = require('../shared/db/users');
let projectRepository;
let projectService;
let projectRelationRepository;
beforeAll(async () => {
	await backend_test_utils_1.testDb.init();
	projectRepository = di_1.Container.get(db_1.ProjectRepository);
	projectService = di_1.Container.get(project_service_ee_1.ProjectService);
	projectRelationRepository = di_1.Container.get(db_1.ProjectRelationRepository);
});
afterAll(async () => {
	await backend_test_utils_1.testDb.terminate();
});
afterEach(async () => {
	await backend_test_utils_1.testDb.truncate(['User']);
});
describe('ProjectService', () => {
	describe('addUser', () => {
		it.each(['project:viewer', 'project:admin', 'project:editor', 'project:personalOwner'])(
			'creates a relation between the user and the project using the role %s',
			async (role) => {
				const member = await (0, users_1.createMember)();
				const project = await projectRepository.save(
					projectRepository.create({
						name: 'Team Project',
						type: 'team',
					}),
				);
				await projectService.addUser(project.id, { userId: member.id, role });
				await projectRelationRepository.findOneOrFail({
					where: { userId: member.id, projectId: project.id, role },
				});
			},
		);
		it('changes the role the user has in the project if the user is already part of the project, instead of creating a new relationship', async () => {
			const member = await (0, users_1.createMember)();
			const project = await projectRepository.save(
				projectRepository.create({
					name: 'Team Project',
					type: 'team',
				}),
			);
			await projectService.addUser(project.id, { userId: member.id, role: 'project:viewer' });
			await projectRelationRepository.findOneOrFail({
				where: { userId: member.id, projectId: project.id, role: 'project:viewer' },
			});
			await projectService.addUser(project.id, { userId: member.id, role: 'project:admin' });
			const relationships = await projectRelationRepository.find({
				where: { userId: member.id, projectId: project.id },
			});
			expect(relationships).toHaveLength(1);
			expect(relationships[0]).toHaveProperty('role', 'project:admin');
		});
	});
	describe('getProjectWithScope', () => {
		it.each([
			{ role: 'project:admin', scope: 'workflow:list' },
			{ role: 'project:admin', scope: 'workflow:create' },
		])(
			'should return the project if the user has the role $role and wants the scope $scope',
			async ({ role, scope }) => {
				const projectOwner = await (0, users_1.createMember)();
				const project = await projectRepository.save(
					projectRepository.create({
						name: 'Team Project',
						type: 'team',
					}),
				);
				await projectService.addUser(project.id, { userId: projectOwner.id, role });
				const projectFromService = await projectService.getProjectWithScope(
					projectOwner,
					project.id,
					[scope],
				);
				if (projectFromService === null) {
					fail('Expected projectFromService not to be null');
				}
				expect(project.id).toBe(projectFromService.id);
			},
		);
		it.each([
			{ role: 'project:viewer', scope: 'workflow:create' },
			{ role: 'project:viewer', scope: 'credential:create' },
		])(
			'should return the project if the user has the role $role and wants the scope $scope',
			async ({ role, scope }) => {
				const projectViewer = await (0, users_1.createMember)();
				const project = await projectRepository.save(
					projectRepository.create({
						name: 'Team Project',
						type: 'team',
					}),
				);
				await projectService.addUser(project.id, { userId: projectViewer.id, role });
				const projectFromService = await projectService.getProjectWithScope(
					projectViewer,
					project.id,
					[scope],
				);
				expect(projectFromService).toBeNull();
			},
		);
		it('should not return the project if the user is not part of it', async () => {
			const member = await (0, users_1.createMember)();
			const project = await projectRepository.save(
				projectRepository.create({
					name: 'Team Project',
					type: 'team',
				}),
			);
			const projectFromService = await projectService.getProjectWithScope(member, project.id, [
				'workflow:list',
			]);
			expect(projectFromService).toBeNull();
		});
	});
	describe('deleteUserFromProject', () => {
		it('should not allow project owner to be removed from the project', async () => {
			const role = 'project:personalOwner';
			const user = await (0, users_1.createMember)();
			const project = await projectRepository.save(
				projectRepository.create({
					name: 'Team Project',
					type: 'team',
				}),
			);
			await projectService.addUser(project.id, { userId: user.id, role });
			await expect(projectService.deleteUserFromProject(project.id, user.id)).rejects.toThrowError(
				/^Project owner cannot be removed from the project$/,
			);
		});
		it('should remove user from project if not owner', async () => {
			const role = 'project:editor';
			const user = await (0, users_1.createMember)();
			const project = await projectRepository.save(
				projectRepository.create({
					name: 'Team Project',
					type: 'team',
				}),
			);
			await projectService.addUser(project.id, { userId: user.id, role });
			await projectService.deleteUserFromProject(project.id, user.id);
			const relations = await projectRelationRepository.findOne({
				where: { userId: user.id, projectId: project.id, role },
			});
			expect(relations).toBeNull();
		});
	});
});
//# sourceMappingURL=project.service.test.js.map
