import {
	createCanvasNodeProvide,
	createCanvasProvide,
} from '@/features/workflows/canvas/__tests__/utils';
import { createComponentRenderer } from '@/__tests__/render';
import { mockedStore, type MockedStore } from '@/__tests__/utils';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import {
	createWorkflowDocumentId,
	useWorkflowDocumentStore,
} from '@/app/stores/workflowDocument.store';
import { createTestingPinia } from '@pinia/testing';
import CanvasNodeSettingsIcons from './CanvasNodeSettingsIcons.vue';
import type { INodeUi } from '@/Interface';

const WORKFLOW_ID = 'test-workflow-id';

vi.mock('@/features/workflows/canvas/canvas.utils', async (importOriginal) => ({
	...(await importOriginal<typeof import('@/features/workflows/canvas/canvas.utils')>()),
	injectCanvasRenderData: vi.fn(() => ({
		value: {
			nodeInputsByNodeId: new Map(),
			nodeOutputsByNodeId: new Map(),
			pinnedDataByNodeName: {},
			executionIssuesByNodeName: new Map(),
		},
	})),
}));

const renderComponent = createComponentRenderer(CanvasNodeSettingsIcons, {
	pinia: createTestingPinia(),
});

describe('CanvasNodeSettingsIcons', () => {
	let workflowsStore: MockedStore<typeof useWorkflowsStore>;
	let workflowDocumentStore: ReturnType<typeof useWorkflowDocumentStore>;

	const createMockNode = (overrides: Partial<INodeUi> = {}): INodeUi =>
		({
			name: 'Test Node',
			type: 'test',
			typeVersion: 1,
			position: [0, 0],
			parameters: {},
			...overrides,
		}) as INodeUi;

	beforeEach(() => {
		workflowsStore = mockedStore(useWorkflowsStore);

		workflowsStore.workflowId = WORKFLOW_ID;

		workflowDocumentStore = useWorkflowDocumentStore(createWorkflowDocumentId(WORKFLOW_ID));
	});

	describe('other settings icons', () => {
		beforeEach(() => {
			vi.mocked(workflowDocumentStore.getNodeByName).mockReturnValue(createMockNode());
		});

		it('should render always output data icon when enabled', () => {
			const node = createMockNode({ alwaysOutputData: true });
			vi.mocked(workflowDocumentStore.getNodeByName).mockReturnValue(node);

			const { getByTestId } = renderComponent({
				global: {
					provide: {
						...createCanvasProvide(),
						...createCanvasNodeProvide({ data: { name: 'Test Node' } }),
					},
				},
			});

			expect(getByTestId('canvas-node-status-always-output-data')).toBeInTheDocument();
		});

		it('should render execute once icon when enabled', () => {
			const node = createMockNode({ executeOnce: true });
			vi.mocked(workflowDocumentStore.getNodeByName).mockReturnValue(node);

			const { getByTestId } = renderComponent({
				global: {
					provide: {
						...createCanvasProvide(),
						...createCanvasNodeProvide({ data: { name: 'Test Node' } }),
					},
				},
			});

			expect(getByTestId('canvas-node-status-execute-once')).toBeInTheDocument();
		});

		it('should render retry on fail icon when enabled', () => {
			const node = createMockNode({ retryOnFail: true });
			vi.mocked(workflowDocumentStore.getNodeByName).mockReturnValue(node);

			const { getByTestId } = renderComponent({
				global: {
					provide: {
						...createCanvasProvide(),
						...createCanvasNodeProvide({ data: { name: 'Test Node' } }),
					},
				},
			});

			expect(getByTestId('canvas-node-status-retry-on-fail')).toBeInTheDocument();
		});

		it('should render continue on error icon when onError is continueRegularOutput', () => {
			const node = createMockNode({ onError: 'continueRegularOutput' });
			vi.mocked(workflowDocumentStore.getNodeByName).mockReturnValue(node);

			const { getByTestId } = renderComponent({
				global: {
					provide: {
						...createCanvasProvide(),
						...createCanvasNodeProvide({ data: { name: 'Test Node' } }),
					},
				},
			});

			expect(getByTestId('canvas-node-status-continue-on-error')).toBeInTheDocument();
		});

		it('should render continue on error icon when onError is continueErrorOutput', () => {
			const node = createMockNode({ onError: 'continueErrorOutput' });
			vi.mocked(workflowDocumentStore.getNodeByName).mockReturnValue(node);

			const { getByTestId } = renderComponent({
				global: {
					provide: {
						...createCanvasProvide(),
						...createCanvasNodeProvide({ data: { name: 'Test Node' } }),
					},
				},
			});

			expect(getByTestId('canvas-node-status-continue-on-error')).toBeInTheDocument();
		});
	});
});
