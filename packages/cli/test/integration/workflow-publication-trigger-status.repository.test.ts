import { createWorkflow, testDb } from '@n8n/backend-test-utils';
import { WorkflowPublicationTriggerStatusRepository } from '@n8n/db';
import { Container } from '@n8n/di';

describe('WorkflowPublicationTriggerStatusRepository', () => {
	let repo: WorkflowPublicationTriggerStatusRepository;

	beforeAll(async () => {
		await testDb.init();
		repo = Container.get(WorkflowPublicationTriggerStatusRepository);
	});
	afterEach(async () => {
		await testDb.truncate(['WorkflowEntity', 'SharedWorkflow']);
	});
	afterAll(async () => await testDb.terminate());

	it('replaceForWorkflow inserts rows then overwrites them', async () => {
		const wf = await createWorkflow();
		await repo.replaceForWorkflow(wf.id, [
			{ nodeId: 'n1', nodeName: 'A', versionId: 'v1', status: 'activated', errorMessage: null },
			{ nodeId: 'n2', nodeName: 'B', versionId: 'v1', status: 'failed', errorMessage: 'boom' },
		]);
		expect(await repo.findByWorkflowId(wf.id)).toHaveLength(2);

		await repo.replaceForWorkflow(wf.id, [
			{ nodeId: 'n1', nodeName: 'A', versionId: 'v2', status: 'activated', errorMessage: null },
		]);
		const rows = await repo.findByWorkflowId(wf.id);
		expect(rows).toHaveLength(1);
		expect(rows[0]).toMatchObject({ nodeId: 'n1', versionId: 'v2', status: 'activated' });
	});

	it('deleteForWorkflow clears rows', async () => {
		const wf = await createWorkflow();
		await repo.replaceForWorkflow(wf.id, [
			{ nodeId: 'n1', nodeName: 'A', versionId: 'v1', status: 'activated', errorMessage: null },
		]);
		await repo.deleteForWorkflow(wf.id);
		expect(await repo.findByWorkflowId(wf.id)).toHaveLength(0);
	});
});
