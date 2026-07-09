import type { InstanceAiContext } from '../../../types';
import {
	bindSourceFileToExistingWorkflow,
	getWorkflowSourceFileBinding,
	refreshWorkflowSourceFileBindingFromSave,
	refreshWorkflowSourceFileBindingFromWorkflow,
	saveWorkflowSourceFileBinding,
} from '../workflow-file-bindings';

describe('workflow source file bindings', () => {
	it('falls back to in-memory bindings when thread metadata exists without this file', async () => {
		const threadMemory = {
			getThread: vi.fn().mockResolvedValue({
				id: 'thread-1',
				metadata: {},
				resourceId: 'resource-1',
				createdAt: new Date(),
				updatedAt: new Date(),
			}),
			patchThread: vi.fn().mockResolvedValue(null),
		};
		const context = {
			threadId: 'thread-1',
			threadMemory,
			logger: { debug: vi.fn(), warn: vi.fn() },
		} as unknown as InstanceAiContext;

		await saveWorkflowSourceFileBinding(context, {
			filePath: 'src/workflows/main.workflow.ts',
			workflowId: 'wf-1',
		});

		await expect(
			getWorkflowSourceFileBinding(context, 'src/workflows/main.workflow.ts'),
		).resolves.toMatchObject({
			filePath: 'src/workflows/main.workflow.ts',
			workflowId: 'wf-1',
		});
	});

	it('refreshes checksum and version for bindings tied to a workflow id', async () => {
		const context = {
			logger: { debug: vi.fn(), warn: vi.fn() },
		} as unknown as InstanceAiContext;

		await saveWorkflowSourceFileBinding(context, {
			filePath: 'src/workflows/main.workflow.ts',
			workflowId: 'wf-1',
			workflowVersionId: 'v-old',
			workflowChecksum: 'checksum-old',
		});

		await refreshWorkflowSourceFileBindingFromSave(context, 'wf-1', {
			versionId: 'v-new',
			checksum: 'checksum-new',
		});

		await expect(
			getWorkflowSourceFileBinding(context, 'src/workflows/main.workflow.ts'),
		).resolves.toMatchObject({
			workflowId: 'wf-1',
			workflowVersionId: 'v-new',
			workflowChecksum: 'checksum-new',
		});
	});

	it('clears workflowChecksum when refresh receives no checksum', async () => {
		const context = {
			logger: { debug: vi.fn(), warn: vi.fn() },
		} as unknown as InstanceAiContext;

		await saveWorkflowSourceFileBinding(context, {
			filePath: 'src/workflows/main.workflow.ts',
			workflowId: 'wf-1',
			workflowVersionId: 'v-old',
			workflowChecksum: 'checksum-old',
		});

		await refreshWorkflowSourceFileBindingFromSave(context, 'wf-1', {
			versionId: 'v-new',
		});

		await expect(
			getWorkflowSourceFileBinding(context, 'src/workflows/main.workflow.ts'),
		).resolves.toMatchObject({
			workflowId: 'wf-1',
			workflowVersionId: 'v-new',
		});
		await expect(
			getWorkflowSourceFileBinding(context, 'src/workflows/main.workflow.ts'),
		).resolves.not.toHaveProperty('workflowChecksum');
	});

	it('seeds version and checksum when binding a source file to an existing workflow', async () => {
		const context = {
			workflowService: {
				get: vi.fn().mockResolvedValue({
					id: 'wf-1',
					versionId: 'v-current',
					checksum: 'checksum-current',
				}),
			},
			logger: { debug: vi.fn(), warn: vi.fn() },
		} as unknown as InstanceAiContext;

		await bindSourceFileToExistingWorkflow(
			context,
			{ filePath: 'src/workflows/main.workflow.ts' },
			'wf-1',
		);

		await expect(
			getWorkflowSourceFileBinding(context, 'src/workflows/main.workflow.ts'),
		).resolves.toMatchObject({
			workflowId: 'wf-1',
			workflowVersionId: 'v-current',
			workflowChecksum: 'checksum-current',
		});
	});

	it('refreshes bindings from the current workflow record', async () => {
		const context = {
			workflowService: {
				get: vi.fn().mockResolvedValue({
					id: 'wf-1',
					versionId: 'v-current',
					checksum: 'checksum-current',
				}),
			},
			logger: { debug: vi.fn(), warn: vi.fn() },
		} as unknown as InstanceAiContext;

		await saveWorkflowSourceFileBinding(context, {
			filePath: 'src/workflows/main.workflow.ts',
			workflowId: 'wf-1',
			workflowVersionId: 'v-stale',
			workflowChecksum: 'checksum-stale',
		});

		await refreshWorkflowSourceFileBindingFromWorkflow(context, 'wf-1');

		await expect(
			getWorkflowSourceFileBinding(context, 'src/workflows/main.workflow.ts'),
		).resolves.toMatchObject({
			workflowId: 'wf-1',
			workflowVersionId: 'v-current',
			workflowChecksum: 'checksum-current',
		});
	});
});
