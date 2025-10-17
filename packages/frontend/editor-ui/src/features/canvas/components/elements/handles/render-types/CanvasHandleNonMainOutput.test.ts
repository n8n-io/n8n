import CanvasHandleNonMainOutput from './CanvasHandleNonMainOutput.vue';
import { createComponentRenderer } from '@/__tests__/render';
import { createCanvasHandleProvide } from '@/features/canvas/__tests__/utils';

const renderComponent = createComponentRenderer(CanvasHandleNonMainOutput);

describe('CanvasHandleNonMainOutput', () => {
	it('should render correctly', async () => {
		const label = 'Test Label';
		const { container, getByText } = renderComponent({
			global: {
				provide: {
					...createCanvasHandleProvide({ label }),
				},
			},
		});

		expect(container.querySelector('.canvas-node-handle-non-main-output')).toBeInTheDocument();
		expect(getByText(label)).toBeInTheDocument();
	});
});
