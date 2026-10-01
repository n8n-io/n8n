import { fireEvent, render } from '@testing-library/vue';
import { computed } from 'vue';

import N8nResizeWrapper from './ResizeWrapper.vue';
import type { ResizablePanel } from '../../composables/useResizablePanel';

function renderComponent(props: Record<string, unknown> = {}) {
	return render(N8nResizeWrapper, {
		props: { supportedDirections: ['right'], ...props },
		slots: { default: '<div>content</div>' },
	});
}

function createResizer(options: { isCollapsed?: boolean; isFullSize?: boolean }): ResizablePanel {
	return {
		width: computed(function getWidth() {
			return 300;
		}),
		height: computed(function getHeight() {
			return 300;
		}),
		isCollapsed: computed(function getIsCollapsed() {
			return options.isCollapsed ?? false;
		}),
		isFullSize: computed(function getIsFullSize() {
			return options.isFullSize ?? false;
		}),
		isWidthCollapsed: computed(function getIsWidthCollapsed() {
			return options.isCollapsed ?? false;
		}),
		isHeightCollapsed: computed(function getIsHeightCollapsed() {
			return false;
		}),
		isWidthFullSize: computed(function getIsWidthFullSize() {
			return options.isFullSize ?? false;
		}),
		isHeightFullSize: computed(function getIsHeightFullSize() {
			return false;
		}),
		isResizing: computed(function getIsResizing() {
			return false;
		}),
		activeDirection: computed(function getActiveDirection() {
			return undefined;
		}),
		startResize: vi.fn(),
		resetSize: vi.fn(),
		cleanupResize: vi.fn(),
	};
}

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

	it('marks a right handle at the minimum width', () => {
		const { getByTestId } = renderComponent({ width: 100, minWidth: 100 });

		expect(getByTestId('resize-handle').className).toContain('atMinLimit');
	});

	it('marks a right handle at the maximum width', () => {
		const { getByTestId } = renderComponent({ width: 500, maxWidth: 500 });

		expect(getByTestId('resize-handle').className).toContain('atMaxLimit');
	});

	it('uses height limits for a top handle', () => {
		const { getByTestId } = renderComponent({
			supportedDirections: ['top'],
			width: 300,
			minWidth: 100,
			height: 100,
			minHeight: 100,
		});

		expect(getByTestId('resize-handle').className).toContain('atMinLimit');
	});

	it('uses width and height limits for a corner handle', () => {
		const { getByTestId } = renderComponent({
			supportedDirections: ['bottomRight'],
			width: 300,
			minWidth: 100,
			height: 500,
			maxHeight: 500,
		});

		expect(getByTestId('resize-handle').className).toContain('atMaxLimit');
	});

	it('does not mark a handle when its size is within the limits', () => {
		const { getByTestId } = renderComponent({
			width: 300,
			minWidth: 100,
			maxWidth: 500,
		});
		const handle = getByTestId('resize-handle');

		expect(handle.className).not.toContain('atMinLimit');
		expect(handle.className).not.toContain('atMaxLimit');
	});

	it.each([
		{ state: 'collapsed', resizer: createResizer({ isCollapsed: true }), className: 'atMinLimit' },
		{ state: 'full size', resizer: createResizer({ isFullSize: true }), className: 'atMaxLimit' },
	])('gives the $state state priority over size limits', ({ resizer, className }) => {
		const { getByTestId } = renderComponent({
			resizer,
			minWidth: 100,
			maxWidth: 200,
		});

		expect(getByTestId('resize-handle').className).toContain(className);
	});
});
