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

const getNodeTypeMock = vi.fn().mockReturnValue(null);

vi.mock('@/app/stores/nodeTypes.store', () => ({
	useNodeTypesStore: vi.fn(() => ({
		getNodeType: getNodeTypeMock,
		communityNodeType: vi.fn().mockReturnValue(null),
	})),
}));

vi.mock('@/app/composables/useNodeHelpers', () => ({
	useNodeHelpers: vi.fn(() => ({
		hasProxyAuth: vi.fn().mockReturnValue(false),
		displayParameter: vi.fn().mockReturnValue(true),
	})),
}));

function createNode(overrides: Partial<INodeUi> = {}): INodeUi {
	return createTestNode({ name: 'Test Node', ...overrides }) as INodeUi;
}

describe('workflowDocument.store orchestration', () => {
	beforeEach(() => {
		setActivePinia(createPinia());
		getNodeTypeMock.mockReturnValue(null);
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

	describe('serialize', () => {
		it('assembles every doc field into WorkflowData', () => {
			const workflowDocumentStore = useWorkflowDocumentStore(createWorkflowDocumentId('wf-42'));

			workflowDocumentStore.setName('My Workflow');
			workflowDocumentStore.setNodes([createNode({ name: 'A' }), createNode({ name: 'B' })]);
			workflowDocumentStore.setConnections({
				A: { main: [[{ node: 'B', type: NodeConnectionTypes.Main, index: 0 }]] },
			});
			workflowDocumentStore.setPinData({ A: [{ json: { value: 1 } }] });
			workflowDocumentStore.setTags(['tag-1', 'tag-2']);

			const data = workflowDocumentStore.serialize();

			expect(data.name).toBe('My Workflow');
			expect(data.nodes).toHaveLength(2);
			expect(data.connections).toHaveProperty('A');
			expect(data.pinData).toHaveProperty('A');
			expect(data.tags).toEqual(['tag-1', 'tag-2']);
			expect(data.id).toBe('wf-42');
		});

		it('deep-copies connections so later store mutations do not affect saved data', () => {
			const workflowDocumentStore = useWorkflowDocumentStore(createWorkflowDocumentId('wf-1'));

			workflowDocumentStore.setNodes([createNode({ name: 'A' }), createNode({ name: 'B' })]);
			workflowDocumentStore.setConnections({
				A: { main: [[{ node: 'B', type: NodeConnectionTypes.Main, index: 0 }]] },
			});

			const data = workflowDocumentStore.serialize();

			workflowDocumentStore.setConnections({
				A: { main: [[{ node: 'B', type: NodeConnectionTypes.Main, index: 0 }]] },
				C: { main: [[{ node: 'B', type: NodeConnectionTypes.Main, index: 0 }]] },
			});

			expect(data.connections).not.toHaveProperty('C');
		});
	});

	describe('serializeNode', () => {
		it('passes parameters + credentials through when node type is unknown', () => {
			const workflowDocumentStore = useWorkflowDocumentStore(createWorkflowDocumentId('wf-1'));
			const node = createNode({
				name: 'Unknown',
				parameters: { foo: 'bar' },
				credentials: { someCred: { id: '1', name: 'cred' } },
			});

			const result = workflowDocumentStore.serializeNode(node);

			expect(result.parameters).toEqual({ foo: 'bar' });
			expect(result.credentials).toEqual({ someCred: { id: '1', name: 'cred' } });
		});

		it('preserves disabled / continueOnFail / onError / notes only when set', () => {
			const workflowDocumentStore = useWorkflowDocumentStore(createWorkflowDocumentId('wf-1'));
			const withFlags = createNode({
				name: 'With',
				disabled: true,
				continueOnFail: true,
				onError: 'continueRegularOutput',
				notes: 'hello',
			});
			const withoutFlags = createNode({
				name: 'Without',
				disabled: false,
				continueOnFail: false,
				onError: 'stopWorkflow',
				notes: '',
			});

			const resultWith = workflowDocumentStore.serializeNode(withFlags);
			const resultWithout = workflowDocumentStore.serializeNode(withoutFlags);

			expect(resultWith.disabled).toBe(true);
			expect(resultWith.continueOnFail).toBe(true);
			expect(resultWith.onError).toBe('continueRegularOutput');
			expect(resultWith.notes).toBe('hello');

			expect(resultWithout.disabled).toBeUndefined();
			expect(resultWithout.continueOnFail).toBeUndefined();
			expect(resultWithout.onError).toBeUndefined();
			expect(resultWithout.notes).toBeUndefined();
		});
	});
});
