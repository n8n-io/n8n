import type * as Vue from 'vue';
import { createTestingPinia } from '@pinia/testing';
import { createComponentRenderer } from '@/__tests__/render';
import NodeCreation from './NodeCreation.vue';
import type { AddedNodesAndConnections } from '@/Interface';

const mockGetAddedNodesAndConnections = vi.fn<() => AddedNodesAndConnections>(() => ({
	nodes: [],
	connections: [],
}));

vi.mock('../composables/useActions', () => ({
	useActions: () => ({
		getAddedNodesAndConnections: mockGetAddedNodesAndConnections,
	}),
}));

// NodeCreator.vue pulls in a large composable/store surface unrelated to the
// wiring under test. Stubbing `defineAsyncComponent` sidesteps loading it (and
// the Suspense boundary) so we can drive `@node-type-selected` directly.
vi.mock('vue', async (importOriginal) => {
	const actual = await importOriginal<typeof Vue>();
	return {
		...actual,
		defineAsyncComponent: () => ({
			name: 'NodeCreatorStub',
			emits: ['node-type-selected', 'close-node-creator'],
			setup(_: unknown, { emit }: { emit: (event: string, ...args: unknown[]) => void }) {
				return { emit };
			},
			template:
				'<button data-test-id="node-creator-stub-select" @click="emit(\'node-type-selected\', [{ type: \'n8n-nodes-base.slack\' }])" />',
		}),
	};
});

vi.mock('@/app/composables/useWorkflowId', () => ({
	useWorkflowId: () => ({ value: 'test-workflow-id' }),
	useRouteWorkflowId: () => ({ value: 'test-workflow-id' }),
}));

vi.mock('@/app/composables/useEditorContext', () => ({
	useEditorContext: () => ({
		aiAssistant: { value: false },
		aiBuilder: { value: false },
		instanceAi: { value: false },
	}),
}));

vi.mock('@/app/composables/useInstanceAiEditorCapability', () => ({
	useInstanceAiEditorCapability: () => ({ openWorkflow: undefined }),
}));

vi.mock('../composables/useNodeCreatorShortcutCoachmark', () => ({
	useNodeCreatorShortcutCoachmark: () => ({
		shouldShowCoachmark: false,
		onDismissCoachmark: vi.fn(),
	}),
}));

const renderComponent = createComponentRenderer(NodeCreation, {
	pinia: createTestingPinia(),
	props: {
		nodeViewScale: 1,
		createNodeActive: true,
		focusPanelActive: false,
	},
});

describe('NodeCreation', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('emits addNodes with the result of getAddedNodesAndConnections when a node type is selected', async () => {
		const addedNodesAndConnections = {
			nodes: [{ type: 'n8n-nodes-base.slack' }],
			connections: [],
		};
		mockGetAddedNodesAndConnections.mockReturnValue(addedNodesAndConnections);

		const { findByTestId, emitted } = renderComponent();
		const selectButton = await findByTestId('node-creator-stub-select');

		selectButton.click();

		await vi.waitFor(() => {
			expect(mockGetAddedNodesAndConnections).toHaveBeenCalled();
		});

		expect(mockGetAddedNodesAndConnections).toHaveBeenCalledWith([
			{ type: 'n8n-nodes-base.slack' },
		]);
		expect(emitted('addNodes')).toEqual([[addedNodesAndConnections]]);
	});
});
