import { fireEvent, render } from '@testing-library/vue';

import N8nModalSidebar from './ModalSidebar.vue';

function renderSidebar(props: Record<string, unknown> = {}, slot = 'Notes') {
	return render(N8nModalSidebar, {
		props: { label: 'Files', ...props },
		slots: { default: slot },
	});
}

describe('N8nModalSidebar', () => {
	it('renders custom content in a named sidebar', () => {
		const { getByTestId, getByRole } = renderSidebar();

		expect(getByRole('complementary', { name: 'Files' })).toHaveTextContent('Notes');
		expect(getByTestId('modal-sidebar')).toBeTruthy();
	});

	it('puts the resize handle on the inner edge', () => {
		const { container: left } = renderSidebar({ side: 'left' });
		expect(left.querySelector('[data-dir="right"]')).toBeTruthy();
		expect(left.querySelector('[data-dir="left"]')).toBeNull();

		const { container: right } = renderSidebar({ side: 'right' });
		expect(right.querySelector('[data-dir="left"]')).toBeTruthy();
		expect(right.querySelector('[data-dir="right"]')).toBeNull();
	});

	it('hides the resize handle when resizing is off', () => {
		const { container } = renderSidebar({ resizable: false });

		expect(container.querySelector('[data-test-id="resize-handle"]')).toBeNull();
	});

	it('updates the width when the handle is dragged', async () => {
		const { container, emitted } = renderSidebar({ width: 240, minWidth: 160, maxWidth: 480 });
		const handle = container.querySelector('[data-test-id="resize-handle"]');
		expect(handle).toBeTruthy();

		await fireEvent.mouseDown(handle as Element, { clientX: 100, clientY: 20 });
		await fireEvent.mouseMove(window, { clientX: 400, clientY: 20 });
		await fireEvent.mouseUp(window, { clientX: 400, clientY: 20 });

		const widths = emitted('update:width') ?? [];
		expect(widths.length).toBeGreaterThan(0);
		const nextWidth = widths.at(-1)?.[0];
		expect(nextWidth).toBeGreaterThanOrEqual(160);
		expect(nextWidth).toBeLessThanOrEqual(480);
		expect(nextWidth).not.toBe(240);
	});
});
