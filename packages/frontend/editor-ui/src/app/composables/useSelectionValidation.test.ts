import { setActivePinia } from 'pinia';
import { createTestingPinia } from '@pinia/testing';
import { NodeConnectionTypes } from 'n8n-workflow';
import type { IConnections, INodeTypeDescription } from 'n8n-workflow';

import { useSelectionValidation } from './useSelectionValidation';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import {
	createWorkflowDocumentId,
	useWorkflowDocumentStore,
} from '@/app/stores/workflowDocument.store';
import type { INodeUi } from '@/Interface';

const TEST_WF_ID = 'test-wf-validation';

function makeNode(overrides: Partial<INodeUi> = {}): INodeUi {
	return {
		id: overrides.id ?? overrides.name ?? 'a',
		name: overrides.name ?? overrides.id ?? 'a',
		type: overrides.type ?? 'n8n-nodes-base.set',
		typeVersion: overrides.typeVersion ?? 1,
		position: overrides.position ?? [0, 0],
		parameters: overrides.parameters ?? {},
		...overrides,
	} as INodeUi;
}

function makeNodeType(overrides: Partial<INodeTypeDescription> = {}): INodeTypeDescription {
	return {
		displayName: overrides.displayName ?? 'Set',
		name: overrides.name ?? 'n8n-nodes-base.set',
		group: overrides.group ?? ['transform'],
		version: overrides.version ?? 1,
		description: overrides.description ?? '',
		defaults: overrides.defaults ?? { name: 'Set' },
		inputs: overrides.inputs ?? ['main'],
		outputs: overrides.outputs ?? ['main'],
		properties: overrides.properties ?? [],
		...overrides,
	};
}

type LinearGraphFixture = {
	nodes: Record<string, INodeUi>;
	connections: IConnections;
};

function makeLinearGraph(): LinearGraphFixture {
	const a = makeNode({ id: 'a', name: 'A' });
	const b = makeNode({ id: 'b', name: 'B' });
	const c = makeNode({ id: 'c', name: 'C' });

	const connections: IConnections = {
		A: { main: [[{ node: 'B', type: 'main', index: 0 }]] },
		B: { main: [[{ node: 'C', type: 'main', index: 0 }]] },
	};
	return {
		nodes: { a, b, c },
		connections,
	};
}

function setupGraph(graph: LinearGraphFixture, nodeTypes: Record<string, INodeTypeDescription>) {
	const workflowDocumentStore = useWorkflowDocumentStore(createWorkflowDocumentId(TEST_WF_ID));
	const nodeTypesStore = useNodeTypesStore();

	const nodesById = new Map<string, INodeUi>();
	const nodesByName = new Map<string, INodeUi>();
	for (const node of Object.values(graph.nodes)) {
		nodesById.set(node.id, node);
		nodesByName.set(node.name, node);
	}

	vi.spyOn(workflowDocumentStore, 'getNodeById').mockImplementation((id: string) =>
		nodesById.get(id),
	);
	vi.spyOn(workflowDocumentStore, 'getNodeByName').mockImplementation(
		(name: string) => nodesByName.get(name) ?? null,
	);
	vi.spyOn(workflowDocumentStore, 'connectionsBySourceNode', 'get').mockReturnValue(
		graph.connections,
	);
	vi.spyOn(workflowDocumentStore, 'getExpressionHandler').mockReturnValue({
		// only the shape is required for NodeHelpers.getNodeInputs/Outputs
		getSimpleParameterValue: () => undefined,
	} as unknown as ReturnType<typeof workflowDocumentStore.getExpressionHandler>);

	vi.spyOn(workflowDocumentStore, 'getParentNodes').mockImplementation(() => []);

	// `getNodeType` and `isTriggerNode` are Pinia computeds exposed as getters
	// on the store proxy. The store type doesn't admit them in the
	// spyOn-on-getter key union, so we widen with `as any` for the spy.
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	vi.spyOn(nodeTypesStore as any, 'getNodeType', 'get').mockReturnValue(
		(type: string) => nodeTypes[type] ?? null,
	);
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	vi.spyOn(nodeTypesStore as any, 'isTriggerNode', 'get').mockReturnValue(
		(type: string) => !!nodeTypes[type]?.group.includes('trigger'),
	);
}

