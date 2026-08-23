import CanvasNodeDisabledStrikeThrough from './CanvasNodeDisabledStrikeThrough.vue';
import { createComponentRenderer } from '@/__tests__/render';

vi.mock('@/features/workflows/canvas/canvas.utils', async (importOriginal) => {
	const actual = await importOriginal<typeof import('@/features/workflows/canvas/canvas.utils')>();
	return {
		...actual,
		injectCanvasRenderData: vi.fn(() => ({ value: actual.createEmptyCanvasRenderData() })),
	};
});

const renderComponent = createComponentRenderer(CanvasNodeDisabledStrikeThrough);

describe('CanvasNodeDisabledStrikeThrough', () => {
	it('should render node correctly', () => {
		const { container } = renderComponent();

		expect(container.firstChild).toHaveClass('disabledStrikeThrough');
	});
});
