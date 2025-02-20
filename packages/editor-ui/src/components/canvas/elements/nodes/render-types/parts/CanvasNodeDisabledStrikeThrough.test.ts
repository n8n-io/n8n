import CanvasNodeDisabledStrikeThrough from '@/components/canvas/elements/nodes/render-types/parts/CanvasNodeDisabledStrikeThrough.vue';
import { createComponentRenderer } from '@/__tests__/render';

const renderComponent = createComponentRenderer(CanvasNodeDisabledStrikeThrough);

describe('CanvasNodeDisabledStrikeThrough', () => {
	it('should render node correctly', () => {
		const { container } = renderComponent();

		expect(container.firstChild).toHaveClass('disabledStrikeThrough');
	});
});
