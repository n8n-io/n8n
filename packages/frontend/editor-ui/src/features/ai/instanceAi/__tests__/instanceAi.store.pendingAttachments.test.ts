import { describe, it, expect, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useInstanceAiStore } from '../instanceAi.store';
import type { InstanceAiNodesAttachment } from '@n8n/api-types';

const setsA: InstanceAiNodesAttachment['sets'] = [{ nodes: [{ id: 'n1', name: 'A' }] }];
const setsB: InstanceAiNodesAttachment['sets'] = [{ nodes: [{ id: 'n2', name: 'B' }] }];

describe('instanceAi store — pending composer attachments', () => {
	beforeEach(() => setActivePinia(createPinia()));

	it('stages one nodes attachment and consumes it', () => {
		const store = useInstanceAiStore();
		store.stageNodeSets('w1', setsA);
		const consumed = store.consumePendingAttachments();
		expect(consumed).toHaveLength(1);
		expect(consumed[0]).toMatchObject({ type: 'nodes', workflowId: 'w1', sets: setsA });
	});

	it('APPENDS a second stage for the same workflow, never replaces', () => {
		const store = useInstanceAiStore();
		store.stageNodeSets('w1', setsA);
		store.stageNodeSets('w1', setsB);
		const consumed = store.consumePendingAttachments();
		expect(consumed).toHaveLength(1);
		const nodesAtt = consumed[0];
		expect(nodesAtt.type === 'nodes' && nodesAtt.sets).toEqual([...setsA, ...setsB]);
	});

	it('skips re-staging a set already present (dedup by node ids, order-independent)', () => {
		const store = useInstanceAiStore();
		const twoNodes: InstanceAiNodesAttachment['sets'] = [
			{
				nodes: [
					{ id: 'n1', name: 'A' },
					{ id: 'n2', name: 'B' },
				],
			},
		];
		const sameReordered: InstanceAiNodesAttachment['sets'] = [
			{
				nodes: [
					{ id: 'n2', name: 'B' },
					{ id: 'n1', name: 'A' },
				],
			},
		];
		store.stageNodeSets('w1', twoNodes);
		store.stageNodeSets('w1', sameReordered);
		store.stageNodeSets('w1', setsB);
		const consumed = store.consumePendingAttachments();
		const nodesAtt = consumed[0];
		expect(nodesAtt.type === 'nodes' && nodesAtt.sets).toEqual([...twoNodes, ...setsB]);
	});

	it('clears staged state after one consume; next stage starts fresh', () => {
		const store = useInstanceAiStore();
		store.stageNodeSets('w1', setsA);
		store.consumePendingAttachments();
		expect(store.consumePendingAttachments()).toEqual([]);
		store.stageNodeSets('w1', setsB);
		const again = store.consumePendingAttachments();
		expect(again[0].type === 'nodes' && again[0].sets).toEqual(setsB);
	});

	it('requestClearCanvasSelection bumps the counter the canvas watches', () => {
		const store = useInstanceAiStore();
		const before = store.clearCanvasSelectionRequest;
		store.requestClearCanvasSelection();
		expect(store.clearCanvasSelectionRequest).toBe(before + 1);
	});
});
