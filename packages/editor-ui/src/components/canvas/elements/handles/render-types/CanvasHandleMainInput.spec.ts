import CanvasHandleMainInput from '@/components/canvas/elements/handles/render-types/CanvasHandleMainInput.vue';
import { createComponentRenderer } from '@/__tests__/render';
import { CanvasNodeHandleKey } from '@/constants';
import { ref } from 'vue';

const renderComponent = createComponentRenderer(CanvasHandleMainInput);

describe('CanvasHandleMainInput', () => {
	it('should render correctly', async () => {
		const label = 'Test Label';
		const { container, getByText } = renderComponent({
			global: {
				provide: {
					[`${CanvasNodeHandleKey}`]: { label: ref(label) },
				},
			},
		});

		expect(container.querySelector('.canvas-node-handle-main-input')).toBeInTheDocument();
		expect(getByText(label)).toBeInTheDocument();
	});
});
