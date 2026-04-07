/**
 * Integration tests for workflowDocument.store cross-cut wiring.
 *
 * These tests verify the orchestration logic in workflowDocument.store.ts —
 * the glue that connects composables to each other and to external stores.
 * Individual composable behavior is tested in their own test files.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { NodeConnectionTypes } from 'n8n-workflow';
import {
	useWorkflowDocumentStore,
	createWorkflowDocumentId,
} from '@/app/stores/workflowDocument.store';
import { useUIStore } from '@/app/stores/ui.store';
import { createTestNode } from '@/__tests__/mocks';
import type { INodeUi } from '@/Interface';

vi.mock('@/app/stores/nodeTypes.store', () => ({
	useNodeTypesStore: vi.fn(() => ({
		getNodeType: vi.fn().mockReturnValue(null),
		communityNodeType: vi.fn().mockReturnValue(null),
	})),
}));

function createNode(overrides: Partial<INodeUi> = {}): INodeUi {
	return createTestNode({ name: 'Test Node', ...overrides }) as INodeUi;
}

describe('workflowDocument.store orchestration', () => {
	beforeEach(() => {
		setActivePinia(createPinia());
	});

	it('removeAllNodes clears nodes, connections, and pin data', () => {
		const store = useWorkflowDocumentStore(createWorkflowDocumentId('test-wf'));

		// Set up nodes, connections, and pin data
		store.setNodes([createNode({ name: 'A' }), createNode({ name: 'B' })]);
		store.setConnections({
			A: { main: [[{ node: 'B', type: NodeConnectionTypes.Main, index: 0 }]] },
		});
		store.setPinData({ A: [{ json: { value: 1 } }] });

		// Verify all are populated
		expect(store.allNodes).toHaveLength(2);
		expect(store.connectionsBySourceNode).toHaveProperty('A');
		expect(store.pinData).toHaveProperty('A');

		// removeAllNodes should clear all three
		store.removeAllNodes();

		expect(store.allNodes).toHaveLength(0);
		expect(store.connectionsBySourceNode).toEqual({});
		expect(store.pinData).toEqual({});
	});

	it('node mutation triggers markStateDirty on UI store', () => {
		const store = useWorkflowDocumentStore(createWorkflowDocumentId('test-wf'));
		const uiStore = useUIStore();

		// Start clean
		uiStore.markStateClean();
		expect(uiStore.stateIsDirty).toBe(false);

		// addNode fires onStateDirty, which the store wires to markStateDirty
		store.addNode(createNode({ name: 'A' }));

		expect(uiStore.stateIsDirty).toBe(true);
	});

	it('connection mutation triggers markStateDirty on UI store', () => {
		const store = useWorkflowDocumentStore(createWorkflowDocumentId('test-wf'));
		const uiStore = useUIStore();

		store.setNodes([createNode({ name: 'A' }), createNode({ name: 'B' })]);

		// Start clean
		uiStore.markStateClean();
		expect(uiStore.stateIsDirty).toBe(false);

		// addConnection fires onStateDirty, which the store wires to markStateDirty
		store.addConnection({
			connection: [
				{ node: 'A', type: NodeConnectionTypes.Main, index: 0 },
				{ node: 'B', type: NodeConnectionTypes.Main, index: 0 },
			],
		});

		expect(uiStore.stateIsDirty).toBe(true);
	});
});
