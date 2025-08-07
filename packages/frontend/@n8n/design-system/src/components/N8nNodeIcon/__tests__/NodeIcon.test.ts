/**
 * Test suite for N8nNodeIcon component
 */

import { render } from '@testing-library/vue';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import N8nNodeIcon from '../NodeIcon.vue';

// Mock FontAwesome
vi.mock('@fortawesome/vue-fontawesome', () => ({
	FontAwesomeIcon: {
		name: 'FontAwesomeIcon',
		template: `<i class="fa-mock" :data-icon="icon" :data-style="JSON.stringify(style)">FA: {{ icon }}</i>`,
		props: ['icon', 'style'],
	},
}));

// Mock N8nIcon
vi.mock('../../N8nIcon', () => ({
	default: {
		name: 'N8nIcon',
		template: `<div class="n8n-icon-mock" :data-icon="icon" :data-size="size">N8N: {{ icon }}</div>`,
		props: ['icon', 'size'],
	},
}));

// Mock N8nTooltip
vi.mock('../../N8nTooltip', () => ({
	default: {
		name: 'N8nTooltip',
		template: `
			<div class="tooltip-mock" :data-placement="placement" :data-disabled="disabled">
				<div class="tooltip-content">
					<slot name="content" />
				</div>
				<div class="tooltip-trigger">
					<slot />
				</div>
			</div>
		`,
		props: ['placement', 'disabled'],
	},
}));

// Mock icon validation function
vi.mock('../../N8nIcon/icons', () => ({
	isSupportedIconName: (name: string) => name === 'supported-icon',
}));

