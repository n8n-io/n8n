import { describe, it, expect, vi, beforeEach } from 'vitest';
import { computed } from 'vue';
import { setActivePinia, createPinia } from 'pinia';
import { createTestNode } from '@/__tests__/mocks';
import {
	useWorkflowDocumentStore,
	createWorkflowDocumentId,
} from '@/app/stores/workflowDocument.store';
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

describe('useWorkflowDocumentRenderData — passthroughs', () => {
	beforeEach(() => {
		setActivePinia(createPinia());
	});

	it('re-exposes workflowDocument by-id projections by identity', () => {
		const { docId, doc } = setupWorkflow('wf-pass', [{ id: 'a', name: 'Alpha' }]);
		const renderData = useWorkflowDocumentRenderData(docId);

		expect(renderData.nodeInputsByNodeId).toBe(doc.nodeInputsByNodeId);
		expect(renderData.nodeOutputsByNodeId).toBe(doc.nodeOutputsByNodeId);
		expect(renderData.pinnedDataByNodeName).toBe(doc.pinnedDataByNodeName);
		expect(renderData.pinnedDataByNodeId).toBe(doc.pinnedDataByNodeId);
		expect(renderData.nodeTypeDescriptionByNodeId).toBe(doc.nodeTypeDescriptionByNodeId);
		expect(renderData.isTriggerByNodeId).toBe(doc.isTriggerByNodeId);
		expect(renderData.subtitleByNodeId).toBe(doc.subtitleByNodeId);
		expect(renderData.simulatedNodeTypeDescriptionByNodeId).toBe(
			doc.simulatedNodeTypeDescriptionByNodeId,
		);
		expect(renderData.validationErrorsByNodeId).toBe(doc.validationErrorsByNodeId);
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
		const renderData = useWorkflowDocumentRenderData(docId);

		expect(renderData.tooltipByNodeId.has('a')).toBe(true);
		expect(renderData.tooltipByNodeId.has('b')).toBe(true);
		expect(renderData.hasIssuesByNodeId.has('a')).toBe(true);
		expect(renderData.hasIssuesByNodeId.has('b')).toBe(true);
		expect(renderData.renderTypeByNodeId.has('a')).toBe(true);
		expect(renderData.renderTypeByNodeId.has('b')).toBe(true);
	});

	it('reconciles fusion maps when a node is added', () => {
		const { docId, doc } = setupWorkflow('wf-fusion-add', [{ id: 'a', name: 'Alpha' }]);
		const renderData = useWorkflowDocumentRenderData(docId);

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
		const renderData = useWorkflowDocumentRenderData(docId);

		doc.removeNodeById('a');

		expect(renderData.tooltipByNodeId.has('a')).toBe(false);
		expect(renderData.hasIssuesByNodeId.has('a')).toBe(false);
		expect(renderData.renderTypeByNodeId.has('a')).toBe(false);
		expect(renderData.tooltipByNodeId.has('b')).toBe(true);
	});

	it('keeps hasIssuesByNodeId false for clean nodes with no execution data', () => {
		const { docId } = setupWorkflow('wf-fusion-clean', [{ id: 'a', name: 'Alpha' }]);
		const renderData = useWorkflowDocumentRenderData(docId);

		expect(renderData.hasIssuesByNodeId.get('a')?.value).toBe(false);
	});

	it('returns undefined tooltip for non-trigger nodes', () => {
		const { docId } = setupWorkflow('wf-fusion-tooltip', [{ id: 'a', name: 'Alpha' }]);
		const renderData = useWorkflowDocumentRenderData(docId);

		expect(renderData.tooltipByNodeId.get('a')?.value).toBeUndefined();
	});

	it('returns the default render type for a generic node', () => {
		const { docId } = setupWorkflow('wf-fusion-default', [{ id: 'a', name: 'Alpha' }]);
		const renderData = useWorkflowDocumentRenderData(docId);

		const render = renderData.renderTypeByNodeId.get('a')?.value;
		expect(render?.type).toBe('default');
	});

	it('returns a sticky-note render type for sticky nodes', () => {
		const { docId } = setupWorkflow('wf-fusion-sticky', [
			{ id: 's', name: 'Sticky', type: 'n8n-nodes-base.stickyNote' },
		]);
		const renderData = useWorkflowDocumentRenderData(docId);

		const render = renderData.renderTypeByNodeId.get('s')?.value;
		expect(render?.type).toBe('n8n-nodes-base.stickyNote');
	});

	it('assigns z-index entries only for sticky notes via additionalPropertiesByNodeId', () => {
		const { docId } = setupWorkflow('wf-fusion-additional', [
			{ id: 's1', name: 'Sticky1', type: 'n8n-nodes-base.stickyNote' },
			{ id: 'n1', name: 'Node1', type: 'test' },
		]);
		const renderData = useWorkflowDocumentRenderData(docId);

		const props = renderData.additionalPropertiesByNodeId.value;
		expect(props.s1).toBeDefined();
		expect(props.n1).toBeUndefined();
	});
});
