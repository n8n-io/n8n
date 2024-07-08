import { fireEvent } from '@testing-library/vue';
import CanvasEdge from './CanvasEdge.vue';
import { createComponentRenderer } from '@/__tests__/render';
import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';

const renderComponent = createComponentRenderer(CanvasEdge, {
	props: {
		sourceX: 0,
		sourceY: 0,
		sourcePosition: 'top',
		targetX: 100,
		targetY: 100,
		targetPosition: 'bottom',
		data: {
			status: undefined,
		},
	},
});

beforeEach(() => {
	const pinia = createTestingPinia();
	setActivePinia(pinia);
});

describe('CanvasEdge', () => {
	it('should emit delete event when toolbar delete is clicked', async () => {
		const { emitted, getByTestId } = renderComponent();
		const deleteButton = getByTestId('delete-connection-button');

		await fireEvent.click(deleteButton);

		expect(emitted()).toHaveProperty('delete');
	});

	it('should compute edgeStyle correctly', () => {
		const { container } = renderComponent();

		const edge = container.querySelector('.vue-flow__edge-path');

		expect(edge).toHaveStyle({
			stroke: 'var(--color-foreground-xdark)',
		});
	});
});
