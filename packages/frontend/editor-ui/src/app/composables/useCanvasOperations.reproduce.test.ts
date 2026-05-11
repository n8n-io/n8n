import { setActivePinia } from 'pinia';
import { createTestingPinia } from '@pinia/testing';
import { useCanvasOperations } from '@/app/composables/useCanvasOperations';
import {
	useWorkflowDocumentStore,
	createWorkflowDocumentId,
} from '@/app/stores/workflowDocument.store';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import type { Workflow } from 'n8n-workflow';
import { createTestNode, createTestWorkflowObject } from '@/__tests__/mocks';

const TEST_WF_ID = 'test-wf-id';

describe('useCanvasOperations - Reproduce #29425', () => {
	let workflowDocumentStore: ReturnType<typeof useWorkflowDocumentStore>;
	let nodeTypesStore: ReturnType<typeof useNodeTypesStore>;

	beforeEach(() => {
		const pinia = createTestingPinia({ stubActions: false });
		setActivePinia(pinia);

		useWorkflowsStore().workflowId = TEST_WF_ID;
		workflowDocumentStore = useWorkflowDocumentStore(createWorkflowDocumentId(TEST_WF_ID));
		nodeTypesStore = useNodeTypesStore();

		// Mock node types
		nodeTypesStore.nodeTypes = {
			'n8n-nodes-base.noOp': {
				1: {
					name: 'n8n-nodes-base.noOp',
					displayName: 'No-Op',
					defaults: { name: 'No-Op' },
					properties: [],
				} as any,
			},
		};

		// Mock createWorkflowObject
		vi.spyOn(workflowDocumentStore, 'createWorkflowObject').mockImplementation(
			(nodes, connections) => {
				return createTestWorkflowObject({ nodes: nodes as any, connections });
			},
		);
	});

	it('should rename pasted nodes when names conflict with existing nodes', async () => {
		const canvasOperations = useCanvasOperations();

		// 1. Setup existing node on canvas
		const existingNode = createTestNode({ name: 'My Node', type: 'n8n-nodes-base.noOp' });
		workflowDocumentStore.addNode(existingNode);

		expect(workflowDocumentStore.allNodes).toHaveLength(1);
		expect(workflowDocumentStore.canvasNames).toContain('My Node');

		// 2. Paste a node with the same name
		const pastedNode = createTestNode({
			name: 'My Node',
			type: 'n8n-nodes-base.noOp',
			id: 'new-id',
		});
		const workflowData = {
			nodes: [pastedNode],
			connections: {},
		};

		const addNodesSpy = vi.spyOn(workflowDocumentStore, 'addNode');

		await canvasOperations.importWorkflowData(workflowData, 'paste');

		// 3. Check if the pasted node was renamed
		// The first call was for existingNode in setup
		// The second call should be for the renamed node
		expect(addNodesSpy).toHaveBeenCalledTimes(2);
		const addedNode = addNodesSpy.mock.calls[1][0];
		expect(addedNode.name).toBe('My Node1');
	});

	it('should handle pasting multiple nodes with same names', async () => {
		const canvasOperations = useCanvasOperations();

		// 1. Setup existing node on canvas
		const existingNode = createTestNode({ name: 'My Node', type: 'n8n-nodes-base.noOp' });
		workflowDocumentStore.addNode(existingNode);

		// 2. Paste TWO nodes with the same name "My Node"
		// (Note: in a single paste operation, names are usually unique, but let's test if it handles it)
		const pastedNode1 = createTestNode({
			name: 'My Node',
			type: 'n8n-nodes-base.noOp',
			id: 'new-id-1',
		});
		const pastedNode2 = createTestNode({
			name: 'My Node',
			type: 'n8n-nodes-base.noOp',
			id: 'new-id-2',
		});
		const workflowData = {
			nodes: [pastedNode1, pastedNode2],
			connections: {},
		};

		const addNodesSpy = vi.spyOn(workflowDocumentStore, 'addNode');

		await canvasOperations.importWorkflowData(workflowData, 'paste');

		// 3. Check if BOTH pasted nodes were added and renamed differently
		// Total nodes should be 3 (1 existing + 2 pasted)
		expect(workflowDocumentStore.allNodes).toHaveLength(3);
		const names = workflowDocumentStore.allNodes.map((n) => n.name);
		expect(names).toContain('My Node');
		expect(names).toContain('My Node1');
		expect(names).toContain('My Node2');
	});
});
