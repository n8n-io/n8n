import { render, fireEvent } from '@testing-library/vue';
import { describe, it, expect } from 'vitest';
import N8nTag from '../Tag.vue';

describe('N8nTag', () => {
	describe('Basic Rendering', () => {
		it('should render with text prop', () => {
			const { container } = render(N8nTag, {
				props: {
					text: 'Test Tag',
				},
			});

			const tag = container.querySelector('.n8n-tag');
			expect(tag).toBeInTheDocument();
			expect(tag).toHaveTextContent('Test Tag');
		});

		it('should render with tag slot', () => {
			const { container } = render(N8nTag, {
				props: {
					text: 'Default Text',
				},
				slots: {
					tag: 'Slot Content',
				},
			});

			const tag = container.querySelector('.n8n-tag');
			expect(tag).toBeInTheDocument();
			expect(tag).toHaveTextContent('Slot Content');
			expect(tag).not.toHaveTextContent('Default Text');
		});
	});

	describe('Clickable Behavior', () => {
		it('should be clickable by default', () => {
			const { container } = render(N8nTag, {
				props: {
					text: 'Clickable Tag',
				},
			});

			const tag = container.querySelector('.n8n-tag');
			expect(tag).toBeInTheDocument();
			expect(tag?.className).toMatch(/clickable/);
		});

		it('should be clickable when clickable prop is true', async () => {
			const { container, emitted } = render(N8nTag, {
				props: {
					text: 'Clickable Tag',
					clickable: true,
				},
			});

			const tag = container.querySelector('.n8n-tag');
			expect(tag).toBeInTheDocument();

			await fireEvent.click(tag!);
			expect(emitted().click).toBeTruthy();
		});

		it('should not be clickable when clickable prop is false', async () => {
			const { container } = render(N8nTag, {
				props: {
					text: 'Non-clickable Tag',
					clickable: false,
				},
			});

			const tag = container.querySelector('.n8n-tag');
			expect(tag).toBeInTheDocument();
			expect(tag?.className).not.toMatch(/clickable/);
		});
	});

	describe('CSS Classes', () => {
		it('should apply correct CSS classes', () => {
			const { container } = render(N8nTag, {
				props: {
					text: 'Test Tag',
					clickable: true,
				},
			});

			const tag = container.querySelector('.n8n-tag');
			expect(tag).toBeInTheDocument();
			expect(tag?.className).toContain('n8n-tag');
			expect(tag?.className).toMatch(/clickable/);
		});

		it('should not apply clickable class when clickable is false', () => {
			const { container } = render(N8nTag, {
				props: {
					text: 'Test Tag',
					clickable: false,
				},
			});

			const tag = container.querySelector('.n8n-tag');
			expect(tag).toBeInTheDocument();
			expect(tag?.className).toContain('n8n-tag');
			expect(tag?.className).not.toMatch(/clickable/);
		});
	});

	describe('Attributes Binding', () => {
		it('should pass through attributes', () => {
			const { container } = render(N8nTag, {
				props: {
					text: 'Test Tag',
					'data-testid': 'custom-tag',
					'aria-label': 'Custom tag label',
				},
			});

			const tag = container.querySelector('.n8n-tag');
			expect(tag).toHaveAttribute('data-testid', 'custom-tag');
			expect(tag).toHaveAttribute('aria-label', 'Custom tag label');
		});
	});

	describe('Slot Priority', () => {
		it('should prioritize tag slot over text prop', () => {
			const { container } = render(N8nTag, {
				props: {
					text: 'Prop Text',
				},
				slots: {
					tag: 'Slot Text',
				},
			});

			const tag = container.querySelector('.n8n-tag');
			expect(tag).toHaveTextContent('Slot Text');
			expect(tag).not.toHaveTextContent('Prop Text');
		});
	});

	describe('Edge Cases', () => {
		it('should handle empty text', () => {
			const { container } = render(N8nTag, {
				props: {
					text: '',
				},
			});

			const tag = container.querySelector('.n8n-tag');
			expect(tag).toBeInTheDocument();
		});

		it('should handle long text content', () => {
			const longText =
				'This is a very long tag text that might need truncation or special handling';
			const { container } = render(N8nTag, {
				props: {
					text: longText,
				},
			});

			const tag = container.querySelector('.n8n-tag');
			expect(tag).toBeInTheDocument();
			expect(tag).toHaveTextContent(longText);
		});
	});

	describe('Events', () => {
		it('should emit click event when clicked and clickable', async () => {
			const { container, emitted } = render(N8nTag, {
				props: {
					text: 'Clickable Tag',
					clickable: true,
				},
			});

			const tag = container.querySelector('.n8n-tag');
			await fireEvent.click(tag!);

			expect(emitted().click).toBeTruthy();
			expect(emitted().click).toHaveLength(1);
		});
	});
});