describe('N8nNodeIcon', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('Basic Rendering', () => {
		it('should render with default props', () => {
			const { container } = render(N8nNodeIcon, {
				props: {
					type: 'icon',
					name: 'test-icon',
				},
			});

			const nodeIcon = container.querySelector('.n8n-node-icon');
			expect(nodeIcon).toBeInTheDocument();

			const wrapper = container.querySelector('[class*="nodeIconWrapper"]');
			expect(wrapper).toBeInTheDocument();
		});

		it('should render file type with image', () => {
			const { container } = render(N8nNodeIcon, {
				props: {
					type: 'file',
					src: '/path/to/icon.png',
					nodeTypeName: 'File Node',
				},
			});

			const image = container.querySelector('[class*="nodeIconImage"]');
			expect(image).toBeInTheDocument();
			expect(image).toHaveAttribute('src', '/path/to/icon.png');
		});

		it('should render icon type with FontAwesome', () => {
			const { container } = render(N8nNodeIcon, {
				props: {
					type: 'icon',
					name: 'test-icon',
				},
			});

			const faIcon = container.querySelector('.fa-mock');
			expect(faIcon).toBeInTheDocument();
			expect(faIcon).toHaveAttribute('data-icon', 'test-icon');
		});

		it('should render unknown type with placeholder', () => {
			const { container } = render(N8nNodeIcon, {
				props: {
					type: 'unknown',
					nodeTypeName: 'Unknown Node',
				},
			});

			const placeholder = container.querySelector('[class*="nodeIconPlaceholder"]');
			expect(placeholder).toBeInTheDocument();
			expect(placeholder).toHaveTextContent('U'); // First character of "Unknown Node"
		});

		it('should render placeholder with question mark when no nodeTypeName', () => {
			const { container } = render(N8nNodeIcon, {
				props: {
					type: 'unknown',
				},
			});

			const placeholder = container.querySelector('[class*="nodeIconPlaceholder"]');
			expect(placeholder).toBeInTheDocument();
			expect(placeholder).toHaveTextContent('?');
		});
	});

	describe('Size Handling', () => {
		it('should apply size-based styles', () => {
			const { container } = render(N8nNodeIcon, {
				props: {
					type: 'icon',
					name: 'test-icon',
					size: 40,
				},
			});

			const wrapper = container.querySelector('[class*="nodeIconWrapper"]');
			expect(wrapper).toHaveStyle({
				width: '40px',
				height: '40px',
				'font-size': '40px',
				'line-height': '40px',
			});
		});

		it('should apply color when provided', () => {
			const { container } = render(N8nNodeIcon, {
				props: {
					type: 'icon',
					name: 'test-icon',
					color: '#ff0000',
				},
			});

			const wrapper = container.querySelector('[class*="nodeIconWrapper"]');
			expect(wrapper).toHaveStyle({
				color: '#ff0000',
			});
		});

		it('should handle size without color', () => {
			const { container } = render(N8nNodeIcon, {
				props: {
					type: 'icon',
					name: 'test-icon',
					size: 24,
				},
			});

			const wrapper = container.querySelector('[class*="nodeIconWrapper"]');
			expect(wrapper).toHaveStyle({
				width: '24px',
				height: '24px',
			});
		});

		it('should handle color without size', () => {
			const { container } = render(N8nNodeIcon, {
				props: {
					type: 'icon',
					name: 'test-icon',
					color: 'blue',
				},
			});

			const wrapper = container.querySelector('[class*="nodeIconWrapper"]');
			expect(wrapper).toHaveStyle({
				color: 'blue',
			});
		});
	});

	describe('Badge Support', () => {
		it('should render badge when provided', () => {
			const { container } = render(N8nNodeIcon, {
				props: {
					type: 'icon',
					name: 'main-icon',
					size: 40,
					badge: {
						src: '/badge-icon.png',
						type: 'file',
					},
				},
			});

			const badge = container.querySelector('[class*="badge"]');
			expect(badge).toBeInTheDocument();

			// Badge should contain a nested N8nNodeIcon
			const nestedNodeIcon = badge?.querySelector('.n8n-node-icon');
			expect(nestedNodeIcon).toBeInTheDocument();
		});

		it('should calculate correct badge size for size 40', () => {
			const { container } = render(N8nNodeIcon, {
				props: {
					type: 'icon',
					name: 'main-icon',
					size: 40,
					badge: {
						src: '/badge-icon.png',
						type: 'file',
					},
				},
			});

			const badge = container.querySelector('[class*="badge"]');
			expect(badge).toBeInTheDocument();
			// Badge size should be 18 for size 40, positioned at -9px
			expect(badge).toHaveStyle({
				padding: '4px', // Math.floor(18/4)
				right: '-9px', // Math.floor(18/2)
				bottom: '-9px',
			});
		});

		it('should calculate correct badge size for size 24', () => {
			const { container } = render(N8nNodeIcon, {
				props: {
					type: 'icon',
					name: 'main-icon',
					size: 24,
					badge: {
						src: '/badge-icon.png',
						type: 'file',
					},
				},
			});

			const badge = container.querySelector('[class*="badge"]');
			expect(badge).toBeInTheDocument();
			// Badge size should be 10 for size 24, positioned at -5px
			expect(badge).toHaveStyle({
				padding: '2px', // Math.floor(10/4)
				right: '-5px', // Math.floor(10/2)
				bottom: '-5px',
			});
		});

		it('should handle default badge size for size 18', () => {
			const { container } = render(N8nNodeIcon, {
				props: {
					type: 'icon',
					name: 'main-icon',
					size: 18,
					badge: {
						src: '/badge-icon.png',
						type: 'file',
					},
				},
			});

			const badge = container.querySelector('[class*="badge"]');
			expect(badge).toBeInTheDocument();
			// Badge size should be 12 (default)
			expect(badge).toHaveStyle({
				padding: '3px', // Math.floor(12/4)
				right: '-6px', // Math.floor(12/2)
				bottom: '-6px',
			});
		});
	});

	describe('Tooltip Functionality', () => {
		it('should render tooltip when showTooltip is true', () => {
			const { container } = render(N8nNodeIcon, {
				props: {
					type: 'icon',
					name: 'test-icon',
					showTooltip: true,
					nodeTypeName: 'Test Node Type',
				},
			});

			const tooltip = container.querySelector('.tooltip-mock');
			expect(tooltip).toBeInTheDocument();
			expect(tooltip).toHaveAttribute('data-disabled', 'false');

			const tooltipContent = container.querySelector('.tooltip-content');
			expect(tooltipContent).toHaveTextContent('Test Node Type');
		});

		it('should not render tooltip when showTooltip is false', () => {
			const { container } = render(N8nNodeIcon, {
				props: {
					type: 'icon',
					name: 'test-icon',
					showTooltip: false,
					nodeTypeName: 'Test Node Type',
				},
			});

			const tooltip = container.querySelector('.tooltip-mock');
			expect(tooltip).not.toBeInTheDocument();
		});

		it('should apply custom tooltip position', () => {
			const { container } = render(N8nNodeIcon, {
				props: {
					type: 'icon',
					name: 'test-icon',
					showTooltip: true,
					tooltipPosition: 'bottom',
					nodeTypeName: 'Test Node Type',
				},
			});

			const tooltip = container.querySelector('.tooltip-mock');
			expect(tooltip).toHaveAttribute('data-placement', 'bottom');
		});

		it('should default tooltip position to top', () => {
			const { container } = render(N8nNodeIcon, {
				props: {
					type: 'icon',
					name: 'test-icon',
					showTooltip: true,
					nodeTypeName: 'Test Node Type',
				},
			});

			const tooltip = container.querySelector('.tooltip-mock');
			expect(tooltip).toHaveAttribute('data-placement', 'top');
		});
	});

	describe('Updated Icons Support', () => {
		it('should render N8nIcon when useUpdatedIcons is true and icon is supported', () => {
			const { container } = render(N8nNodeIcon, {
				props: {
					type: 'icon',
					name: 'supported-icon',
					useUpdatedIcons: true,
				},
			});

			const n8nIcon = container.querySelector('.n8n-icon-mock');
			expect(n8nIcon).toBeInTheDocument();
			expect(n8nIcon).toHaveAttribute('data-icon', 'supported-icon');
			expect(n8nIcon).toHaveAttribute('data-size', 'xlarge');

			// Should not render FontAwesome icon
			const faIcon = container.querySelector('.fa-mock');
			expect(faIcon).not.toBeInTheDocument();
		});

		it('should render FontAwesome when useUpdatedIcons is true but icon is not supported', () => {
			const { container } = render(N8nNodeIcon, {
				props: {
					type: 'icon',
					name: 'unsupported-icon',
					useUpdatedIcons: true,
				},
			});

			const faIcon = container.querySelector('.fa-mock');
			expect(faIcon).toBeInTheDocument();
			expect(faIcon).toHaveAttribute('data-icon', 'unsupported-icon');

			// Should not render N8nIcon
			const n8nIcon = container.querySelector('.n8n-icon-mock');
			expect(n8nIcon).not.toBeInTheDocument();
		});

		it('should render FontAwesome when useUpdatedIcons is false', () => {
			const { container } = render(N8nNodeIcon, {
				props: {
					type: 'icon',
					name: 'supported-icon',
					useUpdatedIcons: false,
				},
			});

			const faIcon = container.querySelector('.fa-mock');
			expect(faIcon).toBeInTheDocument();

			// Should not render N8nIcon
			const n8nIcon = container.querySelector('.n8n-icon-mock');
			expect(n8nIcon).not.toBeInTheDocument();
		});
	});

	describe('CSS Classes and States', () => {
		it('should apply circle class when circle prop is true', () => {
			const { container } = render(N8nNodeIcon, {
				props: {
					type: 'icon',
					name: 'test-icon',
					circle: true,
				},
			});

			const wrapper = container.querySelector('[class*="nodeIconWrapper"]');
			expect(wrapper).toHaveClass('circle');
		});

		it('should apply disabled class when disabled prop is true', () => {
			const { container } = render(N8nNodeIcon, {
				props: {
					type: 'icon',
					name: 'test-icon',
					disabled: true,
				},
			});

			const wrapper = container.querySelector('[class*="nodeIconWrapper"]');
			expect(wrapper).toHaveClass('disabled');
		});

		it('should not apply circle or disabled classes by default', () => {
			const { container } = render(N8nNodeIcon, {
				props: {
					type: 'icon',
					name: 'test-icon',
				},
			});

			const wrapper = container.querySelector('[class*="nodeIconWrapper"]');
			expect(wrapper).not.toHaveClass('circle');
			expect(wrapper).not.toHaveClass('disabled');
		});

		it('should apply both circle and disabled classes', () => {
			const { container } = render(N8nNodeIcon, {
				props: {
					type: 'icon',
					name: 'test-icon',
					circle: true,
					disabled: true,
				},
			});

			const wrapper = container.querySelector('[class*="nodeIconWrapper"]');
			expect(wrapper).toHaveClass('circle');
			expect(wrapper).toHaveClass('disabled');
		});
	});

	describe('Font Style Data', () => {
		it('should apply font style data when size is provided', () => {
			const { container } = render(N8nNodeIcon, {
				props: {
					type: 'icon',
					name: 'test-icon',
					size: 32,
				},
			});

			const faIcon = container.querySelector('.fa-mock');
			const styleData = JSON.parse(faIcon?.getAttribute('data-style') || '{}');
			expect(styleData['max-width']).toBe('32px');
		});

		it('should not apply font style data when size is not provided', () => {
			const { container } = render(N8nNodeIcon, {
				props: {
					type: 'icon',
					name: 'test-icon',
				},
			});

			const faIcon = container.querySelector('.fa-mock');
			const styleData = JSON.parse(faIcon?.getAttribute('data-style') || '{}');
			expect(styleData['max-width']).toBeUndefined();
		});
	});

	describe('Edge Cases and Error Handling', () => {
		it('should handle missing src for file type', () => {
			const { container } = render(N8nNodeIcon, {
				props: {
					type: 'file',
				},
			});

			const image = container.querySelector('[class*="nodeIconImage"]');
			expect(image).toBeInTheDocument();
			expect(image).not.toHaveAttribute('src');
		});

		it('should handle missing name for icon type', () => {
			const { container } = render(N8nNodeIcon, {
				props: {
					type: 'icon',
				},
			});

			const faIcon = container.querySelector('.fa-mock');
			expect(faIcon).toBeInTheDocument();
			expect(faIcon).toHaveAttribute('data-icon', 'undefined');
		});

		it('should handle very large sizes', () => {
			const { container } = render(N8nNodeIcon, {
				props: {
					type: 'icon',
					name: 'test-icon',
					size: 1000,
				},
			});

			const wrapper = container.querySelector('[class*="nodeIconWrapper"]');
			expect(wrapper).toHaveStyle({
				width: '1000px',
				height: '1000px',
				'font-size': '1000px',
			});
		});

		it('should handle zero size', () => {
			const { container } = render(N8nNodeIcon, {
				props: {
					type: 'icon',
					name: 'test-icon',
					size: 0,
				},
			});

			const wrapper = container.querySelector('[class*="nodeIconWrapper"]');
			expect(wrapper).toHaveStyle({
				width: '0px',
				height: '0px',
				'font-size': '0px',
			});
		});

		it('should handle component unmounting gracefully', () => {
			const { unmount } = render(N8nNodeIcon, {
				props: {
					type: 'icon',
					name: 'test-icon',
				},
			});

			expect(() => {
				unmount();
			}).not.toThrow();
		});
	});

	describe('Icon Type Variations', () => {
		it('should handle file type with tooltip', () => {
			const { container } = render(N8nNodeIcon, {
				props: {
					type: 'file',
					src: '/test-icon.png',
					showTooltip: true,
					nodeTypeName: 'File Node',
				},
			});

			const tooltip = container.querySelector('.tooltip-mock');
			const image = container.querySelector('[class*="nodeIconImage"]');

			expect(tooltip).toBeInTheDocument();
			expect(image).toBeInTheDocument();
			expect(image).toHaveAttribute('src', '/test-icon.png');
		});

		it('should handle icon type with tooltip', () => {
			const { container } = render(N8nNodeIcon, {
				props: {
					type: 'icon',
					name: 'test-icon',
					showTooltip: true,
					nodeTypeName: 'Icon Node',
				},
			});

			const tooltip = container.querySelector('.tooltip-mock');
			const faIcon = container.querySelector('.fa-mock');

			expect(tooltip).toBeInTheDocument();
			expect(faIcon).toBeInTheDocument();
		});

		it('should handle unknown type with tooltip', () => {
			const { container } = render(N8nNodeIcon, {
				props: {
					type: 'unknown',
					nodeTypeName: 'Mystery Node',
					showTooltip: true,
				},
			});

			const tooltip = container.querySelector('.tooltip-mock');
			const placeholder = container.querySelector('[class*="nodeIconPlaceholder"]');

			expect(tooltip).toBeInTheDocument();
			expect(placeholder).toBeInTheDocument();
			expect(placeholder).toHaveTextContent('M');
		});
	});

	describe('Performance and Memory', () => {
		it('should handle rapid prop changes', async () => {
			const { rerender } = render(N8nNodeIcon, {
				props: {
					type: 'icon',
					name: 'initial-icon',
					size: 24,
				},
			});

			// Rapid changes
			for (let i = 0; i < 10; i++) {
				await rerender({
					props: {
						type: i % 2 === 0 ? 'icon' : 'file',
						name: `icon-${i}`,
						src: `/icon-${i}.png`,
						size: 24 + i * 2,
					},
				});
			}

			// Should still render without errors
			expect(document.querySelector('.n8n-node-icon')).toBeInTheDocument();
		});

		it('should handle tooltip toggling efficiently', async () => {
			const { rerender } = render(N8nNodeIcon, {
				props: {
					type: 'icon',
					name: 'test-icon',
					showTooltip: false,
					nodeTypeName: 'Test Node',
				},
			});

			// Toggle tooltip multiple times
			for (let i = 0; i < 5; i++) {
				await rerender({
					props: {
						type: 'icon',
						name: 'test-icon',
						showTooltip: i % 2 === 0,
						nodeTypeName: 'Test Node',
					},
				});
			}

			// Should still render correctly
			expect(document.querySelector('.n8n-node-icon')).toBeInTheDocument();
		});
	});

	describe('Attributes and Props Binding', () => {
		it('should bind attributes to container', () => {
			const { container } = render(N8nNodeIcon, {
				props: {
					type: 'icon',
					name: 'test-icon',
					'data-testid': 'custom-node-icon',
					'aria-label': 'Custom Node Icon',
				},
			});

			const nodeIcon = container.querySelector('.n8n-node-icon');
			expect(nodeIcon).toHaveAttribute('data-testid', 'custom-node-icon');
			expect(nodeIcon).toHaveAttribute('aria-label', 'Custom Node Icon');
		});

		it('should handle class attribute merging', () => {
			const { container } = render(N8nNodeIcon, {
				props: {
					type: 'icon',
					name: 'test-icon',
					class: 'custom-class',
				},
			});

			const nodeIcon = container.querySelector('.n8n-node-icon');
			expect(nodeIcon).toHaveClass('custom-class');
		});
	});
});
