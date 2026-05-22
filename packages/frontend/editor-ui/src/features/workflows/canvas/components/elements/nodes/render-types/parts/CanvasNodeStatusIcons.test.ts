import { createCanvasProvide } from '@/features/workflows/canvas/__tests__/utils';
import { createComponentRenderer } from '@/__tests__/render';
import { mockedStore, type MockedStore } from '@/__tests__/utils';
import { VIEWS } from '@/app/constants';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import { CanvasNodeDirtiness } from '../../../../../canvas.types';
import { createTestingPinia } from '@pinia/testing';
import type { IPinData } from 'n8n-workflow';
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

const pinnedDataByNodeName: IPinData = {};

vi.mock('@/features/workflows/canvas/canvas.utils', async (importOriginal) => ({
	...(await importOriginal<typeof import('@/features/workflows/canvas/canvas.utils')>()),
	injectCanvasRenderData: vi.fn(() => ({
		value: {
			nodeInputsByNodeId: new Map(),
			nodeOutputsByNodeId: new Map(),
			pinnedDataByNodeName,
			executionIssuesByNodeName: new Map(),
		},
	})),
}));

const renderComponent = createComponentRenderer(CanvasNodeStatusIcons, {
	pinia: createTestingPinia(),
	props: {
		name: 'Test Node',
		type: 'test',
	},
});

const mockedUseRoute = vi.mocked(useRoute);

describe('CanvasNodeStatusIcons', () => {
	let nodeTypesStore: MockedStore<typeof useNodeTypesStore>;

	beforeEach(() => {
		nodeTypesStore = mockedStore(useNodeTypesStore);
		mockedUseRoute.mockReturnValue({} as RouteLocationNormalizedLoadedGeneric);
		for (const key of Object.keys(pinnedDataByNodeName)) {
			delete pinnedDataByNodeName[key];
		}
	});

	it('should render correctly for a pinned node', () => {
		pinnedDataByNodeName['Test Node'] = [{ json: { key: 'value' } }];

		const { getByTestId } = renderComponent({
			global: {
				provide: createCanvasProvide(),
			},
		});

		expect(getByTestId('canvas-node-status-pinned')).toBeInTheDocument();
	});

	it('should not render pinned icon when disabled', () => {
		pinnedDataByNodeName['Test Node'] = [{ json: { key: 'value' } }];

		const { queryByTestId } = renderComponent({
			props: { name: 'Test Node', type: 'test', disabled: true },
			global: {
				provide: createCanvasProvide(),
			},
		});

		expect(queryByTestId('canvas-node-status-pinned')).not.toBeInTheDocument();
	});

	it('should render correctly for a node that ran successfully', () => {
		const { getByTestId } = renderComponent({
			props: {
				name: 'Test Node',
				type: 'test',
				executionStatus: 'success',
				hasRunData: true,
				runDataIterations: 15,
			},
			global: {
				provide: createCanvasProvide(),
			},
		});

		expect(getByTestId('canvas-node-status-success')).toHaveTextContent('15');
	});

	it('should not render success icon for a node that was canceled', () => {
		const { queryByTestId } = renderComponent({
			props: {
				name: 'Test Node',
				type: 'test',
				executionStatus: 'canceled',
				hasRunData: true,
				runDataIterations: 15,
			},
			global: {
				provide: createCanvasProvide(),
			},
		});

		expect(queryByTestId('canvas-node-status-success')).not.toBeInTheDocument();
	});

	it('should render correctly for a dirty node that has run successfully', () => {
		const { getByTestId } = renderComponent({
			props: {
				name: 'Test Node',
				type: 'test',
				hasRunData: true,
				runDataIterations: 15,
				dirtiness: CanvasNodeDirtiness.PARAMETERS_UPDATED,
			},
			global: {
				provide: createCanvasProvide(),
			},
		});

		expect(getByTestId('canvas-node-status-warning')).toBeInTheDocument();
	});

	it('should render warning icon when node is not installed', () => {
		nodeTypesStore.getIsNodeInstalled = vi.fn().mockReturnValue(false);
		const { queryByTestId } = renderComponent({
			props: { name: 'Test Node', type: 'n8n-nodes-test.testNode' },
			global: {
				provide: createCanvasProvide(),
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
			props: { name: 'Test Node', type: 'n8n-nodes-test.testNode' },
			global: {
				provide: createCanvasProvide(),
			},
		});

		expect(queryByTestId('node-not-installed')).not.toBeInTheDocument();
	});
});
