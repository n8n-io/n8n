import CanvasHandleMainOutput from '@/components/canvas/elements/handles/render-types/CanvasHandleMainOutput.vue';
import { createComponentRenderer } from '@/__tests__/render';
import { createCanvasHandleProvide } from '@/__tests__/data';

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
});
