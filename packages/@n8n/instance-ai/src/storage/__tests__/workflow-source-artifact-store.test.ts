import type { WorkflowSourceArtifact } from '../../workflow-loop/workflow-loop-state';
import type { ThreadRecord } from '../thread-patch';
import { ThreadWorkflowSourceArtifactStore } from '../workflow-source-artifact-store';

function makeThread(): ThreadRecord {
	return {
		id: 'thread-1',
		title: 'Thread',
		resourceId: 'res-1',
		metadata: {},
		createdAt: new Date('2026-01-01T00:00:00Z'),
		updatedAt: new Date('2026-01-01T00:00:00Z'),
	};
}

function makeArtifact(overrides: Partial<WorkflowSourceArtifact> = {}): WorkflowSourceArtifact {
	return {
		sourceRef: 'wfsrc_wi-1_abc12345',
		threadId: 'thread-1',
		runId: 'run-1',
		workItemId: 'wi-1',
		taskId: 'task-1',
		filePath: 'src/workflows/task-1/main.workflow.ts',
		sourceHash: 'hash-initial',
		createdAt: '2026-01-01T00:00:00Z',
		updatedAt: '2026-01-01T00:00:00Z',
		...overrides,
	};
}

describe('ThreadWorkflowSourceArtifactStore', () => {
	it('persists artifacts across store instances and updates build state', async () => {
		let thread = makeThread();
		const memory = {
			getThread: vi.fn(async () => await Promise.resolve(thread)),
			saveThread: vi.fn(async (next: ThreadRecord) => {
				thread = next;
				return await Promise.resolve(next);
			}),
		};
		const firstStore = new ThreadWorkflowSourceArtifactStore(memory, 'thread-1');
		const artifact = makeArtifact();

		await firstStore.upsert(artifact);

		const resumedStore = new ThreadWorkflowSourceArtifactStore(memory, 'thread-1');
		expect(await resumedStore.getBySourceRef(artifact.sourceRef)).toEqual(artifact);
		expect(await resumedStore.getByWorkItemId('wi-1')).toEqual(artifact);

		await resumedStore.markFailed({
			sourceRef: artifact.sourceRef,
			sourceHash: 'hash-failed',
			workflowName: 'Draft workflow',
		});

		const failedArtifact = await firstStore.getBySourceRef(artifact.sourceRef);
		expect(failedArtifact).toMatchObject({
			sourceHash: 'hash-failed',
			workflowName: 'Draft workflow',
		});
		expect(typeof failedArtifact?.lastFailedBuildAt).toBe('string');

		await firstStore.updateAfterSave({
			sourceRef: artifact.sourceRef,
			workflowId: 'wf-1',
			workflowVersionId: 'version-1',
			sourceHash: 'hash-saved',
			workflowName: 'Saved workflow',
		});

		const savedArtifact = await resumedStore.getBySourceRef(artifact.sourceRef);
		expect(savedArtifact).toMatchObject({
			workflowId: 'wf-1',
			workflowVersionId: 'version-1',
			workflowName: 'Saved workflow',
			sourceHash: 'hash-saved',
		});
		expect(typeof savedArtifact?.lastSuccessfulBuildAt).toBe('string');
		expect(memory.saveThread).toHaveBeenCalledTimes(3);
	});
});
