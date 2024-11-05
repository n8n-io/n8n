import { fireEvent } from '@testing-library/vue';
import CanvasNodeToolbar from '@/components/canvas/elements/nodes/CanvasNodeToolbar.vue';
import { createComponentRenderer } from '@/__tests__/render';
import { createCanvasNodeProvide, createCanvasProvide } from '@/__tests__/data';
import { CanvasNodeRenderType } from '@/types';

const renderComponent = createComponentRenderer(CanvasNodeToolbar);

describe('CanvasNodeToolbar', () => {
	it('should render execute node button when renderType is not configuration', async () => {
		const { getByTestId } = renderComponent({
			global: {
				provide: {
					...createCanvasNodeProvide(),
					...createCanvasProvide(),
				},
			},
		});

		expect(getByTestId('execute-node-button')).toBeInTheDocument();
	});

	it('should render disabled execute node button when canvas is executing', () => {
		const { getByTestId } = renderComponent({
			global: {
				provide: {
					...createCanvasNodeProvide(),
					...createCanvasProvide({
						isExecuting: true,
					}),
				},
			},
		});

		expect(getByTestId('execute-node-button')).toBeDisabled();
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
					...createCanvasProvide(),
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
					...createCanvasProvide(),
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
					...createCanvasProvide(),
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
					...createCanvasProvide(),
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
					...createCanvasProvide(),
				},
			},
		});

		await fireEvent.click(getByTestId('overflow-node-button'));

		expect(emitted('open:contextmenu')[0]).toEqual([expect.any(MouseEvent)]);
	});

	it('should emit "update" when sticky note color is changed', async () => {
		const { getAllByTestId, getByTestId, emitted } = renderComponent({
			global: {
				provide: {
					...createCanvasNodeProvide({
						data: {
							render: {
								type: CanvasNodeRenderType.StickyNote,
								options: { color: 3 },
							},
						},
					}),
					...createCanvasProvide(),
				},
			},
		});

		await fireEvent.click(getByTestId('change-sticky-color'));
		await fireEvent.click(getAllByTestId('color')[0]);

		expect(emitted('update')[0]).toEqual([{ color: 1 }]);
	});
});
