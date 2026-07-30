/* eslint-disable import-x/no-extraneous-dependencies -- test-only patterns */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { setActivePinia, createPinia, getActivePinia } from 'pinia';
import { shallowRef } from 'vue';
import { flushPromises } from '@vue/test-utils';
import ToolIoView from '../components/ToolIoView.vue';
import { createComponentRenderer } from '@/__tests__/render';
import { WorkflowDocumentStoreKey } from '@/app/constants/injectionKeys';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import {
	createWorkflowDocumentId,
	getWorkflowDocumentStoreId,
} from '@/app/stores/workflowDocument.store';
import {
	getWorkflowExecutionStateStoreId,
	useWorkflowExecutionStateStore,
} from '@/app/stores/workflowExecutionState.store';
import { createExecutionDataId, getExecutionDataStoreId } from '@/app/stores/executionData.store';
import { getNDVStoreId } from '@/features/ndv/shared/ndv.store';

// Keep RunData lightweight while exercising the same strict NDV injection that failed in sessions.
vi.mock('@/features/ndv/runData/components/RunData.vue', async () => {
	const [{ computed, defineComponent }, { injectNDVStore }] = await Promise.all([
		import('vue'),
		import('@/features/ndv/shared/ndv.store'),
	]);

	return {
		default: defineComponent({
			props: ['paneType'],
			setup() {
				const ndvStore = injectNDVStore();
				return { ndvStoreId: computed(() => ndvStore.value.$id) };
			},
			template:
				'<div data-test-id="run-data" :data-pane-type="paneType" :data-ndv-store-id="ndvStoreId" />',
		}),
	};
});

vi.mock('@/app/stores/nodeTypes.store', () => ({
	useNodeTypesStore: () => ({
		loadNodeTypesIfNotLoaded: vi.fn().mockResolvedValue(undefined),
		getNodeType: () => null,
		getAllNodeTypes: () => ({}),
	}),
}));

vi.mock('@/app/composables/useWorkflowHelpers', () => ({
	useWorkflowHelpers: () => ({
		// `Workflow` constructor tolerates unknown node types (it just flags the
		// node), so an empty INodeTypes shim is enough for the synth workflow.
		getNodeTypes: () => ({
			getByName: () => undefined,
			getByNameAndVersion: () => undefined,
			getKnownTypes: () => ({}),
		}),
	}),
}));

const renderComponent = createComponentRenderer(ToolIoView);

// Simulate the sessions page: App.vue provides `shallowRef(null)` because no
// real workflow is loaded. ToolIoView must re-provide a non-null synthetic
// document store for its RunData subtree (the fix under test).
const SESSIONS_PAGE_PROVIDE = {
	[WorkflowDocumentStoreKey as symbol]: shallowRef(null),
};

function mountIt(overrides: Record<string, unknown> = {}) {
	return renderComponent({
		props: {
			name: 'HTTP Request',
			input: { url: 'https://x' },
			output: { status: 200 },
			nodeParameters: { url: 'https://x' },
			success: true,
			...overrides,
		},
		global: { provide: SESSIONS_PAGE_PROVIDE },
	});
}

const TOOL_IO_DOCUMENT_ID = createWorkflowDocumentId('__tool_io__');

describe('ToolIoView — scopes synth execution under a synthetic document store', () => {
	beforeEach(() => {
		setActivePinia(createPinia());
	});

	it('writes the synth execution to the __tool_io__ document scope, not the editor workflow scope', async () => {
		// The editor's workflow id is the scope the old code wrote to — make it
		// deterministic so a regression (writing to workflowsStore.workflowId)
		// is caught.
		useWorkflowsStore().workflowId = 'editor-wf';

		mountIt();
		await flushPromises();

		const toolIoScope = useWorkflowExecutionStateStore(TOOL_IO_DOCUMENT_ID);
		expect(toolIoScope.activeExecution).not.toBeNull();
		const runData = toolIoScope.activeExecution?.data?.resultData?.runData;
		expect(runData).toBeTruthy();
		expect(runData).toHaveProperty('HTTP Request');
		expect(runData?.['HTTP Request']?.[0]?.inputOverride?.main?.[0]?.[0]?.json).toEqual({
			url: 'https://x',
		});
		expect(runData?.['HTTP Request']?.[0]?.data?.main?.[0]?.[0]?.json).toEqual({
			status: 200,
		});

		// Regression guard: the synth payload must NOT leak into the editor's
		// workflow scope (the old `createWorkflowDocumentId(workflowsStore.workflowId)` write).
		const editorScope = useWorkflowExecutionStateStore(createWorkflowDocumentId('editor-wf'));
		expect(editorScope.activeExecution).toBeNull();
	});

	it('disposes the synthetic stores and execution payload on unmount', async () => {
		const { unmount } = mountIt();
		await flushPromises();

		const storeIds = [
			getExecutionDataStoreId(createExecutionDataId('__tool_io__')),
			getNDVStoreId(TOOL_IO_DOCUMENT_ID),
			getWorkflowExecutionStateStoreId(TOOL_IO_DOCUMENT_ID),
			getWorkflowDocumentStoreId(TOOL_IO_DOCUMENT_ID),
		];
		const pinia = getActivePinia();
		for (const storeId of storeIds) {
			expect(pinia?.state.value[storeId]).toBeDefined();
		}

		unmount();
		await flushPromises();

		for (const storeId of storeIds) {
			expect(pinia?.state.value[storeId]).toBeUndefined();
		}
	});

	it('renders Input and Output panes (two RunData instances) without throwing', async () => {
		const { getAllByTestId } = mountIt();
		await flushPromises();

		const panes = getAllByTestId('run-data');
		expect(panes).toHaveLength(2);
		expect(panes.map((el) => el.getAttribute('data-pane-type'))).toEqual(['input', 'output']);
		expect(panes.map((el) => el.getAttribute('data-ndv-store-id'))).toEqual([
			getNDVStoreId(TOOL_IO_DOCUMENT_ID),
			getNDVStoreId(TOOL_IO_DOCUMENT_ID),
		]);
	});
});
