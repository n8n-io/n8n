import { fireEvent, render } from '@testing-library/vue';
import { defineComponent, h, nextTick, ref, watch } from 'vue';

import N8nSidebar from './Sidebar.vue';

const BoundWidth = defineComponent({
	props: {
		start: { type: Number, required: true },
		minWidth: { type: Number, required: true },
		maxWidth: { type: Number, required: true },
	},
	setup(props) {
		const width = ref(props.start);
		watch(
			() => props.start,
			function applyStart(value) {
				width.value = value;
			},
		);
		return function renderBoundWidth() {
			return h('div', [
				h('output', { 'data-test-id': 'bound-width' }, String(width.value)),
				h(N8nSidebar, {
					width: width.value,
					minWidth: props.minWidth,
					maxWidth: props.maxWidth,
					label: 'Files',
					'onUpdate:width': function setWidth(value: number) {
						width.value = value;
					},
				}),
			]);
		};
	},
});

function renderSidebar(props: Record<string, unknown> = {}, slot = 'Notes') {
	return render(N8nSidebar, {
		props: { label: 'Files', ...props },
		slots: { default: slot },
	});
}

const storageKey = 'n8n-sidebar-width-test';

describe('N8nSidebar', () => {
	beforeEach(() => {
		window.localStorage.removeItem(storageKey);
	});

	it('renders custom content in a named sidebar', () => {
		const { getByTestId, getByRole } = renderSidebar();

		expect(getByRole('complementary', { name: 'Files' })).toHaveTextContent('Notes');
		expect(getByTestId('sidebar')).toBeTruthy();
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

		const widths = emitted<[number]>('update:width') ?? [];
		expect(widths.length).toBeGreaterThan(0);
		const nextWidth = widths.at(-1)?.[0];
		expect(nextWidth).toBeGreaterThanOrEqual(160);
		expect(nextWidth).toBeLessThanOrEqual(480);
		expect(nextWidth).not.toBe(240);
		expect(window.localStorage.getItem(storageKey)).toBeNull();
	});

	it('restores a saved width and writes the next width', async () => {
		window.localStorage.setItem(storageKey, '360');
		const { container, emitted } = renderSidebar({
			width: 240,
			minWidth: 160,
			maxWidth: 480,
			widthStorageId: storageKey,
		});

		expect(emitted('update:width')?.[0]).toEqual([360]);
		const sidebar = container.querySelector('[data-test-id="sidebar"]');
		expect(sidebar?.parentElement?.parentElement).toHaveStyle({ width: '360px' });

		const handle = container.querySelector('[data-test-id="resize-handle"]');
		await fireEvent.mouseDown(handle as Element, { clientX: 100, clientY: 20 });
		await fireEvent.mouseMove(window, { clientX: 180, clientY: 20 });
		await fireEvent.mouseUp(window, { clientX: 180, clientY: 20 });

		const nextWidth = emitted<[number]>('update:width')?.at(-1)?.[0];
		expect(nextWidth).not.toBe(360);
		expect(window.localStorage.getItem(storageKey)).toBe(String(nextWidth));
	});

	it('ignores a saved width outside the allowed range', () => {
		window.localStorage.setItem(storageKey, '900');
		const { emitted } = renderSidebar({
			width: 240,
			minWidth: 160,
			maxWidth: 480,
			widthStorageId: storageKey,
		});

		expect(emitted('update:width')).toBeUndefined();
		expect(window.localStorage.getItem(storageKey)).toBe('900');
	});

	it('keeps a resized width when the parent rerenders the same width', async () => {
		const { container, rerender } = renderSidebar({ width: 240, minWidth: 160, maxWidth: 480 });
		const root = () =>
			container.querySelector('[data-test-id="sidebar"]')?.parentElement?.parentElement;
		const handle = container.querySelector('[data-test-id="resize-handle"]');

		await fireEvent.mouseDown(handle as Element, { clientX: 100, clientY: 20 });
		await fireEvent.mouseMove(window, { clientX: 400, clientY: 20 });
		await fireEvent.mouseUp(window, { clientX: 400, clientY: 20 });

		const resizedWidth = root()?.style.width;
		expect(resizedWidth).toBeTruthy();
		expect(resizedWidth).not.toBe('240px');

		await rerender({ label: 'Files', width: 240, minWidth: 160, maxWidth: 480 });

		expect(root()?.style.width).toBe(resizedWidth);

		await rerender({ label: 'Files', width: 200, minWidth: 160, maxWidth: 480 });

		expect(root()).toHaveStyle({ width: '200px' });
	});

	it('emits the clamped width when the parent keeps the original value', async () => {
		const { emitted } = renderSidebar({ width: 40, minWidth: 160, maxWidth: 480 });

		await nextTick();

		expect(emitted('update:width')).toEqual([[160]]);
	});

	it('clamps a bound width to the configured limits', async () => {
		const { getByTestId, rerender } = render(BoundWidth, {
			props: { start: 40, minWidth: 160, maxWidth: 480 },
		});
		const root = () => getByTestId('sidebar').parentElement?.parentElement;

		await nextTick();
		expect(getByTestId('bound-width')).toHaveTextContent('160');
		expect(root()).toHaveStyle({ width: '160px' });

		await rerender({ start: 900, minWidth: 160, maxWidth: 480 });

		expect(getByTestId('bound-width')).toHaveTextContent('480');
		expect(root()).toHaveStyle({ width: '480px' });

		await rerender({ start: 480, minWidth: 200, maxWidth: 360 });

		expect(getByTestId('bound-width')).toHaveTextContent('360');
		expect(root()).toHaveStyle({ width: '360px' });
	});

	it('restores a clamped default width on double-click', async () => {
		const { container, emitted } = renderSidebar({
			width: 240,
			defaultWidth: 40,
			minWidth: 160,
			maxWidth: 480,
		});
		const handle = container.querySelector('[data-test-id="resize-handle"]');

		await fireEvent.dblClick(handle as Element, { clientX: 100, clientY: 20 });

		expect(emitted('update:width')?.at(-1)).toEqual([160]);
	});

	it('restores the starting width on double-click and saves that width', async () => {
		window.localStorage.setItem(storageKey, '360');
		const { container, emitted } = renderSidebar({
			width: 240,
			minWidth: 160,
			maxWidth: 480,
			widthStorageId: storageKey,
		});
		const handle = container.querySelector('[data-test-id="resize-handle"]');

		await fireEvent.dblClick(handle as Element, { clientX: 100, clientY: 20 });

		expect(emitted('update:width')?.at(-1)).toEqual([240]);
		expect(window.localStorage.getItem(storageKey)).toBe('240');
	});
});
