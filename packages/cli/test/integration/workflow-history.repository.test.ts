import { createWorkflow, createWorkflowHistory, testDb } from '@n8n/backend-test-utils';
import { WorkflowHistoryRepository } from '@n8n/db';
import type { WorkflowEntity } from '@n8n/db';
import { Container } from '@n8n/di';
import { randomUUID } from 'node:crypto';

describe('WorkflowHistoryRepository', () => {
	let repository: WorkflowHistoryRepository;

	beforeAll(async () => {
		await testDb.init();
		repository = Container.get(WorkflowHistoryRepository);
	});

	beforeEach(async () => {
		await testDb.truncate(['WorkflowHistory', 'WorkflowEntity']);
	});

	afterAll(async () => await testDb.terminate());

	async function version(workflow: WorkflowEntity, authors: string, createdAt: string) {
		await createWorkflowHistory(workflow, undefined, undefined, {
			versionId: randomUUID(),
			authors,
			createdAt: new Date(createdAt),
		});
	}

	describe('findRecentAuthorsByWorkflowIds', () => {
		test('returns the newest versions per requested workflow first', async () => {
			const [first, second, other] = await Promise.all([
				createWorkflow(),
				createWorkflow(),
				createWorkflow(),
			]);
			await version(first, 'Alice Adams', '2026-01-01T00:00:00.000Z');
			await version(first, 'Bob Brown', '2026-01-03T00:00:00.000Z');
			await version(second, 'Carol Clark', '2026-01-02T00:00:00.000Z');
			await version(other, 'Dan Dole', '2026-01-04T00:00:00.000Z');

			const recent = await repository.findRecentAuthorsByWorkflowIds([first.id, second.id], 10);

			expect([...recent.keys()].sort()).toEqual([first.id, second.id].sort());
			expect(recent.get(first.id)?.map((entry) => entry.authors)).toEqual([
				'Bob Brown',
				'Alice Adams',
			]);
			expect(recent.get(first.id)?.[0].at.getTime()).toBe(Date.parse('2026-01-03T00:00:00.000Z'));
			expect(recent.get(second.id)?.map((entry) => entry.authors)).toEqual(['Carol Clark']);
		});

		test('keeps at most the requested number of versions per workflow', async () => {
			const workflow = await createWorkflow();
			await version(workflow, 'Alice Adams', '2026-01-01T00:00:00.000Z');
			await version(workflow, 'Bob Brown', '2026-01-02T00:00:00.000Z');
			await version(workflow, 'Carol Clark', '2026-01-03T00:00:00.000Z');

			const recent = await repository.findRecentAuthorsByWorkflowIds([workflow.id], 2);

			expect(recent.get(workflow.id)?.map((entry) => entry.authors)).toEqual([
				'Carol Clark',
				'Bob Brown',
			]);
		});

		test('omits a workflow without versions and returns nothing for no ids', async () => {
			const workflow = await createWorkflow();

			expect(await repository.findRecentAuthorsByWorkflowIds([workflow.id], 10)).toEqual(new Map());
			expect(await repository.findRecentAuthorsByWorkflowIds([], 10)).toEqual(new Map());
		});
	});
});
