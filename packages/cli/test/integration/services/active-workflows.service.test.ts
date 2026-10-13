import { createActiveWorkflow, shareWorkflowWithUsers, testDb } from '@n8n/backend-test-utils';
import { GLOBAL_MEMBER_ROLE, GLOBAL_OWNER_ROLE, type User } from '@n8n/db';
import { Container } from '@n8n/di';

import { ActiveWorkflowsService } from '@/services/active-workflows.service';

import { createUser } from '../shared/db/users';

let owner: User;
let member: User;
let activeWorkflowsService: ActiveWorkflowsService;

beforeAll(async () => {
	await testDb.init();
	owner = await createUser({ role: GLOBAL_OWNER_ROLE });
	member = await createUser({ role: GLOBAL_MEMBER_ROLE });
	activeWorkflowsService = Container.get(ActiveWorkflowsService);
});

beforeEach(async () => {
	await testDb.truncate(['WorkflowEntity', 'SharedWorkflow', 'WorkflowHistory']);
});

afterAll(async () => {
	await testDb.terminate();
});

describe('ActiveWorkflowsService', () => {
	describe('getAllActiveIdsFor', () => {
		it('does not return active workflow ids the user has no access to', async () => {
			const ownerWorkflow = await createActiveWorkflow({}, owner);

			const ids = await activeWorkflowsService.getAllActiveIdsFor(member);

			expect(ids).not.toContain(ownerWorkflow.id);
			expect(ids).toEqual([]);
		});

		it('returns active workflow ids the user has been granted access to', async () => {
			const sharedWorkflow = await createActiveWorkflow({}, owner);
			await shareWorkflowWithUsers(sharedWorkflow, [member]);

			const ids = await activeWorkflowsService.getAllActiveIdsFor(member);

			expect(ids).toContain(sharedWorkflow.id);
		});
	});
});
