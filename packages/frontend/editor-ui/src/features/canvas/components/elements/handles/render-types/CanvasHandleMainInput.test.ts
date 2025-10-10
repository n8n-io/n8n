import CanvasHandleMainInput from './CanvasHandleMainInput.vue';
import { createComponentRenderer } from '@/__tests__/render';
import { createCanvasHandleProvide } from '@/features/canvas/__tests__/utils';

const renderComponent = createComponentRenderer(CanvasHandleMainInput);

describe('CanvasHandleMainInput', () => {
	it('should render correctly', async () => {
		const label = 'Test Label';
		const { container, getByText } = renderComponent({
			global: {
				provide: {
					...createCanvasHandleProvide({ label }),
				},
			},
		});

		expect(container.querySelector('.canvas-node-handle-main-input')).toBeInTheDocument();
		expect(getByText(label)).toBeInTheDocument();
	});
});
