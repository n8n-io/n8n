import type { InstanceAiContext } from '../../../types';
import {
	getWorkflowSourceFileBinding,
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
});