describe('useSelectionValidation', () => {
	beforeEach(() => {
		setActivePinia(createTestingPinia({ stubActions: false }));
		useWorkflowsStore().workflowId = TEST_WF_ID;
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('returns valid for a 2-node connected non-trigger selection', () => {
		const graph = makeLinearGraph();
		const nodeTypes: Record<string, INodeTypeDescription> = {
			'n8n-nodes-base.set': makeNodeType({ name: 'n8n-nodes-base.set' }),
		};
		setupGraph(graph, nodeTypes);

		const { isSelectionGroupable } = useSelectionValidation();
		const result = isSelectionGroupable(['a', 'b']);

		expect(result.valid).toBe(true);
	});

	it('returns too-few-nodes for a single-node selection', () => {
		const graph = makeLinearGraph();
		setupGraph(graph, {
			'n8n-nodes-base.set': makeNodeType({ name: 'n8n-nodes-base.set' }),
		});

		const { isSelectionGroupable } = useSelectionValidation();
		const result = isSelectionGroupable(['a']);

		expect(result).toEqual({ valid: false, reason: 'too-few-nodes' });
	});

	it('returns trigger-selected when a trigger is part of the selection', () => {
		const graph = makeLinearGraph();
		graph.nodes.a.type = 'n8n-nodes-base.manualTrigger';
		const nodeTypes: Record<string, INodeTypeDescription> = {
			'n8n-nodes-base.manualTrigger': makeNodeType({
				name: 'n8n-nodes-base.manualTrigger',
				group: ['trigger'],
			}),
			'n8n-nodes-base.set': makeNodeType({ name: 'n8n-nodes-base.set' }),
		};
		setupGraph(graph, nodeTypes);

		const { isSelectionGroupable } = useSelectionValidation();
		const result = isSelectionGroupable(['a', 'b']);

		expect(result.valid).toBe(false);
		if (!result.valid) {
			expect(result.reason).toBe('trigger-selected');
			if (result.reason === 'trigger-selected') {
				expect(result.triggers).toEqual(['A']);
			}
		}
	});

	it('returns invalid-subgraph when the selection skips an intermediate node', () => {
		// A → B → C; selecting only A and C leaves B (on the path) outside the
		// selection, so the subgraph parser rejects the selection.
		const graph = makeLinearGraph();
		setupGraph(graph, {
			'n8n-nodes-base.set': makeNodeType({ name: 'n8n-nodes-base.set' }),
		});

		const { isSelectionGroupable } = useSelectionValidation();
		const result = isSelectionGroupable(['a', 'c']);

		expect(result.valid).toBe(false);
	});

	it('returns invalid-subgraph when selected nodes are disconnected', () => {
		const a = makeNode({ id: 'a', name: 'A' });
		const b = makeNode({ id: 'b', name: 'B' });
		setupGraph(
			{ nodes: { a, b }, connections: {} },
			{ 'n8n-nodes-base.set': makeNodeType({ name: 'n8n-nodes-base.set' }) },
		);

		const { isSelectionGroupable } = useSelectionValidation();
		const result = isSelectionGroupable(['a', 'b']);

		expect(result.valid).toBe(false);
		if (!result.valid) {
			expect(result.reason).toBe('invalid-subgraph');
		}
	});

	it('validates against candidate connections when provided', () => {
		const graph = makeLinearGraph();
		setupGraph(graph, {
			'n8n-nodes-base.set': makeNodeType({ name: 'n8n-nodes-base.set' }),
		});

		const candidateConnections: IConnections = {
			...graph.connections,
			C: { main: [[{ node: 'B', type: 'main', index: 0 }]] },
		};

		const { isSelectionGroupable } = useSelectionValidation();
		expect(isSelectionGroupable(['a', 'b']).valid).toBe(true);

		const result = isSelectionGroupable(['a', 'b'], candidateConnections);

		expect(result.valid).toBe(false);
		if (!result.valid) {
			expect(result.reason).toBe('invalid-subgraph');
		}
	});

	describe('expandSelectionWithSubNodes', () => {
		it('returns the input ids unchanged when no node has sub-nodes', () => {
			const graph = makeLinearGraph();
			setupGraph(graph, {
				'n8n-nodes-base.set': makeNodeType({ name: 'n8n-nodes-base.set' }),
			});

			const { expandSelectionWithSubNodes } = useSelectionValidation();
			expect(expandSelectionWithSubNodes(['a', 'b'])).toEqual(['a', 'b']);
		});

		it('adds non-main parent ids (sub-nodes) of each selected node', () => {
			const graph = makeLinearGraph();
			const memory = makeNode({ id: 'memory', name: 'Memory' });
			const tool = makeNode({ id: 'tool', name: 'Tool' });
			graph.nodes.memory = memory;
			graph.nodes.tool = tool;

			setupGraph(graph, {
				'n8n-nodes-base.set': makeNodeType({ name: 'n8n-nodes-base.set' }),
			});

			const workflowDocumentStore = useWorkflowDocumentStore(createWorkflowDocumentId(TEST_WF_ID));
			vi.mocked(workflowDocumentStore.getParentNodes).mockImplementation((nodeName, type) => {
				if (type !== 'ALL_NON_MAIN') return [];
				if (nodeName === 'B') return ['Memory', 'Tool'];
				return [];
			});

			const { expandSelectionWithSubNodes } = useSelectionValidation();
			expect(expandSelectionWithSubNodes(['a', 'b']).sort()).toEqual(
				['a', 'b', 'memory', 'tool'].sort(),
			);
		});

		it('deduplicates sub-nodes shared between selected nodes', () => {
			const graph = makeLinearGraph();
			const memory = makeNode({ id: 'memory', name: 'Memory' });
			graph.nodes.memory = memory;
			setupGraph(graph, {
				'n8n-nodes-base.set': makeNodeType({ name: 'n8n-nodes-base.set' }),
			});

			const workflowDocumentStore = useWorkflowDocumentStore(createWorkflowDocumentId(TEST_WF_ID));
			vi.mocked(workflowDocumentStore.getParentNodes).mockImplementation((nodeName, type) => {
				if (type !== 'ALL_NON_MAIN') return [];
				if (nodeName === 'A' || nodeName === 'B') return ['Memory'];
				return [];
			});

			const { expandSelectionWithSubNodes } = useSelectionValidation();
			expect(expandSelectionWithSubNodes(['a', 'b']).sort()).toEqual(['a', 'b', 'memory'].sort());
		});
	});

	it('treats sub-node-augmented selections as groupable', () => {
		// A → B with B owning a Memory sub-node; selecting {A, B} should expand
		// to {A, B, Memory} and still validate, because the non-main edge is
		// contained within the group.
		const graph = makeLinearGraph();
		const memory = makeNode({ id: 'memory', name: 'Memory' });
		graph.nodes.memory = memory;
		// Memory has an ai_memory output flowing into B.
		graph.connections.Memory = { ai_memory: [[{ node: 'B', type: 'ai_memory', index: 0 }]] };

		setupGraph(graph, {
			'n8n-nodes-base.set': makeNodeType({ name: 'n8n-nodes-base.set' }),
		});

		const workflowDocumentStore = useWorkflowDocumentStore(createWorkflowDocumentId(TEST_WF_ID));
		vi.mocked(workflowDocumentStore.getParentNodes).mockImplementation((nodeName, type) => {
			if (type !== 'ALL_NON_MAIN') return [];
			if (nodeName === 'B') return ['Memory'];
			return [];
		});

		const { isSelectionGroupable, expandSelectionWithSubNodes } = useSelectionValidation();
		const expanded = expandSelectionWithSubNodes(['a', 'b']);
		const result = isSelectionGroupable(expanded);

		expect(result.valid).toBe(true);
	});

	it('rejects grouping when an included sub-node is connected to a main node outside the group', () => {
		const graph = makeLinearGraph();
		const model = makeNode({ id: 'model', name: 'Model' });
		graph.nodes.model = model;
		graph.connections.Model = {
			[NodeConnectionTypes.AiLanguageModel]: [
				[
					{ node: 'B', type: NodeConnectionTypes.AiLanguageModel, index: 0 },
					{ node: 'C', type: NodeConnectionTypes.AiLanguageModel, index: 0 },
				],
			],
		};

		setupGraph(graph, {
			'n8n-nodes-base.set': makeNodeType({ name: 'n8n-nodes-base.set' }),
		});

		const { isSelectionExtractable, isSelectionGroupable } = useSelectionValidation();

		expect(isSelectionExtractable(['a', 'b', 'model']).valid).toBe(true);
		const result = isSelectionGroupable(['a', 'b', 'model']);

		expect(result.valid).toBe(false);
		if (!result.valid) {
			expect(result.reason).toBe('non-main-boundary');
		}
	});

	it('allows grouping a shared sub-node when every non-main consumer is inside the group', () => {
		const graph = makeLinearGraph();
		const model = makeNode({ id: 'model', name: 'Model' });
		graph.nodes.model = model;
		graph.connections.Model = {
			[NodeConnectionTypes.AiLanguageModel]: [
				[
					{ node: 'B', type: NodeConnectionTypes.AiLanguageModel, index: 0 },
					{ node: 'C', type: NodeConnectionTypes.AiLanguageModel, index: 0 },
				],
			],
		};

		setupGraph(graph, {
			'n8n-nodes-base.set': makeNodeType({ name: 'n8n-nodes-base.set' }),
		});

		const { isSelectionGroupable } = useSelectionValidation();
		const result = isSelectionGroupable(['a', 'b', 'c', 'model']);

		expect(result.valid).toBe(true);
	});

	it('validates non-main group boundaries against candidate connections', () => {
		const graph = makeLinearGraph();
		const model = makeNode({ id: 'model', name: 'Model' });
		graph.nodes.model = model;
		graph.connections.Model = {
			[NodeConnectionTypes.AiLanguageModel]: [
				[{ node: 'B', type: NodeConnectionTypes.AiLanguageModel, index: 0 }],
			],
		};

		setupGraph(graph, {
			'n8n-nodes-base.set': makeNodeType({ name: 'n8n-nodes-base.set' }),
		});

		const candidateConnections: IConnections = {
			...graph.connections,
			Model: {
				[NodeConnectionTypes.AiLanguageModel]: [
					[
						{ node: 'B', type: NodeConnectionTypes.AiLanguageModel, index: 0 },
						{ node: 'C', type: NodeConnectionTypes.AiLanguageModel, index: 0 },
					],
				],
			},
		};

		const { isSelectionGroupable } = useSelectionValidation();
		expect(isSelectionGroupable(['a', 'b', 'model']).valid).toBe(true);

		const result = isSelectionGroupable(['a', 'b', 'model'], candidateConnections);

		expect(result.valid).toBe(false);
		if (!result.valid) {
			expect(result.reason).toBe('non-main-boundary');
		}
	});

	it('returns multiple-output-branches for an end node with multiple main outputs', () => {
		const graph = makeLinearGraph();
		const nodeTypes: Record<string, INodeTypeDescription> = {
			'n8n-nodes-base.set': makeNodeType({ name: 'n8n-nodes-base.set' }),
			'n8n-nodes-base.if': makeNodeType({
				name: 'n8n-nodes-base.if',
				outputs: ['main', 'main'],
			}),
		};
		graph.nodes.b.type = 'n8n-nodes-base.if';
		setupGraph(graph, nodeTypes);

		const { isSelectionGroupable } = useSelectionValidation();
		const result = isSelectionGroupable(['a', 'b']);

		expect(result.valid).toBe(false);
		if (!result.valid) {
			expect(result.reason).toBe('multiple-output-branches');
		}
	});
});
