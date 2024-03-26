import { ProjectService } from '@/services/project.service';
import * as testDb from '../shared/testDb';
import Container from 'typedi';
import { createMember } from '../shared/db/users';
import { ProjectRepository } from '@/databases/repositories/project.repository';
import { ProjectRelationRepository } from '@/databases/repositories/projectRelation.repository';
import type { ProjectRole } from '@/databases/entities/ProjectRelation';
import type { Scope } from '@n8n/permissions';

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
				await projectService.addUser(project.id, member.id, role);

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
			await projectService.addUser(project.id, member.id, 'project:viewer');

			await projectRelationRepository.findOneOrFail({
				where: { userId: member.id, projectId: project.id, role: 'project:viewer' },
			});

			//
			// ACT
			//
			await projectService.addUser(project.id, member.id, 'project:admin');

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
				await projectService.addUser(project.id, projectOwner.id, role);

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
				await projectService.addUser(project.id, projectViewer.id, role);

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
});
