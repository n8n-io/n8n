import { createTeamProject, linkUserToProject, testDb } from '@n8n/backend-test-utils';
import { ProjectRelationRepository, TransactionRunner } from '@n8n/db';
import { Container } from '@n8n/di';

import { createMember, createOwner } from '../../shared/db/users';

describe('ProjectRelationRepository', () => {
	let repository: ProjectRelationRepository;

	beforeAll(async () => {
		await testDb.init();
		repository = Container.get(ProjectRelationRepository);
	});

	beforeEach(async () => {
		await testDb.truncate(['User', 'Project']);
	});

	afterAll(async () => {
		await testDb.terminate();
	});

	it('finds requested memberships with role scopes', async () => {
		const owner = await createOwner();
		const member = await createMember();
		const included = await createTeamProject('Included', owner);
		const excluded = await createTeamProject('Excluded', owner);
		await linkUserToProject(member, included, 'project:viewer');
		await linkUserToProject(member, excluded, 'project:editor');

		const relations = await repository.findForUserInProjects(member.id, [included.id]);

		expect(relations).toHaveLength(1);
		expect(relations[0]).toMatchObject({
			projectId: included.id,
			userId: member.id,
			role: { slug: 'project:viewer' },
		});
		expect(relations[0].role.scopes.length).toBeGreaterThan(0);
	});

	it('adds, updates, and deletes project members', async () => {
		const owner = await createOwner();
		const firstMember = await createMember();
		const secondMember = await createMember();
		const project = await createTeamProject('Team project', owner);

		await repository.replaceProjectMembers(
			project.id,
			[{ userId: firstMember.id, role: 'project:viewer' }],
			{},
		);
		await repository.addProjectMember(project.id, secondMember.id, 'project:admin');
		await repository.updateProjectMemberRole(project.id, secondMember.id, 'project:editor', {});
		await repository.deleteProjectMember(project.id, firstMember.id, {});

		const relations = await repository.findWithUserAndRole(project.id);
		expect(relations).toHaveLength(1);
		expect(relations[0]).toMatchObject({
			projectId: project.id,
			userId: secondMember.id,
			role: { slug: 'project:editor' },
		});
	});

	it('rolls back membership replacement with its operation context', async () => {
		const owner = await createOwner();
		const member = await createMember();
		const replacement = await createMember();
		const project = await createTeamProject('Team project', owner);
		await linkUserToProject(member, project, 'project:viewer');

		await expect(
			Container.get(TransactionRunner).run({}, async (ctx) => {
				await repository.replaceProjectMembers(
					project.id,
					[{ userId: replacement.id, role: 'project:admin' }],
					ctx,
				);
				throw new Error('Roll back');
			}),
		).rejects.toThrow('Roll back');

		const userIds = await repository.findUserIdsByProjectId(project.id);
		expect(userIds).toEqual(expect.arrayContaining([owner.id, member.id]));
		expect(userIds).not.toContain(replacement.id);
	});
});
