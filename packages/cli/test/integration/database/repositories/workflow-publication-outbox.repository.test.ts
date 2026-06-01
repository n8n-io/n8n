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

	// TODO: cover Postgres `FOR UPDATE SKIP LOCKED` concurrency control under
	// parallel claimers in a follow-up.
});
