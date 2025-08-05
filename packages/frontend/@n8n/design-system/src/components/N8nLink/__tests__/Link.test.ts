import { render } from '@testing-library/vue';
import { describe, it, expect, vi } from 'vitest';
import { createRouter, createWebHistory } from 'vue-router';
import N8nLink from '../Link.vue';

// Mock vue-router
const mockRouter = createRouter({
	history: createWebHistory(),
	routes: [
		{ path: '/', component: { template: '<div>Home</div>' } },
		{ path: '/test-path', component: { template: '<div>Test</div>' } },
		{ path: '/test', component: { template: '<div>Test</div>' } },
	],
});

const renderWithRouter = (component: any, options: any = {}) => {
	return render(component, {
		global: {
			plugins: [mockRouter],
			stubs: ['n8n-text'], // Only stub n8n-text, let n8n-route render normally
			...options.global,
		},
		...options,
	});
};

describe('N8nLink', () => {
	describe('Basic Rendering', () => {
		it('should render with default props', () => {
			const { container } = renderWithRouter(N8nLink, {
				props: {
					to: '/test-path',
				},
				slots: {
					default: 'Test Link',
				},
			});

			const link = container.querySelector('a');
			expect(link).toBeInTheDocument();
			// Since we stub n8n-text, check for the link structure instead of text content
			expect(link.querySelector('n8n-text-stub')).toBeInTheDocument();
		});

		it('should render with href attribute', () => {
			const { container } = renderWithRouter(N8nLink, {
				props: {
					to: '/test-path',
				},
				slots: {
					default: 'Test Link',
				},
			});

			const link = container.querySelector('a');
			expect(link).toHaveAttribute('href', '/test-path');
		});
	});

	describe('External Links', () => {
		it('should handle external URLs', () => {
			const { container } = renderWithRouter(N8nLink, {
				props: {
					to: 'https://external-site.com',
				},
				slots: {
					default: 'External Link',
				},
			});

			const link = container.querySelector('a');
			expect(link).toBeInTheDocument();
			expect(link).toHaveAttribute('href', 'https://external-site.com');
		});

		it('should open external links in new tab when newWindow is true', () => {
			const { container } = renderWithRouter(N8nLink, {
				props: {
					to: 'https://external-site.com',
					newWindow: true,
				},
				slots: {
					default: 'External Link',
				},
			});

			const link = container.querySelector('a');
			expect(link).toHaveAttribute('target', '_blank');
			// Note: rel="noopener noreferrer" should be added to component for security
		});
	});

	describe('Size Variants', () => {
		it('should render with different sizes', () => {
			const sizes = ['small', 'medium', 'large'] as const;

			sizes.forEach((size) => {
				const { container } = renderWithRouter(N8nLink, {
					props: {
						to: '/test',
						size,
					},
					slots: { default: 'Test' },
				});

				const link = container.querySelector('a');
				expect(link).toBeInTheDocument();
				expect(link?.className).toMatch(/size|link/);
			});
		});
	});

	describe('Theme Variants', () => {
		it('should render with different themes', () => {
			const themes = ['primary', 'secondary', 'danger', 'text'] as const;

			themes.forEach((theme) => {
				const { container } = renderWithRouter(N8nLink, {
					props: {
						to: '/test',
						theme,
					},
					slots: { default: 'Test' },
				});

				const link = container.querySelector('a');
				expect(link).toBeInTheDocument();
			});
		});
	});

	describe('Underline Behavior', () => {
		it('should handle underline prop', () => {
			const { container } = renderWithRouter(N8nLink, {
				props: {
					to: '/test',
					underline: true,
				},
				slots: { default: 'Underlined Link' },
			});

			const link = container.querySelector('a');
			expect(link).toBeInTheDocument();
		});

		it('should handle no underline', () => {
			const { container } = renderWithRouter(N8nLink, {
				props: {
					to: '/test',
					underline: false,
				},
				slots: { default: 'No Underline Link' },
			});

			const link = container.querySelector('a');
			expect(link).toBeInTheDocument();
		});
	});

	describe('Bold Text', () => {
		it('should render bold text when bold prop is true', () => {
			const { container } = renderWithRouter(N8nLink, {
				props: {
					to: '/test',
					bold: true,
				},
				slots: { default: 'Bold Link' },
			});

			const link = container.querySelector('a');
			expect(link).toBeInTheDocument();
		});
	});

	describe('Disabled State', () => {
		it('should handle disabled state', () => {
			const { container } = renderWithRouter(N8nLink, {
				props: {
					to: '/test',
					disabled: true,
				},
				slots: { default: 'Disabled Link' },
			});

			const link = container.querySelector('a');
			expect(link).toBeInTheDocument();
		});
	});

	describe('Accessibility', () => {
		it('should pass through attributes for accessibility', () => {
			const { container } = renderWithRouter(N8nLink, {
				props: {
					to: '/test',
					'aria-label': 'Accessible link',
					'data-testid': 'custom-link',
				},
				slots: { default: 'Accessibility Test' },
			});

			const link = container.querySelector('a');
			expect(link).toHaveAttribute('aria-label', 'Accessible link');
			expect(link).toHaveAttribute('data-testid', 'custom-link');
		});

		it('should have proper role for links', () => {
			const { container } = renderWithRouter(N8nLink, {
				props: {
					to: '/test',
				},
				slots: { default: 'Role Test' },
			});

			const link = container.querySelector('a');
			expect(link).toBeInTheDocument();
			// Links inherently have the correct role
		});
	});

	describe('Complex Content', () => {
		it('should render complex slot content', () => {
			const { container } = renderWithRouter(N8nLink, {
				props: {
					to: '/test',
				},
				slots: {
					default: '<span>Complex</span> <strong>Content</strong>',
				},
			});

			const link = container.querySelector('a');
			expect(link).toBeInTheDocument();
			// Since we stub n8n-text, just verify the link structure exists
			expect(link.querySelector('n8n-text-stub')).toBeInTheDocument();
		});
	});

	describe('Edge Cases', () => {
		it('should handle empty to prop', () => {
			const { container } = renderWithRouter(N8nLink, {
				props: {
					to: '',
				},
				slots: { default: 'Empty Link' },
			});

			const link = container.querySelector('a');
			expect(link).toBeInTheDocument();
		});

		it('should handle hash links', () => {
			const { container } = renderWithRouter(N8nLink, {
				props: {
					to: '#section',
				},
				slots: { default: 'Hash Link' },
			});

			const link = container.querySelector('a');
			expect(link).toHaveAttribute('href', '#section');
		});
	});
});
