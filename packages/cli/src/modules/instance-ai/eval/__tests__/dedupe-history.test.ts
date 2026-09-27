import { mock } from 'vitest-mock-extended';
import type { IDataDeduplicator, INode, IWorkflowBase } from 'n8n-workflow';

import {
	describeDedupeHistoryNodes,
	findDedupeHistoryNodes,
	resetDedupeHistory,
	withDedupeHistoryLock,
} from '../dedupe-history';
import { parsePreviouslySeenKeys } from '../workflow-analysis';

function dedupeNode(
	name: string,
	parameters: INode['parameters'],
	extra: Partial<INode> = {},
): INode {
	return {
		id: `id-${name}`,
		name,
		type: 'n8n-nodes-base.removeDuplicates',
		typeVersion: 2,
		position: [0, 0],
		parameters,
		...extra,
	};
}

function workflowWith(nodes: INode[]): IWorkflowBase {
	return { id: 'wf-1', name: 'Test', nodes, connections: {} } as unknown as IWorkflowBase;
}

const seenHistory = {
	operation: 'removeItemsSeenInPreviousExecutions',
	dedupeValue: '={{ $json.id }}',
};

describe('findDedupeHistoryNodes', () => {
	it('finds nodes that drop items seen in earlier executions, with default scope and size', () => {
		const nodes = findDedupeHistoryNodes(workflowWith([dedupeNode('Keep New', seenHistory)]));

		expect(nodes).toEqual([
			expect.objectContaining({
				scope: 'node',
				maxEntries: 10_000,
				dedupeValue: '={{ $json.id }}',
			}),
		]);
	});

	it('reads the workflow scope and history size from the options', () => {
		const [node] = findDedupeHistoryNodes(
			workflowWith([
				dedupeNode('Keep New', { ...seenHistory, options: { scope: 'workflow', historySize: 50 } }),
			]),
		);

		expect(node).toMatchObject({ scope: 'workflow', maxEntries: 50 });
	});

	it('skips other operations, other logics, old versions, and disabled nodes', () => {
		const nodes = findDedupeHistoryNodes(
			workflowWith([
				dedupeNode('Input', { operation: 'removeDuplicateInputItems' }),
				dedupeNode('Incremental', { ...seenHistory, logic: 'removeItemsUpToStoredIncrementalKey' }),
				dedupeNode('Old', seenHistory, { typeVersion: 1.1 }),
				dedupeNode('Off', seenHistory, { disabled: true }),
			]),
		);

		expect(nodes).toEqual([]);
	});
});

describe('describeDedupeHistoryNodes', () => {
	it('names each node with its key expression', () => {
		const text = describeDedupeHistoryNodes(
			findDedupeHistoryNodes(workflowWith([dedupeNode('Keep New', seenHistory)])),
		);

		expect(text).toContain('"Keep New" dedupes on: ={{ $json.id }}');
		expect(text).toContain('"previouslySeenKeys"');
	});

	it('returns nothing without history nodes', () => {
		expect(describeDedupeHistoryNodes([])).toBe('');
	});
});

describe('resetDedupeHistory', () => {
	it('clears every node, then records only the keys the scenario names', async () => {
		const deduplicator = mock<IDataDeduplicator>();
		const nodes = findDedupeHistoryNodes(
			workflowWith([dedupeNode('Keep New', seenHistory), dedupeNode('Other', seenHistory)]),
		);

		await resetDedupeHistory(deduplicator, 'wf-1', nodes, { 'Keep New': ['old-1', ''] });

		expect(deduplicator.clearAllProcessedItems).toHaveBeenCalledTimes(2);
		expect(deduplicator.checkProcessedAndRecord).toHaveBeenCalledTimes(1);
		expect(deduplicator.checkProcessedAndRecord).toHaveBeenCalledWith(
			['old-1'],
			'node',
			{ node: nodes[0].node, workflow: { id: 'wf-1', active: false } },
			{ mode: 'entries', maxEntries: 10_000 },
		);
	});
});

describe('withDedupeHistoryLock', () => {
	it('runs executions of one workflow one at a time', async () => {
		const order: string[] = [];
		let releaseFirst: () => void = () => {};
		const firstGate = new Promise<void>((resolve) => {
			releaseFirst = resolve;
		});

		const first = withDedupeHistoryLock('wf-1', async () => {
			order.push('first:start');
			await firstGate;
			order.push('first:end');
		});
		const second = withDedupeHistoryLock('wf-1', async () => {
			order.push('second');
		});

		await Promise.resolve();
		releaseFirst();
		await Promise.all([first, second]);

		expect(order).toEqual(['first:start', 'first:end', 'second']);
	});

	it('runs the next execution after one fails', async () => {
		const failed = withDedupeHistoryLock('wf-2', async () => {
			throw new Error('boom');
		});
		const next = withDedupeHistoryLock('wf-2', async () => 'ran');

		await expect(failed).rejects.toThrow('boom');
		await expect(next).resolves.toBe('ran');
	});
});

describe('parsePreviouslySeenKeys', () => {
	it('keeps string and number keys per node', () => {
		expect(parsePreviouslySeenKeys({ 'Keep New': ['a', 2, null], Empty: [] })).toEqual({
			'Keep New': ['a', '2'],
		});
	});

	it('returns undefined for anything but an object of arrays', () => {
		expect(parsePreviouslySeenKeys(undefined)).toBeUndefined();
		expect(parsePreviouslySeenKeys(['a'])).toBeUndefined();
		expect(parsePreviouslySeenKeys({ node: 'a' })).toBeUndefined();
	});
});
