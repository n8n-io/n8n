import { describe, it, expect, vi, beforeEach } from 'vitest';
import { computed, nextTick, ref } from 'vue';
import { createPinia, setActivePinia } from 'pinia';
import { mock } from 'vitest-mock-extended';
import type { INodeTypeDescription, Workflow } from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';
import { createTestNode } from '@/__tests__/mocks';
import type { INodeUi } from '@/Interface';
import type { CanvasConnectionPort } from '@/features/workflows/canvas/canvas.types';
import {
	useWorkflowDocumentRenderData,
	type WorkflowDocumentRenderDataDeps,
} from './useWorkflowDocumentRenderData';

const getNodeType = vi.fn<(type: string, version?: number) => INodeTypeDescription | null>();
const communityNodeType =
	vi.fn<(type: string) => { nodeDescription: INodeTypeDescription } | undefined>();

vi.mock('@/app/stores/nodeTypes.store', () => ({
	useNodeTypesStore: vi.fn(() => ({
		getNodeType,
		communityNodeType,
	})),
}));

const getNodeInputs = vi.fn();
vi.mock('n8n-workflow', async (importOriginal) => {
	const actual = await importOriginal<typeof import('n8n-workflow')>();
	return {
		...actual,
		NodeHelpers: {
			...actual.NodeHelpers,
			getNodeInputs: (...args: unknown[]) => getNodeInputs(...args),
		},
	};
});

function makeNode(overrides: Partial<INodeUi> = {}): INodeUi {
	return createTestNode({ name: 'Test', ...overrides }) as INodeUi;
}

function makeWorkflowObject(nodes: INodeUi[]): Workflow {
	return mock<Workflow>({
		getNode: (name: string) => nodes.find((n) => n.name === name) ?? null,
	});
}

function makeDeps(nodes: INodeUi[]) {
	const allNodesRef = ref<INodeUi[]>(nodes);
	const workflowObjectRef = ref<Workflow>(makeWorkflowObject(nodes));
	const deps: WorkflowDocumentRenderDataDeps = {
		allNodes: computed(() => allNodesRef.value ?? []),
		workflowObject:
			workflowObjectRef as unknown as WorkflowDocumentRenderDataDeps['workflowObject'],
	};
	return { deps, allNodesRef, workflowObjectRef };
}

describe('useWorkflowDocumentRenderData', () => {
	beforeEach(() => {
		setActivePinia(createPinia());
		getNodeType.mockReset();
		communityNodeType.mockReset();
		getNodeInputs.mockReset();

		// Defaults: every node has a single Main input port. Use a plain object
		// rather than `mock<INodeTypeDescription>()` because the latter returns a
		// proxy that auto-mocks every property, including `inputNames`, which
		// breaks the array-indexing in mapLegacyEndpointsToCanvasConnectionPort.
		getNodeType.mockReturnValue({ inputNames: [] } as unknown as INodeTypeDescription);
		communityNodeType.mockReturnValue(undefined);
		getNodeInputs.mockReturnValue([NodeConnectionTypes.Main]);
	});

	describe('render.nodes', () => {
		it('populates entries for initial nodes', () => {
			const nodeA = makeNode({ name: 'A' });
			const nodeB = makeNode({ name: 'B' });
			const { deps } = makeDeps([nodeA, nodeB]);

			const { render } = useWorkflowDocumentRenderData(deps);

			expect(render.nodes.size).toBe(2);
			expect(render.nodes.get(nodeA.id)?.inputs.value).toEqual([
				{ type: NodeConnectionTypes.Main, index: 0, label: undefined },
			]);
			expect(render.nodes.get(nodeB.id)?.inputs.value).toEqual([
				{ type: NodeConnectionTypes.Main, index: 0, label: undefined },
			]);
		});

		it('adds an entry when a node is added', async () => {
			const nodeA = makeNode({ name: 'A' });
			const { deps, allNodesRef } = makeDeps([nodeA]);

			const { render } = useWorkflowDocumentRenderData(deps);
			expect(render.nodes.size).toBe(1);

			const nodeB = makeNode({ name: 'B' });
			allNodesRef.value = [nodeA, nodeB];
			await nextTick();

			expect(render.nodes.size).toBe(2);
			expect(render.nodes.has(nodeB.id)).toBe(true);
		});

		it('removes an entry when a node is removed', async () => {
			const nodeA = makeNode({ name: 'A' });
			const nodeB = makeNode({ name: 'B' });
			const { deps, allNodesRef } = makeDeps([nodeA, nodeB]);

			const { render } = useWorkflowDocumentRenderData(deps);
			expect(render.nodes.size).toBe(2);

			allNodesRef.value = [nodeA];
			await nextTick();

			expect(render.nodes.size).toBe(1);
			expect(render.nodes.has(nodeB.id)).toBe(false);
		});

		it('does not write to inputs.value when the computed result is structurally equal', async () => {
			const nodeA = makeNode({ name: 'A' });
			const { deps, workflowObjectRef } = makeDeps([nodeA]);

			const { render } = useWorkflowDocumentRenderData(deps);
			const inputsRef = render.nodes.get(nodeA.id)!.inputs;
			const firstValue = inputsRef.value;

			// Trigger the watcher: replace workflowObject with an equivalent one.
			workflowObjectRef.value = makeWorkflowObject([nodeA]);
			await nextTick();

			expect(inputsRef.value).toBe(firstValue);
		});

		it('writes to inputs.value when the computed result actually changes', async () => {
			const nodeA = makeNode({ name: 'A' });
			const { deps, workflowObjectRef } = makeDeps([nodeA]);

			const { render } = useWorkflowDocumentRenderData(deps);
			const inputsRef = render.nodes.get(nodeA.id)!.inputs;
			const firstValue = inputsRef.value;
			expect(firstValue).toHaveLength(1);

			// Next computation returns a different port set.
			getNodeInputs.mockReturnValue([NodeConnectionTypes.Main, NodeConnectionTypes.AiTool]);
			workflowObjectRef.value = makeWorkflowObject([nodeA]);
			await nextTick();

			expect(inputsRef.value).not.toBe(firstValue);
			expect(inputsRef.value).toHaveLength(2);
		});

		it('falls back to community node type description', () => {
			const nodeA = makeNode({ name: 'A', type: 'community.foo' });
			getNodeType.mockReturnValue(null);
			communityNodeType.mockReturnValue({
				nodeDescription: { inputNames: [] } as unknown as INodeTypeDescription,
			});
			const { deps } = makeDeps([nodeA]);

			const { render } = useWorkflowDocumentRenderData(deps);

			expect(render.nodes.get(nodeA.id)?.inputs.value).toEqual([
				{ type: NodeConnectionTypes.Main, index: 0, label: undefined },
			]);
		});

		it('returns [] when neither core nor community node type description is available', () => {
			const nodeA = makeNode({ name: 'A' });
			getNodeType.mockReturnValue(null);
			communityNodeType.mockReturnValue(undefined);
			const { deps } = makeDeps([nodeA]);

			const { render } = useWorkflowDocumentRenderData(deps);

			expect(render.nodes.get(nodeA.id)?.inputs.value).toEqual<CanvasConnectionPort[]>([]);
		});

		it('returns [] when the workflow object does not know the node', () => {
			const nodeA = makeNode({ name: 'A' });
			const { deps, workflowObjectRef } = makeDeps([nodeA]);
			workflowObjectRef.value = mock<Workflow>({ getNode: () => null });

			const { render } = useWorkflowDocumentRenderData(deps);

			expect(render.nodes.get(nodeA.id)?.inputs.value).toEqual<CanvasConnectionPort[]>([]);
		});
	});
});
