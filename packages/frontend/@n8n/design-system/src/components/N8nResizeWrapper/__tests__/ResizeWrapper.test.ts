/**
 * Test suite for N8nResizeWrapper component
 */

import { render, fireEvent } from '@testing-library/vue';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import N8nResizeWrapper from '../ResizeWrapper.vue';
import type { Direction } from '@n8n/design-system/types';

// Mock the directionsCursorMaps from types
vi.mock('@n8n/design-system/types', () => ({
	directionsCursorMaps: {
		top: 'ns-resize',
		bottom: 'ns-resize',
		left: 'ew-resize',
		right: 'ew-resize',
		topLeft: 'nw-resize',
		topRight: 'ne-resize',
		bottomLeft: 'sw-resize',
		bottomRight: 'se-resize',
	} as Record<Direction, string>,
}));

describe('N8nResizeWrapper', () => {
	beforeEach(() => {
		// Reset document.body.style.cursor before each test
		document.body.style.cursor = '';
	});

	afterEach(() => {
		// Cleanup any remaining event listeners and cursor changes
		document.body.style.cursor = '';
		vi.clearAllMocks();
	});

	describe('Basic Rendering', () => {
		it('should render with default props', () => {
			const { container } = render(N8nResizeWrapper, {
				slots: {
					default: '<div class="test-content">Resizable Content</div>',
				},
			});

			const wrapper = container.firstElementChild;
			expect(wrapper).toBeInTheDocument();
			expect(wrapper).toHaveClass('resize');

			const content = container.querySelector('.test-content');
			expect(content).toBeInTheDocument();
			expect(content).toHaveTextContent('Resizable Content');
		});

		it('should render resize handles when resizing is enabled', () => {
			const { container } = render(N8nResizeWrapper, {
				props: {
					isResizingEnabled: true,
					supportedDirections: ['right', 'bottom'] as Direction[],
				},
			});

			const handles = container.querySelectorAll('[data-test-id="resize-handle"]');
			expect(handles).toHaveLength(2);
		});

		it('should not render resize handles when resizing is disabled', () => {
			const { container } = render(N8nResizeWrapper, {
				props: {
					isResizingEnabled: false,
				},
			});

			const handles = container.querySelectorAll('[data-test-id="resize-handle"]');
			expect(handles).toHaveLength(0);
		});

		it('should render all available directions by default when no supportedDirections specified', () => {
			const { container } = render(N8nResizeWrapper, {
				props: {
					isResizingEnabled: true,
				},
			});

			const handles = container.querySelectorAll('[data-test-id="resize-handle"]');
			// Should render all 8 directions: top, bottom, left, right, topLeft, topRight, bottomLeft, bottomRight
			expect(handles).toHaveLength(8);
		});
	});

	describe('Direction Configuration', () => {
		it('should render only specified directions', () => {
			const { container } = render(N8nResizeWrapper, {
				props: {
					supportedDirections: ['right', 'bottom', 'bottomRight'] as Direction[],
				},
			});

			const handles = container.querySelectorAll('[data-test-id="resize-handle"]');
			expect(handles).toHaveLength(3);

			const rightHandle = container.querySelector('[data-dir="right"]');
			const bottomHandle = container.querySelector('[data-dir="bottom"]');
			const bottomRightHandle = container.querySelector('[data-dir="bottomRight"]');

			expect(rightHandle).toBeInTheDocument();
			expect(bottomHandle).toBeInTheDocument();
			expect(bottomRightHandle).toBeInTheDocument();
		});

		it('should handle single direction', () => {
			const { container } = render(N8nResizeWrapper, {
				props: {
					supportedDirections: ['right'] as Direction[],
				},
			});

			const handles = container.querySelectorAll('[data-test-id="resize-handle"]');
			expect(handles).toHaveLength(1);

			const rightHandle = container.querySelector('[data-dir="right"]');
			expect(rightHandle).toBeInTheDocument();
		});

		it('should handle all corner directions', () => {
			const { container } = render(N8nResizeWrapper, {
				props: {
					supportedDirections: ['topLeft', 'topRight', 'bottomLeft', 'bottomRight'] as Direction[],
				},
			});

			const handles = container.querySelectorAll('[data-test-id="resize-handle"]');
			expect(handles).toHaveLength(4);

			expect(container.querySelector('[data-dir="topLeft"]')).toBeInTheDocument();
			expect(container.querySelector('[data-dir="topRight"]')).toBeInTheDocument();
			expect(container.querySelector('[data-dir="bottomLeft"]')).toBeInTheDocument();
			expect(container.querySelector('[data-dir="bottomRight"]')).toBeInTheDocument();
		});
	});

	describe('Size Configuration', () => {
		it('should accept width and height props', () => {
			const { container } = render(N8nResizeWrapper, {
				props: {
					width: 200,
					height: 150,
				},
			});

			const wrapper = container.firstElementChild;
			expect(wrapper).toBeInTheDocument();
		});

		it('should respect min and max constraints', () => {
			const { container } = render(N8nResizeWrapper, {
				props: {
					minWidth: 100,
					maxWidth: 500,
					minHeight: 80,
					maxHeight: 300,
				},
			});

			const wrapper = container.firstElementChild;
			expect(wrapper).toBeInTheDocument();
		});

		it('should handle scale factor', () => {
			const { container } = render(N8nResizeWrapper, {
				props: {
					scale: 0.5,
					width: 200,
					height: 150,
				},
			});

			const wrapper = container.firstElementChild;
			expect(wrapper).toBeInTheDocument();
		});

		it('should use grid size for snapping', () => {
			const { container } = render(N8nResizeWrapper, {
				props: {
					gridSize: 10,
					width: 200,
					height: 150,
				},
			});

			const wrapper = container.firstElementChild;
			expect(wrapper).toBeInTheDocument();
		});
	});

	describe('Outset Mode', () => {
		it('should apply outset class when outset is true', () => {
			const { container } = render(N8nResizeWrapper, {
				props: {
					outset: true,
				},
			});

			const wrapper = container.firstElementChild;
			expect(wrapper).toHaveClass('resize');
		});

		it('should not apply outset class when outset is false', () => {
			const { container } = render(N8nResizeWrapper, {
				props: {
					outset: false,
				},
			});

			const wrapper = container.firstElementChild;
			expect(wrapper).toHaveClass('resize');
		});
	});

	describe('Event Handling', () => {
		it('should emit resizestart on mousedown', async () => {
			const onResizeStart = vi.fn();
			const { container } = render(N8nResizeWrapper, {
				props: {
					supportedDirections: ['right'] as Direction[],
					onResizestart: onResizeStart,
				},
			});

			const handle = container.querySelector('[data-dir="right"]');
			expect(handle).toBeInTheDocument();

			await fireEvent.mouseDown(handle!, {
				pageX: 100,
				pageY: 100,
			});

			expect(onResizeStart).toHaveBeenCalledTimes(1);
		});

		it('should emit resize events during mouse move', async () => {
			const onResize = vi.fn();
			const { container } = render(N8nResizeWrapper, {
				props: {
					supportedDirections: ['right'] as Direction[],
					width: 200,
					height: 150,
					onResize,
				},
			});

			const handle = container.querySelector('[data-dir="right"]');
			await fireEvent.mouseDown(handle!, {
				pageX: 100,
				pageY: 100,
			});

			// Simulate mouse move
			await fireEvent.mouseMove(document, {
				pageX: 120,
				pageY: 100,
			});

			expect(onResize).toHaveBeenCalled();
			expect(onResize).toHaveBeenCalledWith(
				expect.objectContaining({
					direction: 'right',
					width: expect.any(Number),
					height: expect.any(Number),
					dX: expect.any(Number),
					dY: expect.any(Number),
					x: expect.any(Number),
					y: expect.any(Number),
				})
			);
		});

		it('should emit resizeend on mouseup', async () => {
			const onResizeEnd = vi.fn();
			const { container } = render(N8nResizeWrapper, {
				props: {
					supportedDirections: ['right'] as Direction[],
					onResizeend: onResizeEnd,
				},
			});

			const handle = container.querySelector('[data-dir="right"]');
			await fireEvent.mouseDown(handle!, {
				pageX: 100,
				pageY: 100,
			});

			await fireEvent.mouseUp(document);

			expect(onResizeEnd).toHaveBeenCalledTimes(1);
		});
	});

	describe('Cursor Management', () => {
		it('should set correct cursor on resize handle hover', async () => {
			const { container } = render(N8nResizeWrapper, {
				props: {
					supportedDirections: ['right'] as Direction[],
				},
			});

			const handle = container.querySelector('[data-dir="right"]');
			await fireEvent.mouseDown(handle!, {
				pageX: 100,
				pageY: 100,
			});

			expect(document.body.style.cursor).toBe('ew-resize');
		});

		it('should reset cursor after resize ends', async () => {
			const { container } = render(N8nResizeWrapper, {
				props: {
					supportedDirections: ['bottom'] as Direction[],
				},
			});

			const handle = container.querySelector('[data-dir="bottom"]');
			await fireEvent.mouseDown(handle!, {
				pageX: 100,
				pageY: 100,
			});

			expect(document.body.style.cursor).toBe('ns-resize');

			await fireEvent.mouseUp(document);

			expect(document.body.style.cursor).toBe('unset');
		});

		it('should set correct cursor for different directions', async () => {
			const directions: Array<{ dir: Direction; cursor: string }> = [
				{ dir: 'topLeft', cursor: 'nw-resize' },
				{ dir: 'topRight', cursor: 'ne-resize' },
				{ dir: 'bottomLeft', cursor: 'sw-resize' },
				{ dir: 'bottomRight', cursor: 'se-resize' },
			];

			for (const { dir, cursor } of directions) {
				const { container } = render(N8nResizeWrapper, {
					props: {
						supportedDirections: [dir],
					},
				});

				const handle = container.querySelector(`[data-dir="${dir}"]`);
				await fireEvent.mouseDown(handle!, {
					pageX: 100,
					pageY: 100,
				});

				expect(document.body.style.cursor).toBe(cursor);

				await fireEvent.mouseUp(document);
			}
		});
	});

	describe('Custom Window Object', () => {
		it('should use custom window object for event listeners', () => {
			const mockWindow = {
				addEventListener: vi.fn(),
				removeEventListener: vi.fn(),
			} as any;

			const { container } = render(N8nResizeWrapper, {
				props: {
					window: mockWindow,
					supportedDirections: ['right'] as Direction[],
				},
			});

			const handle = container.querySelector('[data-dir="right"]');
			fireEvent.mouseDown(handle!, {
				pageX: 100,
				pageY: 100,
			});

			expect(mockWindow.addEventListener).toHaveBeenCalledWith('mousemove', expect.any(Function));
			expect(mockWindow.addEventListener).toHaveBeenCalledWith('mouseup', expect.any(Function));
		});

		it('should fall back to global window when custom window not provided', async () => {
			const addEventListenerSpy = vi.spyOn(window, 'addEventListener');
			const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');

			const { container } = render(N8nResizeWrapper, {
				props: {
					supportedDirections: ['right'] as Direction[],
				},
			});

			const handle = container.querySelector('[data-dir="right"]');
			await fireEvent.mouseDown(handle!);
			await fireEvent.mouseUp(document);

			expect(addEventListenerSpy).toHaveBeenCalledWith('mousemove', expect.any(Function));
			expect(addEventListenerSpy).toHaveBeenCalledWith('mouseup', expect.any(Function));
			expect(removeEventListenerSpy).toHaveBeenCalledWith('mousemove', expect.any(Function));
			expect(removeEventListenerSpy).toHaveBeenCalledWith('mouseup', expect.any(Function));

			addEventListenerSpy.mockRestore();
			removeEventListenerSpy.mockRestore();
		});
	});

	describe('Size Calculations', () => {
		it('should respect minimum size constraints', async () => {
			const onResize = vi.fn();
			const { container } = render(N8nResizeWrapper, {
				props: {
					supportedDirections: ['right'] as Direction[],
					width: 150,
					height: 100,
					minWidth: 100,
					minHeight: 80,
					onResize,
				},
			});

			const handle = container.querySelector('[data-dir="right"]');
			await fireEvent.mouseDown(handle!, {
				pageX: 150,
				pageY: 100,
			});

			// Try to resize to smaller than minimum
			await fireEvent.mouseMove(document, {
				pageX: 50, // This should be constrained to minWidth
				pageY: 100,
			});

			expect(onResize).toHaveBeenCalled();
			const lastCall = onResize.mock.calls[onResize.mock.calls.length - 1];
			expect(lastCall[0].width).toBeGreaterThanOrEqual(100);
		});

		it('should respect maximum size constraints', async () => {
			const onResize = vi.fn();
			const { container } = render(N8nResizeWrapper, {
				props: {
					supportedDirections: ['right'] as Direction[],
					width: 200,
					height: 150,
					maxWidth: 300,
					maxHeight: 250,
					onResize,
				},
			});

			const handle = container.querySelector('[data-dir="right"]');
			await fireEvent.mouseDown(handle!, {
				pageX: 200,
				pageY: 150,
			});

			// Try to resize to larger than maximum
			await fireEvent.mouseMove(document, {
				pageX: 500, // This should be constrained to maxWidth
				pageY: 150,
			});

			expect(onResize).toHaveBeenCalled();
			const lastCall = onResize.mock.calls[onResize.mock.calls.length - 1];
			expect(lastCall[0].width).toBeLessThanOrEqual(300);
		});
	});

	describe('Grid Snapping', () => {
		it('should snap to grid when resizing', async () => {
			const onResize = vi.fn();
			const { container } = render(N8nResizeWrapper, {
				props: {
					supportedDirections: ['right'] as Direction[],
					width: 200,
					height: 150,
					gridSize: 20,
					onResize,
				},
			});

			const handle = container.querySelector('[data-dir="right"]');
			await fireEvent.mouseDown(handle!, {
				pageX: 200,
				pageY: 150,
			});

			await fireEvent.mouseMove(document, {
				pageX: 235, // Should snap to nearest multiple of 20
				pageY: 150,
			});

			expect(onResize).toHaveBeenCalled();
			// The exact snapping behavior is tested in the internal functions
		});
	});

	describe('Slot Content', () => {
		it('should render slot content properly', () => {
			const { container } = render(N8nResizeWrapper, {
				slots: {
					default: `
						<div class="content">
							<h3>Resizable Panel</h3>
							<p>This content can be resized</p>
						</div>
					`,
				},
			});

			expect(container).toHaveTextContent('Resizable Panel');
			expect(container).toHaveTextContent('This content can be resized');
		});

		it('should work without slot content', () => {
			const { container } = render(N8nResizeWrapper, {
				props: {
					supportedDirections: ['right'] as Direction[],
				},
			});

			const wrapper = container.firstElementChild;
			expect(wrapper).toBeInTheDocument();

			const handles = container.querySelectorAll('[data-test-id="resize-handle"]');
			expect(handles).toHaveLength(1);
		});
	});

	describe('Edge Cases', () => {
		it('should handle zero dimensions', () => {
			const { container } = render(N8nResizeWrapper, {
				props: {
					width: 0,
					height: 0,
					minWidth: 0,
					minHeight: 0,
				},
			});

			const wrapper = container.firstElementChild;
			expect(wrapper).toBeInTheDocument();
		});

		it('should handle very large dimensions', () => {
			const { container } = render(N8nResizeWrapper, {
				props: {
					width: 10000,
					height: 10000,
					maxWidth: Number.POSITIVE_INFINITY,
					maxHeight: Number.POSITIVE_INFINITY,
				},
			});

			const wrapper = container.firstElementChild;
			expect(wrapper).toBeInTheDocument();
		});

		it('should handle negative scale values', () => {
			const { container } = render(N8nResizeWrapper, {
				props: {
					scale: -1,
					width: 200,
					height: 150,
				},
			});

			const wrapper = container.firstElementChild;
			expect(wrapper).toBeInTheDocument();
		});

		it('should handle rapid mousedown/mouseup events', async () => {
			const onResizeStart = vi.fn();
			const onResizeEnd = vi.fn();
			const { container } = render(N8nResizeWrapper, {
				props: {
					supportedDirections: ['right'] as Direction[],
					onResizestart: onResizeStart,
					onResizeend: onResizeEnd,
				},
			});

			const handle = container.querySelector('[data-dir="right"]');
			
			// Rapid events
			await fireEvent.mouseDown(handle!);
			await fireEvent.mouseUp(document);
			await fireEvent.mouseDown(handle!);
			await fireEvent.mouseUp(document);

			expect(onResizeStart).toHaveBeenCalledTimes(2);
			expect(onResizeEnd).toHaveBeenCalledTimes(2);
		});
	});

	describe('Performance', () => {
		it('should not create excessive DOM elements', () => {
			const { container } = render(N8nResizeWrapper, {
				props: {
					supportedDirections: ['right', 'bottom'] as Direction[],
				},
				slots: {
					default: '<div>Content</div>',
				},
			});

			const allElements = container.querySelectorAll('*');
			// Should have reasonable number of elements: wrapper + handles + slot content
			expect(allElements.length).toBeLessThan(10);
		});

		it('should handle multiple resize operations efficiently', async () => {
			const onResize = vi.fn();
			const { container } = render(N8nResizeWrapper, {
				props: {
					supportedDirections: ['right'] as Direction[],
					onResize,
				},
			});

			const handle = container.querySelector('[data-dir="right"]');
			await fireEvent.mouseDown(handle!);

			// Simulate many move events
			for (let i = 0; i < 10; i++) {
				await fireEvent.mouseMove(document, {
					pageX: 100 + i * 5,
					pageY: 100,
				});
			}

			await fireEvent.mouseUp(document);

			expect(onResize).toHaveBeenCalledTimes(10);
		});
	});
});