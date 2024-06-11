import { fireEvent } from '@testing-library/vue';
import CanvasEdgeToolbar from './CanvasEdgeToolbar.vue';
import { createComponentRenderer } from '@/__tests__/render';

const renderComponent = createComponentRenderer(CanvasEdgeToolbar);

describe('CanvasEdgeToolbar', () => {
	it('should emit delete event when delete button is clicked', async () => {
		const { getByTestId, emitted } = renderComponent();
		const deleteButton = getByTestId('delete-connection-button');

		await fireEvent.click(deleteButton);

		expect(emitted()).toHaveProperty('delete');
	});
});
