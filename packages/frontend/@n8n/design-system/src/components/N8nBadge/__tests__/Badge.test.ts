import { render } from '@testing-library/vue';
import { describe, it, expect } from 'vitest';
import N8nBadge from '../Badge.vue';

describe('N8nBadge', () => {
	describe('Basic Rendering', () => {
		it('should render with default props', () => {
			const { container } = render(N8nBadge, {
				slots: {
					default: 'Test Badge',
				},
				global: {
					stubs: ['n8n-text'],
				},
			});

			const badge = container.querySelector('.n8n-badge');
			expect(badge).toBeInTheDocument();
			expect(badge?.className).toMatch(/default/);
			expect(badge?.className).toMatch(/border/);
		});

		it('should render with slot content', () => {
			const { container } = render(N8nBadge, {
				slots: {
					default: 'Custom Content',
				},
				global: {
					stubs: ['n8n-text'],
				},
			});

			const badge = container.querySelector('.n8n-badge');
			expect(badge).toBeInTheDocument();
			// Since N8nText is stubbed, check for the component structure
			expect(badge.querySelector('n8n-text-stub')).toBeInTheDocument();
		});
	});

	describe('Theme Variants', () => {
		const themes = [
			'default',
			'success',
			'warning',
			'danger',
			'primary',
			'secondary',
			'tertiary',
		] as const;

		themes.forEach((theme) => {
			it(`should render with ${theme} theme`, () => {
				const { container } = render(N8nBadge, {
					props: {
						theme,
					},
					slots: {
						default: 'Test Badge',
					},
					global: {
						stubs: ['n8n-text'],
					},
				});

				const badge = container.querySelector('.n8n-badge');
				expect(badge).toBeInTheDocument();
				expect(badge?.className).toMatch(new RegExp(theme));
			});
		});
	});

	describe('Size Variants', () => {
		const sizes = ['mini', 'small', 'medium', 'large', 'xlarge'] as const;

		sizes.forEach((size) => {
			it(`should render with ${size} size`, () => {
				const { container } = render(N8nBadge, {
					props: {
						size,
					},
					slots: {
						default: 'Test Badge',
					},
					global: {
						stubs: ['n8n-text'],
					},
				});

				const badge = container.querySelector('.n8n-badge');
				expect(badge).toBeInTheDocument();
				const textStub = badge.querySelector('n8n-text-stub');
				expect(textStub).toHaveAttribute('size', size);
			});
		});
	});

	describe('Bold Text', () => {
		it('should render bold text when bold prop is true', () => {
			const { container } = render(N8nBadge, {
				props: {
					bold: true,
				},
				slots: {
					default: 'Bold Badge',
				},
				global: {
					stubs: ['n8n-text'],
				},
			});

			const badge = container.querySelector('.n8n-badge');
			const textStub = badge.querySelector('n8n-text-stub');
			expect(textStub).toHaveAttribute('bold', 'true');
		});

		it('should render normal text when bold prop is false', () => {
			const { container } = render(N8nBadge, {
				props: {
					bold: false,
				},
				slots: {
					default: 'Normal Badge',
				},
				global: {
					stubs: ['n8n-text'],
				},
			});

			const badge = container.querySelector('.n8n-badge');
			const textStub = badge.querySelector('n8n-text-stub');
			expect(textStub).toHaveAttribute('bold', 'false');
		});
	});

	describe('Border Handling', () => {
		it('should show border by default', () => {
			const { container } = render(N8nBadge, {
				slots: {
					default: 'Bordered Badge',
				},
				global: {
					stubs: ['n8n-text'],
				},
			});

			const badge = container.querySelector('.n8n-badge');
			expect(badge?.className).toMatch(/border/);
		});

		it('should show border when showBorder is true', () => {
			const { container } = render(N8nBadge, {
				props: {
					showBorder: true,
				},
				slots: {
					default: 'Bordered Badge',
				},
				global: {
					stubs: ['n8n-text'],
				},
			});

			const badge = container.querySelector('.n8n-badge');
			expect(badge?.className).toMatch(/border/);
		});

		it('should not show border when showBorder is false', () => {
			const { container } = render(N8nBadge, {
				props: {
					showBorder: false,
				},
				slots: {
					default: 'Borderless Badge',
				},
				global: {
					stubs: ['n8n-text'],
				},
			});

			const badge = container.querySelector('.n8n-badge');
			expect(badge?.className).not.toMatch(/border/);
		});
	});

	describe('Text Properties', () => {
		it('should always pass compact=true to N8nText', () => {
			const { container } = render(N8nBadge, {
				slots: {
					default: 'Compact Badge',
				},
				global: {
					stubs: ['n8n-text'],
				},
			});

			const textStub = container.querySelector('n8n-text-stub');
			expect(textStub).toHaveAttribute('compact', 'true');
		});
	});

	describe('Combined Props', () => {
		it('should handle multiple props together', () => {
			const { container } = render(N8nBadge, {
				props: {
					theme: 'success',
					size: 'large',
					bold: true,
					showBorder: false,
				},
				slots: {
					default: 'Complex Badge',
				},
				global: {
					stubs: ['n8n-text'],
				},
			});

			const badge = container.querySelector('.n8n-badge');
			expect(badge).toBeInTheDocument();
			expect(badge?.className).toMatch(/success/);
			expect(badge?.className).not.toMatch(/border/);

			const textStub = badge.querySelector('n8n-text-stub');
			expect(textStub).toHaveAttribute('size', 'large');
			expect(textStub).toHaveAttribute('bold', 'true');
			expect(textStub).toHaveAttribute('compact', 'true');
		});
	});

	describe('Edge Cases', () => {
		it('should handle empty slot content', () => {
			const { container } = render(N8nBadge, {
				slots: {
					default: '',
				},
				global: {
					stubs: ['n8n-text'],
				},
			});

			const badge = container.querySelector('.n8n-badge');
			expect(badge).toBeInTheDocument();
			expect(badge.querySelector('n8n-text-stub')).toBeInTheDocument();
		});

		it('should handle complex slot content', () => {
			const { container } = render(N8nBadge, {
				slots: {
					default: '<span>Complex</span> <strong>Content</strong>',
				},
				global: {
					stubs: ['n8n-text'],
				},
			});

			const badge = container.querySelector('.n8n-badge');
			expect(badge).toBeInTheDocument();
			expect(badge.querySelector('n8n-text-stub')).toBeInTheDocument();
		});

		it('should handle long text content', () => {
			const longText =
				'This is a very long badge text that might cause wrapping issues in some layouts';
			const { container } = render(N8nBadge, {
				slots: {
					default: longText,
				},
				global: {
					stubs: ['n8n-text'],
				},
			});

			const badge = container.querySelector('.n8n-badge');
			expect(badge).toBeInTheDocument();
			expect(badge.querySelector('n8n-text-stub')).toBeInTheDocument();
		});
	});

	describe('CSS Classes', () => {
		it('should apply correct base CSS classes', () => {
			const { container } = render(N8nBadge, {
				slots: {
					default: 'Test',
				},
				global: {
					stubs: ['n8n-text'],
				},
			});

			const badge = container.querySelector('.n8n-badge');
			expect(badge?.className).toContain('n8n-badge');
		});

		it('should combine theme and border classes correctly', () => {
			const { container } = render(N8nBadge, {
				props: {
					theme: 'primary',
					showBorder: true,
				},
				slots: {
					default: 'Test',
				},
				global: {
					stubs: ['n8n-text'],
				},
			});

			const badge = container.querySelector('.n8n-badge');
			expect(badge?.className).toMatch(/primary/);
			expect(badge?.className).toMatch(/border/);
		});
	});
});
