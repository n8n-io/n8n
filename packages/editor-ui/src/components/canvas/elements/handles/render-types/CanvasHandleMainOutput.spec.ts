import CanvasHandleMainOutput from '@/components/canvas/elements/handles/render-types/CanvasHandleMainOutput.vue';
import { createComponentRenderer } from '@/__tests__/render';
import { CanvasNodeHandleKey } from '@/constants';
import { ref } from 'vue';

const renderComponent = createComponentRenderer(CanvasHandleMainOutput);

describe('CanvasHandleMainOutput', () => {
	it('should render correctly', async () => {
		const label = 'Test Label';
		const { container, getByText } = renderComponent({
			global: {
				provide: {
					[`${CanvasNodeHandleKey}`]: { label: ref(label) },
				},
			},
		});

		expect(container.querySelector('.canvas-node-handle-main-output')).toBeInTheDocument();
		expect(getByText(label)).toBeInTheDocument();
	});
});
