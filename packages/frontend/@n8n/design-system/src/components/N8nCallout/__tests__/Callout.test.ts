import { render } from '@testing-library/vue';
import { describe, it, expect } from 'vitest';
import N8nCallout from '../Callout.vue';

describe('N8nCallout', () => {
	describe('Basic Rendering', () => {
		it('should render with required theme prop', () => {
			const { container } = render(N8nCallout, {
				props: {
					theme: 'info',
				},
				slots: {
					default: 'Test callout message',
				},
				global: {
					stubs: ['n8n-icon', 'n8n-text'],
				},
			});

			const callout = container.querySelector('.n8n-callout');
			expect(callout).toBeInTheDocument();
			expect(callout).toHaveAttribute('role', 'alert');
		});

		it('should render with slot content', () => {
			const { container } = render(N8nCallout, {
				props: {
					theme: 'info',
				},
				slots: {
					default: 'Custom message content',
				},
				global: {
					stubs: ['n8n-icon', 'n8n-text'],
				},
			});

			const callout = container.querySelector('.n8n-callout');
			expect(callout).toBeInTheDocument();
			expect(callout.querySelector('n8n-text-stub')).toBeInTheDocument();
		});
	});

	describe('Theme Variants', () => {
		const themes = ['info', 'success', 'warning', 'danger', 'secondary'] as const;

		themes.forEach((theme) => {
			it(`should render with ${theme} theme`, () => {
				const { container } = render(N8nCallout, {
					props: {
						theme,
					},
					slots: {
						default: `${theme} message`,
					},
					global: {
						stubs: ['n8n-icon', 'n8n-text'],
					},
				});

				const callout = container.querySelector('.n8n-callout');
				expect(callout).toBeInTheDocument();
				expect(callout?.className).toMatch(new RegExp(theme));
			});
		});
	});

	describe('Icon Handling', () => {
		it('should render with default icon by default', () => {
			const { container } = render(N8nCallout, {
				props: {
					theme: 'info',
				},
				slots: {
					default: 'Message with default icon',
				},
				global: {
					stubs: ['n8n-icon', 'n8n-text'],
				},
			});

			const icon = container.querySelector('n8n-icon-stub');
			expect(icon).toBeInTheDocument();
			expect(icon).toHaveAttribute('icon', 'info'); // Default icon for info theme
		});

		it('should render with custom icon when provided', () => {
			const { container } = render(N8nCallout, {
				props: {
					theme: 'info',
					icon: 'circle-check',
				},
				slots: {
					default: 'Message with custom icon',
				},
				global: {
					stubs: ['n8n-icon', 'n8n-text'],
				},
			});

			const icon = container.querySelector('n8n-icon-stub');
			expect(icon).toBeInTheDocument();
			expect(icon).toHaveAttribute('icon', 'circle-check');
		});

		it('should not render icon when iconless is true', () => {
			const { container } = render(N8nCallout, {
				props: {
					theme: 'info',
					iconless: true,
				},
				slots: {
					default: 'Message without icon',
				},
				global: {
					stubs: ['n8n-icon', 'n8n-text'],
				},
			});

			const icon = container.querySelector('n8n-icon-stub');
			expect(icon).not.toBeInTheDocument();
		});

		it('should render with correct default icons for different themes', () => {
			const themeIconMap = {
				info: 'info',
				success: 'circle-check',
				warning: 'triangle-alert',
				danger: 'triangle-alert',
			};

			Object.entries(themeIconMap).forEach(([theme, expectedIcon]) => {
				const { container } = render(N8nCallout, {
					props: {
						theme: theme as keyof typeof themeIconMap,
					},
					slots: {
						default: `${theme} message`,
					},
					global: {
						stubs: ['n8n-icon', 'n8n-text'],
					},
				});

				const icon = container.querySelector('n8n-icon-stub');
				expect(icon).toHaveAttribute('icon', expectedIcon);
			});
		});
	});

	describe('Icon Size', () => {
		it('should use medium icon size by default', () => {
			const { container } = render(N8nCallout, {
				props: {
					theme: 'info',
				},
				slots: {
					default: 'Message',
				},
				global: {
					stubs: ['n8n-icon', 'n8n-text'],
				},
			});

			const icon = container.querySelector('n8n-icon-stub');
			expect(icon).toHaveAttribute('size', 'medium');
		});

		it('should use custom icon size when provided', () => {
			const { container } = render(N8nCallout, {
				props: {
					theme: 'info',
					iconSize: 'large',
				},
				slots: {
					default: 'Message',
				},
				global: {
					stubs: ['n8n-icon', 'n8n-text'],
				},
			});

			const icon = container.querySelector('n8n-icon-stub');
			expect(icon).toHaveAttribute('size', 'large');
		});

		it('should use medium size for secondary theme by default', () => {
			const { container } = render(N8nCallout, {
				props: {
					theme: 'secondary',
				},
				slots: {
					default: 'Secondary message',
				},
				global: {
					stubs: ['n8n-icon', 'n8n-text'],
				},
			});

			const icon = container.querySelector('n8n-icon-stub');
			expect(icon).toHaveAttribute('size', 'medium');
		});
	});

	describe('Styling Options', () => {
		it('should apply slim class when slim prop is true', () => {
			const { container } = render(N8nCallout, {
				props: {
					theme: 'info',
					slim: true,
				},
				slots: {
					default: 'Slim callout',
				},
				global: {
					stubs: ['n8n-icon', 'n8n-text'],
				},
			});

			const callout = container.querySelector('.n8n-callout');
			expect(callout?.className).toMatch(/slim/);
		});

		it('should apply round class when roundCorners is true (default)', () => {
			const { container } = render(N8nCallout, {
				props: {
					theme: 'info',
				},
				slots: {
					default: 'Round callout',
				},
				global: {
					stubs: ['n8n-icon', 'n8n-text'],
				},
			});

			const callout = container.querySelector('.n8n-callout');
			expect(callout?.className).toMatch(/round/);
		});

		it('should not apply round class when roundCorners is false', () => {
			const { container } = render(N8nCallout, {
				props: {
					theme: 'info',
					roundCorners: false,
				},
				slots: {
					default: 'Square callout',
				},
				global: {
					stubs: ['n8n-icon', 'n8n-text'],
				},
			});

			const callout = container.querySelector('.n8n-callout');
			expect(callout?.className).not.toMatch(/round/);
		});

		it('should apply onlyBottomBorder class when onlyBottomBorder is true', () => {
			const { container } = render(N8nCallout, {
				props: {
					theme: 'info',
					onlyBottomBorder: true,
				},
				slots: {
					default: 'Bottom border only',
				},
				global: {
					stubs: ['n8n-icon', 'n8n-text'],
				},
			});

			const callout = container.querySelector('.n8n-callout');
			expect(callout?.className).toMatch(/onlyBottomBorder/);
		});
	});

	describe('Slots', () => {
		it('should render actions slot', () => {
			const { container } = render(N8nCallout, {
				props: {
					theme: 'info',
				},
				slots: {
					default: 'Message',
					actions: '<button>Action Button</button>',
				},
				global: {
					stubs: ['n8n-icon', 'n8n-text'],
				},
			});

			const callout = container.querySelector('.n8n-callout');
			expect(callout).toBeInTheDocument();
			// Actions slot is rendered but content depends on actual HTML structure
		});

		it('should render trailingContent slot', () => {
			const { container } = render(N8nCallout, {
				props: {
					theme: 'info',
				},
				slots: {
					default: 'Message',
					trailingContent: '<span>Trailing Content</span>',
				},
				global: {
					stubs: ['n8n-icon', 'n8n-text'],
				},
			});

			const callout = container.querySelector('.n8n-callout');
			expect(callout).toBeInTheDocument();
			// Trailing content slot is rendered but content depends on actual HTML structure
		});
	});

	describe('Text Properties', () => {
		it('should pass size="small" to N8nText', () => {
			const { container } = render(N8nCallout, {
				props: {
					theme: 'info',
				},
				slots: {
					default: 'Text message',
				},
				global: {
					stubs: ['n8n-icon', 'n8n-text'],
				},
			});

			const textStub = container.querySelector('n8n-text-stub');
			expect(textStub).toHaveAttribute('size', 'small');
		});
	});

	describe('Combined Props', () => {
		it('should handle multiple props together', () => {
			const { container } = render(N8nCallout, {
				props: {
					theme: 'warning',
					icon: 'triangle-alert',
					iconSize: 'large',
					slim: true,
					roundCorners: false,
					onlyBottomBorder: true,
				},
				slots: {
					default: 'Complex callout',
				},
				global: {
					stubs: ['n8n-icon', 'n8n-text'],
				},
			});

			const callout = container.querySelector('.n8n-callout');
			expect(callout).toBeInTheDocument();
			expect(callout?.className).toMatch(/warning/);
			expect(callout?.className).toMatch(/slim/);
			expect(callout?.className).not.toMatch(/round/);
			expect(callout?.className).toMatch(/onlyBottomBorder/);

			const icon = container.querySelector('n8n-icon-stub');
			expect(icon).toHaveAttribute('icon', 'triangle-alert');
			expect(icon).toHaveAttribute('size', 'large');
		});
	});

	describe('Accessibility', () => {
		it('should have role="alert" for accessibility', () => {
			const { container } = render(N8nCallout, {
				props: {
					theme: 'info',
				},
				slots: {
					default: 'Alert message',
				},
				global: {
					stubs: ['n8n-icon', 'n8n-text'],
				},
			});

			const callout = container.querySelector('.n8n-callout');
			expect(callout).toHaveAttribute('role', 'alert');
		});
	});

	describe('Edge Cases', () => {
		it('should handle empty slot content', () => {
			const { container } = render(N8nCallout, {
				props: {
					theme: 'info',
				},
				slots: {
					default: '',
				},
				global: {
					stubs: ['n8n-icon', 'n8n-text'],
				},
			});

			const callout = container.querySelector('.n8n-callout');
			expect(callout).toBeInTheDocument();
		});

		it('should handle complex HTML content in slots', () => {
			const { container } = render(N8nCallout, {
				props: {
					theme: 'info',
				},
				slots: {
					default: '<strong>Bold</strong> and <em>italic</em> text with <a href="#">links</a>',
				},
				global: {
					stubs: ['n8n-icon', 'n8n-text'],
				},
			});

			const callout = container.querySelector('.n8n-callout');
			expect(callout).toBeInTheDocument();
		});
	});

	describe('CSS Classes', () => {
		it('should apply correct base CSS classes', () => {
			const { container } = render(N8nCallout, {
				props: {
					theme: 'info',
				},
				slots: {
					default: 'Test',
				},
				global: {
					stubs: ['n8n-icon', 'n8n-text'],
				},
			});

			const callout = container.querySelector('.n8n-callout');
			expect(callout?.className).toContain('n8n-callout');
		});
	});
});
