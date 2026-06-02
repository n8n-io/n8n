import { testDb } from '@n8n/backend-test-utils';
import { WorkflowPublicationOutboxRepository } from '@n8n/db';
import { Container } from '@n8n/di';

describe('WorkflowPublicationOutboxRepository', () => {
	let repository: WorkflowPublicationOutboxRepository;

	beforeAll(async () => {
		await testDb.init();
		repository = Container.get(WorkflowPublicationOutboxRepository);
	});

	beforeEach(async () => {
		await testDb.truncate(['WorkflowPublicationOutbox']);
	});

	afterAll(async () => {
		await testDb.terminate();
	});

	it('enqueues a pending record that can then be claimed', async () => {
		const enqueued = await repository.enqueue('wf-1', 'v-1');

		expect(enqueued.id).toBeGreaterThan(0);
		expect(enqueued.status).toBe('pending');
		expect(enqueued.workflowId).toBe('wf-1');
		expect(enqueued.publishedVersionId).toBe('v-1');

		const claimed = await repository.claimNextPendingRecord();

		expect(claimed?.id).toBe(enqueued.id);
		expect(claimed?.status).toBe('in_progress');

		const claimedAgain = await repository.claimNextPendingRecord();
		expect(claimedAgain).toBeNull();
	});

	it('supersedes an existing pending record when re-enqueued for the same workflow', async () => {
		const first = await repository.enqueue('wf-1', 'v-1');
		const second = await repository.enqueue('wf-1', 'v-2');

		expect(second.id).toBe(first.id);
		expect(second.publishedVersionId).toBe('v-2');

		const claimed = await repository.claimNextPendingRecord();
		expect(claimed?.id).toBe(first.id);
		expect(claimed?.publishedVersionId).toBe('v-2');

		const claimedAgain = await repository.claimNextPendingRecord();
		expect(claimedAgain).toBeNull();
	});

	it('enqueues a fresh pending record once the previous one is no longer pending', async () => {
		const first = await repository.enqueue('wf-1', 'v-1');
		await repository.claimNextPendingRecord();
		await repository.markCompleted(first.id);

		const next = await repository.enqueue('wf-1', 'v-2');

		expect(next.id).not.toBe(first.id);
		expect(next.status).toBe('pending');
		expect(next.publishedVersionId).toBe('v-2');
	});

	// TODO: cover Postgres `FOR UPDATE SKIP LOCKED` concurrency control under
	// parallel claimers in a follow-up.
});
