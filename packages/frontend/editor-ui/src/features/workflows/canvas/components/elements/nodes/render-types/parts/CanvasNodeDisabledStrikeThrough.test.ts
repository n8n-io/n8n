import CanvasNodeDisabledStrikeThrough from './CanvasNodeDisabledStrikeThrough.vue';
import { createComponentRenderer } from '@/__tests__/render';
import { CanvasNodeRenderType } from '../../../../../canvas.types';

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

const renderComponent = createComponentRenderer(CanvasNodeDisabledStrikeThrough);

describe('CanvasNodeDisabledStrikeThrough', () => {
	it('should render node correctly', () => {
		const { container } = renderComponent({
			props: {
				hasRunData: false,
				render: {
					type: CanvasNodeRenderType.Default,
					options: {},
				},
			},
		});

		expect(container.firstChild).toHaveClass('disabledStrikeThrough');
	});
});
