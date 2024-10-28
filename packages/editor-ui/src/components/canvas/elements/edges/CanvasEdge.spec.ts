import { fireEvent } from '@testing-library/vue';
import CanvasEdge from './CanvasEdge.vue';
import { createComponentRenderer } from '@/__tests__/render';

const renderComponent = createComponentRenderer(CanvasEdge, {
	props: {
		sourceX: 0,
		sourceY: 0,
		sourcePosition: 'top',
		targetX: 100,
		targetY: 100,
		targetPosition: 'bottom',
	},
});

describe('CanvasEdge', () => {
	it('should emit delete event when toolbar delete is clicked', async () => {
		const { emitted, getByTestId } = renderComponent();
		const deleteButton = getByTestId('delete-connection-button');

		await fireEvent.click(deleteButton);

		expect(emitted()).toHaveProperty('delete');
	});

	it('should compute edgeStyle correctly', () => {
		const { container } = renderComponent({
			props: {
				style: {
					stroke: 'red',
				},
			},
		});

		const edge = container.querySelector('.vue-flow__edge-path');

		expect(edge).toHaveStyle({
			stroke: 'red',
			strokeWidth: 2,
		});
	});
});
