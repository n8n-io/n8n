import { render } from '@testing-library/vue';
import { describe, it, expect } from 'vitest';
import N8nHeading from '../Heading.vue';

describe('N8nHeading', () => {
	describe('Basic Rendering', () => {
		it('should render with default props', () => {
			const { container } = render(N8nHeading, {
				slots: {
					default: 'Test Heading',
				},
			});

			const heading = container.querySelector('span');
			expect(heading).toBeInTheDocument();
			expect(heading).toHaveClass('n8n-heading');
			expect(heading).toHaveTextContent('Test Heading');
		});

		it('should render with custom slot content', () => {
			const { container } = render(N8nHeading, {
				slots: {
					default: '<strong>Bold Content</strong>',
				},
			});

			const heading = container.querySelector('span');
			expect(heading).toBeInTheDocument();
			expect(heading?.innerHTML).toContain('<strong>Bold Content</strong>');
		});
	});

	describe('Props Configuration', () => {
		it('should render with different tags', () => {
			const tags = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'div', 'p'];

			tags.forEach((tag) => {
				const { container } = render(N8nHeading, {
					props: { tag },
					slots: { default: 'Test' },
				});

				const element = container.querySelector(tag);
				expect(element).toBeInTheDocument();
				expect(element).toHaveClass('n8n-heading');
			});
		});

		it('should render with different sizes', () => {
			const sizes = ['2xlarge', 'xlarge', 'large', 'medium', 'small'] as const;

			sizes.forEach((size) => {
				const { container } = render(N8nHeading, {
					props: { size },
					slots: { default: 'Test' },
				});

				const heading = container.querySelector('span');
				expect(heading).toBeInTheDocument();
				// CSS modules class names are transformed, so we check for the presence of the class
				expect(heading?.className).toMatch(/size-/);
			});
		});

		it('should render with different colors', () => {
			const colors = [
				'primary',
				'text-dark',
				'text-base',
				'text-light',
				'text-xlight',
				'danger',
			] as const;

			colors.forEach((color) => {
				const { container } = render(N8nHeading, {
					props: { color },
					slots: { default: 'Test' },
				});

				const heading = container.querySelector('span');
				expect(heading).toBeInTheDocument();
				// CSS modules transform class names, so we check for presence of color-related class
				expect(heading?.className).toMatch(new RegExp(color));
			});
		});

		it('should render with different alignments', () => {
			const alignments = ['left', 'center', 'right'] as const;

			alignments.forEach((align) => {
				const { container } = render(N8nHeading, {
					props: { align },
					slots: { default: 'Test' },
				});

				const heading = container.querySelector('span');
				expect(heading).toBeInTheDocument();
				expect(heading?.className).toMatch(/align/);
			});
		});

		it('should render bold text when bold prop is true', () => {
			const { container } = render(N8nHeading, {
				props: { bold: true },
				slots: { default: 'Bold Text' },
			});

			const heading = container.querySelector('span');
			expect(heading?.className).toMatch(/bold/);
		});

		it('should render regular text when bold prop is false', () => {
			const { container } = render(N8nHeading, {
				props: { bold: false },
				slots: { default: 'Regular Text' },
			});

			const heading = container.querySelector('span');
			expect(heading?.className).toMatch(/regular/);
		});
	});

	describe('Combined Props', () => {
		it('should handle multiple props together', () => {
			const { container } = render(N8nHeading, {
				props: {
					tag: 'h2',
					size: 'large',
					color: 'primary',
					align: 'center',
					bold: true,
				},
				slots: { default: 'Combined Props Test' },
			});

			const heading = container.querySelector('h2');
			expect(heading).toBeInTheDocument();
			expect(heading).toHaveClass('n8n-heading');
			expect(heading).toHaveTextContent('Combined Props Test');
			expect(heading?.className).toMatch(/bold/);
			expect(heading?.className).toMatch(/primary/);
			expect(heading?.className).toMatch(/align/);
			expect(heading?.className).toMatch(/size/);
		});
	});

	describe('Accessibility', () => {
		it('should pass through attributes for accessibility', () => {
			const { container } = render(N8nHeading, {
				props: {
					'aria-label': 'Accessible heading',
					'data-testid': 'custom-heading',
				},
				slots: { default: 'Accessibility Test' },
			});

			const heading = container.querySelector('span');
			expect(heading).toHaveAttribute('aria-label', 'Accessible heading');
			expect(heading).toHaveAttribute('data-testid', 'custom-heading');
		});
	});

	describe('Default Values', () => {
		it('should use default values when props are not provided', () => {
			const { container } = render(N8nHeading, {
				slots: { default: 'Default Test' },
			});

			const heading = container.querySelector('span'); // default tag
			expect(heading).toBeInTheDocument();
			expect(heading?.className).toMatch(/regular/); // default bold: false
			expect(heading?.className).toMatch(/medium/); // default size: medium
		});
	});
});
