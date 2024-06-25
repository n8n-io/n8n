import { fireEvent } from '@testing-library/vue';
import CanvasNodeToolbar from '@/components/canvas/elements/nodes/CanvasNodeToolbar.vue';
import { createComponentRenderer } from '@/__tests__/render';
import { createCanvasNodeProvide } from '@/__tests__/data';

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
							renderType: 'configuration',
						},
					}),
				},
			},
		});

		expect(queryByTestId('execute-node-button')).not.toBeInTheDocument();
	});

	it('should call executeNode function when execute node button is clicked', async () => {
		const executeNode = vi.fn();
		const { getByTestId } = renderComponent({
			global: {
				provide: {
					...createCanvasNodeProvide(),
				},
				mocks: {
					executeNode,
				},
			},
		});

		await fireEvent.click(getByTestId('execute-node-button'));

		expect(executeNode).toHaveBeenCalled();
	});

	it('should call toggleDisableNode function when disable node button is clicked', async () => {
		const toggleDisableNode = vi.fn();
		const { getByTestId } = renderComponent({
			global: {
				provide: {
					...createCanvasNodeProvide(),
				},
				mocks: {
					toggleDisableNode,
				},
			},
		});

		await fireEvent.click(getByTestId('disable-node-button'));

		expect(toggleDisableNode).toHaveBeenCalled();
	});

	it('should call deleteNode function when delete node button is clicked', async () => {
		const deleteNode = vi.fn();
		const { getByTestId } = renderComponent({
			global: {
				provide: {
					...createCanvasNodeProvide(),
				},
				mocks: {
					deleteNode,
				},
			},
		});

		await fireEvent.click(getByTestId('delete-node-button'));

		expect(deleteNode).toHaveBeenCalled();
	});

	it('should call openContextMenu function when overflow node button is clicked', async () => {
		const openContextMenu = vi.fn();
		const { getByTestId } = renderComponent({
			global: {
				provide: {
					...createCanvasNodeProvide(),
				},
				mocks: {
					openContextMenu,
				},
			},
		});

		await fireEvent.click(getByTestId('overflow-node-button'));

		expect(openContextMenu).toHaveBeenCalled();
	});
});
