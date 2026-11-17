import { LicenseState } from '@n8n/backend-common';
import { EventService } from '@n8n/backend-services';
import {
	createTeamProject,
	createWorkflow,
	getPersonalProject,
	linkUserToProject,
	testDb,
} from '@n8n/backend-test-utils';
import { WorkflowRepository, type Project, type User, type WorkflowEntity } from '@n8n/db';
import { Container } from '@n8n/di';
import { LicenseMocker } from '@test-integration/license';

import { createAdmin, createMember, createOwner } from './shared/db/users';

import { License } from '@/license';
import { ProvisioningService } from '@/modules/provisioning.ee/provisioning.service.ee';
import { ProjectService } from '@/services/project.service.ee';
import { UserService } from '@/services/user.service';

describe('Resource owner on lifecycle changes', () => {
	let workflowRepository: WorkflowRepository;
	let projectService: ProjectService;
	let userService: UserService;

	let instanceOwner: User;
	let projectAdmin: User;
	let leavingUser: User;
	let project: Project;
	let workflow: WorkflowEntity;

	const ownerOf = async ({ id }: WorkflowEntity) =>
		(await workflowRepository.findOneByOrFail({ id })).ownerUserId;

	const createOwnedWorkflow = async (ownerUserId: string, home: Project) => {
		const owned = await createWorkflow({}, home);
		await workflowRepository.update(owned.id, { ownerUserId });
		return owned;
	};

	beforeAll(async () => {
		await testDb.init();

		workflowRepository = Container.get(WorkflowRepository);
		projectService = Container.get(ProjectService);
		userService = Container.get(UserService);

		const license = new LicenseMocker();
		license.mock(Container.get(License));
		license.mockLicenseState(Container.get(LicenseState));
		license.enable('feat:projectRole:editor');

		instanceOwner = await createOwner();
		projectAdmin = await createMember();
	});

	beforeEach(async () => {
		leavingUser = await createMember();
		project = await createTeamProject(undefined, projectAdmin);
		await linkUserToProject(leavingUser, project, 'project:editor');
		workflow = await createOwnedWorkflow(leavingUser.id, project);
	});

	afterAll(async () => {
		await testDb.terminate();
	});

	it('gives the workflows to the remover when a project admin removes a member', async () => {
		const otherAdmin = await createMember();
		await linkUserToProject(otherAdmin, project, 'project:admin');

		await projectService.deleteUserFromProject(otherAdmin, project.id, leavingUser.id);

		expect(await ownerOf(workflow)).toBe(otherAdmin.id);
	});

	it('replaces the owner when a project relation sync drops a member', async () => {
		await projectService.syncProjectRelations(project.id, [
			{ userId: projectAdmin.id, role: 'project:admin' },
		]);

		expect(await ownerOf(workflow)).toBe(projectAdmin.id);
	});

	it('replaces the owner when provisioning removes project access', async () => {
		const provisioningService = Container.get(ProvisioningService);
		await provisioningService.getConfig();
		// @ts-expect-error - provisioningConfig is private
		provisioningService.provisioningConfig.scopesProvisionProjectRoles = true;
		const keptProject = await createTeamProject(undefined, projectAdmin);

		await provisioningService.provisionProjectRolesForUser(leavingUser.id, [
			`${keptProject.id}:viewer`,
		]);

		expect(await ownerOf(workflow)).toBe(projectAdmin.id);
	});

	it('replaces the owner when a user becomes a chat user', async () => {
		await userService.changeUserRole(leavingUser, { newRoleName: 'global:chatUser' });

		expect(await ownerOf(workflow)).toBe(projectAdmin.id);
	});

	it('replaces the owner in team projects when a user is deleted without a transfer', async () => {
		const emit = vi.spyOn(Container.get(EventService), 'emit');

		await userService.deleteUser(instanceOwner, leavingUser.id);

		expect(await ownerOf(workflow)).toBe(projectAdmin.id);
		expect(emit).toHaveBeenCalledWith('workflow-owner-changed', {
			user: instanceOwner,
			workflowId: workflow.id,
			projectId: project.id,
			previousOwnerUserId: leavingUser.id,
			newOwnerUserId: projectAdmin.id,
			reason: 'user-deleted',
		});
	});

	it('gives transferred workflows to the user of the transfer project when a user is deleted', async () => {
		const personalWorkflow = await createOwnedWorkflow(
			leavingUser.id,
			await getPersonalProject(leavingUser),
		);
		const transferee = await createAdmin();
		const transferProject = await getPersonalProject(transferee);

		await userService.deleteUser(instanceOwner, leavingUser.id, transferProject.id);

		expect(await ownerOf(personalWorkflow)).toBe(transferee.id);
		expect(await ownerOf(workflow)).toBe(projectAdmin.id);
	});

	it('replaces an owner who is not a member of the project that takes over a deleted project', async () => {
		const targetProject = await createTeamProject(undefined, projectAdmin);

		await projectService.deleteProject(instanceOwner, project.id, {
			migrateToProject: targetProject.id,
		});

		expect(await ownerOf(workflow)).toBe(projectAdmin.id);
	});
});
