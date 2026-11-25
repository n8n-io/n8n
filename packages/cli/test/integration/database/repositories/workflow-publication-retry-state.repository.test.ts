import { createWorkflow, testDb } from '@n8n/backend-test-utils';
import { WorkflowPublicationRetryStateRepository } from '@n8n/db';
import { Container } from '@n8n/di';

describe('WorkflowPublicationRetryStateRepository', () => {
	let repository: WorkflowPublicationRetryStateRepository;

	beforeAll(async () => {
		await testDb.init();
		repository = Container.get(WorkflowPublicationRetryStateRepository);
	});

	afterEach(async () => {
		await testDb.truncate(['WorkflowPublicationRetryState']);
	});

	afterAll(async () => {
		await testDb.terminate();
	});

	it('keeps one retry-suppression target per workflow', async () => {
		const workflow = await createWorkflow();

		await repository.suppressRetry(workflow.id, 'version-1');
		await repository.suppressRetry(workflow.id, 'version-2');

		expect(await repository.find()).toEqual([
			expect.objectContaining({ workflowId: workflow.id, targetVersionId: 'version-2' }),
		]);
	});

	it('clears retry suppression', async () => {
		const workflow = await createWorkflow();
		await repository.suppressRetry(workflow.id, 'version-1');

		await repository.clearRetrySuppression(workflow.id);

		expect(await repository.find()).toEqual([]);
	});
});
