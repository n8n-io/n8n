import CanvasNodeTooltip from './CanvasNodeTooltip.vue';
import { createComponentRenderer } from '@/__tests__/render';
import { queryTooltip } from '@/__tests__/utils';
import { waitFor } from '@testing-library/vue';

vi.mock('@/features/workflows/canvas/canvas.utils', async (importOriginal) => ({
	...(await importOriginal<typeof import('@/features/workflows/canvas/canvas.utils')>()),
	injectCanvasRenderData: vi.fn(() => ({
		value: {
			nodeInputsByNodeId: new Map(),
			nodeOutputsByNodeId: new Map(),
			pinnedDataByNodeName: {},
			executionIssuesByNodeName: new Map(),
		},
	})),
}));

const renderComponent = createComponentRenderer(CanvasNodeTooltip);

describe('CanvasNodeTooltip', () => {
	describe('rendering', () => {
		it('should render tooltip when tooltip option is provided', async () => {
			renderComponent({
				props: {
					visible: true,
					tooltip: 'Test tooltip text',
				},
			});

			await waitFor(() => {
				const tooltipContent = queryTooltip();
				expect(tooltipContent).toBeVisible();
				expect(tooltipContent).toHaveTextContent('Test tooltip text');
			});
		});

		it('should not render tooltip when not visible', () => {
			renderComponent({
				props: {
					visible: false,
					tooltip: 'Test tooltip text',
				},
			});

			expect(queryTooltip()).not.toBeInTheDocument();
		});
	});
});
