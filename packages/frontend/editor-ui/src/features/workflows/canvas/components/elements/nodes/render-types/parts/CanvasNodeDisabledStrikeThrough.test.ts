import CanvasNodeDisabledStrikeThrough from './CanvasNodeDisabledStrikeThrough.vue';
import { createComponentRenderer } from '@/__tests__/render';

vi.mock('@/app/stores/workflowDocument/useWorkflowDocumentRenderData', () => ({
	injectWorkflowRenderData: vi.fn(() => ({
		nodeInputsByNodeId: new Map(),
		nodeOutputsByNodeId: new Map(),
	})),
}));

const renderComponent = createComponentRenderer(CanvasNodeDisabledStrikeThrough);

describe('CanvasNodeDisabledStrikeThrough', () => {
	it('should render node correctly', () => {
		const { container } = renderComponent();

		expect(container.firstChild).toHaveClass('disabledStrikeThrough');
	});
});
