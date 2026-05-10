import { createTeamProject, linkUserToProject, testDb } from '@n8n/backend-test-utils';
import { AuthIdentity, GLOBAL_MEMBER_ROLE, ProjectRepository, UserRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import { EntityNotFoundError } from '@n8n/typeorm';

import { createMember, createOwner, createUserShell } from '../../shared/db/users';

describe('ProjectRepository', () => {
	beforeAll(async () => {
		await testDb.init();
	});

	beforeEach(async () => {
		await testDb.truncate(['User', 'WorkflowEntity', 'Project']);
	});

	afterAll(async () => {
		await testDb.terminate();
	});

	describe('getPersonalProjectForUser', () => {
		it('returns the personal project', async () => {
			//
			// ARRANGE
			//
			const owner = await createOwner();
			const ownerPersonalProject = await Container.get(ProjectRepository).findOneByOrFail({
				projectRelations: { userId: owner.id },
			});

			//
			// ACT
			//
			const personalProject = await Container.get(ProjectRepository).getPersonalProjectForUser(
				owner.id,
			);

			//
			// ASSERT
			//
			if (!personalProject) {
				fail('Expected personalProject to be defined.');
			}
			expect(personalProject).toBeDefined();
			expect(personalProject.id).toBe(ownerPersonalProject.id);
		});

		it('does not return non personal projects', async () => {
			//
			// ARRANGE
			//
			const owner = await createOwner();
			await Container.get(ProjectRepository).delete({});
			await createTeamProject(undefined, owner);

			//
			// ACT
			//
			const personalProject = await Container.get(ProjectRepository).getPersonalProjectForUser(
				owner.id,
			);

			//
			// ASSERT
			//
			expect(personalProject).toBeNull();
		});
	});

	describe('getPersonalProjectForUserOrFail', () => {
		it('returns the personal project', async () => {
			//
			// ARRANGE
			//
			const owner = await createOwner();
			const ownerPersonalProject = await Container.get(ProjectRepository).findOneByOrFail({
				projectRelations: { userId: owner.id },
			});

			//
			// ACT
			//
			const personalProject = await Container.get(
				ProjectRepository,
			).getPersonalProjectForUserOrFail(owner.id);

			//
			// ASSERT
			//
			if (!personalProject) {
				fail('Expected personalProject to be defined.');
			}
			expect(personalProject).toBeDefined();
			expect(personalProject.id).toBe(ownerPersonalProject.id);
		});

		it('does not return non personal projects', async () => {
			//
			// ARRANGE
			//
			const owner = await createOwner();
			await Container.get(ProjectRepository).delete({});
			await createTeamProject(undefined, owner);

			//
			// ACT
			//
			const promise = Container.get(ProjectRepository).getPersonalProjectForUserOrFail(owner.id);

			//
			// ASSERT
			//
			await expect(promise).rejects.toThrowError(EntityNotFoundError);
		});
	});

	describe('findAllProjectsAndCount', () => {
		it('returns all projects with count', async () => {
			const owner = await createOwner();
			await createTeamProject('Alpha', owner);
			await createTeamProject('Beta', owner);
			await createTeamProject('Gamma', owner);

			const repo = Container.get(ProjectRepository);
			const [projects, count] = await repo.findAllProjectsAndCount({});

			// 3 team projects + 1 personal project for the owner
			expect(count).toBe(4);
			expect(projects).toHaveLength(4);
		});

		it('paginates results', async () => {
			const owner = await createOwner();
			for (let i = 0; i < 5; i++) {
				await createTeamProject(`Project ${i}`, owner);
			}

			const repo = Container.get(ProjectRepository);
			const [page, count] = await repo.findAllProjectsAndCount({ skip: 0, take: 2 });

			expect(count).toBe(6); // 5 team + 1 personal
			expect(page).toHaveLength(2);
		});

		it('filters by search', async () => {
			const owner = await createOwner();
			await createTeamProject('Marketing Campaign', owner);
			await createTeamProject('Engineering Sprint', owner);
			await createTeamProject('Marketing Report', owner);

			const repo = Container.get(ProjectRepository);
			const [projects, count] = await repo.findAllProjectsAndCount({ search: 'Marketing' });

			expect(count).toBe(2);
			expect(projects).toHaveLength(2);
			expect(projects.every((p) => p.name.includes('Marketing'))).toBe(true);
		});

		it('filters by type', async () => {
			const owner = await createOwner();
			await createTeamProject('Team One', owner);
			await createTeamProject('Team Two', owner);

			const repo = Container.get(ProjectRepository);
			const [teamProjects, teamCount] = await repo.findAllProjectsAndCount({ type: 'team' });
			const [personalProjects, personalCount] = await repo.findAllProjectsAndCount({
				type: 'personal',
			});

			expect(teamCount).toBe(2);
			expect(teamProjects).toHaveLength(2);
			expect(personalCount).toBe(1);
			expect(personalProjects).toHaveLength(1);
		});

		it('orders by name ASC', async () => {
			const owner = await createOwner();
			await createTeamProject('Zebra', owner);
			await createTeamProject('Apple', owner);
			await createTeamProject('Mango', owner);

			const repo = Container.get(ProjectRepository);
			const [projects] = await repo.findAllProjectsAndCount({ type: 'team' });
			const names = projects.map((p) => p.name);

			expect(names).toEqual(['Apple', 'Mango', 'Zebra']);
		});

		it('filters out non-activated personal projects when activated=true', async () => {
			const owner = await createOwner();
			await createUserShell(GLOBAL_MEMBER_ROLE); // pending user (no password)
			await createTeamProject('Team A', owner);

			const repo = Container.get(ProjectRepository);
			const [projects, count] = await repo.findAllProjectsAndCount({ activated: true });

			// owner's personal + Team A, but NOT the pending user's personal project
			expect(count).toBe(2);
			expect(projects).toHaveLength(2);
			const types = projects.map((p) => p.type);
			expect(types).toContain('team');
			expect(types).toContain('personal');
		});

		it('orders team projects first, then activated personal, then pending personal', async () => {
			const owner = await createOwner();
			const pendingUser = await createUserShell(GLOBAL_MEMBER_ROLE);
			await createTeamProject('Alpha Team', owner);

			const repo = Container.get(ProjectRepository);
			const [projects] = await repo.findAllProjectsAndCount({});

			const types = projects.map((p) => p.type);
			// Team projects come first, then personal projects
			const firstPersonalIndex = types.indexOf('personal');
			const lastTeamIndex = types.lastIndexOf('team');
			expect(lastTeamIndex).toBeLessThan(firstPersonalIndex);

			// Among personal projects, activated (owner) should come before pending
			const personalProjects = projects.filter((p) => p.type === 'personal');
			expect(personalProjects).toHaveLength(2);
			// Owner has a password, pending user does not — owner should be first
			expect(personalProjects[0].creatorId).toBe(owner.id);
			expect(personalProjects[1].creatorId).toBe(pendingUser.id);
		});
	});

	describe('getAccessibleProjectsAndCount', () => {
		it('returns only own personal project and team projects the user belongs to', async () => {
			const owner = await createOwner();
			const member = await createMember();

			const teamA = await createTeamProject('Accessible Team', owner);
			await linkUserToProject(member, teamA, 'project:viewer');
			await createTeamProject('Not Accessible Team', owner);

			const repo = Container.get(ProjectRepository);
			const [projects, count] = await repo.getAccessibleProjectsAndCount(member.id, {});

			// member sees: own personal project + teamA (NOT owner's personal project)
			const projectNames = projects.map((p) => p.name);
			expect(projectNames).toContain('Accessible Team');
			expect(projectNames).not.toContain('Not Accessible Team');
			const personalProjects = projects.filter((p) => p.type === 'personal');
			expect(personalProjects).toHaveLength(1);
			expect(personalProjects[0].creatorId).toBe(member.id);
			expect(count).toBe(2); // 1 personal + 1 team
		});

		it('paginates correctly with accurate count', async () => {
			const owner = await createOwner();
			const member = await createMember();

			for (let i = 0; i < 10; i++) {
				const project = await createTeamProject(`Team ${i}`, owner);
				await linkUserToProject(member, project, 'project:viewer');
			}

			const repo = Container.get(ProjectRepository);
			const [page, count] = await repo.getAccessibleProjectsAndCount(member.id, {
				skip: 0,
				take: 3,
			});

			expect(page).toHaveLength(3);
			// 10 team projects + 1 personal project (member's own only)
			expect(count).toBe(11);
		});

		it('filters by search', async () => {
			const owner = await createOwner();
			const member = await createMember();

			const alpha = await createTeamProject('Alpha Project', owner);
			const beta = await createTeamProject('Beta Project', owner);
			await linkUserToProject(member, alpha, 'project:viewer');
			await linkUserToProject(member, beta, 'project:viewer');

			const repo = Container.get(ProjectRepository);
			const [projects, count] = await repo.getAccessibleProjectsAndCount(member.id, {
				search: 'Alpha',
			});

			expect(count).toBe(1);
			expect(projects).toHaveLength(1);
			expect(projects[0].name).toBe('Alpha Project');
		});

		it('does not include other users personal projects', async () => {
			const owner = await createOwner();
			const member = await createMember();

			const team = await createTeamProject('Shared Team', owner);
			await linkUserToProject(member, team, 'project:editor');

			const repo = Container.get(ProjectRepository);
			const [projects, count] = await repo.getAccessibleProjectsAndCount(member.id, {});

			// member sees only own personal project, not owner's
			const personalProjects = projects.filter((p) => p.type === 'personal');
			expect(personalProjects).toHaveLength(1);
			expect(personalProjects[0].creatorId).toBe(member.id);
			expect(count).toBe(projects.length);
		});

		it('filters out non-activated own personal project when activated=true', async () => {
			await createOwner();
			const member = await createMember();
			await createUserShell(GLOBAL_MEMBER_ROLE); // pending user

			const repo = Container.get(ProjectRepository);
			const [projects, count] = await repo.getAccessibleProjectsAndCount(member.id, {
				activated: true,
			});

			// member sees only own personal project (member is activated)
			const personalProjects = projects.filter((p) => p.type === 'personal');
			expect(personalProjects).toHaveLength(1);
			expect(personalProjects[0].creatorId).toBe(member.id);
			expect(count).toBe(1);
		});

		it('orders team projects first, then personal projects', async () => {
			await createOwner();
			const member = await createMember();
			await createTeamProject('Alpha Team', member);

			const repo = Container.get(ProjectRepository);
			const [projects] = await repo.getAccessibleProjectsAndCount(member.id, {});

			const types = projects.map((p) => p.type);
			const firstPersonalIndex = types.indexOf('personal');
			const lastTeamIndex = types.lastIndexOf('team');
			expect(lastTeamIndex).toBeLessThan(firstPersonalIndex);
		});
	});

	describe('update personal project name', () => {
		// TypeORM enters an infinite loop if you create entities with circular
		// references and pass this to the `Repository.create` function.
		//
		// This actually happened in combination with SAML.
		// `samlHelpers.updateUserFromSamlAttributes` and
		// `samlHelpers.createUserFromSamlAttributes` would create a User and an
		// AuthIdentity and assign them to one another. Then it would call
		// `UserRepository.save(user)`. This would then call the UserSubscriber in
		// `database/entities/Project.ts` which would pass the circular User into
		// `UserRepository.create` and cause the infinite loop.
		//
		// This test simulates that behavior and makes sure the UserSubscriber
		// checks if the entity is already a user and does not pass it into
		// `UserRepository.create` in that case.
		test('do not pass a User instance with circular references into `UserRepository.create`', async () => {
			//
			// ARRANGE
			//
			const user = await createMember();

			const authIdentity = new AuthIdentity();
			authIdentity.providerId = user.email;
			authIdentity.providerType = 'saml';
			authIdentity.user = user;

			user.firstName = `updated ${user.firstName}`;
			user.authIdentities = [];
			user.authIdentities.push(authIdentity);

			//
			// ACT & ASSERT
			//
			await expect(Container.get(UserRepository).save(user)).resolves.not.toThrow();
		});
	});
});
