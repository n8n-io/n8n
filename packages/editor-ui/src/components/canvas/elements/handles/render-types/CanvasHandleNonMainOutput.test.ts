import CanvasHandleNonMainOutput from '@/components/canvas/elements/handles/render-types/CanvasHandleNonMainOutput.vue';
import { createComponentRenderer } from '@/__tests__/render';
import { createCanvasHandleProvide } from '@/__tests__/data';

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
