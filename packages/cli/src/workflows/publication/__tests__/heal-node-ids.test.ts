import type { INode } from 'n8n-workflow';

import type { HealNodeIdsResult } from '../heal-node-ids';
import { healNodeIds } from '../heal-node-ids';

const node = (overrides: Partial<INode>): INode => ({
	id: 'some-id',
	name: 'Some Node',
	type: 'n8n-nodes-base.set',
	typeVersion: 1,
	position: [0, 0],
	parameters: {},
	...overrides,
});

const trigger = (overrides: Partial<INode>): INode =>
	node({ type: 'n8n-nodes-base.scheduleTrigger', ...overrides });

const sticky = (overrides: Partial<INode>): INode =>
	node({ type: 'n8n-nodes-base.stickyNote', ...overrides });

const isTriggerLike = (n: INode) => n.type.toLowerCase().includes('trigger');

const heal = (nodes: INode[]) => healNodeIds(nodes, { isTriggerLike });

const expectChanged = (result: HealNodeIdsResult) => {
	expect(result.changed).toBe(true);
	if (!result.changed) throw new Error('unreachable');
	return result;
};

/** Healing a healed output must be a byte-identical no-op. */
const expectStable = (healedNodes: INode[]) => {
	expect(heal(healedNodes)).toEqual({ changed: false });
};

