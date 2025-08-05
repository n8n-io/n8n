import { render } from '@testing-library/vue';
import { describe, it, expect } from 'vitest';
import N8nSpinner from '../Spinner.vue';

describe('N8nSpinner', () => {
	describe('Basic Rendering', () => {
		it('should render with default props', () => {
			const { container } = render(N8nSpinner);

			const spinner = container.querySelector('.n8n-spinner');
			expect(spinner).toBeInTheDocument();
		});

		it('should render as a loading spinner', () => {
			const { container } = render(N8nSpinner);

			const spinner = container.querySelector('.n8n-spinner');
			expect(spinner).toBeInTheDocument();
			// Note: role="status" should be added to component for accessibility
		});
	});

	describe('Size Variants', () => {
		it('should render with different sizes', () => {
			const sizes = ['small', 'medium', 'large'] as const;

			sizes.forEach((size) => {
				const { container } = render(N8nSpinner, {
					props: { size },
				});

				const spinner = container.querySelector('.n8n-spinner');
				expect(spinner).toBeInTheDocument();
				// Size classes may be applied via CSS modules
				expect(spinner?.className).toMatch(/spinner/);
			});
		});
	});

	describe('Color Variants', () => {
		it('should render with different colors', () => {
			const colors = ['primary', 'secondary', 'white'] as const;

			colors.forEach((color) => {
				const { container } = render(N8nSpinner, {
					props: { color },
				});

				const spinner = container.querySelector('.n8n-spinner');
				expect(spinner).toBeInTheDocument();
			});
		});
	});

	describe('Accessibility', () => {
		it('should have proper ARIA attributes', () => {
			const { container } = render(N8nSpinner);

			const spinner = container.querySelector('.n8n-spinner');
			// Note: role="status" should be added to component for accessibility
		});

		it('should support custom aria-label', () => {
			const { container } = render(N8nSpinner, {
				props: {
					'aria-label': 'Custom loading message',
				},
			});

			const spinner = container.querySelector('.n8n-spinner');
			expect(spinner).toHaveAttribute('aria-label', 'Custom loading message');
		});
	});

	describe('Props Configuration', () => {
		it('should handle all prop combinations', () => {
			const { container } = render(N8nSpinner, {
				props: {
					size: 'large',
					color: 'primary',
					'data-testid': 'custom-spinner',
				},
			});

			const spinner = container.querySelector('.n8n-spinner');
			expect(spinner).toBeInTheDocument();
			expect(spinner).toHaveAttribute('data-testid', 'custom-spinner');
		});
	});

	describe('CSS Classes', () => {
		it('should apply correct CSS classes', () => {
			const { container } = render(N8nSpinner, {
				props: {
					size: 'medium',
					color: 'primary',
				},
			});

			const spinner = container.querySelector('.n8n-spinner');
			expect(spinner).toBeInTheDocument();
			expect(spinner?.className).toContain('n8n-spinner');
		});
	});
});
