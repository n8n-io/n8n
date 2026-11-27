import { EventService } from '@n8n/backend-services';
import {
	createTeamProject,
	createWorkflow,
	getPersonalProject,
	linkUserToProject,
	testDb,
	testModules,
} from '@n8n/backend-test-utils';
import {
	ProjectRelationRepository,
	WorkflowRepository,
	type Project,
	type User,
	type WorkflowEntity,
} from '@n8n/db';
import { Container } from '@n8n/di';
import { BadRequestError, ForbiddenError } from '@n8n/errors';
import { v4 as uuid } from 'uuid';

import type { ProjectAgent } from '@/modules/agents/entities/agent.entity';
import { AgentRepository } from '@/modules/agents/repositories/agent.repository';
import { ResourceOwnerService } from '@/services/resource-owner.service';

import {
	createAdmin,
	createMember,
	getGlobalOwner,
	createServiceAccountWithProject,
} from './shared/db/users';

describe('ResourceOwnerService', () => {
	let service: ResourceOwnerService;
	let workflowRepository: WorkflowRepository;
	let agentRepository: AgentRepository;
	let emit: ReturnType<typeof vi.spyOn>;

	let instanceOwner: User;
	let projectAdmin: User;
	let editor: User;
	let outsider: User;
	let project: Project;

	const ownerOf = async (workflow: WorkflowEntity) =>
		(await workflowRepository.findOneByOrFail({ id: workflow.id })).ownerUserId;

	const createOwnedWorkflow = async (ownerUserId: string | null, home: Project = project) => {
		const workflow = await createWorkflow({}, home);
		await workflowRepository.update(workflow.id, { ownerUserId });
		return workflow;
	};

	const createOwnedAgent = async (ownerUserId: string | null) =>
		await agentRepository.save(
			agentRepository.create({
				id: uuid(),
				name: 'Test Agent',
				projectId: project.id,
				ownerUserId,
			} as Partial<ProjectAgent>),
		);

	beforeAll(async () => {
		await testModules.loadModules(['agents']);
		await testDb.init();

		service = Container.get(ResourceOwnerService);
		workflowRepository = Container.get(WorkflowRepository);
		agentRepository = Container.get(AgentRepository);

		instanceOwner = await getGlobalOwner();
		projectAdmin = await createMember();
		editor = await createMember();
		outsider = await createMember();
	});

	beforeEach(async () => {
		project = await createTeamProject(undefined, projectAdmin);
		await linkUserToProject(editor, project, 'project:editor');
		emit = vi.spyOn(Container.get(EventService), 'emit');
	});

	afterAll(async () => {
		await testDb.terminate();
	});

	describe('setOwner', () => {
		it('lets a project admin set and clear the owner', async () => {
			const workflow = await createOwnedWorkflow(null);

			await service.setOwner(projectAdmin, { type: 'workflow', id: workflow.id }, editor.id);
			expect(await ownerOf(workflow)).toBe(editor.id);
			expect(emit).toHaveBeenCalledWith('workflow-owner-changed', {
				user: projectAdmin,
				workflowId: workflow.id,
				projectId: project.id,
				previousOwnerUserId: null,
				newOwnerUserId: editor.id,
				reason: 'manual',
			});

			await service.setOwner(projectAdmin, { type: 'workflow', id: workflow.id }, null);
			expect(await ownerOf(workflow)).toBeNull();
		});

		it('lets an instance owner who is not a project member set the owner', async () => {
			const workflow = await createOwnedWorkflow(null);

			await service.setOwner(instanceOwner, { type: 'workflow', id: workflow.id }, editor.id);

			expect(await ownerOf(workflow)).toBe(editor.id);
		});

		it('lets the current owner hand over, but not clear the owner', async () => {
			const workflow = await createOwnedWorkflow(editor.id);
			const resource = { type: 'workflow', id: workflow.id } as const;

			await expect(service.setOwner(editor, resource, null)).rejects.toThrow(ForbiddenError);

			await service.setOwner(editor, resource, projectAdmin.id);
			expect(await ownerOf(workflow)).toBe(projectAdmin.id);
		});

		it('rejects an editor who is not the owner', async () => {
			const workflow = await createOwnedWorkflow(projectAdmin.id);

			await expect(
				service.setOwner(editor, { type: 'workflow', id: workflow.id }, editor.id),
			).rejects.toThrow(ForbiddenError);
		});

		it('rejects a new owner who is not a person in the home project', async () => {
			const workflow = await createOwnedWorkflow(null);
			const resource = { type: 'workflow', id: workflow.id } as const;
			const serviceAccount = await createServiceAccountWithProject();
			await linkUserToProject(serviceAccount, project, 'project:editor');

			for (const invalidOwner of [outsider, serviceAccount]) {
				await expect(service.setOwner(projectAdmin, resource, invalidOwner.id)).rejects.toThrow(
					BadRequestError,
				);
			}
		});

		it('accepts an instance admin without a relation in a team project only', async () => {
			const instanceAdmin = await createAdmin();
			const teamWorkflow = await createOwnedWorkflow(null);
			const personalWorkflow = await createOwnedWorkflow(null, await getPersonalProject(editor));

			await service.setOwner(
				projectAdmin,
				{ type: 'workflow', id: teamWorkflow.id },
				instanceAdmin.id,
			);
			expect(await ownerOf(teamWorkflow)).toBe(instanceAdmin.id);

			await expect(
				service.setOwner(
					instanceOwner,
					{ type: 'workflow', id: personalWorkflow.id },
					instanceAdmin.id,
				),
			).rejects.toThrow(BadRequestError);
		});

		it('sets the owner of an agent', async () => {
			const agent = await createOwnedAgent(null);

			await service.setOwner(projectAdmin, { type: 'agent', id: agent.id }, editor.id);

			expect((await agentRepository.findOneByOrFail({ id: agent.id })).ownerUserId).toBe(editor.id);
			expect(emit).toHaveBeenCalledWith(
				'agent-owner-changed',
				expect.objectContaining({ agentId: agent.id, newOwnerUserId: editor.id, reason: 'manual' }),
			);
		});
	});

	describe('ownerForNewResource', () => {
		it('picks the creator when the creator is a person in the project', async () => {
			expect(await service.ownerForNewResource(editor, project.id, 'workflow', {})).toBe(editor.id);
		});

		it('picks the user of a personal project', async () => {
			const personalProject = await getPersonalProject(editor);

			expect(
				await service.ownerForNewResource(instanceOwner, personalProject.id, 'workflow', {}),
			).toBe(editor.id);
		});

		it('picks an instance admin who creates in a team project without a relation', async () => {
			const instanceAdmin = await createAdmin();

			expect(await service.ownerForNewResource(instanceAdmin, project.id, 'workflow', {})).toBe(
				instanceAdmin.id,
			);
		});

		it('picks the project admin who joined the project first', async () => {
			expect(await service.ownerForNewResource(outsider, project.id, 'agent', {})).toBe(
				projectAdmin.id,
			);

			const olderAdmin = await createMember();
			await linkUserToProject(olderAdmin, project, 'project:admin');
			await Container.get(ProjectRelationRepository).update(
				{ projectId: project.id, userId: olderAdmin.id },
				{ createdAt: new Date(2020, 0, 1) },
			);

			expect(await service.ownerForNewResource(outsider, project.id, 'agent', {})).toBe(
				olderAdmin.id,
			);
		});

		it('picks the instance owner in a team project without a project admin', async () => {
			const adminlessProject = await createTeamProject();

			expect(
				await service.ownerForNewResource(undefined, adminlessProject.id, 'workflow', {}),
			).toBe(instanceOwner.id);
		});
	});

	describe('reconcileAfterMove', () => {
		let destination: Project;

		beforeEach(async () => {
			destination = await createTeamProject(undefined, projectAdmin);
		});

		it('keeps an owner who is a member of the destination', async () => {
			const workflow = await createOwnedWorkflow(projectAdmin.id, destination);

			await service.reconcileAfterMove(editor, [workflow.id], destination.id, {});

			expect(await ownerOf(workflow)).toBe(projectAdmin.id);
			expect(emit).not.toHaveBeenCalled();
		});

		it('picks the mover when the mover can manage owners in the destination', async () => {
			const otherAdmin = await createMember();
			await linkUserToProject(otherAdmin, destination, 'project:admin');
			const workflow = await createOwnedWorkflow(outsider.id, destination);

			await service.reconcileAfterMove(otherAdmin, [workflow.id], destination.id, {});

			expect(await ownerOf(workflow)).toBe(otherAdmin.id);
			expect(emit).toHaveBeenCalledWith('workflow-owner-changed', {
				user: otherAdmin,
				workflowId: workflow.id,
				projectId: destination.id,
				previousOwnerUserId: outsider.id,
				newOwnerUserId: otherAdmin.id,
				reason: 'move',
			});
		});

		it('picks the project admin when the mover is an editor in the destination', async () => {
			await linkUserToProject(editor, destination, 'project:editor');
			const workflow = await createOwnedWorkflow(outsider.id, destination);

			await service.reconcileAfterMove(editor, [workflow.id], destination.id, {});

			expect(await ownerOf(workflow)).toBe(projectAdmin.id);
		});
	});

	describe('reassignOwnedBy', () => {
		it('gives the workflows and agents of the leaving user to the fallback owner', async () => {
			const otherProject = await createTeamProject(undefined, projectAdmin);
			await linkUserToProject(editor, otherProject, 'project:editor');
			const workflow = await createOwnedWorkflow(editor.id);
			const agent = await createOwnedAgent(editor.id);
			const untouched = await createOwnedWorkflow(editor.id, otherProject);
			await Container.get(ProjectRelationRepository).delete({
				projectId: project.id,
				userId: editor.id,
			});

			await service.reassignOwnedBy(
				{ userId: editor.id, projectId: project.id, actor: undefined, reason: 'member-removed' },
				{},
			);

			expect(await ownerOf(workflow)).toBe(projectAdmin.id);
			expect((await agentRepository.findOneByOrFail({ id: agent.id })).ownerUserId).toBe(
				projectAdmin.id,
			);
			expect(await ownerOf(untouched)).toBe(editor.id);
			expect(emit.mock.calls).toEqual([
				[
					'workflow-owner-changed',
					{
						user: null,
						workflowId: workflow.id,
						projectId: project.id,
						previousOwnerUserId: editor.id,
						newOwnerUserId: projectAdmin.id,
						reason: 'member-removed',
					},
				],
				[
					'agent-owner-changed',
					{
						user: null,
						agentId: agent.id,
						projectId: project.id,
						previousOwnerUserId: editor.id,
						newOwnerUserId: projectAdmin.id,
						reason: 'member-removed',
					},
				],
			]);
		});

		it('picks the instance owner when the only project admin leaves', async () => {
			const workflow = await createOwnedWorkflow(projectAdmin.id);

			await service.reassignOwnedBy(
				{ userId: projectAdmin.id, actor: undefined, reason: 'user-deleted' },
				{},
			);

			expect(await ownerOf(workflow)).toBe(instanceOwner.id);
		});

		it('picks the other project admin when one of two project admins leaves', async () => {
			const otherAdmin = await createMember();
			await linkUserToProject(otherAdmin, project, 'project:admin');
			const workflow = await createOwnedWorkflow(projectAdmin.id);

			await service.reassignOwnedBy(
				{ userId: projectAdmin.id, actor: undefined, reason: 'user-deleted' },
				{},
			);

			expect(await ownerOf(workflow)).toBe(otherAdmin.id);
		});
	});
});
