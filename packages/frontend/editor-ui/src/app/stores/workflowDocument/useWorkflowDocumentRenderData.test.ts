import { describe, it, expect, vi, beforeEach } from 'vitest';
import { computed, effectScope } from 'vue';
import { setActivePinia, createPinia } from 'pinia';
import { createTestNode } from '@/__tests__/mocks';
import {
	useWorkflowDocumentStore,
	createWorkflowDocumentId,
	type WorkflowDocumentId,
} from '@/app/stores/workflowDocument.store';
import { useWorkflowExecutionStateStore } from '@/app/stores/workflowExecutionState.store';
import { useWorkflowDocumentRenderData } from './useWorkflowDocumentRenderData';

// External-surface mocks only — node-types and dirtiness pull in unrelated
// stores that aren't needed to exercise renderData's wiring. The actual
// workflowDocument / workflowExecutionState stores stay real so reconciliation
// off `onNodesChange` is genuinely tested.
vi.mock('@/app/composables/useNodeDirtiness', () => ({
	useNodeDirtiness: vi.fn(() => ({ dirtinessByName: computed(() => ({})) })),
}));

vi.mock('@/app/stores/nodeTypes.store', () => ({
	useNodeTypesStore: vi.fn(() => ({
		isConfigNode: () => false,
		isConfigurableNode: () => false,
		isTriggerNode: () => false,
		getNodeType: () => null,
		communityNodeType: () => undefined,
		getAllNodeTypes: () => [],
	})),
}));

function setupWorkflow(
	id: string,
	nodes: Array<Partial<{ id: string; name: string; type: string }>> = [],
) {
	const docId = createWorkflowDocumentId(id, 'v1');
	const doc = useWorkflowDocumentStore(docId);
	doc.setNodes(
		nodes.map((n) =>
			createTestNode({
				id: n.id ?? `${n.name}-id`,
				name: n.name ?? 'Node',
				type: n.type ?? 'test',
			}),
		),
	);
	return { docId, doc };
}

// The composable is side-effectful and registers `onScopeDispose`, so it must
// run inside an `effectScope` (as it does in production). The returned `scope`
// lets a test exercise teardown via `scope.stop()`.
function createRenderData(docId: WorkflowDocumentId) {
	const scope = effectScope();
	const renderData = scope.run(() => useWorkflowDocumentRenderData(docId))!;
	return { renderData, scope };
}

describe('useWorkflowDocumentRenderData — passthroughs', () => {
	beforeEach(() => {
		setActivePinia(createPinia());
	});

	it('re-exposes workflowDocument by-id projections by identity', () => {
		const { docId, doc } = setupWorkflow('wf-pass', [{ id: 'a', name: 'Alpha' }]);
		const { renderData } = createRenderData(docId);

		expect(renderData.nodeInputsByNodeId).toBe(doc.nodeInputsByNodeId);
		expect(renderData.nodeOutputsByNodeId).toBe(doc.nodeOutputsByNodeId);
		expect(renderData.pinnedDataByNodeName).toBe(doc.pinnedDataByNodeName);
		expect(renderData.pinnedDataByNodeId).toBe(doc.pinnedDataByNodeId);
		expect(renderData.validationErrorsByNodeId).toBe(doc.validationErrorsByNodeId);
	});

	it('owns per-node-id node-type derivation maps locally', () => {
		const { docId } = setupWorkflow('wf-nodetype-info', [{ id: 'a', name: 'Alpha' }]);
		const { renderData } = createRenderData(docId);

		expect(renderData.nodeTypeDescriptionByNodeId.has('a')).toBe(true);
		expect(renderData.isTriggerByNodeId.has('a')).toBe(true);
		expect(renderData.subtitleByNodeId.has('a')).toBe(true);
		expect(renderData.simulatedNodeTypeDescriptionByNodeId.has('a')).toBe(true);
	});
});

