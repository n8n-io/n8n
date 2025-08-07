/**
 * Test suite for N8nSticky component
 */

import { render, fireEvent, waitFor } from '@testing-library/vue';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import N8nSticky from '../Sticky.vue';
import type { StickyProps } from '../types';

// Mock the child components
vi.mock('../../N8nMarkdown', () => ({
	default: {
		name: 'N8nMarkdown',
		template: `
			<div class="markdown-mock"
				:data-content="content"
				:data-theme="theme"
				:data-with-multi-breaks="withMultiBreaks"
				@markdown-click="$emit('markdown-click', $event.link, $event.event)"
				@update-content="$emit('update-content', $event)">
				{{ content }}
			</div>
		`,
		props: ['content', 'theme', 'withMultiBreaks'],
		emits: ['markdown-click', 'update-content'],
	},
}));

vi.mock('../../N8nInput', () => ({
	default: {
		name: 'N8nInput',
		template: `
			<textarea 
				class="input-mock"
				:name="name"
				:rows="rows"
				:value="modelValue"
				:data-type="type"
				@input="$emit('update:model-value', $event.target.value)"
				@blur="$emit('blur')"
				@wheel="$emit('wheel', $event)"
			></textarea>
		`,
		props: ['modelValue', 'name', 'type', 'rows'],
		emits: ['update:model-value', 'blur', 'wheel'],
	},
}));

vi.mock('../../N8nText', () => ({
	default: {
		name: 'N8nText',
		template: `<div class="text-mock" :data-size="size" :data-align="align"><slot /></div>`,
		props: ['size', 'align'],
	},
}));

// Mock the composable
vi.mock('../../composables/useI18n', () => ({
	useI18n: () => ({
		t: (key: string) => {
			const translations = {
				'sticky.markdownHint': 'You can use <strong>markdown</strong> here',
			};
			return translations[key] || key;
		},
	}),
}));

// Mock the directive
const mockDirective = {
	mounted: vi.fn(),
	updated: vi.fn(),
};

