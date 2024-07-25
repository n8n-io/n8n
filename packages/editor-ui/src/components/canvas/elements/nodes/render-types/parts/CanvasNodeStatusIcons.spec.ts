import CanvasNodeStatusIcons from './CanvasNodeStatusIcons.vue';
import { createComponentRenderer } from '@/__tests__/render';
import { createCanvasNodeProvide } from '@/__tests__/data';
import { createTestingPinia } from '@pinia/testing';

const renderComponent = createComponentRenderer(CanvasNodeStatusIcons, {
	pinia: createTestingPinia(),
});

describe('CanvasNodeStatusIcons', () => {
	it('should render correctly for a pinned node', () => {
		const { getByTestId } = renderComponent({
			global: {
				provide: createCanvasNodeProvide({ data: { pinnedData: { count: 5, visible: true } } }),
			},
		});

		expect(getByTestId('canvas-node-status-pinned')).toHaveTextContent('5');
	});

	it('should render correctly for a running node', () => {
		const { getByTestId } = renderComponent({
			global: {
				provide: createCanvasNodeProvide({ data: { execution: { running: true } } }),
			},
		});

		expect(getByTestId('canvas-node-status-running')).toBeInTheDocument();
	});

	it('should render correctly for a node that ran successfully', () => {
		const { getByTestId } = renderComponent({
			global: {
				provide: createCanvasNodeProvide({ data: { runData: { count: 15, visible: true } } }),
			},
		});

		expect(getByTestId('canvas-node-status-success')).toHaveTextContent('15');
	});
});
