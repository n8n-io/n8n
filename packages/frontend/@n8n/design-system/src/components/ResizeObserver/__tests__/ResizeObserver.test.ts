/**
 * Test suite for ResizeObserver component
 */

import { render, waitFor } from '@testing-library/vue';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import ResizeObserver from '../ResizeObserver.vue';
import type { BreakpointDefinition } from '../ResizeObserver.vue';

// Mock ResizeObserver API
class MockResizeObserver {
	private callback: ResizeObserverCallback;
	private elements: Set<Element> = new Set();

	constructor(callback: ResizeObserverCallback) {
		this.callback = callback;
	}

	observe(target: Element) {
		this.elements.add(target);
		// Simulate immediate observation with current dimensions
		const entry: ResizeObserverEntry = {
			target,
			contentRect: {
				width: target.getBoundingClientRect().width || 300,
				height: target.getBoundingClientRect().height || 200,
				top: 0,
				left: 0,
				bottom: 200,
				right: 300,
				x: 0,
				y: 0,
			},
			borderBoxSize: [] as any,
			contentBoxSize: [] as any,
			devicePixelContentBoxSize: [] as any,
		};

		// Use requestAnimationFrame to simulate async behavior
		requestAnimationFrame(() => {
			this.callback([entry], this);
		});
	}

	unobserve(target: Element) {
		this.elements.delete(target);
	}

	disconnect() {
		this.elements.clear();
	}

	// Test helper method to trigger resize
	triggerResize(element: Element, width: number, height: number) {
		const entry: ResizeObserverEntry = {
			target: element,
			contentRect: {
				width,
				height,
				top: 0,
				left: 0,
				bottom: height,
				right: width,
				x: 0,
				y: 0,
			},
			borderBoxSize: [] as any,
			contentBoxSize: [] as any,
			devicePixelContentBoxSize: [] as any,
		};

		requestAnimationFrame(() => {
			this.callback([entry], this);
		});
	}
}

// Store original ResizeObserver
const originalResizeObserver = global.ResizeObserver;
let mockResizeObserver: MockResizeObserver;

