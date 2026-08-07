import { createWorkflow, testDb } from '@n8n/backend-test-utils';
import { GLOBAL_MEMBER_ROLE, GLOBAL_OWNER_ROLE, type User } from '@n8n/db';
import { Container } from '@n8n/di';

import { WorkflowFinderService } from '@/workflows/workflow-finder.service';

import { createUser } from '../shared/db/users';

let owner: User;
let member: User;
let anotherMember: User;
let workflowFinderService: WorkflowFinderService;

beforeAll(async () => {
	await testDb.init();
	owner = await createUser({ role: GLOBAL_OWNER_ROLE });
	member = await createUser({ role: GLOBAL_MEMBER_ROLE });
	anotherMember = await createUser({ role: GLOBAL_MEMBER_ROLE });
	workflowFinderService = Container.get(WorkflowFinderService);
});

beforeEach(async () => {
	await testDb.truncate(['WorkflowEntity', 'SharedWorkflow']);
});

afterAll(async () => {
	await testDb.terminate();
});

describe('WorkflowFinderService', () => {
	describe('findWorkflowHeadForUser', () => {
		it('should return the workflow head for a user with a project-scoped role', async () => {
			const workflow = await createWorkflow({}, member);

			const head = await workflowFinderService.findWorkflowHeadForUser(workflow.id, member, [
				'workflow:publish',
			]);

			expect(head?.versionId).toBe(workflow.versionId);
			expect(head?.updatedAt).toBeInstanceOf(Date);
		});

		it('should return the workflow head for a user with a global scope', async () => {
			const workflow = await createWorkflow({}, member);

			const head = await workflowFinderService.findWorkflowHeadForUser(workflow.id, owner, [
				'workflow:publish',
			]);

			expect(head?.versionId).toBe(workflow.versionId);
			expect(head?.updatedAt).toBeInstanceOf(Date);
		});

		it('should return null for a user without access to the workflow', async () => {
			const workflow = await createWorkflow({}, member);

			const head = await workflowFinderService.findWorkflowHeadForUser(workflow.id, anotherMember, [
				'workflow:publish',
			]);

			expect(head).toBeNull();
		});
	});
});
