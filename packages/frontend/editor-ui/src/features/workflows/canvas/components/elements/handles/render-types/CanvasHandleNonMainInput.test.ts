import CanvasHandleNonMainInput from './CanvasHandleNonMainInput.vue';
import { createComponentRenderer } from '@/__tests__/render';
import {
	createCanvasHandleProvide,
	createCanvasProvide,
} from '@/features/workflows/canvas/__tests__/utils';

const renderComponent = createComponentRenderer(CanvasHandleNonMainInput);

describe('CanvasHandleNonMainInput', () => {
	it('should render correctly', async () => {
		const label = 'Test Label';
		const { container, getByText } = renderComponent({
			global: {
				provide: {
					...createCanvasProvide(),
					...createCanvasHandleProvide({ label }),
				},
			},
		});

		expect(container.querySelector('.canvas-node-handle-non-main-input')).toBeInTheDocument();
		expect(getByText(label)).toBeInTheDocument();
	});
});