describe('ResizeObserver', () => {
	beforeEach(() => {
		vi.clearAllMocks();

		// Mock ResizeObserver constructor
		global.ResizeObserver = vi.fn().mockImplementation((callback) => {
			mockResizeObserver = new MockResizeObserver(callback);
			return mockResizeObserver;
		});

		// Mock getBoundingClientRect
		Element.prototype.getBoundingClientRect = vi.fn().mockReturnValue({
			width: 300,
			height: 200,
			top: 0,
			left: 0,
			bottom: 200,
			right: 300,
			x: 0,
			y: 0,
		});
	});

	afterEach(() => {
		global.ResizeObserver = originalResizeObserver;
	});

	const mockBreakpoints: BreakpointDefinition[] = [
		{ bp: 'sm', width: 640 },
		{ bp: 'md', width: 768 },
		{ bp: 'lg', width: 1024 },
		{ bp: 'xl', width: 1280 },
	];

	describe('Basic Rendering', () => {
		it('should render with default props', async () => {
			const { container } = render(ResizeObserver, {
				slots: {
					default: '<div class="test-content">Test Content</div>',
				},
			});

			const root = container.querySelector('div');
			expect(root).toBeInTheDocument();

			const content = container.querySelector('.test-content');
			expect(content).toBeInTheDocument();
			expect(content).toHaveTextContent('Test Content');
		});

		it('should render slot content with breakpoint data', async () => {
			const { container } = render(ResizeObserver, {
				props: {
					breakpoints: mockBreakpoints,
				},
				slots: {
					default: '<div class="test-content" :data-bp="props.bp">Content: {{ props.bp }}</div>',
				},
			});

			await waitFor(() => {
				const content = container.querySelector('.test-content');
				expect(content).toBeInTheDocument();
			});
		});

		it('should provide default breakpoint when no breakpoints defined', async () => {
			const TestComponent = {
				template:
					'<ResizeObserver><template #default="{ bp }"><div class="bp-display">{{ bp }}</div></template></ResizeObserver>',
				components: { ResizeObserver },
			};

			const { container } = render(TestComponent);

			await waitFor(() => {
				const bpDisplay = container.querySelector('.bp-display');
				expect(bpDisplay).toHaveTextContent('default');
			});
		});
	});

	describe('Enabled/Disabled State', () => {
		it('should observe element when enabled is true (default)', async () => {
			render(ResizeObserver, {
				props: {
					enabled: true,
				},
				slots: {
					default: '<div>Content</div>',
				},
			});

			expect(global.ResizeObserver).toHaveBeenCalled();
			expect(mockResizeObserver.observe).toBeDefined();
		});

		it('should not observe element when enabled is false', async () => {
			render(ResizeObserver, {
				props: {
					enabled: false,
				},
				slots: {
					default: '<div>Content</div>',
				},
			});

			expect(global.ResizeObserver).not.toHaveBeenCalled();
		});

		it('should default to enabled when prop not provided', async () => {
			render(ResizeObserver, {
				slots: {
					default: '<div>Content</div>',
				},
			});

			expect(global.ResizeObserver).toHaveBeenCalled();
		});
	});

	describe('Breakpoint Calculation', () => {
		it('should return correct breakpoint for different widths', async () => {
			const TestComponent = {
				template:
					'<ResizeObserver :breakpoints="breakpoints"><template #default="{ bp }"><div class="bp-display">{{ bp }}</div></template></ResizeObserver>',
				components: { ResizeObserver },
				data() {
					return {
						breakpoints: mockBreakpoints,
					};
				},
			};

			const { container } = render(TestComponent);

			// Wait for initial render and ResizeObserver to trigger
			await waitFor(() => {
				const bpDisplay = container.querySelector('.bp-display');
				expect(bpDisplay).toBeInTheDocument();
			});

			// Simulate different widths
			const root = container.querySelector('div');

			// Test width < 640 (should be 'sm')
			mockResizeObserver.triggerResize(root!, 500, 200);
			await waitFor(() => {
				const bpDisplay = container.querySelector('.bp-display');
				expect(bpDisplay).toHaveTextContent('sm');
			});

			// Test width < 768 but >= 640 (should be 'md')
			mockResizeObserver.triggerResize(root!, 700, 200);
			await waitFor(() => {
				const bpDisplay = container.querySelector('.bp-display');
				expect(bpDisplay).toHaveTextContent('md');
			});

			// Test width < 1024 but >= 768 (should be 'lg')
			mockResizeObserver.triggerResize(root!, 900, 200);
			await waitFor(() => {
				const bpDisplay = container.querySelector('.bp-display');
				expect(bpDisplay).toHaveTextContent('lg');
			});

			// Test width >= 1280 (should be 'default')
			mockResizeObserver.triggerResize(root!, 1400, 200);
			await waitFor(() => {
				const bpDisplay = container.querySelector('.bp-display');
				expect(bpDisplay).toHaveTextContent('default');
			});
		});

		it('should handle breakpoints not in sorted order', async () => {
			const unsortedBreakpoints: BreakpointDefinition[] = [
				{ bp: 'lg', width: 1024 },
				{ bp: 'sm', width: 640 },
				{ bp: 'xl', width: 1280 },
				{ bp: 'md', width: 768 },
			];

			const TestComponent = {
				template:
					'<ResizeObserver :breakpoints="breakpoints"><template #default="{ bp }"><div class="bp-display">{{ bp }}</div></template></ResizeObserver>',
				components: { ResizeObserver },
				data() {
					return {
						breakpoints: unsortedBreakpoints,
					};
				},
			};

			const { container } = render(TestComponent);

			await waitFor(() => {
				const bpDisplay = container.querySelector('.bp-display');
				expect(bpDisplay).toBeInTheDocument();
			});

			const root = container.querySelector('div');

			// Test that sorting works correctly
			mockResizeObserver.triggerResize(root!, 700, 200);
			await waitFor(() => {
				const bpDisplay = container.querySelector('.bp-display');
				expect(bpDisplay).toHaveTextContent('md'); // Should be md, not lg
			});
		});

		it('should return default when width is larger than all breakpoints', async () => {
			const TestComponent = {
				template:
					'<ResizeObserver :breakpoints="breakpoints"><template #default="{ bp }"><div class="bp-display">{{ bp }}</div></template></ResizeObserver>',
				components: { ResizeObserver },
				data() {
					return {
						breakpoints: mockBreakpoints,
					};
				},
			};

			const { container } = render(TestComponent);

			await waitFor(() => {
				const bpDisplay = container.querySelector('.bp-display');
				expect(bpDisplay).toBeInTheDocument();
			});

			const root = container.querySelector('div');

			// Test very large width
			mockResizeObserver.triggerResize(root!, 2000, 200);
			await waitFor(() => {
				const bpDisplay = container.querySelector('.bp-display');
				expect(bpDisplay).toHaveTextContent('default');
			});
		});

		it('should handle empty breakpoints array', async () => {
			const TestComponent = {
				template:
					'<ResizeObserver :breakpoints="[]"><template #default="{ bp }"><div class="bp-display">{{ bp }}</div></template></ResizeObserver>',
				components: { ResizeObserver },
			};

			const { container } = render(TestComponent);

			await waitFor(() => {
				const bpDisplay = container.querySelector('.bp-display');
				expect(bpDisplay).toHaveTextContent('default');
			});
		});
	});

	describe('ResizeObserver Lifecycle', () => {
		it('should create ResizeObserver on mount when enabled', async () => {
			render(ResizeObserver, {
				props: {
					enabled: true,
				},
				slots: {
					default: '<div>Content</div>',
				},
			});

			expect(global.ResizeObserver).toHaveBeenCalledTimes(1);
			expect(global.ResizeObserver).toHaveBeenCalledWith(expect.any(Function));
		});

		it('should observe the root element on mount', async () => {
			const observeSpy = vi.spyOn(MockResizeObserver.prototype, 'observe');

			render(ResizeObserver, {
				slots: {
					default: '<div>Content</div>',
				},
			});

			expect(observeSpy).toHaveBeenCalledTimes(1);
		});

		it('should disconnect observer on unmount', async () => {
			const disconnectSpy = vi.spyOn(MockResizeObserver.prototype, 'disconnect');

			const { unmount } = render(ResizeObserver, {
				slots: {
					default: '<div>Content</div>',
				},
			});

			unmount();

			expect(disconnectSpy).toHaveBeenCalledTimes(1);
		});

		it('should handle observer disconnect gracefully when observer is null', async () => {
			const { unmount } = render(ResizeObserver, {
				props: {
					enabled: false,
				},
				slots: {
					default: '<div>Content</div>',
				},
			});

			// Should not throw when unmounting with no observer
			expect(() => {
				unmount();
			}).not.toThrow();
		});
	});

	describe('Initial Breakpoint Detection', () => {
		it('should detect initial breakpoint based on element width', async () => {
			// Mock element to have specific width
			Element.prototype.getBoundingClientRect = vi.fn().mockReturnValue({
				width: 800, // Should be 'lg' breakpoint
				height: 200,
				top: 0,
				left: 0,
				bottom: 200,
				right: 800,
				x: 0,
				y: 0,
			});

			const TestComponent = {
				template:
					'<ResizeObserver :breakpoints="breakpoints"><template #default="{ bp }"><div class="bp-display">{{ bp }}</div></template></ResizeObserver>',
				components: { ResizeObserver },
				data() {
					return {
						breakpoints: mockBreakpoints,
					};
				},
			};

			const { container } = render(TestComponent);

			await waitFor(() => {
				const bpDisplay = container.querySelector('.bp-display');
				expect(bpDisplay).toHaveTextContent('lg');
			});
		});

		it('should handle initial detection when element has no width', async () => {
			Element.prototype.getBoundingClientRect = vi.fn().mockReturnValue({
				width: 0,
				height: 0,
				top: 0,
				left: 0,
				bottom: 0,
				right: 0,
				x: 0,
				y: 0,
			});

			const TestComponent = {
				template:
					'<ResizeObserver :breakpoints="breakpoints"><template #default="{ bp }"><div class="bp-display">{{ bp }}</div></template></ResizeObserver>',
				components: { ResizeObserver },
				data() {
					return {
						breakpoints: mockBreakpoints,
					};
				},
			};

			const { container } = render(TestComponent);

			await waitFor(() => {
				const bpDisplay = container.querySelector('.bp-display');
				expect(bpDisplay).toHaveTextContent('sm'); // First breakpoint
			});
		});
	});

	describe('requestAnimationFrame Usage', () => {
		it('should use requestAnimationFrame for breakpoint updates', async () => {
			const rafSpy = vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
				cb(0);
				return 0;
			});

			const TestComponent = {
				template:
					'<ResizeObserver :breakpoints="breakpoints"><template #default="{ bp }"><div class="bp-display">{{ bp }}</div></template></ResizeObserver>',
				components: { ResizeObserver },
				data() {
					return {
						breakpoints: mockBreakpoints,
					};
				},
			};

			const { container } = render(TestComponent);

			const root = container.querySelector('div');
			mockResizeObserver.triggerResize(root!, 500, 200);

			await waitFor(() => {
				expect(rafSpy).toHaveBeenCalled();
			});

			rafSpy.mockRestore();
		});
	});

	describe('Edge Cases', () => {
		it('should handle missing root element reference', async () => {
			const TestComponent = {
				template:
					'<ResizeObserver v-if="show" :breakpoints="breakpoints"><template #default="{ bp }"><div class="bp-display">{{ bp }}</div></template></ResizeObserver>',
				components: { ResizeObserver },
				data() {
					return {
						show: false,
						breakpoints: mockBreakpoints,
					};
				},
			};

			expect(() => {
				render(TestComponent);
			}).not.toThrow();
		});

		it('should handle component with no slot content', async () => {
			const { container } = render(ResizeObserver, {
				props: {
					breakpoints: mockBreakpoints,
				},
			});

			const root = container.querySelector('div');
			expect(root).toBeInTheDocument();
		});

		it('should handle breakpoints with same width', async () => {
			const duplicateBreakpoints: BreakpointDefinition[] = [
				{ bp: 'sm', width: 640 },
				{ bp: 'md', width: 640 }, // Same width
				{ bp: 'lg', width: 1024 },
			];

			const TestComponent = {
				template:
					'<ResizeObserver :breakpoints="breakpoints"><template #default="{ bp }"><div class="bp-display">{{ bp }}</div></template></ResizeObserver>',
				components: { ResizeObserver },
				data() {
					return {
						breakpoints: duplicateBreakpoints,
					};
				},
			};

			const { container } = render(TestComponent);

			await waitFor(() => {
				const bpDisplay = container.querySelector('.bp-display');
				expect(bpDisplay).toBeInTheDocument();
			});

			const root = container.querySelector('div');
			mockResizeObserver.triggerResize(root!, 600, 200);

			await waitFor(() => {
				const bpDisplay = container.querySelector('.bp-display');
				expect(bpDisplay).toHaveTextContent('sm'); // Should use first matching breakpoint
			});
		});

		it('should handle very small widths', async () => {
			const TestComponent = {
				template:
					'<ResizeObserver :breakpoints="breakpoints"><template #default="{ bp }"><div class="bp-display">{{ bp }}</div></template></ResizeObserver>',
				components: { ResizeObserver },
				data() {
					return {
						breakpoints: mockBreakpoints,
					};
				},
			};

			const { container } = render(TestComponent);

			await waitFor(() => {
				const bpDisplay = container.querySelector('.bp-display');
				expect(bpDisplay).toBeInTheDocument();
			});

			const root = container.querySelector('div');
			mockResizeObserver.triggerResize(root!, 1, 200);

			await waitFor(() => {
				const bpDisplay = container.querySelector('.bp-display');
				expect(bpDisplay).toHaveTextContent('sm');
			});
		});

		it('should handle negative widths gracefully', async () => {
			const TestComponent = {
				template:
					'<ResizeObserver :breakpoints="breakpoints"><template #default="{ bp }"><div class="bp-display">{{ bp }}</div></template></ResizeObserver>',
				components: { ResizeObserver },
				data() {
					return {
						breakpoints: mockBreakpoints,
					};
				},
			};

			const { container } = render(TestComponent);

			const root = container.querySelector('div');
			mockResizeObserver.triggerResize(root!, -100, 200);

			await waitFor(() => {
				const bpDisplay = container.querySelector('.bp-display');
				expect(bpDisplay).toHaveTextContent('sm'); // Should handle gracefully
			});
		});
	});

	describe('Performance', () => {
		it('should handle rapid resize events efficiently', async () => {
			const TestComponent = {
				template:
					'<ResizeObserver :breakpoints="breakpoints"><template #default="{ bp }"><div class="bp-display">{{ bp }}</div></template></ResizeObserver>',
				components: { ResizeObserver },
				data() {
					return {
						breakpoints: mockBreakpoints,
					};
				},
			};

			const { container } = render(TestComponent);

			await waitFor(() => {
				const bpDisplay = container.querySelector('.bp-display');
				expect(bpDisplay).toBeInTheDocument();
			});

			const root = container.querySelector('div');

			// Simulate rapid resize events
			for (let i = 0; i < 10; i++) {
				mockResizeObserver.triggerResize(root!, 500 + i * 50, 200);
			}

			// Should still work correctly after rapid changes
			await waitFor(() => {
				const bpDisplay = container.querySelector('.bp-display');
				expect(bpDisplay).toBeInTheDocument();
			});
		});

		it('should handle component destruction during resize', async () => {
			const TestComponent = {
				template:
					'<ResizeObserver v-if="show" :breakpoints="breakpoints"><template #default="{ bp }"><div class="bp-display">{{ bp }}</div></template></ResizeObserver>',
				components: { ResizeObserver },
				data() {
					return {
						show: true,
						breakpoints: mockBreakpoints,
					};
				},
			};

			const { container, rerender } = render(TestComponent);

			await waitFor(() => {
				const bpDisplay = container.querySelector('.bp-display');
				expect(bpDisplay).toBeInTheDocument();
			});

			// Destroy component
			await rerender({ show: false });

			// Should not throw errors
			const root = container.querySelector('div');
			if (root) {
				expect(() => {
					mockResizeObserver.triggerResize(root, 500, 200);
				}).not.toThrow();
			}
		});
	});

	describe('Browser Compatibility', () => {
		it('should handle missing ResizeObserver gracefully', async () => {
			// Temporarily remove ResizeObserver
			const tempResizeObserver = global.ResizeObserver;
			delete (global as any).ResizeObserver;

			expect(() => {
				render(ResizeObserver, {
					slots: {
						default: '<div>Content</div>',
					},
				});
			}).not.toThrow();

			// Restore ResizeObserver
			global.ResizeObserver = tempResizeObserver;
		});
	});
});
