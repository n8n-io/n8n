import { describe, it, expect, vi, beforeEach } from 'vitest';
import { computed, effectScope, ref } from 'vue';
import { setActivePinia, createPinia } from 'pinia';
import type { INode } from 'n8n-workflow';
import type { INodeUi } from '@/Interface';
import {
	createTestNode,
	createTestWorkflow,
	createTestWorkflowExecutionResponse,
} from '@/__tests__/mocks';
import { STICKY_NODE_TYPE } from '@/app/constants';
import {
	useWorkflowDocumentStore,
	createWorkflowDocumentId,
	type WorkflowDocumentId,
} from '@/app/stores/workflowDocument.store';
import { useWorkflowExecutionStateStore } from '@/app/stores/workflowExecutionState.store';
import { useExecutionDataStore, createExecutionDataId } from '@/app/stores/executionData.store';
import {
	CanvasNodeDirtiness,
	type CanvasNodeDefaultRender,
	type CanvasNodeDirtinessType,
} from '@/features/workflows/canvas/canvas.types';
import { useWorkflowDocumentRenderData } from './useWorkflowDocumentRenderData';

const TEST_TRIGGER_NODE_TYPE = 'n8n-nodes-base.testTrigger';

// External-surface mocks only — node-types and dirtiness pull in unrelated
// stores that aren't needed to exercise renderData's wiring. The actual
// workflowDocument / workflowExecutionState stores stay real so reconciliation
// off `onNodesChange` is genuinely tested.
// Both consts below are only dereferenced when the mocked composables are
// *called* (inside tests, after this module's body has initialized), so the
// references are safe under vi.mock hoisting.
const dirtinessByNameOverride = ref<Record<string, CanvasNodeDirtinessType | undefined>>({});
const isConfigNodeSpy = vi.fn((..._args: unknown[]) => false);

vi.mock('@/app/composables/useNodeDirtiness', () => ({
	useNodeDirtiness: vi.fn(() => ({
		dirtinessByName: computed(() => dirtinessByNameOverride.value),
	})),
}));

vi.mock('@/app/stores/nodeTypes.store', () => ({
	useNodeTypesStore: vi.fn(() => ({
		isConfigNode: isConfigNodeSpy,
		isConfigurableNode: () => false,
		isTriggerNode: (type: string) => type === 'n8n-nodes-base.testTrigger',
		getNodeType: (type: string) =>
			type === 'n8n-nodes-base.testTrigger'
				? {
						name: 'n8n-nodes-base.testTrigger',
						displayName: 'Test Trigger',
						description: '',
						version: 1,
						defaults: {},
						group: ['trigger'],
						inputs: [],
						outputs: ['main'],
						properties: [],
					}
				: null,
		communityNodeType: () => undefined,
		getAllNodeTypes: () => [],
	})),
}));

function setupWorkflow(id: string, nodes: Array<Partial<INodeUi>> = []) {
	const docId = createWorkflowDocumentId(id, 'v1');
	const doc = useWorkflowDocumentStore(docId);
	doc.setNodes(
		nodes.map((n) =>
			createTestNode({
				id: n.id ?? `${n.name}-id`,
				name: n.name ?? 'Node',
				type: n.type ?? 'test',
				...n,
			} as Partial<INode>),
		),
	);
	return { docId, doc };
}

/**
 * Loads an execution into a per-execution data store (with a workflowData
 * snapshot providing the id↔name mapping) and marks it active on the
 * document's execution state store, so the active-execution by-id projections
 * resolve through it.
 */
