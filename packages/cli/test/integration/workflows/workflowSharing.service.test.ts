import Container from 'typedi';

import type { User } from '@db/entities/User';
import { WorkflowSharingService } from '@/workflows/workflowSharing.service';

import * as testDb from '../shared/testDb';
import { createUser } from '../shared/db/users';
import { createWorkflow, shareWorkflowWithUsers } from '../shared/db/workflows';

let owner: User;
let member: User;
let anotherMember: User;
let workflowSharingService: WorkflowSharingService;

beforeAll(async () => {
	await testDb.init();
	owner = await createUser({ role: 'global:owner' });
	member = await createUser({ role: 'global:member' });
	anotherMember = await createUser({ role: 'global:member' });
	workflowSharingService = Container.get(WorkflowSharingService);
});

beforeEach(async () => {
	await testDb.truncate(['Workflow', 'SharedWorkflow', 'WorkflowHistory']);
});

describe('WorkflowSharingService', () => {
	describe('getSharedWorkflowIds', () => {
		it('should show all workflows to owners', async () => {
			owner.role = 'global:owner';
			const workflow1 = await createWorkflow({}, member);
			const workflow2 = await createWorkflow({}, anotherMember);
			const sharedWorkflowIds = await workflowSharingService.getSharedWorkflowIds(owner);
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
			const sharedWorkflowIds = await workflowSharingService.getSharedWorkflowIds(member);
			expect(sharedWorkflowIds).toHaveLength(2);
			expect(sharedWorkflowIds).toContain(workflow1.id);
			expect(sharedWorkflowIds).toContain(workflow3.id);
			expect(sharedWorkflowIds).not.toContain(workflow2.id);
		});
	});
});
