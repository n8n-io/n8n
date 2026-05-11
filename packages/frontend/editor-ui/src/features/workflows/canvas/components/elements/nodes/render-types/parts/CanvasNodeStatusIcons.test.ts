import {
	createCanvasNodeProvide,
	createCanvasProvide,
} from '@/features/workflows/canvas/__tests__/utils';
import { createComponentRenderer } from '@/__tests__/render';
import { mockedStore, type MockedStore } from '@/__tests__/utils';
import { VIEWS } from '@/app/constants';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import { CanvasNodeDirtiness, CanvasNodeRenderType } from '../../../../../canvas.types';
import { createTestingPinia } from '@pinia/testing';
import type * as actualVueRouter from 'vue-router';
import { type RouteLocationNormalizedLoadedGeneric, useRoute } from 'vue-router';
import CanvasNodeStatusIcons from './CanvasNodeStatusIcons.vue';

vi.mock('vue-router', async (importOriginal) => {
	const actual = await importOriginal();
	return {
		...(actual as typeof actualVueRouter),
		useRoute: vi.fn(),
	};
});

const renderComponent = createComponentRenderer(CanvasNodeStatusIcons, {
	pinia: createTestingPinia(),
});

const mockedUseRoute = vi.mocked(useRoute);

describe('CanvasNodeStatusIcons', () => {
	let nodeTypesStore: MockedStore<typeof useNodeTypesStore>;

	beforeEach(() => {
		nodeTypesStore = mockedStore(useNodeTypesStore);
		mockedUseRoute.mockReturnValue({} as RouteLocationNormalizedLoadedGeneric);
	});

	it('should render correctly for a pinned node', () => {
		const { getByTestId } = renderComponent({
			global: {
				provide: {
					...createCanvasProvide(),
					...createCanvasNodeProvide({ data: { pinnedData: { count: 5, visible: true } } }),
				},
			},
		});

		expect(getByTestId('canvas-node-status-pinned')).toBeInTheDocument();
	});

	it('should not render pinned icon when disabled', () => {
		const { queryByTestId } = renderComponent({
			global: {
				provide: {
					...createCanvasProvide(),
					...createCanvasNodeProvide({
						data: { disabled: true, pinnedData: { count: 5, visible: true } },
					}),
				},
			},
		});

		expect(queryByTestId('canvas-node-status-pinned')).not.toBeInTheDocument();
	});

	it('should render correctly for a node that ran successfully', () => {
		const { getByTestId } = renderComponent({
			global: {
				provide: {
					...createCanvasProvide(),
					...createCanvasNodeProvide({
						data: {
							execution: { status: 'success', running: false },
							runData: { outputMap: {}, iterations: 15, visible: true },
						},
					}),
				},
			},
		});

		expect(getByTestId('canvas-node-status-success')).toHaveTextContent('15');
	});

	it('should not render success icon for a node that was canceled', () => {
		const { queryByTestId } = renderComponent({
			global: {
				provide: {
					...createCanvasProvide(),
					...createCanvasNodeProvide({
						data: {
							execution: { status: 'canceled', running: false },
							runData: { outputMap: {}, iterations: 15, visible: true },
						},
					}),
				},
			},
		});

		expect(queryByTestId('canvas-node-status-success')).not.toBeInTheDocument();
	});

	it('should render correctly for a dirty node that has run successfully', () => {
		const { getByTestId } = renderComponent({
			global: {
				provide: {
					...createCanvasProvide(),
					...createCanvasNodeProvide({
						data: {
							runData: { outputMap: {}, iterations: 15, visible: true },
							render: {
								type: CanvasNodeRenderType.Default,
								options: { dirtiness: CanvasNodeDirtiness.PARAMETERS_UPDATED },
							},
						},
					}),
				},
			},
		});

		expect(getByTestId('canvas-node-status-warning')).toBeInTheDocument();
	});

	it('should render warning icon when node is not installed', () => {
		nodeTypesStore.getIsNodeInstalled = vi.fn().mockReturnValue(false);
		const { queryByTestId } = renderComponent({
			global: {
				provide: {
					...createCanvasProvide(),
					...createCanvasNodeProvide({ data: { type: 'n8n-nodes-test.testNode' } }),
				},
			},
		});

		expect(queryByTestId('node-not-installed')).toBeInTheDocument();
	});
	it('should not render warning icon when node is not installed and route is demo', () => {
		mockedUseRoute.mockReturnValue({
			name: VIEWS.DEMO,
		} as RouteLocationNormalizedLoadedGeneric);
		nodeTypesStore.getIsNodeInstalled = vi.fn().mockReturnValue(false);
		const { queryByTestId } = renderComponent({
			global: {
				provide: {
					...createCanvasProvide(),
					...createCanvasNodeProvide({ data: { type: 'n8n-nodes-test.testNode' } }),
				},
			},
		});

		expect(queryByTestId('node-not-installed')).not.toBeInTheDocument();
	});
});
