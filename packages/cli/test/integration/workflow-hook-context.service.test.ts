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

	describe('hasWorkflowTag', () => {
		it('returns true when the workflow has the tag', async () => {
			const workflow = await createWorkflow();
			await createTag({ name: 'tagOne' }, workflow);

			await expect(service.hasWorkflowTag(workflow.id, 'tagOne')).resolves.toBe(true);
		});

		it('returns false when the workflow does not have the tag', async () => {
			const workflow = await createWorkflow();
			await createTag({ name: 'otherTag' }, workflow);

			await expect(service.hasWorkflowTag(workflow.id, 'tagOne')).resolves.toBe(false);
		});

		it('returns false when the workflow has no tags', async () => {
			const workflow = await createWorkflow();

			await expect(service.hasWorkflowTag(workflow.id, 'tagOne')).resolves.toBe(false);
		});

		it('returns false when the workflow does not exist', async () => {
			await expect(service.hasWorkflowTag('non-existent-id', 'tagOne')).resolves.toBe(false);
		});
	});
});
