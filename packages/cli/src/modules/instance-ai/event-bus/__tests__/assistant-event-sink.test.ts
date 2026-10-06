import type { InstanceAiEvent, InstanceAiSetupItem } from '@n8n/api-types';
import type { Logger } from '@n8n/backend-common';
import { Container } from '@n8n/di';
import { mock } from 'vitest-mock-extended';

import { N8nMemory } from '../../../agents/integrations/n8n-memory';
import { ASSISTANT_AGENT_ID } from '../../assistant-turn-options';
import { AssistantEventSink, SETUP_ITEMS_METADATA_KEY } from '../assistant-event-sink';

type Metadata = Record<string, unknown> | undefined;
type PatchArgs = {
	threadId: string;
	update: (current: { metadata?: Metadata }) => { metadata?: Metadata } | null | undefined;
};

/** One in-memory thread; `patchThread` applies the update to its metadata. */
function createMemoryDouble(initialMetadata: Metadata = {}) {
	const state: { metadata: Metadata } = { metadata: initialMetadata };
	const memory = {
		getThread: vi.fn(async (threadId: string) => ({ id: threadId, metadata: state.metadata })),
		patchThread: vi.fn(async ({ threadId, update }: PatchArgs) => {
			const next = update({ metadata: state.metadata });
			if (next?.metadata) state.metadata = next.metadata;
			return { id: threadId, metadata: state.metadata };
		}),
	};
	return { state, memory };
}

function setupItem(id: string): InstanceAiSetupItem {
	return { id } as unknown as InstanceAiSetupItem;
}

function setupItemsEvent(workflowId: string, items: InstanceAiSetupItem[]): InstanceAiEvent {
	return {
		type: 'setup-items',
		runId: 'run-1',
		agentId: 'agent-1',
		payload: { workflowId, items },
	} as InstanceAiEvent;
}

describe('AssistantEventSink', () => {
	const logger = mock<Logger>();
	const getImplementation = vi.fn();

	beforeEach(() => {
		vi.clearAllMocks();
		Container.set(N8nMemory, { getImplementation } as unknown as N8nMemory);
	});

	it('stores published setup items in thread metadata', async () => {
		const { state, memory } = createMemoryDouble({ other: 'kept' });
		getImplementation.mockReturnValue(memory);
		const sink = new AssistantEventSink(logger);

		sink.publish('thread-1', setupItemsEvent('wf-1', [setupItem('a')]));
		const result = await sink.readSetupItems('thread-1');

		expect(getImplementation).toHaveBeenCalledWith(ASSISTANT_AGENT_ID);
		expect(memory.patchThread).toHaveBeenCalledWith(
			expect.objectContaining({ threadId: 'thread-1' }),
		);
		expect(state.metadata).toEqual({
			other: 'kept',
			[SETUP_ITEMS_METADATA_KEY]: { 'wf-1': [setupItem('a')] },
		});
		expect(result).toEqual([{ workflowId: 'wf-1', items: [setupItem('a')] }]);
	});

	it('keeps the latest items per workflow, with the most recent workflow last', async () => {
		const { memory } = createMemoryDouble();
		getImplementation.mockReturnValue(memory);
		const sink = new AssistantEventSink(logger);

		sink.publish('thread-1', setupItemsEvent('wf-1', [setupItem('a')]));
		sink.publish('thread-1', setupItemsEvent('wf-2', [setupItem('b')]));
		sink.publish('thread-1', setupItemsEvent('wf-1', [setupItem('c')]));

		expect(await sink.readSetupItems('thread-1')).toEqual([
			{ workflowId: 'wf-2', items: [setupItem('b')] },
			{ workflowId: 'wf-1', items: [setupItem('c')] },
		]);
	});

	it('ignores events of other types', async () => {
		const { memory } = createMemoryDouble();
		getImplementation.mockReturnValue(memory);
		const sink = new AssistantEventSink(logger);

		sink.publish('thread-1', {
			type: 'text-delta',
			runId: 'run-1',
			agentId: 'agent-1',
			payload: { text: 'hello' },
		} as InstanceAiEvent);
		sink.publish('thread-1', {
			type: 'run-finish',
			runId: 'run-1',
			agentId: 'agent-1',
			payload: { status: 'completed' },
		} as InstanceAiEvent);

		expect(memory.patchThread).not.toHaveBeenCalled();
		expect(await sink.readSetupItems('thread-1')).toEqual([]);
	});

	it('waits for a pending write before it reads', async () => {
		const { memory } = createMemoryDouble();
		let releaseWrite!: () => void;
		const writeGate = new Promise<void>((resolve) => {
			releaseWrite = resolve;
		});
		const applyPatch = memory.patchThread.getMockImplementation()!;
		memory.patchThread.mockImplementation(async (args: PatchArgs) => {
			await writeGate;
			return await applyPatch(args);
		});
		getImplementation.mockReturnValue(memory);
		const sink = new AssistantEventSink(logger);

		sink.publish('thread-1', setupItemsEvent('wf-1', [setupItem('a')]));
		let settled = false;
		const read = sink.readSetupItems('thread-1').then((items) => {
			settled = true;
			return items;
		});
		await new Promise((resolve) => setImmediate(resolve));

		expect(settled).toBe(false);
		expect(memory.getThread).not.toHaveBeenCalled();

		releaseWrite();
		expect(await read).toEqual([{ workflowId: 'wf-1', items: [setupItem('a')] }]);
	});

	it('logs a failed write and keeps serving reads', async () => {
		const { memory } = createMemoryDouble();
		memory.patchThread.mockRejectedValueOnce(new Error('db down'));
		getImplementation.mockReturnValue(memory);
		const sink = new AssistantEventSink(logger);

		sink.publish('thread-1', setupItemsEvent('wf-1', [setupItem('a')]));

		expect(await sink.readSetupItems('thread-1')).toEqual([]);
		expect(logger.warn).toHaveBeenCalledWith(
			'Failed to store Assistant setup items',
			expect.objectContaining({ threadId: 'thread-1' }),
		);
	});

	it('returns no items when the stored value is not a record', async () => {
		const { memory } = createMemoryDouble({ [SETUP_ITEMS_METADATA_KEY]: 'corrupt' });
		getImplementation.mockReturnValue(memory);

		expect(await new AssistantEventSink(logger).readSetupItems('thread-1')).toEqual([]);
	});
});