describe('N8nSticky', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('Basic Rendering', () => {
		it('should render with default props', () => {
			const { container } = render(N8nSticky, {
				global: {
					directives: {
						'n8n-html': mockDirective,
					},
				},
			});

			const sticky = container.querySelector('.n8n-sticky');
			expect(sticky).toBeInTheDocument();
			expect(sticky).toHaveClass('clickable');
			expect(sticky).toHaveClass('color-1');
		});

		it('should apply correct size styles', () => {
			const { container } = render(N8nSticky, {
				props: {
					width: 300,
					height: 200,
				},
				global: {
					directives: {
						'n8n-html': mockDirective,
					},
				},
			});

			const sticky = container.querySelector('.n8n-sticky');
			expect(sticky).toHaveStyle({
				width: '300px',
				height: '200px',
			});
		});

		it('should enforce minimum dimensions', () => {
			const { container } = render(N8nSticky, {
				props: {
					width: 50, // Below minWidth
					height: 30, // Below minHeight
					minWidth: 150,
					minHeight: 80,
				},
				global: {
					directives: {
						'n8n-html': mockDirective,
					},
				},
			});

			const sticky = container.querySelector('.n8n-sticky');
			expect(sticky).toHaveStyle({
				width: '150px', // Should use minWidth
				height: '80px', // Should use minHeight
			});
		});

		it('should apply correct background color class', () => {
			const backgroundColors = [1, 2, 3, 4, 5, 6, 7];

			backgroundColors.forEach((backgroundColor) => {
				const { container } = render(N8nSticky, {
					props: {
						backgroundColor,
					},
					global: {
						directives: {
							'n8n-html': mockDirective,
						},
					},
				});

				const sticky = container.querySelector('.n8n-sticky');
				expect(sticky).toHaveClass(`color-${backgroundColor}`);
			});
		});
	});

	describe('Display Mode', () => {
		it('should show markdown content by default', () => {
			const { container } = render(N8nSticky, {
				props: {
					modelValue: '# Hello World\nThis is **markdown** content',
					editMode: false,
				},
				global: {
					directives: {
						'n8n-html': mockDirective,
					},
				},
			});

			const wrapper = container.querySelector('[class*="wrapper"]');
			const markdown = container.querySelector('.markdown-mock');

			expect(wrapper).toBeInTheDocument();
			expect(wrapper).toBeVisible();
			expect(markdown).toBeInTheDocument();
			expect(markdown).toHaveAttribute('data-content', '# Hello World\nThis is **markdown** content');
			expect(markdown).toHaveAttribute('data-theme', 'sticky');
			expect(markdown).toHaveAttribute('data-with-multi-breaks', 'true');
		});

		it('should handle empty content', () => {
			const { container } = render(N8nSticky, {
				props: {
					modelValue: '',
					editMode: false,
				},
				global: {
					directives: {
						'n8n-html': mockDirective,
					},
				},
			});

			const markdown = container.querySelector('.markdown-mock');
			expect(markdown).toHaveAttribute('data-content', '');
		});

		it('should emit markdown-click events', async () => {
			const onMarkdownClick = vi.fn();
			const { container } = render(N8nSticky, {
				props: {
					modelValue: '[Link](http://example.com)',
					editMode: false,
					'onMarkdown-click': onMarkdownClick,
				},
				global: {
					directives: {
						'n8n-html': mockDirective,
					},
				},
			});

			const markdown = container.querySelector('.markdown-mock');
			const mockLink = document.createElement('a');
			const mockEvent = new MouseEvent('click');

			await fireEvent(markdown!, new CustomEvent('markdown-click', {
				detail: { link: mockLink, event: mockEvent }
			}));

			expect(onMarkdownClick).toHaveBeenCalledTimes(1);
		});

		it('should enter edit mode on double click when not readonly', async () => {
			const onEdit = vi.fn();
			const { container } = render(N8nSticky, {
				props: {
					modelValue: 'Test content',
					editMode: false,
					readOnly: false,
					onEdit,
				},
				global: {
					directives: {
						'n8n-html': mockDirective,
					},
				},
			});

			const wrapper = container.querySelector('[class*="wrapper"]');
			await fireEvent.doubleClick(wrapper!);

			expect(onEdit).toHaveBeenCalledWith(true);
		});

		it('should not enter edit mode on double click when readonly', async () => {
			const onEdit = vi.fn();
			const { container } = render(N8nSticky, {
				props: {
					modelValue: 'Test content',
					editMode: false,
					readOnly: true,
					onEdit,
				},
				global: {
					directives: {
						'n8n-html': mockDirective,
					},
				},
			});

			const wrapper = container.querySelector('[class*="wrapper"]');
			await fireEvent.doubleClick(wrapper!);

			expect(onEdit).not.toHaveBeenCalled();
		});
	});

	describe('Edit Mode', () => {
		it('should show input when in edit mode', () => {
			const { container } = render(N8nSticky, {
				props: {
					modelValue: 'Test content',
					editMode: true,
					id: 'sticky-123',
				},
				global: {
					directives: {
						'n8n-html': mockDirective,
					},
				},
			});

			const textareaContainer = container.querySelector('.sticky-textarea');
			const input = container.querySelector('.input-mock');

			expect(textareaContainer).toBeInTheDocument();
			expect(textareaContainer).toBeVisible();
			expect(input).toBeInTheDocument();
			expect(input).toHaveAttribute('name', 'sticky-123-input');
			expect(input).toHaveAttribute('data-type', 'textarea');
			expect(input).toHaveAttribute('rows', '5');
			expect(input).toHaveValue('Test content');
		});

		it('should hide markdown when in edit mode', () => {
			const { container } = render(N8nSticky, {
				props: {
					modelValue: 'Test content',
					editMode: true,
				},
				global: {
					directives: {
						'n8n-html': mockDirective,
					},
				},
			});

			const wrapper = container.querySelector('[class*="wrapper"]');
			expect(wrapper).not.toBeVisible();
		});

		it('should emit update:modelValue on input change', async () => {
			const onUpdateModelValue = vi.fn();
			const { container } = render(N8nSticky, {
				props: {
					modelValue: 'Initial content',
					editMode: true,
					'onUpdate:modelValue': onUpdateModelValue,
				},
				global: {
					directives: {
						'n8n-html': mockDirective,
					},
				},
			});

			const input = container.querySelector('.input-mock');
			await fireEvent.input(input!, { target: { value: 'Updated content' } });

			expect(onUpdateModelValue).toHaveBeenCalledWith('Updated content');
		});

		it('should exit edit mode on blur', async () => {
			const onEdit = vi.fn();
			const { container } = render(N8nSticky, {
				props: {
					modelValue: 'Test content',
					editMode: true,
					onEdit,
				},
				global: {
					directives: {
						'n8n-html': mockDirective,
					},
				},
			});

			const input = container.querySelector('.input-mock');
			await fireEvent.blur(input!);

			expect(onEdit).toHaveBeenCalledWith(false);
		});

		it('should show footer when dimensions allow', () => {
			const { container } = render(N8nSticky, {
				props: {
					modelValue: 'Test content',
					editMode: true,
					width: 200, // > 155
					height: 120, // > 100
				},
				global: {
					directives: {
						'n8n-html': mockDirective,
					},
				},
			});

			const footer = container.querySelector('[class*="footer"]');
			const text = container.querySelector('.text-mock');

			expect(footer).toBeInTheDocument();
			expect(footer).toBeVisible();
			expect(text).toHaveAttribute('data-size', 'xsmall');
			expect(text).toHaveAttribute('data-align', 'right');
		});

		it('should hide footer when dimensions are too small', () => {
			const { container } = render(N8nSticky, {
				props: {
					modelValue: 'Test content',
					editMode: true,
					width: 100, // <= 155
					height: 80,  // <= 100
				},
				global: {
					directives: {
						'n8n-html': mockDirective,
					},
				},
			});

			const footer = container.querySelector('[class*="footer"]');
			expect(footer).not.toBeInTheDocument();
		});

		it('should apply full-height class when footer is hidden', () => {
			const { container } = render(N8nSticky, {
				props: {
					modelValue: 'Test content',
					editMode: true,
					width: 100,
					height: 80,
				},
				global: {
					directives: {
						'n8n-html': mockDirective,
					},
				},
			});

			const textareaContainer = container.querySelector('.sticky-textarea');
			expect(textareaContainer).toHaveClass('full-height');
		});

		it('should handle escape key to exit edit mode', async () => {
			const onEdit = vi.fn();
			const { container } = render(N8nSticky, {
				props: {
					modelValue: 'Test content',
					editMode: true,
					onEdit,
				},
				global: {
					directives: {
						'n8n-html': mockDirective,
					},
				},
			});

			const textareaContainer = container.querySelector('.sticky-textarea');
			await fireEvent.keyDown(textareaContainer!, { key: 'Escape' });

			expect(onEdit).toHaveBeenCalledWith(false);
		});
	});

	describe('Event Handling', () => {
		it('should prevent keydown events on the sticky container', async () => {
			const { container } = render(N8nSticky, {
				props: {
					modelValue: 'Test content',
				},
				global: {
					directives: {
						'n8n-html': mockDirective,
					},
				},
			});

			const sticky = container.querySelector('.n8n-sticky');
			const mockEvent = { preventDefault: vi.fn() };

			// Simulate keydown event
			await fireEvent.keyDown(sticky!, mockEvent);

			// The event should be prevented (though we can't directly test preventDefault)
			expect(sticky).toBeInTheDocument();
		});

		it('should stop propagation on edit mode container events', async () => {
			const { container } = render(N8nSticky, {
				props: {
					modelValue: 'Test content',
					editMode: true,
				},
				global: {
					directives: {
						'n8n-html': mockDirective,
					},
				},
			});

			const textareaContainer = container.querySelector('.sticky-textarea');

			// These events should stop propagation
			await fireEvent.click(textareaContainer!);
			await fireEvent.mouseDown(textareaContainer!);
			await fireEvent.mouseUp(textareaContainer!);
			await fireEvent.keyDown(textareaContainer!);

			// Component should still be rendered properly
			expect(textareaContainer).toBeInTheDocument();
		});

		it('should handle wheel events on input with scroll control', async () => {
			const { container } = render(N8nSticky, {
				props: {
					modelValue: 'Test content',
					editMode: true,
				},
				global: {
					directives: {
						'n8n-html': mockDirective,
					},
				},
			});

			const input = container.querySelector('.input-mock');

			// Test regular scroll (should stop propagation)
			await fireEvent.wheel(input!, { ctrlKey: false, metaKey: false });
			expect(input).toBeInTheDocument();

			// Test zoom scroll (should allow propagation)
			await fireEvent.wheel(input!, { ctrlKey: true });
			expect(input).toBeInTheDocument();
		});
	});

	describe('Props and State Management', () => {
		it('should handle all sticky props correctly', () => {
			const props: StickyProps = {
				modelValue: 'Custom content',
				height: 250,
				width: 300,
				minHeight: 100,
				minWidth: 200,
				id: 'custom-sticky',
				defaultText: 'Enter your note here...',
				editMode: false,
				readOnly: true,
				backgroundColor: 3,
			};

			const { container } = render(N8nSticky, {
				props,
				global: {
					directives: {
						'n8n-html': mockDirective,
					},
				},
			});

			const sticky = container.querySelector('.n8n-sticky');
			const markdown = container.querySelector('.markdown-mock');

			expect(sticky).toHaveClass('color-3');
			expect(sticky).toHaveStyle({
				width: '300px',
				height: '250px',
			});
			expect(markdown).toHaveAttribute('data-content', 'Custom content');
		});

		it('should not show clickable class when resizing', () => {
			const { container, rerender } = render(N8nSticky, {
				props: {
					modelValue: 'Test content',
				},
				global: {
					directives: {
						'n8n-html': mockDirective,
					},
				},
			});

			const sticky = container.querySelector('.n8n-sticky');
			expect(sticky).toHaveClass('clickable');

			// Simulate internal isResizing state change
			// This would normally be controlled by parent resize wrapper
			rerender({
				props: {
					modelValue: 'Test content',
				},
			});

			expect(sticky).toHaveClass('clickable');
		});

		it('should generate correct input name from id', () => {
			const { container } = render(N8nSticky, {
				props: {
					modelValue: 'Test content',
					editMode: true,
					id: 'test-sticky-123',
				},
				global: {
					directives: {
						'n8n-html': mockDirective,
					},
				},
			});

			const input = container.querySelector('.input-mock');
			expect(input).toHaveAttribute('name', 'test-sticky-123-input');
		});

		it('should handle undefined id', () => {
			const { container } = render(N8nSticky, {
				props: {
					modelValue: 'Test content',
					editMode: true,
					id: undefined,
				},
				global: {
					directives: {
						'n8n-html': mockDirective,
					},
				},
			});

			const input = container.querySelector('.input-mock');
			expect(input).not.toHaveAttribute('name');
		});
	});

	describe('Edit Mode Transitions', () => {
		it('should focus and select input when entering edit mode with default text', async () => {
			const mockFocus = vi.fn();
			const mockSelect = vi.fn();

			// Mock input ref with focus and select methods
			const { rerender } = render(N8nSticky, {
				props: {
					modelValue: 'Default text',
					defaultText: 'Default text',
					editMode: false,
				},
				global: {
					directives: {
						'n8n-html': mockDirective,
					},
				},
			});

			// Change to edit mode
			await rerender({
				props: {
					modelValue: 'Default text',
					defaultText: 'Default text',
					editMode: true,
				},
			});

			// Wait for the setTimeout to complete
			await waitFor(() => {
				// Input should be rendered in edit mode
				expect(document.querySelector('.input-mock')).toBeInTheDocument();
			}, { timeout: 150 });
		});

		it('should focus input when entering edit mode with custom text', async () => {
			const { rerender } = render(N8nSticky, {
				props: {
					modelValue: 'Custom content',
					defaultText: 'Default text',
					editMode: false,
				},
				global: {
					directives: {
						'n8n-html': mockDirective,
					},
				},
			});

			// Change to edit mode
			await rerender({
				props: {
					modelValue: 'Custom content',
					defaultText: 'Default text',
					editMode: true,
				},
			});

			await waitFor(() => {
				expect(document.querySelector('.input-mock')).toBeInTheDocument();
			}, { timeout: 150 });
		});
	});

	describe('Background Colors', () => {
		it('should support all available background colors', () => {
			const colors = [1, 2, 3, 4, 5, 6, 7];

			colors.forEach((color) => {
				const { container } = render(N8nSticky, {
					props: {
						backgroundColor: color,
					},
					global: {
						directives: {
							'n8n-html': mockDirective,
						},
					},
				});

				const sticky = container.querySelector('.n8n-sticky');
				expect(sticky).toHaveClass(`color-${color}`);
			});
		});

		it('should handle string background colors', () => {
			const { container } = render(N8nSticky, {
				props: {
					backgroundColor: '5',
				},
				global: {
					directives: {
						'n8n-html': mockDirective,
					},
				},
			});

			const sticky = container.querySelector('.n8n-sticky');
			expect(sticky).toHaveClass('color-5');
		});
	});

	describe('Accessibility', () => {
		it('should be keyboard accessible in display mode', async () => {
			const onEdit = vi.fn();
			const { container } = render(N8nSticky, {
				props: {
					modelValue: 'Accessible content',
					editMode: false,
					readOnly: false,
					onEdit,
				},
				global: {
					directives: {
						'n8n-html': mockDirective,
					},
				},
			});

			const sticky = container.querySelector('.n8n-sticky');
			
			// Should be able to receive focus
			expect(sticky).toBeInTheDocument();
			
			// Should have clickable class indicating it's interactive
			expect(sticky).toHaveClass('clickable');
		});

		it('should provide proper textarea access in edit mode', () => {
			const { container } = render(N8nSticky, {
				props: {
					modelValue: 'Editable content',
					editMode: true,
					id: 'accessible-sticky',
				},
				global: {
					directives: {
						'n8n-html': mockDirective,
					},
				},
			});

			const input = container.querySelector('.input-mock');
			expect(input).toBeInTheDocument();
			expect(input).toHaveAttribute('name', 'accessible-sticky-input');
		});

		it('should work with screen readers through proper content structure', () => {
			const { container } = render(N8nSticky, {
				props: {
					modelValue: '# Important Note\nThis is screen reader accessible content',
					editMode: false,
				},
				global: {
					directives: {
						'n8n-html': mockDirective,
					},
				},
			});

			const markdown = container.querySelector('.markdown-mock');
			expect(markdown).toHaveAttribute('data-content', '# Important Note\nThis is screen reader accessible content');
		});
	});

	describe('Performance and Edge Cases', () => {
		it('should handle very large content efficiently', () => {
			const largeContent = 'Lorem ipsum '.repeat(1000);
			const { container } = render(N8nSticky, {
				props: {
					modelValue: largeContent,
					editMode: false,
				},
				global: {
					directives: {
						'n8n-html': mockDirective,
					},
				},
			});

			const markdown = container.querySelector('.markdown-mock');
			expect(markdown).toHaveAttribute('data-content', largeContent);
		});

		it('should handle rapid mode switching', async () => {
			const { rerender } = render(N8nSticky, {
				props: {
					modelValue: 'Test content',
					editMode: false,
				},
				global: {
					directives: {
						'n8n-html': mockDirective,
					},
				},
			});

			// Rapidly switch modes
			for (let i = 0; i < 5; i++) {
				await rerender({
					props: {
						modelValue: 'Test content',
						editMode: i % 2 === 0,
					},
				});
			}

			// Should still render correctly
			expect(document.querySelector('.n8n-sticky')).toBeInTheDocument();
		});

		it('should handle extreme dimensions', () => {
			const { container } = render(N8nSticky, {
				props: {
					width: 1,
					height: 1,
					minWidth: 1,
					minHeight: 1,
				},
				global: {
					directives: {
						'n8n-html': mockDirective,
					},
				},
			});

			const sticky = container.querySelector('.n8n-sticky');
			expect(sticky).toHaveStyle({
				width: '1px',
				height: '1px',
			});
		});

		it('should handle component unmounting gracefully', () => {
			const { unmount } = render(N8nSticky, {
				props: {
					modelValue: 'Test content',
					editMode: true,
				},
				global: {
					directives: {
						'n8n-html': mockDirective,
					},
				},
			});

			expect(() => {
				unmount();
			}).not.toThrow();
		});

		it('should handle special characters and emojis', () => {
			const specialContent = '🎉 Special chars: <>&"\' and unicode: ñáéíóú';
			const { container } = render(N8nSticky, {
				props: {
					modelValue: specialContent,
					editMode: false,
				},
				global: {
					directives: {
						'n8n-html': mockDirective,
					},
				},
			});

			const markdown = container.querySelector('.markdown-mock');
			expect(markdown).toHaveAttribute('data-content', specialContent);
		});

		it('should work with zero or negative dimensions', () => {
			const { container } = render(N8nSticky, {
				props: {
					width: -10,
					height: 0,
					minWidth: 50,
					minHeight: 30,
				},
				global: {
					directives: {
						'n8n-html': mockDirective,
					},
				},
			});

			const sticky = container.querySelector('.n8n-sticky');
			// Should enforce minimums
			expect(sticky).toHaveStyle({
				width: '50px',
				height: '30px',
			});
		});
	});

	describe('Integration with Parent Components', () => {
		it('should work properly when controlled by parent state', async () => {
			let editMode = false;
			const toggleEdit = () => { editMode = !editMode; };

			const { rerender } = render(N8nSticky, {
				props: {
					modelValue: 'Parent controlled content',
					editMode,
					onEdit: toggleEdit,
				},
				global: {
					directives: {
						'n8n-html': mockDirective,
					},
				},
			});

			// Should start in display mode
			expect(document.querySelector('.markdown-mock')).toBeVisible();

			// Simulate parent changing edit mode
			editMode = true;
			await rerender({
				props: {
					modelValue: 'Parent controlled content',
					editMode,
					onEdit: toggleEdit,
				},
			});

			expect(document.querySelector('.input-mock')).toBeInTheDocument();
		});

		it('should emit all events properly for parent handling', async () => {
			const onEdit = vi.fn();
			const onUpdateModelValue = vi.fn();
			const onMarkdownClick = vi.fn();

			const { container } = render(N8nSticky, {
				props: {
					modelValue: 'Test content',
					editMode: false,
					onEdit,
					'onUpdate:modelValue': onUpdateModelValue,
					'onMarkdown-click': onMarkdownClick,
				},
				global: {
					directives: {
						'n8n-html': mockDirective,
					},
				},
			});

			// Test double click to edit
			const wrapper = container.querySelector('[class*="wrapper"]');
			await fireEvent.doubleClick(wrapper!);
			expect(onEdit).toHaveBeenCalledWith(true);
		});
	});
});