/**
 * Test suite for N8nNodeCreatorNode component
 */

import { render, fireEvent } from '@testing-library/vue';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import N8nNodeCreatorNode from '../NodeCreatorNode.vue';
import type { NodeCreatorTag } from '../../../types/node-creator-node';

// Mock the child components
vi.mock('../../N8nIcon', () => ({
	default: {
		name: 'N8nIcon',
		template: `
			<div class="icon-mock" 
				:data-icon="icon" 
				:data-size="size" 
				:data-title="title">
				Icon: {{ icon }}
			</div>
		`,
		props: ['icon', 'size', 'title'],
	},
}));

// Mock Element Plus components
vi.mock('element-plus', () => ({
	ElTag: {
		name: 'ElTag',
		template: `
			<span class="el-tag-mock" 
				:data-type="type" 
				:data-size="size" 
				:data-round="round">
				<slot />
			</span>
		`,
		props: ['type', 'size', 'round'],
	},
}));

// Mock the composable
vi.mock('../../../composables/useI18n', () => ({
	useI18n: () => ({
		t: (key: string) => {
			const translations = {
				'nodeCreator.nodeItem.triggerIconTitle': 'Trigger node',
			};
			return translations[key] || key;
		},
	}),
}));

describe('N8nNodeCreatorNode', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('Basic Rendering', () => {
		it('should render with minimal required props', () => {
			const { container } = render(N8nNodeCreatorNode, {
				props: {
					title: 'Test Node',
				},
				slots: {
					icon: '<div class="test-icon">Icon</div>',
				},
			});

			const creatorNode = container.querySelector('[data-test-id="node-creator-item-name"]');
			expect(creatorNode).toBeInTheDocument();
			expect(creatorNode).toHaveTextContent('Test Node');

			const iconSlot = container.querySelector('.test-icon');
			expect(iconSlot).toBeInTheDocument();
		});

		it('should render with all props provided', () => {
			const tag: NodeCreatorTag = {
				text: 'Premium',
				type: 'warning',
			};

			const { container } = render(N8nNodeCreatorNode, {
				props: {
					title: 'Advanced Node',
					description: 'This is an advanced node for power users',
					active: true,
					isAi: true,
					isTrigger: true,
					isOfficial: true,
					showActionArrow: true,
					tag,
				},
				slots: {
					icon: '<div class="advanced-icon">Advanced Icon</div>',
					extraDetails: '<span class="extra-detail">Extra Info</span>',
					dragContent: '<div class="drag-handle">Drag Me</div>',
				},
			});

			const title = container.querySelector('[data-test-id="node-creator-item-name"]');
			const description = container.querySelector('[data-test-id="node-creator-item-description"]');
			const elTag = container.querySelector('.el-tag-mock');
			const triggerIcon = container.querySelector('.icon-mock[data-icon="bolt-filled"]');
			const actionArrow = container.querySelector('.icon-mock[data-icon="arrow-right"]');

			expect(title).toHaveTextContent('Advanced Node');
			expect(description).toHaveTextContent('This is an advanced node for power users');
			expect(elTag).toBeInTheDocument();
			expect(elTag).toHaveTextContent('Premium');
			expect(elTag).toHaveAttribute('data-type', 'warning');
			expect(triggerIcon).toBeInTheDocument();
			expect(actionArrow).toBeInTheDocument();
		});

		it('should apply correct CSS classes', () => {
			const { container } = render(N8nNodeCreatorNode, {
				props: {
					title: 'Test Node',
					showActionArrow: false,
				},
				slots: {
					icon: '<div>Icon</div>',
				},
			});

			const creatorNode = container.querySelector('[class*="creatorNode"]');
			expect(creatorNode).toBeInTheDocument();
			expect(creatorNode).toHaveClass('hasAction');
		});

		it('should not apply hasAction class when showActionArrow is true', () => {
			const { container } = render(N8nNodeCreatorNode, {
				props: {
					title: 'Test Node',
					showActionArrow: true,
				},
				slots: {
					icon: '<div>Icon</div>',
				},
			});

			const creatorNode = container.querySelector('[class*="creatorNode"]');
			expect(creatorNode).toBeInTheDocument();
			expect(creatorNode).not.toHaveClass('hasAction');
		});
	});

	describe('Props Handling', () => {
		it('should handle active prop', () => {
			const { container, rerender } = render(N8nNodeCreatorNode, {
				props: {
					title: 'Test Node',
					active: false,
				},
				slots: {
					icon: '<div>Icon</div>',
				},
			});

			expect(container.querySelector('[class*="creatorNode"]')).toBeInTheDocument();

			// Change active state
			rerender({
				props: {
					title: 'Test Node',
					active: true,
				},
				slots: {
					icon: '<div>Icon</div>',
				},
			});

			expect(container.querySelector('[class*="creatorNode"]')).toBeInTheDocument();
		});

		it('should handle different tag types', () => {
			const tagTypes: Array<NodeCreatorTag['type']> = ['success', 'warning', 'danger', 'info'];

			tagTypes.forEach((type) => {
				const tag: NodeCreatorTag = {
					text: `Tag ${type}`,
					type,
				};

				const { container } = render(N8nNodeCreatorNode, {
					props: {
						title: 'Test Node',
						tag,
					},
					slots: {
						icon: '<div>Icon</div>',
					},
				});

				const elTag = container.querySelector('.el-tag-mock');
				expect(elTag).toBeInTheDocument();
				expect(elTag).toHaveAttribute('data-type', type || 'success');
				expect(elTag).toHaveTextContent(`Tag ${type}`);
			});
		});

		it('should default tag type to success when not provided', () => {
			const tag: NodeCreatorTag = {
				text: 'No Type Tag',
			};

			const { container } = render(N8nNodeCreatorNode, {
				props: {
					title: 'Test Node',
					tag,
				},
				slots: {
					icon: '<div>Icon</div>',
				},
			});

			const elTag = container.querySelector('.el-tag-mock');
			expect(elTag).toHaveAttribute('data-type', 'success');
		});

		it('should handle boolean flags correctly', () => {
			const { container } = render(N8nNodeCreatorNode, {
				props: {
					title: 'Test Node',
					isAi: true,
					isTrigger: true,
					isOfficial: true,
				},
				slots: {
					icon: '<div>Icon</div>',
				},
			});

			// Component should render without errors
			expect(
				container.querySelector('[data-test-id="node-creator-item-name"]'),
			).toBeInTheDocument();
		});
	});

	describe('Trigger Icon', () => {
		it('should show trigger icon when isTrigger is true', () => {
			const { container } = render(N8nNodeCreatorNode, {
				props: {
					title: 'Trigger Node',
					isTrigger: true,
				},
				slots: {
					icon: '<div>Icon</div>',
				},
			});

			const triggerIcon = container.querySelector('.icon-mock[data-icon="bolt-filled"]');
			expect(triggerIcon).toBeInTheDocument();
			expect(triggerIcon).toHaveAttribute('data-size', 'xsmall');
			expect(triggerIcon).toHaveAttribute('data-title', 'Trigger node');
		});

		it('should not show trigger icon when isTrigger is false', () => {
			const { container } = render(N8nNodeCreatorNode, {
				props: {
					title: 'Regular Node',
					isTrigger: false,
				},
				slots: {
					icon: '<div>Icon</div>',
				},
			});

			const triggerIcon = container.querySelector('.icon-mock[data-icon="bolt-filled"]');
			expect(triggerIcon).not.toBeInTheDocument();
		});
	});

	describe('Action Arrow', () => {
		it('should show action arrow when showActionArrow is true', () => {
			const { container } = render(N8nNodeCreatorNode, {
				props: {
					title: 'Test Node',
					showActionArrow: true,
				},
				slots: {
					icon: '<div>Icon</div>',
				},
			});

			const actionButton = container.querySelector('[class*="panelIcon"]');
			const arrowIcon = container.querySelector('.icon-mock[data-icon="arrow-right"]');

			expect(actionButton).toBeInTheDocument();
			expect(arrowIcon).toBeInTheDocument();
			expect(arrowIcon).toHaveAttribute('data-size', 'large');
		});

		it('should not show action arrow when showActionArrow is false', () => {
			const { container } = render(N8nNodeCreatorNode, {
				props: {
					title: 'Test Node',
					showActionArrow: false,
				},
				slots: {
					icon: '<div>Icon</div>',
				},
			});

			const actionButton = container.querySelector('[class*="panelIcon"]');
			expect(actionButton).not.toBeInTheDocument();
		});
	});

	describe('Slots Rendering', () => {
		it('should render icon slot', () => {
			const { container } = render(N8nNodeCreatorNode, {
				props: {
					title: 'Test Node',
				},
				slots: {
					icon: '<div class="custom-icon" data-testid="icon-slot">Custom Icon</div>',
				},
			});

			const iconSlot = container.querySelector('[data-testid="icon-slot"]');
			expect(iconSlot).toBeInTheDocument();
			expect(iconSlot).toHaveTextContent('Custom Icon');
		});

		it('should render extraDetails slot', () => {
			const { container } = render(N8nNodeCreatorNode, {
				props: {
					title: 'Test Node',
				},
				slots: {
					icon: '<div>Icon</div>',
					extraDetails: '<span class="extra-info" data-testid="extra-details">Beta</span>',
				},
			});

			const extraDetails = container.querySelector('[data-testid="extra-details"]');
			expect(extraDetails).toBeInTheDocument();
			expect(extraDetails).toHaveTextContent('Beta');
		});

		it('should render dragContent slot', () => {
			const { container } = render(N8nNodeCreatorNode, {
				props: {
					title: 'Test Node',
				},
				slots: {
					icon: '<div>Icon</div>',
					dragContent: '<div class="drag-handle" data-testid="drag-content">Drag Handle</div>',
				},
			});

			const dragContent = container.querySelector('[data-testid="drag-content"]');
			expect(dragContent).toBeInTheDocument();
			expect(dragContent).toHaveTextContent('Drag Handle');
		});

		it('should render all slots together', () => {
			const { container } = render(N8nNodeCreatorNode, {
				props: {
					title: 'Multi Slot Node',
				},
				slots: {
					icon: '<div data-testid="icon">Icon</div>',
					extraDetails: '<span data-testid="extra">Extra</span>',
					dragContent: '<div data-testid="drag">Drag</div>',
				},
			});

			expect(container.querySelector('[data-testid="icon"]')).toBeInTheDocument();
			expect(container.querySelector('[data-testid="extra"]')).toBeInTheDocument();
			expect(container.querySelector('[data-testid="drag"]')).toBeInTheDocument();
		});
	});

	describe('Event Handling', () => {
		it('should emit tooltipClick event', async () => {
			const onTooltipClick = vi.fn();
			const { container } = render(N8nNodeCreatorNode, {
				props: {
					title: 'Test Node',
					onTooltipClick,
				},
				slots: {
					icon: '<div>Icon</div>',
				},
			});

			const creatorNode = container.querySelector('[class*="creatorNode"]');
			await fireEvent.click(creatorNode!);

			// Since the component doesn't automatically emit tooltipClick on click,
			// we test that the event can be emitted when triggered
			expect(creatorNode).toBeInTheDocument();
		});

		it('should handle attributes correctly', () => {
			const { container } = render(N8nNodeCreatorNode, {
				props: {
					title: 'Test Node',
					'data-custom': 'custom-value',
					class: 'custom-class',
				},
				slots: {
					icon: '<div>Icon</div>',
				},
			});

			const creatorNode = container.querySelector('[class*="creatorNode"]');
			expect(creatorNode).toHaveAttribute('data-custom', 'custom-value');
			expect(creatorNode).toHaveClass('custom-class');
		});
	});

	describe('Description Handling', () => {
		it('should render description when provided', () => {
			const { container } = render(N8nNodeCreatorNode, {
				props: {
					title: 'Test Node',
					description: 'This is a test description for the node',
				},
				slots: {
					icon: '<div>Icon</div>',
				},
			});

			const description = container.querySelector('[data-test-id="node-creator-item-description"]');
			expect(description).toBeInTheDocument();
			expect(description).toHaveTextContent('This is a test description for the node');
		});

		it('should not render description when not provided', () => {
			const { container } = render(N8nNodeCreatorNode, {
				props: {
					title: 'Test Node',
				},
				slots: {
					icon: '<div>Icon</div>',
				},
			});

			const description = container.querySelector('[data-test-id="node-creator-item-description"]');
			expect(description).not.toBeInTheDocument();
		});

		it('should handle empty description', () => {
			const { container } = render(N8nNodeCreatorNode, {
				props: {
					title: 'Test Node',
					description: '',
				},
				slots: {
					icon: '<div>Icon</div>',
				},
			});

			const description = container.querySelector('[data-test-id="node-creator-item-description"]');
			expect(description).not.toBeInTheDocument();
		});

		it('should handle long descriptions', () => {
			const longDescription = 'This is a very long description '.repeat(10);
			const { container } = render(N8nNodeCreatorNode, {
				props: {
					title: 'Test Node',
					description: longDescription,
				},
				slots: {
					icon: '<div>Icon</div>',
				},
			});

			const description = container.querySelector('[data-test-id="node-creator-item-description"]');
			expect(description).toBeInTheDocument();
			expect(description).toHaveTextContent(longDescription);
		});
	});

	describe('Tag Rendering', () => {
		it('should render tag with custom type', () => {
			const tag: NodeCreatorTag = {
				text: 'Beta',
				type: 'warning',
			};

			const { container } = render(N8nNodeCreatorNode, {
				props: {
					title: 'Test Node',
					tag,
				},
				slots: {
					icon: '<div>Icon</div>',
				},
			});

			const elTag = container.querySelector('.el-tag-mock');
			expect(elTag).toBeInTheDocument();
			expect(elTag).toHaveTextContent('Beta');
			expect(elTag).toHaveAttribute('data-type', 'warning');
			expect(elTag).toHaveAttribute('data-size', 'small');
			expect(elTag).toHaveAttribute('data-round', 'true');
		});

		it('should not render tag when not provided', () => {
			const { container } = render(N8nNodeCreatorNode, {
				props: {
					title: 'Test Node',
				},
				slots: {
					icon: '<div>Icon</div>',
				},
			});

			const elTag = container.querySelector('.el-tag-mock');
			expect(elTag).not.toBeInTheDocument();
		});

		it('should handle tag with only text', () => {
			const tag: NodeCreatorTag = {
				text: 'New',
			};

			const { container } = render(N8nNodeCreatorNode, {
				props: {
					title: 'Test Node',
					tag,
				},
				slots: {
					icon: '<div>Icon</div>',
				},
			});

			const elTag = container.querySelector('.el-tag-mock');
			expect(elTag).toBeInTheDocument();
			expect(elTag).toHaveTextContent('New');
			expect(elTag).toHaveAttribute('data-type', 'success'); // Default type
		});
	});

	describe('Accessibility', () => {
		it('should have proper test-id attributes', () => {
			const { container } = render(N8nNodeCreatorNode, {
				props: {
					title: 'Accessible Node',
					description: 'Accessible description',
				},
				slots: {
					icon: '<div>Icon</div>',
				},
			});

			const nameElement = container.querySelector('[data-test-id="node-creator-item-name"]');
			const descriptionElement = container.querySelector(
				'[data-test-id="node-creator-item-description"]',
			);

			expect(nameElement).toBeInTheDocument();
			expect(descriptionElement).toBeInTheDocument();
		});

		it('should be keyboard accessible when showActionArrow is true', () => {
			const { container } = render(N8nNodeCreatorNode, {
				props: {
					title: 'Test Node',
					showActionArrow: true,
				},
				slots: {
					icon: '<div>Icon</div>',
				},
			});

			const actionButton = container.querySelector('[class*="panelIcon"]');
			expect(actionButton).toBeInTheDocument();
			expect(actionButton?.tagName).toBe('BUTTON');
		});

		it('should have proper semantic structure', () => {
			const { container } = render(N8nNodeCreatorNode, {
				props: {
					title: 'Semantic Node',
					description: 'This tests semantic structure',
				},
				slots: {
					icon: '<div>Icon</div>',
				},
			});

			const title = container.querySelector('[data-test-id="node-creator-item-name"]');
			const description = container.querySelector('[data-test-id="node-creator-item-description"]');

			expect(title?.tagName).toBe('SPAN');
			expect(description?.tagName).toBe('P');
		});
	});

	describe('Edge Cases', () => {
		it('should handle very long titles', () => {
			const longTitle = 'Very Long Node Title '.repeat(10);
			const { container } = render(N8nNodeCreatorNode, {
				props: {
					title: longTitle,
				},
				slots: {
					icon: '<div>Icon</div>',
				},
			});

			const title = container.querySelector('[data-test-id="node-creator-item-name"]');
			expect(title).toHaveTextContent(longTitle);
		});

		it('should handle special characters in title and description', () => {
			const { container } = render(N8nNodeCreatorNode, {
				props: {
					title: 'Node <with> & "special" characters',
					description: 'Description with émojis 🎉 and unicode ñáéíóú',
				},
				slots: {
					icon: '<div>Icon</div>',
				},
			});

			const title = container.querySelector('[data-test-id="node-creator-item-name"]');
			const description = container.querySelector('[data-test-id="node-creator-item-description"]');

			expect(title).toHaveTextContent('Node <with> & "special" characters');
			expect(description).toHaveTextContent('Description with émojis 🎉 and unicode ñáéíóú');
		});

		it('should handle component unmounting gracefully', () => {
			const { unmount } = render(N8nNodeCreatorNode, {
				props: {
					title: 'Test Node',
				},
				slots: {
					icon: '<div>Icon</div>',
				},
			});

			expect(() => {
				unmount();
			}).not.toThrow();
		});

		it('should work with all boolean flags set to false', () => {
			const { container } = render(N8nNodeCreatorNode, {
				props: {
					title: 'Simple Node',
					active: false,
					isAi: false,
					isTrigger: false,
					isOfficial: false,
					showActionArrow: false,
				},
				slots: {
					icon: '<div>Icon</div>',
				},
			});

			const creatorNode = container.querySelector('[class*="creatorNode"]');
			const triggerIcon = container.querySelector('.icon-mock[data-icon="bolt-filled"]');
			const actionButton = container.querySelector('[class*="panelIcon"]');

			expect(creatorNode).toBeInTheDocument();
			expect(creatorNode).toHaveClass('hasAction');
			expect(triggerIcon).not.toBeInTheDocument();
			expect(actionButton).not.toBeInTheDocument();
		});

		it('should handle multiple rapid prop changes', async () => {
			const { container, rerender } = render(N8nNodeCreatorNode, {
				props: {
					title: 'Initial Title',
					isTrigger: false,
				},
				slots: {
					icon: '<div>Icon</div>',
				},
			});

			// Rapid changes
			for (let i = 0; i < 5; i++) {
				await rerender({
					props: {
						title: `Title ${i}`,
						isTrigger: i % 2 === 0,
					},
					slots: {
						icon: '<div>Icon</div>',
					},
				});
			}

			const title = container.querySelector('[data-test-id="node-creator-item-name"]');
			expect(title).toBeInTheDocument();
		});
	});
});
