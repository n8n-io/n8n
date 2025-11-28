import { LicenseState } from '@n8n/backend-common';
import { testDb } from '@n8n/backend-test-utils';
import { ProjectRelationRepository, ProjectRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import { PROJECT_OWNER_ROLE_SLUG, type ProjectRole, type Scope } from '@n8n/permissions';

import { License } from '@/license';
import { ProjectService } from '@/services/project.service.ee';
import { createRole } from '@test-integration/db/roles';

import { createMember } from '../shared/db/users';
import { LicenseMocker } from '@test-integration/license';

let projectRepository: ProjectRepository;
let projectService: ProjectService;
let projectRelationRepository: ProjectRelationRepository;

beforeAll(async () => {
	await testDb.init();

	projectRepository = Container.get(ProjectRepository);
	projectService = Container.get(ProjectService);
	projectRelationRepository = Container.get(ProjectRelationRepository);
	const license: LicenseMocker = new LicenseMocker();
	license.mock(Container.get(License));
	license.mockLicenseState(Container.get(LicenseState));
	license.enable('feat:projectRole:editor');
	license.enable('feat:projectRole:viewer');
	license.enable('feat:customRoles');
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
			PROJECT_OWNER_ROLE_SLUG,
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
					where: { userId: member.id, projectId: project.id, role: { slug: role } },
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
				where: { userId: member.id, projectId: project.id, role: { slug: 'project:viewer' } },
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
				relations: { role: true },
			});

			expect(relationships).toHaveLength(1);
			expect(relationships[0]).toHaveProperty('role.slug', 'project:admin');
		});

		it('adds a user to a project with a custom role', async () => {
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
			const role = await createRole({ slug: 'project:custom', displayName: 'Custom Role' });

			//
			// ACT
			//
			await projectService.addUser(project.id, { userId: member.id, role: role.slug });

			//
			// ASSERT
			//
			const relationships = await projectRelationRepository.find({
				where: { userId: member.id, projectId: project.id },
				relations: { role: true },
			});

			expect(relationships).toHaveLength(1);
			expect(relationships[0].role.slug).toBe('project:custom');
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
			const role = PROJECT_OWNER_ROLE_SLUG;

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
				where: { userId: user.id, projectId: project.id, role: { slug: role } },
			});

			expect(relations).toBeNull();
		});
	});

	describe('addUsersToProject', () => {
		it('should add multiple users to a project', async () => {
			//
			// ARRANGE
			//
			const members = await Promise.all([createMember(), createMember()]);
			const project = await projectRepository.save(
				projectRepository.create({
					name: 'Team Project',
					type: 'team',
				}),
			);

			//
			// ACT
			//
			await projectService.addUsersToProject(
				project.id,
				members.map((member) => ({ userId: member.id, role: 'project:editor' })),
			);

			//
			// ASSERT
			//
			const relations = await projectRelationRepository.find({
				where: { projectId: project.id },
			});

			expect(relations).toHaveLength(members.length);
		});

		it('fails to add a user to a project with a non-existing role', async () => {
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
			await expect(
				projectService.addUsersToProject(project.id, [
					{ userId: member.id, role: 'custom:non-existing' },
				]),
			).rejects.toThrowError('Role custom:non-existing does not exist');
		});
	});

	describe('syncProjectRelations', () => {
		it('should synchronize project relations for a user', async () => {
			//
			// ARRANGE
			//
			const user = await createMember();
			const project = await projectRepository.save(
				projectRepository.create({
					name: 'Team Project',
					type: 'team',
				}),
			);

			//
			// ACT
			//
			await projectService.syncProjectRelations(project.id, [
				{ userId: user.id, role: 'project:editor' },
			]);

			//
			// ASSERT
			//
			const relations = await projectRelationRepository.find({
				where: { userId: user.id, projectId: project.id },
			});
			expect(relations).toHaveLength(1);
		});

		it('should fail to synchronize users with non-existing roles', async () => {
			//
			// ARRANGE
			//
			const user = await createMember();
			const project = await projectRepository.save(
				projectRepository.create({
					name: 'Team Project',
					type: 'team',
				}),
			);

			//
			// ACT
			//
			await expect(
				projectService.syncProjectRelations(project.id, [
					{ userId: user.id, role: 'project:non-existing' },
				]),
			).rejects.toThrowError('Role project:non-existing does not exist');
		});
	});

	describe('changeUserRoleInProject', () => {
		it('should change user role in project', async () => {
			//
			// ARRANGE
			//
			const user = await createMember();
			const project = await projectRepository.save(
				projectRepository.create({
					name: 'Team Project',
					type: 'team',
				}),
			);

			//
			// ACT
			//
			await projectService.addUser(project.id, { userId: user.id, role: 'project:viewer' });
			await projectService.changeUserRoleInProject(project.id, user.id, 'project:editor');

			//
			// ASSERT
			//
			const relations = await projectRelationRepository.find({
				where: { userId: user.id, projectId: project.id },
				relations: { role: true },
			});
			expect(relations).toHaveLength(1);
			expect(relations[0].role.slug).toBe('project:editor');
		});

		it('should fail to change user role in project with non-existing role', async () => {
			//
			// ARRANGE
			//
			const user = await createMember();
			const project = await projectRepository.save(
				projectRepository.create({
					name: 'Team Project',
					type: 'team',
				}),
			);

			//
			// ACT
			//
			await projectService.addUser(project.id, { userId: user.id, role: 'project:viewer' });
			await expect(
				projectService.changeUserRoleInProject(project.id, user.id, 'project:non-existing'),
			).rejects.toThrowError('Role project:non-existing does not exist');
		});
	});
});
