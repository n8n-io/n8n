import { LicenseState } from '@n8n/backend-common';
import { createWorkflow, shareWorkflowWithUsers, testDb } from '@n8n/backend-test-utils';
import { GLOBAL_MEMBER_ROLE, GLOBAL_OWNER_ROLE, type User } from '@n8n/db';
import { Container } from '@n8n/di';
import { mock } from 'jest-mock-extended';

import { ProjectService } from '@/services/project.service.ee';
import { WorkflowSharingService } from '@/workflows/workflow-sharing.service';

import { createUser } from '../shared/db/users';

let owner: User;
let member: User;
let anotherMember: User;
let workflowSharingService: WorkflowSharingService;
let projectService: ProjectService;

beforeAll(async () => {
	await testDb.init();
	owner = await createUser({ role: GLOBAL_OWNER_ROLE });
	member = await createUser({ role: GLOBAL_MEMBER_ROLE });
	anotherMember = await createUser({ role: GLOBAL_MEMBER_ROLE });
	const licenseMock = mock<LicenseState>();
	licenseMock.isSharingLicensed.mockReturnValue(true);
	licenseMock.getMaxTeamProjects.mockReturnValue(-1);
	Container.set(LicenseState, licenseMock);
	workflowSharingService = Container.get(WorkflowSharingService);
	projectService = Container.get(ProjectService);
});

beforeEach(async () => {
	await testDb.truncate(['WorkflowEntity', 'SharedWorkflow', 'WorkflowHistory']);
});

afterAll(async () => {
	await testDb.terminate();
});

describe('WorkflowSharingService', () => {
	describe('getSharedWorkflowIds', () => {
		it('should show all workflows to owners', async () => {
			const workflow1 = await createWorkflow({}, member);
			const workflow2 = await createWorkflow({}, anotherMember);
			const sharedWorkflowIds = await workflowSharingService.getSharedWorkflowIds(owner, {
				scopes: ['workflow:read'],
			});
			expect(sharedWorkflowIds).toHaveLength(2);
			expect(sharedWorkflowIds).toContain(workflow1.id);
			expect(sharedWorkflowIds).toContain(workflow2.id);
		});

		it('should show shared workflows to users', async () => {
			const workflow1 = await createWorkflow({}, anotherMember);
			const workflow2 = await createWorkflow({}, anotherMember);
			const workflow3 = await createWorkflow({}, anotherMember);
			await shareWorkflowWithUsers(workflow1, [member]);
			await shareWorkflowWithUsers(workflow3, [member]);
			const sharedWorkflowIds = await workflowSharingService.getSharedWorkflowIds(member, {
				scopes: ['workflow:read'],
			});
			expect(sharedWorkflowIds).toHaveLength(2);
			expect(sharedWorkflowIds).toContain(workflow1.id);
			expect(sharedWorkflowIds).toContain(workflow3.id);
			expect(sharedWorkflowIds).not.toContain(workflow2.id);
		});

		it('should show workflows that the user has access to through a team project they are part of', async () => {
			//
			// ARRANGE
			//
			const project = await projectService.createTeamProject(member, { name: 'Team Project' });
			await projectService.addUser(project.id, { userId: anotherMember.id, role: 'project:admin' });
			const workflow = await createWorkflow(undefined, project);

			//
			// ACT
			//
			const sharedWorkflowIds = await workflowSharingService.getSharedWorkflowIds(anotherMember, {
				scopes: ['workflow:read'],
			});

			//
			// ASSERT
			//
			expect(sharedWorkflowIds).toContain(workflow.id);
		});

		it('should show workflows that the user has update access to', async () => {
			//
			// ARRANGE
			//
			const project1 = await projectService.createTeamProject(member, { name: 'Team Project 1' });
			const workflow1 = await createWorkflow(undefined, project1);
			const project2 = await projectService.createTeamProject(member, { name: 'Team Project 2' });
			const workflow2 = await createWorkflow(undefined, project2);
			await projectService.addUser(project1.id, {
				userId: anotherMember.id,
				role: 'project:admin',
			});
			await projectService.addUser(project2.id, {
				userId: anotherMember.id,
				role: 'project:viewer',
			});

			//
			// ACT
			//
			const sharedWorkflowIds = await workflowSharingService.getSharedWorkflowIds(anotherMember, {
				scopes: ['workflow:update'],
			});

			//
			// ASSERT
			//
			expect(sharedWorkflowIds).toContain(workflow1.id);
			expect(sharedWorkflowIds).not.toContain(workflow2.id);
		});
	});
});
