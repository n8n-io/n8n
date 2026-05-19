import { createWorkflow, testDb } from '@n8n/backend-test-utils';
import { Container } from '@n8n/di';

import { WorkflowHookContextService } from '@/workflow-hook-context.service';

import { createTag } from './shared/db/tags';

describe('WorkflowHookContextService', () => {
	let service: WorkflowHookContextService;

	beforeAll(async () => {
		await testDb.init();
		service = Container.get(WorkflowHookContextService);
	});

	beforeEach(async () => {
		await testDb.truncate(['WorkflowEntity', 'TagEntity']);
	});

	afterAll(async () => {
		await testDb.terminate();
	});

	describe('getWorkflowTags', () => {
		it('returns the tag names of the workflow', async () => {
			const workflow = await createWorkflow();
			await createTag({ name: 'tagOne' }, workflow);
			await createTag({ name: 'tagTwo' }, workflow);

			await expect(service.getWorkflowTags(workflow.id)).resolves.toEqual(
				expect.arrayContaining(['tagOne', 'tagTwo']),
			);
		});

		it('returns an empty array when the workflow has no tags', async () => {
			const workflow = await createWorkflow();

			await expect(service.getWorkflowTags(workflow.id)).resolves.toEqual([]);
		});

		it('returns an empty array when the workflow does not exist', async () => {
			await expect(service.getWorkflowTags('non-existent-id')).resolves.toEqual([]);
		});
	});
});
