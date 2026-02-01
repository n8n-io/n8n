import { render } from '@testing-library/vue';
import { describe, expect, it, vi } from 'vitest';

import NodeIcon from './NodeIcon.vue';

// Mock N8nTooltip component
vi.mock('../N8nTooltip', () => ({
	default: {
		name: 'N8nTooltip',
		template: '<div data-testid="tooltip"><slot /></div>',
		props: ['placement', 'disabled'],
	},
}));

// Mock N8nIcon component
vi.mock('../N8nIcon', () => ({
	default: {
		name: 'N8nIcon',
		template: '<span data-testid="n8n-icon" :data-icon="icon"></span>',
		props: ['icon'],
	},
}));

describe('NodeIcon', () => {
	describe('icon rendering', () => {
		it('renders file type icon with image', () => {
			const { container } = render(NodeIcon, {
				props: {
					type: 'file',
					src: 'https://example.com/icon.png',
				},
			});

			const img = container.querySelector('img');
			expect(img).toBeTruthy();
			expect(img?.getAttribute('src')).toBe('https://example.com/icon.png');
		});

		it('renders icon type with supported icon name', () => {
			const { container } = render(NodeIcon, {
				props: {
					type: 'icon',
					name: 'check',
				},
			});

			// N8nIcon should be rendered (via IconContent)
			const icon = container.querySelector('[data-testid="n8n-icon"]');
			expect(icon).toBeTruthy();
			expect(icon?.getAttribute('data-icon')).toBe('check');
		});

		it('renders unknown type with placeholder', () => {
			const { getByText } = render(NodeIcon, {
				props: {
					type: 'unknown',
					nodeTypeName: 'TestNode',
				},
			});

			expect(getByText('T')).toBeTruthy();
		});

		it('renders unknown type with question mark when no nodeTypeName', () => {
			const { getByText } = render(NodeIcon, {
				props: {
					type: 'unknown',
				},
			});

			expect(getByText('?')).toBeTruthy();
		});
	});

	describe('styling', () => {
		it('applies custom size to wrapper', () => {
			const { container } = render(NodeIcon, {
				props: {
					type: 'file',
					src: 'test.png',
					size: 40,
				},
			});

			const wrapper = container.querySelector('[class*="nodeIconWrapper"]');
			expect(wrapper).toBeTruthy();
			const style = (wrapper as HTMLElement).style;
			expect(style.width).toBe('40px');
			expect(style.height).toBe('40px');
		});

		it('applies custom color', () => {
			const { container } = render(NodeIcon, {
				props: {
					type: 'file',
					src: 'test.png',
					color: '#ff0000',
				},
			});

			const wrapper = container.querySelector('[class*="nodeIconWrapper"]');
			const style = (wrapper as HTMLElement).style;
			expect(style.color).toBe('rgb(255, 0, 0)');
		});

		it('applies circle class when circle prop is true', () => {
			const { container } = render(NodeIcon, {
				props: {
					type: 'file',
					src: 'test.png',
					circle: true,
				},
			});

			const wrapper = container.querySelector('[class*="nodeIconWrapper"]');
			expect(wrapper?.className).toContain('circle');
		});

		it('applies disabled class when disabled prop is true', () => {
			const { container } = render(NodeIcon, {
				props: {
					type: 'file',
					src: 'test.png',
					disabled: true,
				},
			});

			const wrapper = container.querySelector('[class*="nodeIconWrapper"]');
			expect(wrapper?.className).toContain('disabled');
		});
	});

	describe('tooltip', () => {
		it('renders tooltip when showTooltip is true', () => {
			const { container } = render(NodeIcon, {
				props: {
					type: 'file',
					src: 'test.png',
					showTooltip: true,
					nodeTypeName: 'Test Node',
				},
			});

			const tooltip = container.querySelector('[data-testid="tooltip"]');
			expect(tooltip).toBeTruthy();
		});

		it('does not render tooltip when showTooltip is false', () => {
			const { container } = render(NodeIcon, {
				props: {
					type: 'file',
					src: 'test.png',
					showTooltip: false,
				},
			});

			const tooltip = container.querySelector('[data-testid="tooltip"]');
			expect(tooltip).toBeNull();
		});
	});

	describe('badge', () => {
		it('renders badge when badge prop is provided', () => {
			const { container } = render(NodeIcon, {
				props: {
					type: 'file',
					src: 'test.png',
					size: 40,
					badge: {
						type: 'file',
						src: 'badge.png',
					},
				},
			});

			const badge = container.querySelector('[class*="badge"]');
			expect(badge).toBeTruthy();
		});

		it('does not render badge when badge prop is not provided', () => {
			const { container } = render(NodeIcon, {
				props: {
					type: 'file',
					src: 'test.png',
				},
			});

			const badge = container.querySelector('[class*="badge"]');
			expect(badge).toBeNull();
		});

		it('renders placeholder when icon name is not supported', () => {
			const { getByText } = render(NodeIcon, {
				props: {
					type: 'icon',
					name: 'unsupported-icon-name',
					nodeTypeName: 'CustomNode',
				},
			});

			expect(getByText('C')).toBeTruthy();
		});
	});
});