describe('healNodeIds', () => {
	it('returns changed: false for nodes with unique, non-empty ids', () => {
		const nodes = [trigger({ id: 'a', name: 'Trigger' }), node({ id: 'b', name: 'Set' })];

		expect(heal(nodes)).toEqual({ changed: false });
	});

	it('leaves same-name nodes with distinct ids alone', () => {
		const nodes = [node({ id: 'a', name: 'Twin' }), node({ id: 'b', name: 'Twin' })];

		expect(heal(nodes)).toEqual({ changed: false });
	});

	it('fills missing and empty ids with fresh uuids', () => {
		const nodes = [node({ id: '', name: 'Empty' }), node({ id: undefined, name: 'Missing' })];

		const result = expectChanged(heal(nodes));

		expect(result.nodes).toHaveLength(2);
		for (const healed of result.nodes) {
			expect(healed.id).toMatch(/^[0-9a-f-]{36}$/);
		}
		expect(result.nodes[0].id).not.toBe(result.nodes[1].id);
		expect(result.report.filled).toEqual([
			{ name: 'Empty', newId: result.nodes[0].id },
			{ name: 'Missing', newId: result.nodes[1].id },
		]);
		expectStable(result.nodes);
	});

	it('collapses same-named nodes without ids to the last occurrence, then fills it', () => {
		const nodes = [
			node({ id: '', name: 'Twin', parameters: { generation: 1 } }),
			node({ id: '', name: 'Twin', parameters: { generation: 2 } }),
			node({ id: undefined, name: 'Other' }),
		];

		const result = expectChanged(heal(nodes));

		expect(result.nodes.map(({ name }) => name)).toEqual(['Twin', 'Other']);
		expect(result.nodes[0].parameters).toEqual({ generation: 2 });
		expect(result.report.dropped).toEqual([{ name: 'Twin', id: '' }]);
		expect(result.report.reassigned).toEqual([]);
		expect(result.report.filled).toEqual([
			{ name: 'Twin', newId: result.nodes[0].id },
			{ name: 'Other', newId: result.nodes[1].id },
		]);
		expectStable(result.nodes);
	});

	it('keeps a shared id on the trigger-like node when exactly one sharer is trigger-like', () => {
		const nodes = [node({ id: 'shared', name: 'Set' }), trigger({ id: 'shared', name: 'Trigger' })];

		const result = expectChanged(heal(nodes));

		expect(result.nodes[1]).toBe(nodes[1]);
		expect(result.nodes[0].id).not.toBe('shared');
		expect(result.report.reassigned).toEqual([
			{ name: 'Set', oldId: 'shared', newId: result.nodes[0].id },
		]);
		expectStable(result.nodes);
	});

	it('keeps a shared id on the first sharer when none is trigger-like', () => {
		const nodes = [
			sticky({ id: 'shared', name: 'Note A' }),
			sticky({ id: 'shared', name: 'Note B' }),
		];

		const result = expectChanged(heal(nodes));

		expect(result.nodes[0]).toBe(nodes[0]);
		expect(result.nodes[1].id).not.toBe('shared');
		expectStable(result.nodes);
	});

	it('keeps a shared id on the first sharer when several are trigger-like', () => {
		// The non-trigger comes first so this is distinguishable from "any
		// trigger-like sharer wins".
		const nodes = [
			node({ id: 'shared', name: 'Set' }),
			trigger({ id: 'shared', name: 'Trigger A' }),
			trigger({ id: 'shared', name: 'Trigger B' }),
		];

		const result = expectChanged(heal(nodes));

		expect(result.nodes[0]).toBe(nodes[0]);
		expect(result.nodes[1].id).not.toBe('shared');
		expect(result.nodes[2].id).not.toBe('shared');
		expect(result.nodes[1].id).not.toBe(result.nodes[2].id);
		expectStable(result.nodes);
	});

	it('drops exact same-name duplicates, keeping the last occurrence', () => {
		// Last-write-wins matches the runtime's name-keyed node map, so the healed
		// workflow executes the same node the unhealed one did.
		const nodes = [
			node({ id: 'shared', name: 'Twin', parameters: { generation: 1 } }),
			node({ id: 'shared', name: 'Twin', parameters: { generation: 2 } }),
		];

		const result = expectChanged(heal(nodes));

		expect(result.nodes).toEqual([nodes[1]]);
		expect(result.report.dropped).toEqual([{ name: 'Twin', id: 'shared' }]);
		expect(result.report.reassigned).toEqual([]);
		expectStable(result.nodes);
	});

	it('handles a group of same-name and distinct-name sharers together', () => {
		const nodes = [
			node({ id: 'shared', name: 'Twin', parameters: { generation: 1 } }),
			trigger({ id: 'shared', name: 'Trigger' }),
			node({ id: 'shared', name: 'Twin', parameters: { generation: 2 } }),
		];

		const result = expectChanged(heal(nodes));

		// Twin collapses to its last occurrence, the sole trigger keeps the id.
		expect(result.nodes).toHaveLength(2);
		expect(result.nodes[0]).toBe(nodes[1]);
		expect(result.nodes[1].name).toBe('Twin');
		expect(result.nodes[1].parameters).toEqual({ generation: 2 });
		expect(result.nodes[1].id).not.toBe('shared');
		expect(result.report.dropped).toEqual([{ name: 'Twin', id: 'shared' }]);
		expect(result.report.reassigned).toEqual([
			{ name: 'Twin', oldId: 'shared', newId: result.nodes[1].id },
		]);
		expectStable(result.nodes);
	});

	it('keeps a referenced id alive through combined drops and reassignments', () => {
		// nodeGroups.nodeIds, poller_state rows and processed_data contexts key on
		// the shared id: after healing it must still resolve to exactly one node,
		// even when the first occurrence is a dropped same-name duplicate.
		const nodes = [
			node({ id: 'shared', name: 'Twin', parameters: { generation: 1 } }),
			node({ id: 'shared', name: 'Twin', parameters: { generation: 2 } }),
			node({ id: 'shared', name: 'Twin', parameters: { generation: 3 } }),
			node({ id: 'shared', name: 'Other A' }),
			node({ id: 'shared', name: 'Other B' }),
		];
		const inputSnapshot = structuredClone(nodes);

		const result = expectChanged(heal(nodes));

		expect(result.nodes.map(({ name }) => name)).toEqual(['Twin', 'Other A', 'Other B']);
		// No trigger-like sharer, so the first surviving occurrence keeps the id.
		expect(result.nodes[0].parameters).toEqual({ generation: 3 });
		expect(result.nodes[0].id).toBe('shared');
		expect(result.nodes[1].id).not.toBe('shared');
		expect(result.nodes[2].id).not.toBe('shared');
		expect(result.nodes[1].id).not.toBe(result.nodes[2].id);
		expect(result.report.dropped).toEqual([
			{ name: 'Twin', id: 'shared' },
			{ name: 'Twin', id: 'shared' },
		]);
		// The input array and its nodes are untouched.
		expect(nodes).toEqual(inputSnapshot);
		expectStable(result.nodes);
	});

	it('counts the same node object at two positions as two occurrences', () => {
		const twin = node({ id: 'shared', name: 'Twin' });

		const result = expectChanged(heal([twin, twin]));

		expect(result.nodes).toEqual([twin]);
		expect(result.report.dropped).toEqual([{ name: 'Twin', id: 'shared' }]);
		expectStable(result.nodes);
	});

	it('heals multiple independent id groups in one pass', () => {
		const nodes = [
			trigger({ id: 'a', name: 'Trigger A' }),
			node({ id: 'a', name: 'Set A' }),
			sticky({ id: 'b', name: 'Note' }),
			sticky({ id: 'b', name: 'Note' }),
			node({ id: 'c', name: 'Untouched' }),
		];

		const result = expectChanged(heal(nodes));

		expect(result.nodes.map(({ name }) => name)).toEqual([
			'Trigger A',
			'Set A',
			'Note',
			'Untouched',
		]);
		expect(new Set(result.nodes.map(({ id }) => id)).size).toBe(4);
		// Untouched nodes come through by reference, not as copies.
		expect(result.nodes[3]).toBe(nodes[4]);
		expectStable(result.nodes);
	});
});
