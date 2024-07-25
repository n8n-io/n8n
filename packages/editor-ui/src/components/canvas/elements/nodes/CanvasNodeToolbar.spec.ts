import { fireEvent } from '@testing-library/vue';
import CanvasNodeToolbar from '@/components/canvas/elements/nodes/CanvasNodeToolbar.vue';
import { createComponentRenderer } from '@/__tests__/render';
import { createCanvasNodeProvide } from '@/__tests__/data';
import { CanvasNodeRenderType } from '@/types';

const renderComponent = createComponentRenderer(CanvasNodeToolbar);

describe('CanvasNodeToolbar', () => {
	it('should render execute node button when renderType is not configuration', async () => {
		const { getByTestId } = renderComponent({
			global: {
				provide: {
					...createCanvasNodeProvide(),
				},
			},
		});

		expect(getByTestId('execute-node-button')).toBeInTheDocument();
	});

	it('should not render execute node button when renderType is configuration', async () => {
		const { queryByTestId } = renderComponent({
			global: {
				provide: {
					...createCanvasNodeProvide({
						data: {
							render: {
								type: CanvasNodeRenderType.Default,
								options: { configuration: true },
							},
						},
					}),
				},
			},
		});

		expect(queryByTestId('execute-node-button')).not.toBeInTheDocument();
	});

	it('should emit "run" when execute node button is clicked', async () => {
		const { getByTestId, emitted } = renderComponent({
			global: {
				provide: {
					...createCanvasNodeProvide(),
				},
			},
		});

		await fireEvent.click(getByTestId('execute-node-button'));

		expect(emitted('run')[0]).toEqual([]);
	});

	it('should emit "toggle" when disable node button is clicked', async () => {
		const { getByTestId, emitted } = renderComponent({
			global: {
				provide: {
					...createCanvasNodeProvide(),
				},
			},
		});

		await fireEvent.click(getByTestId('disable-node-button'));

		expect(emitted('toggle')[0]).toEqual([]);
	});

	it('should emit "delete" when delete node button is clicked', async () => {
		const { getByTestId, emitted } = renderComponent({
			global: {
				provide: {
					...createCanvasNodeProvide(),
				},
			},
		});

		await fireEvent.click(getByTestId('delete-node-button'));

		expect(emitted('delete')[0]).toEqual([]);
	});

	it('should emit "open:contextmenu" when overflow node button is clicked', async () => {
		const { getByTestId, emitted } = renderComponent({
			global: {
				provide: {
					...createCanvasNodeProvide(),
				},
			},
		});

		await fireEvent.click(getByTestId('overflow-node-button'));

		expect(emitted('open:contextmenu')[0]).toEqual([expect.any(MouseEvent)]);
	});
});