function setActiveExecution(
	docId: WorkflowDocumentId,
	nodes: INode[],
	runData: Record<string, Array<Record<string, unknown>>>,
) {
	const executionId = `exec-${docId}`;
	const executionDataStore = useExecutionDataStore(createExecutionDataId(executionId));
	executionDataStore.setExecution(
		createTestWorkflowExecutionResponse({
			id: executionId,
			finished: false,
			status: 'running',
			workflowData: createTestWorkflow({ nodes }),
			data: { resultData: { runData, lastNodeExecuted: '' } } as never,
		}),
	);
	useWorkflowExecutionStateStore(docId).setActiveExecutionId(executionId);
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

describe('useWorkflowDocumentRenderData — hasIssuesByNodeId precedence', () => {
	beforeEach(() => {
		setActivePinia(createPinia());
	});

	const alpha = () => createTestNode({ id: 'a', name: 'Alpha' });

	it('reports issues when the execution status is crashed', () => {
		const { docId } = setupWorkflow('wf-issues-crashed', [{ id: 'a', name: 'Alpha' }]);
		setActiveExecution(docId, [alpha()], { Alpha: [{ executionStatus: 'crashed' }] });
		const { renderData } = createRenderData(docId);

		expect(renderData.hasIssuesByNodeId.get('a')?.value).toBe(true);
	});

	it('reports issues when the execution status is error', () => {
		const { docId } = setupWorkflow('wf-issues-error', [{ id: 'a', name: 'Alpha' }]);
		setActiveExecution(docId, [alpha()], { Alpha: [{ executionStatus: 'error' }] });
		const { renderData } = createRenderData(docId);

		expect(renderData.hasIssuesByNodeId.get('a')?.value).toBe(true);
	});

	it('reports no issues when the node has pinned data despite validation issues', () => {
		const { docId, doc } = setupWorkflow('wf-issues-pinned', [
			{ id: 'a', name: 'Alpha', issues: { typeUnknown: true } },
		]);
		doc.pinNodeData('Alpha', [{ json: {} }]);
		const { renderData } = createRenderData(docId);

		// The node genuinely has validation errors — pinned data must still win.
		expect(renderData.validationErrorsByNodeId.get('a')?.value?.length).toBeGreaterThan(0);
		expect(renderData.hasIssuesByNodeId.get('a')?.value).toBe(false);
	});

	it('reports issues for validation errors when there is no pinned data', () => {
		const { docId } = setupWorkflow('wf-issues-validation', [
			{ id: 'a', name: 'Alpha', issues: { typeUnknown: true } },
		]);
		const { renderData } = createRenderData(docId);

		expect(renderData.hasIssuesByNodeId.get('a')?.value).toBe(true);
	});

	it('reports issues when the active execution reports execution errors', () => {
		const { docId } = setupWorkflow('wf-issues-execution', [{ id: 'a', name: 'Alpha' }]);
		setActiveExecution(docId, [alpha()], {
			Alpha: [{ executionStatus: 'error', error: { message: 'boom' } }],
		});
		const { renderData } = createRenderData(docId);

		expect(renderData.hasIssuesByNodeId.get('a')?.value).toBe(true);
	});

	it('reports no issues when a successful run follows an errored one', () => {
		const { docId } = setupWorkflow('wf-issues-retry', [{ id: 'a', name: 'Alpha' }]);
		setActiveExecution(docId, [alpha()], {
			Alpha: [
				{ executionStatus: 'error', error: { message: 'boom' } },
				{ executionStatus: 'success' },
			],
		});
		const { renderData } = createRenderData(docId);

		expect(renderData.hasIssuesByNodeId.get('a')?.value).toBe(false);
	});
});

describe('useWorkflowDocumentRenderData — trigger tooltip', () => {
	beforeEach(() => {
		setActivePinia(createPinia());
	});

	function setupRunningWorkflow(id: string, nodes: Array<Partial<INodeUi>>) {
		const result = setupWorkflow(id, nodes);
		// `null` marks an execution as started with its id still pending, which
		// flips `isWorkflowRunning` without needing execution data.
		useWorkflowExecutionStateStore(result.docId).setActiveExecutionId(null);
		return result;
	}

	it('shows the waiting tooltip on the single active trigger while the workflow is running', () => {
		const { docId } = setupRunningWorkflow('wf-tooltip-shown', [
			{ id: 't', name: 'Trigger', type: TEST_TRIGGER_NODE_TYPE },
			{ id: 'a', name: 'Alpha' },
		]);
		const { renderData } = createRenderData(docId);

		expect(renderData.tooltipByNodeId.get('t')?.value).toBe(
			'Waiting for you to create an event in Test',
		);
	});

	it('does not show a tooltip when the trigger has pinned data', () => {
		const { docId, doc } = setupRunningWorkflow('wf-tooltip-pinned', [
			{ id: 't', name: 'Trigger', type: TEST_TRIGGER_NODE_TYPE },
		]);
		doc.pinNodeData('Trigger', [{ json: {} }]);
		const { renderData } = createRenderData(docId);

		expect(renderData.tooltipByNodeId.get('t')?.value).toBeUndefined();
	});

	it('does not show a tooltip when the workflow is not running', () => {
		const { docId } = setupWorkflow('wf-tooltip-idle', [
			{ id: 't', name: 'Trigger', type: TEST_TRIGGER_NODE_TYPE },
		]);
		const { renderData } = createRenderData(docId);

		expect(renderData.tooltipByNodeId.get('t')?.value).toBeUndefined();
	});

	it('does not show a tooltip on disabled triggers', () => {
		const { docId } = setupRunningWorkflow('wf-tooltip-disabled', [
			{ id: 't', name: 'Trigger', type: TEST_TRIGGER_NODE_TYPE, disabled: true },
		]);
		const { renderData } = createRenderData(docId);

		expect(renderData.tooltipByNodeId.get('t')?.value).toBeUndefined();
	});

	it('suppresses tooltips when multiple triggers are active and the driving trigger is unknown', () => {
		const { docId } = setupRunningWorkflow('wf-tooltip-multi', [
			{ id: 't1', name: 'Trigger 1', type: TEST_TRIGGER_NODE_TYPE },
			{ id: 't2', name: 'Trigger 2', type: TEST_TRIGGER_NODE_TYPE },
		]);
		const { renderData } = createRenderData(docId);

		expect(renderData.tooltipByNodeId.get('t1')?.value).toBeUndefined();
		expect(renderData.tooltipByNodeId.get('t2')?.value).toBeUndefined();
	});
});

describe('useWorkflowDocumentRenderData — sticky z-index ordering', () => {
	beforeEach(() => {
		setActivePinia(createPinia());
	});

	// Grid-aligned positions so the document store's snap-to-grid is a no-op
	// and the overlap geometry below is exact.
	function sticky(id: string, position: [number, number], size: number): Partial<INodeUi> {
		return {
			id,
			name: `Sticky ${id}`,
			type: STICKY_NODE_TYPE,
			position,
			parameters: { width: size, height: size },
		};
	}

	it('assigns the base z-index to a single sticky', () => {
		const { docId } = setupWorkflow('wf-sticky-single', [sticky('s1', [0, 0], 100)]);
		const { renderData } = createRenderData(docId);

		expect(renderData.additionalPropertiesByNodeId.value.s1).toEqual({
			style: { zIndex: -100 },
		});
	});

	it('assigns sequential z-indexes to non-overlapping stickies', () => {
		const { docId } = setupWorkflow('wf-sticky-apart', [
			sticky('s1', [0, 0], 100),
			sticky('s2', [320, 320], 100),
		]);
		const { renderData } = createRenderData(docId);

		const props = renderData.additionalPropertiesByNodeId.value;
		expect(props.s1).toEqual({ style: { zIndex: -100 } });
		expect(props.s2).toEqual({ style: { zIndex: -99 } });
	});

	it('raises a smaller sticky above a larger overlapping one', () => {
		const { docId } = setupWorkflow('wf-sticky-overlap', [
			sticky('small', [48, 48], 100),
			sticky('large', [0, 0], 160),
		]);
		const { renderData } = createRenderData(docId);

		const props = renderData.additionalPropertiesByNodeId.value;
		expect(props.large).toEqual({ style: { zIndex: -100 } });
		expect(props.small).toEqual({ style: { zIndex: -99 } });
	});

	it('orders multiple overlapping stickies by area with smaller ones on top', () => {
		const { docId } = setupWorkflow('wf-sticky-multi', [
			sticky('s1', [0, 0], 100),
			sticky('s2', [32, 32], 50),
			sticky('s3', [48, 48], 100),
		]);
		const { renderData } = createRenderData(docId);

		const props = renderData.additionalPropertiesByNodeId.value;
		expect(props.s1).toEqual({ style: { zIndex: -100 } });
		expect(props.s2).toEqual({ style: { zIndex: -98 } });
		expect(props.s3).toEqual({ style: { zIndex: -99 } });
	});
});

describe('useWorkflowDocumentRenderData — lifecycle', () => {
	beforeEach(() => {
		setActivePinia(createPinia());
	});

	it('constructs without inject() warnings outside a component context', () => {
		// Production constructs this composable in detached effect scopes (watch
		// callbacks in WorkflowCanvas.vue / useWorkflowDiff.ts), where Vue's
		// inject() is unavailable. Nothing in the construction path may inject.
		const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
		try {
			const { docId } = setupWorkflow('wf-inject', [{ id: 'a', name: 'Alpha' }]);
			createRenderData(docId);
			const warnings = warnSpy.mock.calls.flat().filter((arg) => typeof arg === 'string');
			expect(warnings.join('\n')).not.toContain('inject() can only be used');
		} finally {
			warnSpy.mockRestore();
		}
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

describe('useWorkflowDocumentRenderData — per-node dirtiness gating', () => {
	beforeEach(() => {
		setActivePinia(createPinia());
		dirtinessByNameOverride.value = {};
	});

	it('propagates a node dirtiness change into its render type options', () => {
		const { docId } = setupWorkflow('wf-dirtiness-propagate', [{ id: 'a', name: 'Alpha' }]);
		const { renderData } = createRenderData(docId);
		const renderA = () => renderData.renderTypeByNodeId.get('a')?.value as CanvasNodeDefaultRender;

		expect(renderA().options.dirtiness).toBeUndefined();

		dirtinessByNameOverride.value = { Alpha: CanvasNodeDirtiness.PARAMETERS_UPDATED };
		expect(renderA().options.dirtiness).toBe(CanvasNodeDirtiness.PARAMETERS_UPDATED);

		dirtinessByNameOverride.value = {};
		expect(renderA().options.dirtiness).toBeUndefined();
	});

	it('does not re-evaluate render types of nodes whose dirtiness is unchanged', () => {
		const { docId } = setupWorkflow('wf-dirtiness-isolation', [
			{ id: 'a', name: 'Alpha' },
			{ id: 'b', name: 'Beta' },
		]);
		const { renderData } = createRenderData(docId);

		const initialA = renderData.renderTypeByNodeId.get('a')?.value;
		const initialB = renderData.renderTypeByNodeId.get('b')?.value;
		// `isConfigNode` runs once per default-render-type evaluation with the
		// node as its second argument, so calls attribute evaluations per node.
		const betaEvaluations = () =>
			isConfigNodeSpy.mock.calls.filter((call) => (call[1] as INodeUi).id === 'b').length;
		const betaEvaluationsBefore = betaEvaluations();

		dirtinessByNameOverride.value = { Alpha: CanvasNodeDirtiness.PARAMETERS_UPDATED };

		// Alpha's dirtiness changed: its entry re-evaluates to a new value.
		const updatedA = renderData.renderTypeByNodeId.get('a')?.value;
		expect(updatedA).not.toBe(initialA);
		expect((updatedA as CanvasNodeDefaultRender).options.dirtiness).toBe(
			CanvasNodeDirtiness.PARAMETERS_UPDATED,
		);

		// Beta's dirtiness is unchanged: identity is kept AND — the actual
		// regression guard, since the render entry's isEqual gate alone would
		// preserve identity even after a wasted re-evaluation — its compute
		// body never re-ran.
		expect(renderData.renderTypeByNodeId.get('b')?.value).toBe(initialB);
		expect(betaEvaluations()).toBe(betaEvaluationsBefore);
	});
});
