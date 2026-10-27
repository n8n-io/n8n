import type { AssistantTurnMemory } from '../../turn-setup/assistant-turn-runtime';
import {
	createThreadTemporaryWorkflowMarkers,
	TEMPORARY_WORKFLOWS_METADATA_KEY,
} from '../assistant-temporary-workflow-markers';

function createMemory(metadata: Record<string, unknown> = {}) {
	const thread = { id: 'thread-1', resourceId: 'system-chat:user-1', title: '', metadata };
	const memory = {
		getThread: vi.fn(async () => thread),
		patchThread: vi.fn(
			async ({
				update,
			}: { update: (current: typeof thread) => { metadata?: Record<string, unknown> } | null }) => {
				const patch = update({ ...thread, metadata: { ...thread.metadata } });
				if (patch?.metadata) thread.metadata = patch.metadata;
				return thread;
			},
		),
	};
	return { memory: memory as unknown as AssistantTurnMemory, thread };
}

describe('createThreadTemporaryWorkflowMarkers', () => {
	it('keeps the marked workflows in the thread metadata', async () => {
		const { memory, thread } = createMemory({ other: 'kept' });
		const markers = createThreadTemporaryWorkflowMarkers(memory, 'thread-1');

		await markers.mark('wf-1');
		await markers.mark('wf-2');
		await markers.mark('wf-1');

		expect(thread.metadata).toEqual({
			other: 'kept',
			[TEMPORARY_WORKFLOWS_METADATA_KEY]: ['wf-1', 'wf-2'],
		});
		await expect(markers.list()).resolves.toEqual(['wf-1', 'wf-2']);
		await expect(markers.has('wf-2')).resolves.toBe(true);
	});

	it('removes a promoted workflow from the markers', async () => {
		const { memory } = createMemory({ [TEMPORARY_WORKFLOWS_METADATA_KEY]: ['wf-1', 'wf-2'] });
		const markers = createThreadTemporaryWorkflowMarkers(memory, 'thread-1');

		await markers.unmark('wf-1');

		await expect(markers.list()).resolves.toEqual(['wf-2']);
		await expect(markers.has('wf-1')).resolves.toBe(false);
	});

	it('ignores metadata that is not a list of ids', async () => {
		const { memory } = createMemory({ [TEMPORARY_WORKFLOWS_METADATA_KEY]: 'broken' });

		await expect(createThreadTemporaryWorkflowMarkers(memory, 'thread-1').list()).resolves.toEqual(
			[],
		);
	});
});
