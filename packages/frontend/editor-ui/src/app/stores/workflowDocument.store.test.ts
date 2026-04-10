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
		const workflowDocumentStore = useWorkflowDocumentStore(createWorkflowDocumentId('test-wf'));

		// Set up nodes, connections, and pin data
		workflowDocumentStore.setNodes([createNode({ name: 'A' }), createNode({ name: 'B' })]);
		workflowDocumentStore.setConnections({
			A: { main: [[{ node: 'B', type: NodeConnectionTypes.Main, index: 0 }]] },
		});
		workflowDocumentStore.setPinData({ A: [{ json: { value: 1 } }] });

		// Verify all are populated
		expect(workflowDocumentStore.allNodes).toHaveLength(2);
		expect(workflowDocumentStore.connectionsBySourceNode).toHaveProperty('A');
		expect(workflowDocumentStore.pinData).toHaveProperty('A');

		// removeAllNodes should clear all three
		workflowDocumentStore.removeAllNodes();

		expect(workflowDocumentStore.allNodes).toHaveLength(0);
		expect(workflowDocumentStore.connectionsBySourceNode).toEqual({});
		expect(workflowDocumentStore.pinData).toEqual({});
	});

	it('node mutation triggers markStateDirty on UI store', () => {
		const workflowDocumentStore = useWorkflowDocumentStore(createWorkflowDocumentId('test-wf'));
		const uiStore = useUIStore();

		// Start clean
		uiStore.markStateClean();
		expect(uiStore.stateIsDirty).toBe(false);

		// addNode fires onStateDirty, which the store wires to markStateDirty
		workflowDocumentStore.addNode(createNode({ name: 'A' }));

		expect(uiStore.stateIsDirty).toBe(true);
	});

	it('connection mutation triggers markStateDirty on UI store', () => {
		const workflowDocumentStore = useWorkflowDocumentStore(createWorkflowDocumentId('test-wf'));
		const uiStore = useUIStore();

		workflowDocumentStore.setNodes([createNode({ name: 'A' }), createNode({ name: 'B' })]);

		// Start clean
		uiStore.markStateClean();
		expect(uiStore.stateIsDirty).toBe(false);

		// addConnection fires onStateDirty, which the store wires to markStateDirty
		workflowDocumentStore.addConnection({
			connection: [
				{ node: 'A', type: NodeConnectionTypes.Main, index: 0 },
				{ node: 'B', type: NodeConnectionTypes.Main, index: 0 },
			],
		});

		expect(uiStore.stateIsDirty).toBe(true);
	});
});
