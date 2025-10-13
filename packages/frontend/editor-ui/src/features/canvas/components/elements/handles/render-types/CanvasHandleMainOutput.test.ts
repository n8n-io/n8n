import CanvasHandleMainOutput from './CanvasHandleMainOutput.vue';
import { createComponentRenderer } from '@/__tests__/render';
import { createCanvasHandleProvide } from '@/features/canvas/__tests__/utils';

const renderComponent = createComponentRenderer(CanvasHandleMainOutput);

describe('CanvasHandleMainOutput', () => {
	it('should render correctly', async () => {
		const label = 'Test Label';
		const { container, getByText, getByTestId } = renderComponent({
			global: {
				provide: {
					...createCanvasHandleProvide({ label }),
				},
			},
		});

		expect(container.querySelector('.canvas-node-handle-main-output')).toBeInTheDocument();
		expect(getByTestId('canvas-handle-plus')).toBeInTheDocument();
		expect(getByText(label)).toBeInTheDocument();
	});

	it('should not render CanvasHandlePlus when isReadOnly', () => {
		const { queryByTestId } = renderComponent({
			global: {
				provide: {
					...createCanvasHandleProvide({ isReadOnly: true }),
				},
			},
		});

		expect(queryByTestId('canvas-handle-plus')).not.toBeInTheDocument();
	});

	it('should render CanvasHandlePlus with success state when runData.total > 1', () => {
		const { queryByTestId } = renderComponent({
			global: {
				provide: {
					...createCanvasHandleProvide({
						runData: {
							total: 2,
							iterations: 1,
						},
					}),
				},
			},
		});

		expect(queryByTestId('canvas-handle-plus-wrapper')).toHaveClass('success');
	});

	it('should render run data label', async () => {
		const runData = {
			total: 1,
			iterations: 1,
		};
		const { getByText } = renderComponent({
			global: {
				provide: {
					...createCanvasHandleProvide({ label: '', runData }),
				},
			},
		});
		expect(getByText('1 item')).toBeInTheDocument();
	});

	it('should render run data label even if output label is available', async () => {
		const runData = {
			total: 1,
			iterations: 1,
		};
		const { getByText } = renderComponent({
			global: {
				provide: {
					...createCanvasHandleProvide({ label: 'Output', runData }),
				},
			},
		});

		expect(getByText('1 item')).toBeInTheDocument();
		expect(getByText('Output')).toBeInTheDocument();
	});

	it('should not render run data label if handle is connected', async () => {
		const runData = {
			total: 1,
			iterations: 1,
		};
		const { queryByText } = renderComponent({
			global: {
				provide: {
					...createCanvasHandleProvide({ label: '', runData, isConnected: true }),
				},
			},
		});
		expect(queryByText('1 item')).not.toBeInTheDocument();
	});
});
