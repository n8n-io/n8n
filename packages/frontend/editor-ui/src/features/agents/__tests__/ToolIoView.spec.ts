/* eslint-disable import-x/no-extraneous-dependencies -- test-only patterns */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { shallowRef } from 'vue';
import { flushPromises } from '@vue/test-utils';
import ToolIoView from '../components/ToolIoView.vue';
import { createComponentRenderer } from '@/__tests__/render';
import { WorkflowDocumentStoreKey } from '@/app/constants/injectionKeys';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { createWorkflowDocumentId } from '@/app/stores/workflowDocument.store';
import { useWorkflowExecutionStateStore } from '@/app/stores/workflowExecutionState.store';

// Stub RunData so the test targets ToolIoView's store scoping (the actual
// fix) without pulling in the full NDV/schema-preview render stack. RunData's
// own behaviour is covered by its own test suite.
vi.mock('@/features/ndv/runData/components/RunData.vue', () => ({
	default: {
		props: ['paneType'],
		template: '<div data-test-id="run-data" :data-pane-type="paneType" />',
	},
}));

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

		// Regression guard: the synth payload must NOT leak into the editor's
		// workflow scope (the old `createWorkflowDocumentId(workflowsStore.workflowId)` write).
		const editorScope = useWorkflowExecutionStateStore(createWorkflowDocumentId('editor-wf'));
		expect(editorScope.activeExecution).toBeNull();
	});

	it('restores the previous execution data on unmount', async () => {
		// Pre-populate the __tool_io__ scope so we can verify unmount restores it.
		const toolIoScope = useWorkflowExecutionStateStore(TOOL_IO_DOCUMENT_ID);
		const sentinel = {
			id: 'sentinel',
			data: { resultData: { runData: {} } },
		} as unknown as Parameters<typeof toolIoScope.setWorkflowExecutionData>[0];
		toolIoScope.setWorkflowExecutionData(sentinel);

		const { unmount } = mountIt();
		await flushPromises();

		// While mounted, the synth payload (id '__tool_io__') overwrites the sentinel.
		expect(toolIoScope.activeExecution?.id).toBe('__tool_io__');

		unmount();
		await flushPromises();

		// On unmount the previous execution (the sentinel) is restored.
		expect(toolIoScope.activeExecution?.id).toBe('sentinel');
	});

	it('renders Input and Output panes (two RunData instances) without throwing', async () => {
		const { getAllByTestId } = mountIt();
		await flushPromises();

		const panes = getAllByTestId('run-data');
		expect(panes).toHaveLength(2);
		expect(panes.map((el) => el.getAttribute('data-pane-type'))).toEqual(['input', 'output']);
	});
});
