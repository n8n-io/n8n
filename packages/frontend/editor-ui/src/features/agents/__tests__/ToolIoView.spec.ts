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

// Keep RunData lightweight while exercising the same strict NDV injection that failed in sessions.
vi.mock('@/features/ndv/runData/components/RunData.vue', async () => {
	const [{ computed, defineComponent }, { injectNDVStore }, { injectWorkflowExecutionStateStore }] =
		await Promise.all([
			import('vue'),
			import('@/features/ndv/shared/ndv.store'),
			import('@/app/stores/workflowExecutionState.store'),
		]);

	return {
		default: defineComponent({
			props: ['node', 'paneType'],
			setup(props) {
				const ndvStore = injectNDVStore();
				const executionStateStore = injectWorkflowExecutionStateStore();
				const paneValue = computed(() => {
					const nodeName = props.node?.name as string | undefined;
					if (!nodeName) return '';

					const taskData =
						executionStateStore.value.activeExecution?.data?.resultData.runData[nodeName]?.[0];
					const items =
						props.paneType === 'input'
							? taskData?.inputOverride?.main?.[0]
							: taskData?.data?.main?.[0];

					return JSON.stringify(items?.[0]?.json ?? {});
				});
				return { ndvStoreId: computed(() => ndvStore.value.$id), paneValue };
			},
			template:
				'<div data-test-id="run-data" :data-pane-type="paneType" :data-ndv-store-id="ndvStoreId" :data-pane-value="paneValue" />',
		}),
	};
});

vi.mock('@/app/stores/nodeTypes.store', () => ({
	useNodeTypesStore: () => ({
		loadNodeTypesIfNotLoaded: vi.fn().mockResolvedValue(undefined),
		getNodeType: () => null,
		communityNodeType: () => null,
		isTriggerNode: () => false,
		isConfigNode: () => false,
		isConfigurableNode: () => false,
		getAllNodeTypes: () => ({
			getByName: () => undefined,
			getByNameAndVersion: () => undefined,
			getKnownTypes: () => ({}),
		}),
	}),
}));

vi.mock('@/app/composables/useWorkflowNormalization', () => ({
	useWorkflowNormalization: () => ({
		normalizeWorkflowData: ({ nodes, connections }: { nodes: unknown[]; connections: object }) => ({
			nodes,
			connections,
		}),
	}),
}));

const renderComponent = createComponentRenderer(ToolIoView);

// Simulate the sessions page: App.vue provides `shallowRef(null)` because no
// real workflow is loaded. The standalone host must provide the RunData scope.
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

describe('ToolIoView', () => {
	beforeEach(() => {
		setActivePinia(createPinia());
	});

	it('renders the synthetic input and output without writing to the editor workflow scope', async () => {
		useWorkflowsStore().workflowId = 'editor-wf';

		const { getAllByTestId } = mountIt();
		await flushPromises();

		expect(getAllByTestId('run-data').map((pane) => pane.getAttribute('data-pane-value'))).toEqual([
			JSON.stringify({ url: 'https://x' }),
			JSON.stringify({ status: 200 }),
		]);

		const editorScope = useWorkflowExecutionStateStore(createWorkflowDocumentId('editor-wf'));
		expect(editorScope.activeExecution).toBeNull();
	});

	it('renders Input and Output panes (two RunData instances) without throwing', async () => {
		const { getAllByTestId } = mountIt();
		await flushPromises();

		const panes = getAllByTestId('run-data');
		expect(panes).toHaveLength(2);
		expect(panes.map((el) => el.getAttribute('data-pane-type'))).toEqual(['input', 'output']);
		expect(panes[0]?.getAttribute('data-ndv-store-id')).toBeTruthy();
		expect(panes[1]?.getAttribute('data-ndv-store-id')).toBe(
			panes[0]?.getAttribute('data-ndv-store-id'),
		);
	});

	it('updates both panes when the mounted view is reused with new tool data', async () => {
		const { getAllByTestId, rerender } = mountIt();
		await flushPromises();

		expect(getAllByTestId('run-data').map((pane) => pane.getAttribute('data-pane-value'))).toEqual([
			JSON.stringify({ url: 'https://x' }),
			JSON.stringify({ status: 200 }),
		]);

		await rerender({
			name: 'HTTP Request',
			input: { url: 'https://updated.example' },
			output: { status: 201 },
			nodeParameters: { url: 'https://updated.example' },
			success: true,
		});
		await flushPromises();

		expect(getAllByTestId('run-data').map((pane) => pane.getAttribute('data-pane-value'))).toEqual([
			JSON.stringify({ url: 'https://updated.example' }),
			JSON.stringify({ status: 201 }),
		]);
	});
});