describe('useWorkflowDocumentRenderData — fusion projections', () => {
	beforeEach(() => {
		setActivePinia(createPinia());
	});

	it('initializes fusion maps for nodes present at construction time', () => {
		const { docId } = setupWorkflow('wf-fusion-init', [
			{ id: 'a', name: 'Alpha' },
			{ id: 'b', name: 'Beta' },
		]);
		const { renderData } = createRenderData(docId);

		expect(renderData.tooltipByNodeId.has('a')).toBe(true);
		expect(renderData.tooltipByNodeId.has('b')).toBe(true);
		expect(renderData.hasIssuesByNodeId.has('a')).toBe(true);
		expect(renderData.hasIssuesByNodeId.has('b')).toBe(true);
		expect(renderData.renderTypeByNodeId.has('a')).toBe(true);
		expect(renderData.renderTypeByNodeId.has('b')).toBe(true);
	});

	it('reconciles fusion maps when a node is added', () => {
		const { docId, doc } = setupWorkflow('wf-fusion-add', [{ id: 'a', name: 'Alpha' }]);
		const { renderData } = createRenderData(docId);

		doc.addNode(createTestNode({ id: 'b', name: 'Beta', type: 'test' }));

		expect(renderData.tooltipByNodeId.has('b')).toBe(true);
		expect(renderData.hasIssuesByNodeId.has('b')).toBe(true);
		expect(renderData.renderTypeByNodeId.has('b')).toBe(true);
	});

	it('reconciles fusion maps when a node is removed', () => {
		const { docId, doc } = setupWorkflow('wf-fusion-remove', [
			{ id: 'a', name: 'Alpha' },
			{ id: 'b', name: 'Beta' },
		]);
		const { renderData } = createRenderData(docId);

		doc.removeNodeById('a');

		expect(renderData.tooltipByNodeId.has('a')).toBe(false);
		expect(renderData.hasIssuesByNodeId.has('a')).toBe(false);
		expect(renderData.renderTypeByNodeId.has('a')).toBe(false);
		expect(renderData.tooltipByNodeId.has('b')).toBe(true);
	});

	it('keeps hasIssuesByNodeId false for clean nodes with no execution data', () => {
		const { docId } = setupWorkflow('wf-fusion-clean', [{ id: 'a', name: 'Alpha' }]);
		const { renderData } = createRenderData(docId);

		expect(renderData.hasIssuesByNodeId.get('a')?.value).toBe(false);
	});

	it('returns undefined tooltip for non-trigger nodes', () => {
		const { docId } = setupWorkflow('wf-fusion-tooltip', [{ id: 'a', name: 'Alpha' }]);
		const { renderData } = createRenderData(docId);

		expect(renderData.tooltipByNodeId.get('a')?.value).toBeUndefined();
	});

	it('returns the default render type for a generic node', () => {
		const { docId } = setupWorkflow('wf-fusion-default', [{ id: 'a', name: 'Alpha' }]);
		const { renderData } = createRenderData(docId);

		const render = renderData.renderTypeByNodeId.get('a')?.value;
		expect(render?.type).toBe('default');
	});

	it('returns a sticky-note render type for sticky nodes', () => {
		const { docId } = setupWorkflow('wf-fusion-sticky', [
			{ id: 's', name: 'Sticky', type: 'n8n-nodes-base.stickyNote' },
		]);
		const { renderData } = createRenderData(docId);

		const render = renderData.renderTypeByNodeId.get('s')?.value;
		expect(render?.type).toBe('n8n-nodes-base.stickyNote');
	});

	it('assigns z-index entries only for sticky notes via additionalPropertiesByNodeId', () => {
		const { docId } = setupWorkflow('wf-fusion-additional', [
			{ id: 's1', name: 'Sticky1', type: 'n8n-nodes-base.stickyNote' },
			{ id: 'n1', name: 'Node1', type: 'test' },
		]);
		const { renderData } = createRenderData(docId);

		const props = renderData.additionalPropertiesByNodeId.value;
		expect(props.s1).toBeDefined();
		expect(props.n1).toBeUndefined();
	});
});

describe('useWorkflowDocumentRenderData — lifecycle', () => {
	beforeEach(() => {
		setActivePinia(createPinia());
	});

	it('stops reconciling once its scope is disposed', () => {
		const { docId, doc } = setupWorkflow('wf-teardown', [{ id: 'a', name: 'Alpha' }]);
		const { renderData, scope } = createRenderData(docId);

		expect(renderData.renderTypeByNodeId.has('a')).toBe(true);

		scope.stop();
		doc.addNode(createTestNode({ id: 'b', name: 'Beta', type: 'test' }));

		// The `onNodesChange` subscription was removed on teardown, so the node
		// added after disposal is not reconciled into the maps.
		expect(renderData.renderTypeByNodeId.has('b')).toBe(false);
		expect(renderData.tooltipByNodeId.has('b')).toBe(false);
		expect(renderData.hasIssuesByNodeId.has('b')).toBe(false);
	});

	it('exposes active-execution projections as live getters, not captured snapshots', () => {
		const { docId } = setupWorkflow('wf-fresh', [{ id: 'a', name: 'Alpha' }]);
		const { renderData } = createRenderData(docId);
		const executionStateStore = useWorkflowExecutionStateStore(docId);

		// With no execution, the getter resolves to the store's current map.
		const emptyMap = renderData.executionStatusByNodeId;
		expect(emptyMap).toBe(executionStateStore.activeExecutionStatusByNodeId);

		// Swapping the resolved execution changes the source map identity; the
		// getter must reflect the new map rather than a value captured at setup.
		executionStateStore.setActiveExecutionId('exec-fresh');
		expect(renderData.executionStatusByNodeId).toBe(
			executionStateStore.activeExecutionStatusByNodeId,
		);
		expect(renderData.executionStatusByNodeId).not.toBe(emptyMap);
	});

	it('exposes pinnedDataByNodeName as a live getter that computeds track across pin/unpin', () => {
		const { docId, doc } = setupWorkflow('wf-pin-live', [{ id: 'a', name: 'Alpha' }]);
		const { renderData } = createRenderData(docId);

		// Mirrors the canvas pin-badge computed in CanvasNodeStatusIcons /
		// CanvasNodeDefault: `!!renderData.value.pinnedDataByNodeName[name]`.
		const hasPinnedData = computed(() => !!renderData.pinnedDataByNodeName.Alpha);
		expect(hasPinnedData.value).toBe(false);

		// Pin mutations replace the store ref's value; a snapshot captured at
		// setup would keep returning the pre-pin object and the computed would
		// never invalidate.
		doc.pinNodeData('Alpha', [{ json: { value: 1 } }]);
		expect(hasPinnedData.value).toBe(true);

		doc.unpinNodeData('Alpha');
		expect(hasPinnedData.value).toBe(false);
	});
});
