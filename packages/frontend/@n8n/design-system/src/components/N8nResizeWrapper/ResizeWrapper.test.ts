import { fireEvent, render } from '@testing-library/vue';

import N8nResizeWrapper from './ResizeWrapper.vue';

const renderComponent = (props: Record<string, unknown> = {}) =>
	render(N8nResizeWrapper, {
		props: { supportedDirections: ['right'], ...props },
		slots: { default: '<div>content</div>' },
	});

describe('N8nResizeWrapper', () => {
	it('renders a handle per supported direction', () => {
		const { getAllByTestId } = renderComponent({ supportedDirections: ['right', 'left'] });

		expect(getAllByTestId('resize-handle')).toHaveLength(2);
	});

	it('marks the dragged handle active for the duration of the drag', async () => {
		const { getByTestId, emitted } = renderComponent();
		const handle = getByTestId('resize-handle');

		await fireEvent.mouseDown(handle, { pageX: 100, pageY: 100 });
		expect(handle.className).toContain('active');
		expect(emitted('resizestart')).toHaveLength(1);

		await fireEvent.mouseUp(window, { pageX: 120, pageY: 100 });
		expect(handle.className).not.toContain('active');
		expect(emitted('resizeend')).toHaveLength(1);
	});
});
