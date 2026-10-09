import { createWorkflow, testDb } from '@n8n/backend-test-utils';
import { WorkflowPublishHistoryRepository } from '@n8n/db';
import type { User, WorkflowEntity } from '@n8n/db';
import { Container } from '@n8n/di';

import { createMember } from './shared/db/users';

describe('WorkflowPublishHistoryRepository', () => {
	let repository: WorkflowPublishHistoryRepository;
	let alice: User;
	let bob: User;

	beforeAll(async () => {
		await testDb.init();
		repository = Container.get(WorkflowPublishHistoryRepository);
	});

	beforeEach(async () => {
		await testDb.truncate(['WorkflowPublishHistory', 'WorkflowEntity', 'User']);
		[alice, bob] = await Promise.all([createMember(), createMember()]);
	});

	afterAll(async () => await testDb.terminate());

	async function publishEvent(
		workflow: WorkflowEntity,
		userId: string | null,
		createdAt: string,
		event: 'activated' | 'deactivated' = 'activated',
	) {
		await repository.insert({
			workflowId: workflow.id,
			versionId: null,
			event,
			userId,
			createdAt: new Date(createdAt),
		});
	}

	describe('findRecentAttributedByWorkflowIds', () => {
		test('returns the newest events per workflow first, without those whose user is gone', async () => {
			const [first, second, other] = await Promise.all([
				createWorkflow(),
				createWorkflow(),
				createWorkflow(),
			]);
			await publishEvent(first, alice.id, '2026-01-01T00:00:00.000Z');
			await publishEvent(first, bob.id, '2026-01-03T00:00:00.000Z', 'deactivated');
			await publishEvent(first, null, '2026-01-05T00:00:00.000Z');
			await publishEvent(second, bob.id, '2026-01-02T00:00:00.000Z');
			await publishEvent(other, alice.id, '2026-01-04T00:00:00.000Z');

			const recent = await repository.findRecentAttributedByWorkflowIds([first.id, second.id], 10);

			expect([...recent.keys()].sort()).toEqual([first.id, second.id].sort());
			expect(recent.get(first.id)?.map((entry) => entry.userId)).toEqual([bob.id, alice.id]);
			expect(recent.get(first.id)?.[0].at.getTime()).toBe(Date.parse('2026-01-03T00:00:00.000Z'));
			expect(recent.get(second.id)?.map((entry) => entry.userId)).toEqual([bob.id]);
		});

		test('keeps at most the requested number of events per workflow', async () => {
			const workflow = await createWorkflow();
			await publishEvent(workflow, alice.id, '2026-01-01T00:00:00.000Z');
			await publishEvent(workflow, bob.id, '2026-01-02T00:00:00.000Z');
			await publishEvent(workflow, alice.id, '2026-01-03T00:00:00.000Z');

			const recent = await repository.findRecentAttributedByWorkflowIds([workflow.id], 2);

			expect(recent.get(workflow.id)?.map((entry) => entry.userId)).toEqual([alice.id, bob.id]);
		});

		test('omits a workflow with no attributable event and returns nothing for no ids', async () => {
			const workflow = await createWorkflow();
			await publishEvent(workflow, null, '2026-01-01T00:00:00.000Z');

			expect(await repository.findRecentAttributedByWorkflowIds([workflow.id], 10)).toEqual(
				new Map(),
			);
			expect(await repository.findRecentAttributedByWorkflowIds([], 10)).toEqual(new Map());
		});
	});
});
