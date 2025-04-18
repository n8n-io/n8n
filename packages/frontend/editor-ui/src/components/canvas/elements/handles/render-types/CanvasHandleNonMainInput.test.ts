import CanvasHandleNonMainInput from '@/components/canvas/elements/handles/render-types/CanvasHandleNonMainInput.vue';
import { createComponentRenderer } from '@/__tests__/render';
import { createCanvasHandleProvide } from '@/__tests__/data';

const renderComponent = createComponentRenderer(CanvasHandleNonMainInput);

describe('CanvasHandleNonMainInput', () => {
	it('should render correctly', async () => {
		const label = 'Test Label';
		const { container, getByText } = renderComponent({
			global: {
				provide: {
					...createCanvasHandleProvide({ label }),
				},
			},
		});

		expect(container.querySelector('.canvas-node-handle-non-main-input')).toBeInTheDocument();
		expect(getByText(label)).toBeInTheDocument();
	});
});
