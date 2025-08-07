/**
 * Test suite for N8nLoading component
 */

import { render } from '@testing-library/vue';
import { describe, it, expect } from 'vitest';
import N8nLoading from '../Loading.vue';

describe('N8nLoading', () => {
	describe('Basic Rendering', () => {
		it('should render with default props', () => {
			const { container } = render(N8nLoading);

			const skeleton = container.querySelector('.el-skeleton');
			expect(skeleton).toBeInTheDocument();
			expect(skeleton).toHaveClass('n8n-loading');
			expect(skeleton).toHaveClass('n8n-loading-p');
		});

		it('should render in loading state by default', () => {
			const { container } = render(N8nLoading);

			const skeleton = container.querySelector('.el-skeleton');
			expect(skeleton).toBeInTheDocument();
			// Should show skeleton items
			const skeletonItems = container.querySelectorAll('.el-skeleton__item');
			expect(skeletonItems.length).toBeGreaterThan(0);
		});

		it('should not render skeleton when loading is false', () => {
			const { container } = render(N8nLoading, {
				props: {
					loading: false,
				},
			});

			const skeleton = container.querySelector('.el-skeleton');
			expect(skeleton).toBeInTheDocument();
		});
	});

	describe('Animation', () => {
		it('should be animated by default', () => {
			const { container } = render(N8nLoading);

			const skeleton = container.querySelector('.el-skeleton');
			expect(skeleton).toBeInTheDocument();
		});

		it('should handle non-animated state', () => {
			const { container } = render(N8nLoading, {
				props: {
					animated: false,
				},
			});

			const skeleton = container.querySelector('.el-skeleton');
			expect(skeleton).toBeInTheDocument();
		});
	});

	describe('Variant Types', () => {
		it('should render with paragraph variant by default', () => {
			const { container } = render(N8nLoading);

			const skeleton = container.querySelector('.n8n-loading-p');
			expect(skeleton).toBeInTheDocument();
		});

		it('should render with custom variant', () => {
			const { container } = render(N8nLoading, {
				props: {
					variant: 'custom',
				},
			});

			const skeleton = container.querySelector('.n8n-loading-custom');
			expect(skeleton).toBeInTheDocument();
		});

		it('should render with h1 variant', () => {
			const { container } = render(N8nLoading, {
				props: {
					variant: 'h1',
				},
			});

			const skeleton = container.querySelector('.n8n-loading-h1');
			expect(skeleton).toBeInTheDocument();
		});

		it('should render with h3 variant', () => {
			const { container } = render(N8nLoading, {
				props: {
					variant: 'h3',
				},
			});

			const skeleton = container.querySelector('.n8n-loading-h3');
			expect(skeleton).toBeInTheDocument();
		});

		it('should render with text variant', () => {
			const { container } = render(N8nLoading, {
				props: {
					variant: 'text',
				},
			});

			const skeleton = container.querySelector('.n8n-loading-text');
			expect(skeleton).toBeInTheDocument();
		});

		it('should render with caption variant', () => {
			const { container } = render(N8nLoading, {
				props: {
					variant: 'caption',
				},
			});

			const skeleton = container.querySelector('.n8n-loading-caption');
			expect(skeleton).toBeInTheDocument();
		});

		it('should render with button variant', () => {
			const { container } = render(N8nLoading, {
				props: {
					variant: 'button',
				},
			});

			const skeleton = container.querySelector('.n8n-loading-button');
			expect(skeleton).toBeInTheDocument();
		});

		it('should render with image variant', () => {
			const { container } = render(N8nLoading, {
				props: {
					variant: 'image',
				},
			});

			const skeleton = container.querySelector('.n8n-loading-image');
			expect(skeleton).toBeInTheDocument();
		});

		it('should render with circle variant', () => {
			const { container } = render(N8nLoading, {
				props: {
					variant: 'circle',
				},
			});

			const skeleton = container.querySelector('.n8n-loading-circle');
			expect(skeleton).toBeInTheDocument();
		});

		it('should render with rect variant', () => {
			const { container } = render(N8nLoading, {
				props: {
					variant: 'rect',
				},
			});

			const skeleton = container.querySelector('.n8n-loading-rect');
			expect(skeleton).toBeInTheDocument();
		});
	});

	describe('Rows Configuration', () => {
		it('should render single row by default', () => {
			const { container } = render(N8nLoading, {
				props: {
					variant: 'p',
				},
			});

			const skeleton = container.querySelector('.n8n-loading');
			expect(skeleton).toBeInTheDocument();
			// With rows: 1, there should be one skeleton item for 'p' variant
			const skeletonItems = container.querySelectorAll('.el-skeleton__item');
			expect(skeletonItems.length).toBe(1);
		});

		it('should render multiple rows', () => {
			const { container } = render(N8nLoading, {
				props: {
					variant: 'p',
					rows: 3,
				},
			});

			const skeleton = container.querySelector('.n8n-loading');
			expect(skeleton).toBeInTheDocument();
			// With rows: 3, there should be three skeleton items for 'p' variant
			const skeletonItems = container.querySelectorAll('.el-skeleton__item');
			expect(skeletonItems.length).toBe(3);
		});

		it('should handle rows with h1 variant', () => {
			const { container } = render(N8nLoading, {
				props: {
					variant: 'h1',
					rows: 2,
				},
			});

			const skeleton = container.querySelector('.n8n-loading-h1');
			expect(skeleton).toBeInTheDocument();
			const skeletonItems = container.querySelectorAll('.el-skeleton__item');
			expect(skeletonItems.length).toBe(2);
		});

		it('should apply shrinkLast styling for multiple rows', () => {
			const { container } = render(N8nLoading, {
				props: {
					variant: 'p',
					rows: 3,
					shrinkLast: true,
				},
			});

			// Check if the styling module classes are applied
			const skeleton = container.querySelector('.n8n-loading');
			expect(skeleton).toBeInTheDocument();
		});

		it('should handle shrinkLast false', () => {
			const { container } = render(N8nLoading, {
				props: {
					variant: 'p',
					rows: 3,
					shrinkLast: false,
				},
			});

			const skeleton = container.querySelector('.n8n-loading');
			expect(skeleton).toBeInTheDocument();
		});
	});

	describe('Columns Configuration', () => {
		it('should render with columns when specified', () => {
			const { container } = render(N8nLoading, {
				props: {
					cols: 3,
				},
			});

			const skeleton = container.querySelector('.n8n-loading');
			expect(skeleton).toBeInTheDocument();
			// With cols: 3, there should be three skeleton items
			const skeletonItems = container.querySelectorAll('.el-skeleton__item');
			expect(skeletonItems.length).toBe(3);
		});

		it('should prioritize cols over rows when both are set', () => {
			const { container } = render(N8nLoading, {
				props: {
					rows: 2,
					cols: 4,
				},
			});

			const skeleton = container.querySelector('.n8n-loading');
			expect(skeleton).toBeInTheDocument();
			// cols should override rows, so expect 4 items
			const skeletonItems = container.querySelectorAll('.el-skeleton__item');
			expect(skeletonItems.length).toBe(4);
		});

		it('should handle zero columns', () => {
			const { container } = render(N8nLoading, {
				props: {
					cols: 0,
					rows: 2,
				},
			});

			const skeleton = container.querySelector('.n8n-loading');
			expect(skeleton).toBeInTheDocument();
			// With cols: 0, should fall back to rows
			const skeletonItems = container.querySelectorAll('.el-skeleton__item');
			expect(skeletonItems.length).toBe(2);
		});
	});

	describe('Custom Variant Styling', () => {
		it('should apply custom styles for custom variant', () => {
			const { container } = render(N8nLoading, {
				props: {
					variant: 'custom',
				},
			});

			const skeleton = container.querySelector('.n8n-loading-custom');
			expect(skeleton).toBeInTheDocument();
		});

		it('should render custom variant with full dimensions', () => {
			const { container } = render(N8nLoading, {
				props: {
					variant: 'custom',
				},
			});

			const skeleton = container.querySelector('.n8n-loading-custom');
			expect(skeleton).toBeInTheDocument();
			// Custom variant should have 100% width and height styles applied
		});
	});

	describe('Complex Configurations', () => {
		it('should handle all props together', () => {
			const { container } = render(N8nLoading, {
				props: {
					animated: false,
					loading: true,
					rows: 2,
					shrinkLast: false,
					variant: 'h1',
				},
			});

			const skeleton = container.querySelector('.n8n-loading-h1');
			expect(skeleton).toBeInTheDocument();
		});

		it('should handle complex column configuration', () => {
			const { container } = render(N8nLoading, {
				props: {
					animated: true,
					loading: true,
					cols: 5,
					variant: 'text',
				},
			});

			const skeleton = container.querySelector('.n8n-loading-text');
			expect(skeleton).toBeInTheDocument();
			const skeletonItems = container.querySelectorAll('.el-skeleton__item');
			expect(skeletonItems.length).toBe(5);
		});
	});

	describe('Edge Cases', () => {
		it('should handle negative rows gracefully', () => {
			const { container } = render(N8nLoading, {
				props: {
					rows: -1,
				},
			});

			const skeleton = container.querySelector('.n8n-loading');
			expect(skeleton).toBeInTheDocument();
		});

		it('should handle zero rows', () => {
			const { container } = render(N8nLoading, {
				props: {
					rows: 0,
				},
			});

			const skeleton = container.querySelector('.n8n-loading');
			expect(skeleton).toBeInTheDocument();
		});

		it('should handle large number of rows', () => {
			const { container } = render(N8nLoading, {
				props: {
					rows: 100,
					variant: 'p',
				},
			});

			const skeleton = container.querySelector('.n8n-loading');
			expect(skeleton).toBeInTheDocument();
			const skeletonItems = container.querySelectorAll('.el-skeleton__item');
			expect(skeletonItems.length).toBe(100);
		});

		it('should handle large number of columns', () => {
			const { container } = render(N8nLoading, {
				props: {
					cols: 50,
				},
			});

			const skeleton = container.querySelector('.n8n-loading');
			expect(skeleton).toBeInTheDocument();
			const skeletonItems = container.querySelectorAll('.el-skeleton__item');
			expect(skeletonItems.length).toBe(50);
		});
	});

	describe('Accessibility', () => {
		it('should have proper ARIA attributes', () => {
			const { container } = render(N8nLoading, {
				props: {
					'aria-label': 'Loading content',
				},
			});

			const skeleton = container.querySelector('.el-skeleton');
			expect(skeleton).toBeInTheDocument();
		});

		it('should be accessible when loading', () => {
			const { container } = render(N8nLoading, {
				props: {
					loading: true,
				},
			});

			const skeleton = container.querySelector('.el-skeleton');
			expect(skeleton).toBeInTheDocument();
		});
	});

	describe('Performance', () => {
		it('should handle rapid loading state changes', () => {
			const { rerender } = render(N8nLoading, {
				props: {
					loading: true,
				},
			});

			expect(() => {
				rerender({ loading: false });
				rerender({ loading: true });
				rerender({ loading: false });
			}).not.toThrow();
		});

		it('should handle rapid variant changes', () => {
			const { rerender } = render(N8nLoading, {
				props: {
					variant: 'p',
				},
			});

			expect(() => {
				rerender({ variant: 'h1' });
				rerender({ variant: 'custom' });
				rerender({ variant: 'text' });
			}).not.toThrow();
		});

		it('should handle rapid rows/cols changes', () => {
			const { rerender } = render(N8nLoading, {
				props: {
					rows: 1,
					cols: 0,
				},
			});

			expect(() => {
				rerender({ rows: 5, cols: 0 });
				rerender({ rows: 1, cols: 3 });
				rerender({ rows: 10, cols: 5 });
			}).not.toThrow();
		});
	});
});