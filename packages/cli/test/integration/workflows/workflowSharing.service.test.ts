import Container from 'typedi';

import type { User } from '@db/entities/User';
import { WorkflowSharingService } from '@/workflows/workflowSharing.service';

import * as testDb from '../shared/testDb';
import { createUser } from '../shared/db/users';
import { createWorkflow, shareWorkflowWithUsers } from '../shared/db/workflows';
import { ProjectService } from '@/services/project.service';
import { LicenseMocker } from '../shared/license';
import { License } from '@/License';

let owner: User;
let member: User;
let anotherMember: User;
let workflowSharingService: WorkflowSharingService;
let projectService: ProjectService;

beforeAll(async () => {
	await testDb.init();
	owner = await createUser({ role: 'global:owner' });
	member = await createUser({ role: 'global:member' });
	anotherMember = await createUser({ role: 'global:member' });
	let license: LicenseMocker;
	license = new LicenseMocker();
	license.mock(Container.get(License));
	license.enable('feat:sharing');
	license.setQuota('quota:maxTeamProjects', -1);
	workflowSharingService = Container.get(WorkflowSharingService);
	projectService = Container.get(ProjectService);
});

beforeEach(async () => {
	await testDb.truncate(['Workflow', 'SharedWorkflow', 'WorkflowHistory']);
});

afterAll(async () => {
	await testDb.terminate();
});

describe('WorkflowSharingService', () => {
	describe('getSharedWorkflowIds', () => {
		it('should show all workflows to owners', async () => {
			owner.role = 'global:owner';
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
			member.role = 'global:member';
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
			const project = await projectService.createTeamProject('Team Project', member);
			await projectService.addUser(project.id, anotherMember.id, 'project:admin');
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
			const project1 = await projectService.createTeamProject('Team Project 1', member);
			const workflow1 = await createWorkflow(undefined, project1);
			const project2 = await projectService.createTeamProject('Team Project 2', member);
			const workflow2 = await createWorkflow(undefined, project2);
			await projectService.addUser(project1.id, anotherMember.id, 'project:admin');
			await projectService.addUser(project2.id, anotherMember.id, 'project:viewer');

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
