import { render } from '@testing-library/vue';
import { describe, it, expect } from 'vitest';
import N8nText from '../Text.vue';

describe('N8nText', () => {
	describe('Basic Rendering', () => {
		it('should render with default props', () => {
			const { container } = render(N8nText, {
				slots: {
					default: 'Test Text',
				},
			});

			const textElement = container.querySelector('span');
			expect(textElement).toBeInTheDocument();
			expect(textElement).toHaveTextContent('Test Text');
		});

		it('should render with custom slot content', () => {
			const { container } = render(N8nText, {
				slots: {
					default: '<strong>Bold Text</strong>',
				},
			});

			const textElement = container.querySelector('span');
			expect(textElement).toBeInTheDocument();
			expect(textElement?.innerHTML).toContain('<strong>Bold Text</strong>');
		});
	});

	describe('Tag Variants', () => {
		it('should render different HTML tags', () => {
			const tags = ['span', 'p', 'div', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'label'];

			tags.forEach((tag) => {
				const { container } = render(N8nText, {
					props: { tag },
					slots: { default: 'Test' },
				});

				const element = container.querySelector(tag);
				expect(element).toBeInTheDocument();
			});
		});
	});

	describe('Size Variants', () => {
		it('should render with different sizes', () => {
			const sizes = ['xsmall', 'small', 'mini', 'medium', 'large'] as const;

			sizes.forEach((size) => {
				const { container } = render(N8nText, {
					props: { size },
					slots: { default: 'Test' },
				});

				const textElement = container.querySelector('span');
				expect(textElement).toBeInTheDocument();
				expect(textElement?.className).toMatch(/size/);
			});
		});
	});

	describe('Color Variants', () => {
		it('should render with different colors', () => {
			const colors = [
				'primary',
				'text-dark',
				'text-base',
				'text-light',
				'text-xlight',
				'danger',
				'success',
				'warning',
			] as const;

			colors.forEach((color) => {
				const { container } = render(N8nText, {
					props: { color },
					slots: { default: 'Test' },
				});

				const textElement = container.querySelector('span');
				expect(textElement).toBeInTheDocument();
				expect(textElement?.className).toMatch(new RegExp(color));
			});
		});
	});

	describe('Alignment', () => {
		it('should render with different alignments', () => {
			const alignments = ['left', 'center', 'right'] as const;

			alignments.forEach((align) => {
				const { container } = render(N8nText, {
					props: { align },
					slots: { default: 'Test' },
				});

				const textElement = container.querySelector('span');
				expect(textElement).toBeInTheDocument();
				expect(textElement?.className).toMatch(/align/);
			});
		});
	});

	describe('Text Formatting', () => {
		it('should render bold text', () => {
			const { container } = render(N8nText, {
				props: { bold: true },
				slots: { default: 'Bold Text' },
			});

			const textElement = container.querySelector('span');
			expect(textElement?.className).toMatch(/bold/);
		});

		it('should render compact text', () => {
			const { container } = render(N8nText, {
				props: { compact: true },
				slots: { default: 'Compact Text' },
			});

			const textElement = container.querySelector('span');
			expect(textElement?.className).toMatch(/compact/);
		});
	});

	describe('Edge Cases', () => {
		it('should handle empty content', () => {
			const { container } = render(N8nText, {
				slots: { default: '' },
			});

			const textElement = container.querySelector('span');
			expect(textElement).toBeInTheDocument();
			expect(textElement).toHaveTextContent('');
		});

		it('should handle long text content', () => {
			const longText = 'This is a very long text content that should still render properly'.repeat(
				10,
			);
			const { container } = render(N8nText, {
				slots: { default: longText },
			});

			const textElement = container.querySelector('span');
			expect(textElement).toBeInTheDocument();
			expect(textElement).toHaveTextContent(longText);
		});
	});

	describe('Combined Props', () => {
		it('should handle multiple props together', () => {
			const { container } = render(N8nText, {
				props: {
					tag: 'p',
					size: 'large',
					color: 'primary',
					align: 'center',
					bold: true,
					compact: true,
				},
				slots: { default: 'Combined Props Test' },
			});

			const textElement = container.querySelector('p');
			expect(textElement).toBeInTheDocument();
			expect(textElement).toHaveTextContent('Combined Props Test');
			expect(textElement?.className).toMatch(/bold/);
			expect(textElement?.className).toMatch(/compact/);
			expect(textElement?.className).toMatch(/primary/);
			expect(textElement?.className).toMatch(/align/);
			expect(textElement?.className).toMatch(/size/);
		});
	});

	describe('Accessibility', () => {
		it('should pass through attributes for accessibility', () => {
			const { container } = render(N8nText, {
				props: {
					'aria-label': 'Accessible text',
					'data-testid': 'custom-text',
				},
				slots: { default: 'Accessibility Test' },
			});

			const textElement = container.querySelector('span');
			expect(textElement).toHaveAttribute('aria-label', 'Accessible text');
			expect(textElement).toHaveAttribute('data-testid', 'custom-text');
		});
	});
});
