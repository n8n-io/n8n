import { describe, it, expect, vi, beforeEach } from 'vitest';
import { reactive, shallowReactive, shallowRef, type ComputedRef } from 'vue';
import { setActivePinia, createPinia, getActivePinia } from 'pinia';
import type { IPinData } from 'n8n-workflow';
import type { CanvasConnectionPort } from '@/features/workflows/canvas/canvas.types';
import {
	useWorkflowDocumentStore,
	createWorkflowDocumentId,
} from '@/app/stores/workflowDocument.store';
import { useWorkflowExecutionStateStore } from '@/app/stores/workflowExecutionState.store';
import {
	useWorkflowDocumentRenderDataStore,
	disposeWorkflowDocumentRenderDataStore,
} from './workflowDocumentRenderData.store';

const nodeInputsByNodeId = shallowReactive(new Map<string, ComputedRef<CanvasConnectionPort[]>>());
const nodeOutputsByNodeId = shallowReactive(new Map<string, ComputedRef<CanvasConnectionPort[]>>());
const pinnedDataByNodeName = shallowRef<IPinData>({});
const executionIssuesByNodeName = shallowRef(new Map<string, ComputedRef<string[]>>());

// The mocks are `reactive` objects holding refs for the swappable fields, to
// mirror how Pinia stores unwrap refs on property access and to let the
// render-data store's computeds track identity replacements.
vi.mock('@/app/stores/workflowDocument.store', async (importOriginal) => {
	const actual = await importOriginal<typeof import('@/app/stores/workflowDocument.store')>();
	return {
		...actual,
		useWorkflowDocumentStore: vi.fn(() =>
			reactive({
				workflowId: 'wf-1',
				nodeInputsByNodeId,
				nodeOutputsByNodeId,
				pinnedDataByNodeName,
			}),
		),
	};
});

vi.mock('@/app/stores/workflowExecutionState.store', () => ({
	useWorkflowExecutionStateStore: vi.fn(() =>
		reactive({
			activeExecutionIssuesByNodeName: executionIssuesByNodeName,
		}),
	),
}));

describe('useWorkflowDocumentRenderDataStore', () => {
	beforeEach(() => {
		setActivePinia(createPinia());
		pinnedDataByNodeName.value = {};
		executionIssuesByNodeName.value = new Map();
		vi.mocked(useWorkflowDocumentStore).mockClear();
		vi.mocked(useWorkflowExecutionStateStore).mockClear();
	});

	it('returns the same store instance for repeated calls with the same document id', () => {
		const documentId = createWorkflowDocumentId('wf-1');

		const first = useWorkflowDocumentRenderDataStore(documentId);
		const second = useWorkflowDocumentRenderDataStore(documentId);

		expect(second).toBe(first);
		expect(useWorkflowDocumentStore).toHaveBeenCalledTimes(1);
		expect(useWorkflowExecutionStateStore).toHaveBeenCalledTimes(1);
	});

	it('returns distinct store instances for different document ids', () => {
		const first = useWorkflowDocumentRenderDataStore(createWorkflowDocumentId('wf-1'));
		const second = useWorkflowDocumentRenderDataStore(createWorkflowDocumentId('wf-2'));

		expect(second).not.toBe(first);
	});

	it('passes through nodeInputsByNodeId and nodeOutputsByNodeId by reference', () => {
		const renderData = useWorkflowDocumentRenderDataStore(createWorkflowDocumentId('wf-1'));

		expect(renderData.nodeInputsByNodeId).toBe(nodeInputsByNodeId);
		expect(renderData.nodeOutputsByNodeId).toBe(nodeOutputsByNodeId);
	});

	it('exposes the current pinnedDataByNodeName after its identity is replaced', () => {
		const renderData = useWorkflowDocumentRenderDataStore(createWorkflowDocumentId('wf-1'));

		expect(renderData.pinnedDataByNodeName).toBe(pinnedDataByNodeName.value);

		const replaced: IPinData = { Node1: [{ json: {} }] };
		pinnedDataByNodeName.value = replaced;

		expect(renderData.pinnedDataByNodeName).toBe(replaced);
	});

	it('exposes the current executionIssuesByNodeName after the active execution swaps', () => {
		const renderData = useWorkflowDocumentRenderDataStore(createWorkflowDocumentId('wf-1'));

		expect(renderData.executionIssuesByNodeName).toBe(executionIssuesByNodeName.value);

		const swapped = new Map<string, ComputedRef<string[]>>();
		executionIssuesByNodeName.value = swapped;

		expect(renderData.executionIssuesByNodeName).toBe(swapped);
	});

	it('uses the exact workflow document id when resolving the underlying stores', () => {
		const documentId = createWorkflowDocumentId('wf-1', 'ver-123');

		useWorkflowDocumentRenderDataStore(documentId);

		expect(useWorkflowDocumentStore).toHaveBeenCalledWith(documentId);
		expect(useWorkflowExecutionStateStore).toHaveBeenCalledWith(documentId);
	});

	it('disposeWorkflowDocumentRenderDataStore disposes the instance and clears scoped state', () => {
		const documentId = createWorkflowDocumentId('wf-1');
		const renderDataStore = useWorkflowDocumentRenderDataStore(documentId);
		const pinia = getActivePinia();
		const disposeSpy = vi.spyOn(renderDataStore, '$dispose');

		expect(pinia?.state.value[renderDataStore.$id]).toBeDefined();

		disposeWorkflowDocumentRenderDataStore(renderDataStore);

		expect(disposeSpy).toHaveBeenCalledOnce();
		expect(pinia?.state.value[renderDataStore.$id]).toBeUndefined();

		const recreatedRenderDataStore = useWorkflowDocumentRenderDataStore(documentId);

		expect(recreatedRenderDataStore).not.toBe(renderDataStore);
	});
});
