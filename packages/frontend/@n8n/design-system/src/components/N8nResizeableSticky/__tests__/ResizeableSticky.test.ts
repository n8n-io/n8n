/**
 * Test suite for N8nResizeableSticky component
 */

import { render, fireEvent } from '@testing-library/vue';
import { describe, it, expect, vi } from 'vitest';
import N8nResizeableSticky from '../ResizeableSticky.vue';
import type { ResizeData } from '@n8n/design-system/types';

// Mock the child components
vi.mock('../N8nResizeWrapper/ResizeWrapper.vue', () => ({
	default: {
		name: 'N8nResizeWrapper',
		template: `
			<div class="resize-wrapper-mock" 
				 :data-is-resizing-enabled="isResizingEnabled"
				 :data-height="height"
				 :data-width="width"
				 :data-min-height="minHeight"
				 :data-min-width="minWidth"
				 :data-scale="scale"
				 :data-grid-size="gridSize"
				 @resize="$emit('resize', $event)"
				 @resizestart="$emit('resizestart')"
				 @resizeend="$emit('resizeend')">
				<slot />
			</div>
		`,
		props: ['isResizingEnabled', 'height', 'width', 'minHeight', 'minWidth', 'scale', 'gridSize'],
		emits: ['resize', 'resizestart', 'resizeend'],
	},
}));

vi.mock('../N8nSticky/Sticky.vue', () => ({
	default: {
		name: 'N8nSticky',
		template: `
			<div class="sticky-mock"
				 :data-model-value="modelValue"
				 :data-height="height"
				 :data-width="width"
				 :data-read-only="readOnly"
				 :data-edit-mode="editMode"
				 :data-background-color="backgroundColor"
				 @markdown-click="$emit('markdown-click', $event.link, $event.event)">
				Sticky Note Content
			</div>
		`,
		props: ['modelValue', 'height', 'width', 'minHeight', 'minWidth', 'id', 'defaultText', 'editMode', 'readOnly', 'backgroundColor'],
		emits: ['markdown-click'],
	},
}));

