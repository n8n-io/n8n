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

	describe('hasWorkflowTags', () => {
		it('returns true when the workflow has all required tags', async () => {
			const workflow = await createWorkflow();
			await createTag({ name: 'tagOne' }, workflow);
			await createTag({ name: 'tagTwo' }, workflow);

			await expect(service.hasWorkflowTags(workflow.id, ['tagOne', 'tagTwo'])).resolves.toBe(true);
		});

		it('returns false when the workflow is missing some of the required tags', async () => {
			const workflow = await createWorkflow();
			await createTag({ name: 'tagOne' }, workflow);

			await expect(service.hasWorkflowTags(workflow.id, ['tagOne', 'tagTwo'])).resolves.toBe(false);
		});

		it('returns false when the workflow has none of the required tags', async () => {
			const workflow = await createWorkflow();
			await createTag({ name: 'unrelatedTag' }, workflow);

			await expect(service.hasWorkflowTags(workflow.id, ['tagOne', 'tagTwo'])).resolves.toBe(false);
		});

		it('returns false when the workflow does not exist', async () => {
			await expect(service.hasWorkflowTags('non-existent-id', ['tagOne'])).resolves.toBe(false);
		});
	});
});
