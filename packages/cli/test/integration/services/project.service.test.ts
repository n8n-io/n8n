import { testDb } from '@n8n/backend-test-utils';
import { ProjectRelationRepository, ProjectRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import type { ProjectRole, Scope } from '@n8n/permissions';

import { ProjectService } from '@/services/project.service.ee';

import { createMember } from '../shared/db/users';

let projectRepository: ProjectRepository;
let projectService: ProjectService;
let projectRelationRepository: ProjectRelationRepository;

beforeAll(async () => {
	await testDb.init();

	projectRepository = Container.get(ProjectRepository);
	projectService = Container.get(ProjectService);
	projectRelationRepository = Container.get(ProjectRelationRepository);
});

afterAll(async () => {
	await testDb.terminate();
});

afterEach(async () => {
	await testDb.truncate(['User']);
});

describe('ProjectService', () => {
	describe('addUser', () => {
		it.each([
			'project:viewer',
			'project:admin',
			'project:editor',
			'project:personalOwner',
		] as ProjectRole[])(
			'creates a relation between the user and the project using the role %s',
			async (role) => {
				//
				// ARRANGE
				//
				const member = await createMember();
				const project = await projectRepository.save(
					projectRepository.create({
						name: 'Team Project',
						type: 'team',
					}),
				);

				//
				// ACT
				//
				await projectService.addUser(project.id, { userId: member.id, role });

				//
				// ASSERT
				//
				await projectRelationRepository.findOneOrFail({
					where: { userId: member.id, projectId: project.id, role },
				});
			},
		);

		it('changes the role the user has in the project if the user is already part of the project, instead of creating a new relationship', async () => {
			//
			// ARRANGE
			//
			const member = await createMember();
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

			//
			// ACT
			//
			await projectService.addUser(project.id, { userId: member.id, role: 'project:admin' });

			//
			// ASSERT
			//
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
		] as Array<{
			role: ProjectRole;
			scope: Scope;
		}>)(
			'should return the project if the user has the role $role and wants the scope $scope',
			async ({ role, scope }) => {
				//
				// ARRANGE
				//
				const projectOwner = await createMember();
				const project = await projectRepository.save(
					projectRepository.create({
						name: 'Team Project',
						type: 'team',
					}),
				);
				await projectService.addUser(project.id, { userId: projectOwner.id, role });

				//
				// ACT
				//
				const projectFromService = await projectService.getProjectWithScope(
					projectOwner,
					project.id,
					[scope],
				);

				//
				// ASSERT
				//
				if (projectFromService === null) {
					fail('Expected projectFromService not to be null');
				}
				expect(project.id).toBe(projectFromService.id);
			},
		);

		it.each([
			{ role: 'project:viewer', scope: 'workflow:create' },
			{ role: 'project:viewer', scope: 'credential:create' },
		] as Array<{
			role: ProjectRole;
			scope: Scope;
		}>)(
			'should return the project if the user has the role $role and wants the scope $scope',
			async ({ role, scope }) => {
				//
				// ARRANGE
				//
				const projectViewer = await createMember();
				const project = await projectRepository.save(
					projectRepository.create({
						name: 'Team Project',
						type: 'team',
					}),
				);
				await projectService.addUser(project.id, { userId: projectViewer.id, role });

				//
				// ACT
				//
				const projectFromService = await projectService.getProjectWithScope(
					projectViewer,
					project.id,
					[scope],
				);

				//
				// ASSERT
				//
				expect(projectFromService).toBeNull();
			},
		);

		it('should not return the project if the user is not part of it', async () => {
			//
			// ARRANGE
			//
			const member = await createMember();
			const project = await projectRepository.save(
				projectRepository.create({
					name: 'Team Project',
					type: 'team',
				}),
			);

			//
			// ACT
			//
			const projectFromService = await projectService.getProjectWithScope(member, project.id, [
				'workflow:list',
			]);

			//
			// ASSERT
			//
			expect(projectFromService).toBeNull();
		});
	});

	describe('deleteUserFromProject', () => {
		it('should not allow project owner to be removed from the project', async () => {
			const role = 'project:personalOwner';

			const user = await createMember();
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

			const user = await createMember();
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