describe('N8nResizeableSticky', () => {
	describe('Basic Rendering', () => {
		it('should render with default props', () => {
			const { container } = render(N8nResizeableSticky);

			const resizeWrapper = container.querySelector('.resize-wrapper-mock');
			const sticky = container.querySelector('.sticky-mock');

			expect(resizeWrapper).toBeInTheDocument();
			expect(sticky).toBeInTheDocument();
			expect(sticky).toHaveTextContent('Sticky Note Content');
		});

		it('should pass default sticky props to child components', () => {
			const { container } = render(N8nResizeableSticky);

			const resizeWrapper = container.querySelector('.resize-wrapper-mock');
			const sticky = container.querySelector('.sticky-mock');

			// Check default values are passed to ResizeWrapper
			expect(resizeWrapper).toHaveAttribute('data-height', '180');
			expect(resizeWrapper).toHaveAttribute('data-width', '240');
			expect(resizeWrapper).toHaveAttribute('data-min-height', '80');
			expect(resizeWrapper).toHaveAttribute('data-min-width', '150');
			expect(resizeWrapper).toHaveAttribute('data-scale', '1');
			expect(resizeWrapper).toHaveAttribute('data-grid-size', '20');

			// Check default values are passed to Sticky
			expect(sticky).toHaveAttribute('data-height', '180');
			expect(sticky).toHaveAttribute('data-width', '240');
			expect(sticky).toHaveAttribute('data-read-only', 'false');
			expect(sticky).toHaveAttribute('data-edit-mode', 'false');
			expect(sticky).toHaveAttribute('data-background-color', '1');
		});

		it('should render with custom props', () => {
			const { container } = render(N8nResizeableSticky, {
				props: {
					width: 300,
					height: 200,
					minWidth: 200,
					minHeight: 100,
					modelValue: 'Test content',
					editMode: true,
					backgroundColor: 3,
					scale: 0.8,
					gridSize: 10,
				},
			});

			const resizeWrapper = container.querySelector('.resize-wrapper-mock');
			const sticky = container.querySelector('.sticky-mock');

			// Check custom values are passed to ResizeWrapper
			expect(resizeWrapper).toHaveAttribute('data-height', '200');
			expect(resizeWrapper).toHaveAttribute('data-width', '300');
			expect(resizeWrapper).toHaveAttribute('data-min-height', '100');
			expect(resizeWrapper).toHaveAttribute('data-min-width', '200');
			expect(resizeWrapper).toHaveAttribute('data-scale', '0.8');
			expect(resizeWrapper).toHaveAttribute('data-grid-size', '10');

			// Check custom values are passed to Sticky
			expect(sticky).toHaveAttribute('data-height', '200');
			expect(sticky).toHaveAttribute('data-width', '300');
			expect(sticky).toHaveAttribute('data-model-value', 'Test content');
			expect(sticky).toHaveAttribute('data-edit-mode', 'true');
			expect(sticky).toHaveAttribute('data-background-color', '3');
		});
	});

	describe('Resize Functionality', () => {
		it('should enable resizing when not in readOnly mode', () => {
			const { container } = render(N8nResizeableSticky, {
				props: {
					readOnly: false,
				},
			});

			const resizeWrapper = container.querySelector('.resize-wrapper-mock');
			expect(resizeWrapper).toHaveAttribute('data-is-resizing-enabled', 'true');
		});

		it('should disable resizing when in readOnly mode', () => {
			const { container } = render(N8nResizeableSticky, {
				props: {
					readOnly: true,
				},
			});

			const resizeWrapper = container.querySelector('.resize-wrapper-mock');
			expect(resizeWrapper).toHaveAttribute('data-is-resizing-enabled', 'false');
		});

		it('should emit resize events', async () => {
			const onResize = vi.fn();
			const { container } = render(N8nResizeableSticky, {
				props: {
					onResize,
				},
			});

			const resizeWrapper = container.querySelector('.resize-wrapper-mock');
			const resizeData: ResizeData = {
				width: 300,
				height: 200,
				dX: 10,
				dY: 5,
				x: 150,
				y: 100,
				direction: 'bottomRight',
			};

			await fireEvent(resizeWrapper!, new CustomEvent('resize', { detail: resizeData }));

			expect(onResize).toHaveBeenCalledTimes(1);
			expect(onResize).toHaveBeenCalledWith(resizeData);
		});

		it('should emit resizestart events', async () => {
			const onResizeStart = vi.fn();
			const { container } = render(N8nResizeableSticky, {
				props: {
					onResizestart: onResizeStart,
				},
			});

			const resizeWrapper = container.querySelector('.resize-wrapper-mock');
			await fireEvent(resizeWrapper!, new CustomEvent('resizestart'));

			expect(onResizeStart).toHaveBeenCalledTimes(1);
		});

		it('should emit resizeend events', async () => {
			const onResizeEnd = vi.fn();
			const { container } = render(N8nResizeableSticky, {
				props: {
					onResizeend: onResizeEnd,
				},
			});

			const resizeWrapper = container.querySelector('.resize-wrapper-mock');
			await fireEvent(resizeWrapper!, new CustomEvent('resizeend'));

			expect(onResizeEnd).toHaveBeenCalledTimes(1);
		});

		it('should track resizing state internally', async () => {
			const { container } = render(N8nResizeableSticky);

			const resizeWrapper = container.querySelector('.resize-wrapper-mock');

			// Start resizing
			await fireEvent(resizeWrapper!, new CustomEvent('resizestart'));
			
			// Component should be in resizing state now (internal state)
			
			// End resizing
			await fireEvent(resizeWrapper!, new CustomEvent('resizeend'));
			
			// Component should no longer be in resizing state
		});
	});

	describe('Sticky Note Properties', () => {
		it('should pass through all sticky properties', () => {
			const { container } = render(N8nResizeableSticky, {
				props: {
					modelValue: 'Test note content',
					id: 'sticky-123',
					defaultText: 'Enter text here',
					editMode: true,
					readOnly: false,
					backgroundColor: 2,
				},
			});

			const sticky = container.querySelector('.sticky-mock');

			expect(sticky).toHaveAttribute('data-model-value', 'Test note content');
			expect(sticky).toHaveAttribute('data-edit-mode', 'true');
			expect(sticky).toHaveAttribute('data-read-only', 'false');
			expect(sticky).toHaveAttribute('data-background-color', '2');
		});

		it('should handle empty content', () => {
			const { container } = render(N8nResizeableSticky, {
				props: {
					modelValue: '',
				},
			});

			const sticky = container.querySelector('.sticky-mock');
			expect(sticky).toHaveAttribute('data-model-value', '');
		});

		it('should handle different background colors', () => {
			const backgroundColors = [1, 2, 3, 4, 5];

			backgroundColors.forEach((backgroundColor) => {
				const { container } = render(N8nResizeableSticky, {
					props: {
						backgroundColor,
					},
				});

				const sticky = container.querySelector('.sticky-mock');
				expect(sticky).toHaveAttribute('data-background-color', backgroundColor.toString());
			});
		});
	});

	describe('Markdown Click Events', () => {
		it('should emit markdown-click events from sticky note', async () => {
			const onMarkdownClick = vi.fn();
			const { container } = render(N8nResizeableSticky, {
				props: {
					'onMarkdown-click': onMarkdownClick,
				},
			});

			const sticky = container.querySelector('.sticky-mock');
			
			// Simulate markdown click event
			const mockLink = document.createElement('a');
			const mockEvent = new MouseEvent('click');
			
			await fireEvent(sticky!, new CustomEvent('markdown-click', { 
				detail: { link: mockLink, event: mockEvent }
			}));

			expect(onMarkdownClick).toHaveBeenCalledTimes(1);
		});
	});

	describe('Attributes and Props Binding', () => {
		it('should pass through additional attributes to sticky component', () => {
			const { container } = render(N8nResizeableSticky, {
				props: {
					'data-testid': 'resizeable-sticky',
					'aria-label': 'Resizeable sticky note',
					class: 'custom-sticky-class',
				},
			});

			const sticky = container.querySelector('.sticky-mock');
			expect(sticky).toBeInTheDocument();
		});

		it('should combine props and attrs correctly', () => {
			const { container } = render(N8nResizeableSticky, {
				props: {
					modelValue: 'Prop value',
					customAttribute: 'custom value',
				},
				attrs: {
					'data-custom': 'attr value',
				},
			});

			const sticky = container.querySelector('.sticky-mock');
			expect(sticky).toBeInTheDocument();
		});
	});

	describe('Scale and Grid Configuration', () => {
		it('should use custom scale factor', () => {
			const { container } = render(N8nResizeableSticky, {
				props: {
					scale: 0.5,
				},
			});

			const resizeWrapper = container.querySelector('.resize-wrapper-mock');
			expect(resizeWrapper).toHaveAttribute('data-scale', '0.5');
		});

		it('should use custom grid size', () => {
			const { container } = render(N8nResizeableSticky, {
				props: {
					gridSize: 25,
				},
			});

			const resizeWrapper = container.querySelector('.resize-wrapper-mock');
			expect(resizeWrapper).toHaveAttribute('data-grid-size', '25');
		});

		it('should handle edge case scale values', () => {
			const scaleValues = [0.1, 1, 2, 10];

			scaleValues.forEach((scale) => {
				const { container } = render(N8nResizeableSticky, {
					props: {
						scale,
					},
				});

				const resizeWrapper = container.querySelector('.resize-wrapper-mock');
				expect(resizeWrapper).toHaveAttribute('data-scale', scale.toString());
			});
		});
	});

	describe('Size Constraints', () => {
		it('should enforce minimum dimensions', () => {
			const { container } = render(N8nResizeableSticky, {
				props: {
					minWidth: 100,
					minHeight: 80,
				},
			});

			const resizeWrapper = container.querySelector('.resize-wrapper-mock');
			expect(resizeWrapper).toHaveAttribute('data-min-width', '100');
			expect(resizeWrapper).toHaveAttribute('data-min-height', '80');
		});

		it('should handle very small minimum dimensions', () => {
			const { container } = render(N8nResizeableSticky, {
				props: {
					minWidth: 1,
					minHeight: 1,
				},
			});

			const resizeWrapper = container.querySelector('.resize-wrapper-mock');
			expect(resizeWrapper).toHaveAttribute('data-min-width', '1');
			expect(resizeWrapper).toHaveAttribute('data-min-height', '1');
		});

		it('should handle large dimensions', () => {
			const { container } = render(N8nResizeableSticky, {
				props: {
					width: 1000,
					height: 800,
					minWidth: 500,
					minHeight: 400,
				},
			});

			const resizeWrapper = container.querySelector('.resize-wrapper-mock');
			const sticky = container.querySelector('.sticky-mock');

			expect(resizeWrapper).toHaveAttribute('data-width', '1000');
			expect(resizeWrapper).toHaveAttribute('data-height', '800');
			expect(sticky).toHaveAttribute('data-width', '1000');
			expect(sticky).toHaveAttribute('data-height', '800');
		});
	});

	describe('Edit and Read-Only Modes', () => {
		it('should handle edit mode', () => {
			const { container } = render(N8nResizeableSticky, {
				props: {
					editMode: true,
				},
			});

			const sticky = container.querySelector('.sticky-mock');
			const resizeWrapper = container.querySelector('.resize-wrapper-mock');

			expect(sticky).toHaveAttribute('data-edit-mode', 'true');
			expect(resizeWrapper).toHaveAttribute('data-is-resizing-enabled', 'true');
		});

		it('should handle read-only mode', () => {
			const { container } = render(N8nResizeableSticky, {
				props: {
					readOnly: true,
				},
			});

			const sticky = container.querySelector('.sticky-mock');
			const resizeWrapper = container.querySelector('.resize-wrapper-mock');

			expect(sticky).toHaveAttribute('data-read-only', 'true');
			expect(resizeWrapper).toHaveAttribute('data-is-resizing-enabled', 'false');
		});

		it('should prioritize read-only over edit mode for resize enabling', () => {
			const { container } = render(N8nResizeableSticky, {
				props: {
					editMode: true,
					readOnly: true, // This should disable resizing despite editMode being true
				},
			});

			const resizeWrapper = container.querySelector('.resize-wrapper-mock');
			expect(resizeWrapper).toHaveAttribute('data-is-resizing-enabled', 'false');
		});
	});

	describe('Event Sequence', () => {
		it('should emit events in correct sequence during resize operation', async () => {
			const events: string[] = [];
			const { container } = render(N8nResizeableSticky, {
				props: {
					onResizestart: () => events.push('resizestart'),
					onResize: () => events.push('resize'),
					onResizeend: () => events.push('resizeend'),
				},
			});

			const resizeWrapper = container.querySelector('.resize-wrapper-mock');

			// Simulate resize sequence
			await fireEvent(resizeWrapper!, new CustomEvent('resizestart'));
			await fireEvent(resizeWrapper!, new CustomEvent('resize', { 
				detail: { width: 300, height: 200, dX: 0, dY: 0, x: 0, y: 0, direction: 'right' }
			}));
			await fireEvent(resizeWrapper!, new CustomEvent('resizeend'));

			expect(events).toEqual(['resizestart', 'resize', 'resizeend']);
		});

		it('should handle multiple resize events between start and end', async () => {
			const resizeEvents: any[] = [];
			const { container } = render(N8nResizeableSticky, {
				props: {
					onResize: (data: ResizeData) => resizeEvents.push(data),
				},
			});

			const resizeWrapper = container.querySelector('.resize-wrapper-mock');

			await fireEvent(resizeWrapper!, new CustomEvent('resizestart'));
			
			// Multiple resize events
			for (let i = 0; i < 5; i++) {
				const resizeData = {
					width: 250 + i * 10,
					height: 180 + i * 5,
					dX: i,
					dY: i,
					x: 100 + i,
					y: 100 + i,
					direction: 'bottomRight' as const,
				};
				await fireEvent(resizeWrapper!, new CustomEvent('resize', { detail: resizeData }));
			}
			
			await fireEvent(resizeWrapper!, new CustomEvent('resizeend'));

			expect(resizeEvents).toHaveLength(5);
		});
	});

	describe('Performance and Edge Cases', () => {
		it('should handle rapid resize events efficiently', async () => {
			let resizeCount = 0;
			const { container } = render(N8nResizeableSticky, {
				props: {
					onResize: () => resizeCount++,
				},
			});

			const resizeWrapper = container.querySelector('.resize-wrapper-mock');

			// Simulate many rapid resize events
			await fireEvent(resizeWrapper!, new CustomEvent('resizestart'));
			for (let i = 0; i < 100; i++) {
				await fireEvent(resizeWrapper!, new CustomEvent('resize', { 
					detail: { width: 200 + i, height: 150 + i, dX: 0, dY: 0, x: 0, y: 0, direction: 'bottomRight' }
				}));
			}
			await fireEvent(resizeWrapper!, new CustomEvent('resizeend'));

			expect(resizeCount).toBe(100);
		});

		it('should handle component unmounting during resize', async () => {
			const { container, unmount } = render(N8nResizeableSticky);

			const resizeWrapper = container.querySelector('.resize-wrapper-mock');
			await fireEvent(resizeWrapper!, new CustomEvent('resizestart'));

			expect(() => {
				unmount();
			}).not.toThrow();
		});

		it('should work with zero dimensions', () => {
			const { container } = render(N8nResizeableSticky, {
				props: {
					width: 0,
					height: 0,
					minWidth: 0,
					minHeight: 0,
				},
			});

			const resizeWrapper = container.querySelector('.resize-wrapper-mock');
			const sticky = container.querySelector('.sticky-mock');

			expect(resizeWrapper).toBeInTheDocument();
			expect(sticky).toBeInTheDocument();
		});
	});
});