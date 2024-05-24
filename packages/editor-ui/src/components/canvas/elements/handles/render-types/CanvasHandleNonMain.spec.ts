import CanvasHandleNonMain from '@/components/canvas/elements/handles/render-types/CanvasHandleNonMain.vue';
import { createComponentRenderer } from '@/__tests__/render';
import { CanvasNodeHandleKey } from '@/constants';
import { ref } from 'vue';

const renderComponent = createComponentRenderer(CanvasHandleNonMain);

describe('CanvasHandleNonMain', () => {
	it('should render correctly', async () => {
		const label = 'Test Label';
		const { container, getByText } = renderComponent({
			global: {
				provide: {
					[`${CanvasNodeHandleKey}`]: { label: ref(label) },
				},
			},
		});

		expect(container.querySelector('.canvas-node-handle-non-main')).toBeInTheDocument();
		expect(getByText(label)).toBeInTheDocument();
	});
});
