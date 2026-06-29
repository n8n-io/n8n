import { createWorkflow, testDb } from '@n8n/backend-test-utils';
import { WorkflowPublicationTriggerStatusRepository, WorkflowRepository } from '@n8n/db';
import { Container } from '@n8n/di';

describe('WorkflowPublicationTriggerStatusRepository', () => {
	let repo: WorkflowPublicationTriggerStatusRepository;
	let workflowRepository: WorkflowRepository;

	beforeAll(async () => {
		await testDb.init();
		repo = Container.get(WorkflowPublicationTriggerStatusRepository);
		workflowRepository = Container.get(WorkflowRepository);
	});
	afterEach(async () => {
		await testDb.truncate(['WorkflowEntity', 'SharedWorkflow']);
	});
	afterAll(async () => await testDb.terminate());

	it('replaceForWorkflow inserts rows then overwrites them', async () => {
		const wf = await createWorkflow();
		await repo.replaceForWorkflow(wf.id, [
			{ nodeId: 'n1', versionId: 'v1', status: 'activated', errorMessage: null },
			{ nodeId: 'n2', versionId: 'v1', status: 'failed', errorMessage: 'boom' },
		]);
		expect(await repo.findByWorkflowId(wf.id)).toHaveLength(2);

		await repo.replaceForWorkflow(wf.id, [
			{ nodeId: 'n1', versionId: 'v2', status: 'activated', errorMessage: null },
		]);
		const rows = await repo.findByWorkflowId(wf.id);
		expect(rows).toHaveLength(1);
		expect(rows[0]).toMatchObject({ nodeId: 'n1', versionId: 'v2', status: 'activated' });
	});

	it('deleteForWorkflow clears rows', async () => {
		const wf = await createWorkflow();
		await repo.replaceForWorkflow(wf.id, [
			{ nodeId: 'n1', versionId: 'v1', status: 'activated', errorMessage: null },
		]);
		await repo.deleteForWorkflow(wf.id);
		expect(await repo.findByWorkflowId(wf.id)).toHaveLength(0);
	});

	it('FK CASCADE deletes trigger status rows when parent workflow is deleted', async () => {
		const wf = await createWorkflow();
		await repo.replaceForWorkflow(wf.id, [
			{ nodeId: 'n1', versionId: 'v1', status: 'activated', errorMessage: null },
			{ nodeId: 'n2', versionId: 'v1', status: 'failed', errorMessage: 'boom' },
		]);
		expect(await repo.findByWorkflowId(wf.id)).toHaveLength(2);

		await workflowRepository.delete(wf.id);

		expect(await repo.findByWorkflowId(wf.id)).toEqual([]);
	});
});
