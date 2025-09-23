import userEvent from '@testing-library/user-event';
import { fireEvent } from '@testing-library/vue';

import { createComponentRenderer } from '@n8n/design-system/__tests__/render';

import N8nPromptInput from './N8nPromptInput.vue';

const renderComponent = createComponentRenderer(N8nPromptInput);

describe('N8nPromptInput', () => {
	describe('rendering', () => {
		it('should render correctly with default props', () => {
			const { container } = renderComponent({
				global: {
					stubs: ['N8nCallout', 'N8nScrollArea', 'N8nSendStopButton'],
				},
			});
			expect(container).toMatchSnapshot();
		});

		it('should render with non-default placeholder', () => {
			const { container } = renderComponent({
				props: {
					placeholder: 'Type your message here...',
				},
				global: {
					stubs: ['N8nCallout', 'N8nScrollArea', 'N8nSendStopButton'],
				},
			});
			const textarea = container.querySelector('textarea');
			expect(textarea).toHaveAttribute('placeholder', 'Type your message here...');
		});

		it('should render streaming state', () => {
			const { container } = renderComponent({
				props: {
					streaming: true,
				},
				global: {
					stubs: ['N8nCallout', 'N8nScrollArea', 'N8nSendStopButton'],
				},
			});
			const textarea = container.querySelector('textarea');
			expect(textarea).toHaveAttribute('disabled');
			expect(container).toMatchSnapshot();
		});
	});

	describe('mode switching', () => {
		it('should start in single-line mode', () => {
			const { container } = renderComponent({
				global: {
					stubs: ['N8nCallout', 'N8nScrollArea', 'N8nSendStopButton'],
				},
			});
			expect(container.querySelector('.singleLineWrapper')).toBeTruthy();
			expect(container.querySelector('.multilineTextarea')).toBeFalsy();
		});

		it('should switch to multiline mode when text contains newlines', async () => {
			// Store original descriptor
			const originalDescriptor = Object.getOwnPropertyDescriptor(
				HTMLTextAreaElement.prototype,
				'scrollHeight',
			);

			// Mock scrollHeight to simulate text that needs multiple lines
			// The component checks if scrollHeight > 24 (single line height)
			Object.defineProperty(HTMLTextAreaElement.prototype, 'scrollHeight', {
				configurable: true,
				get(this: HTMLTextAreaElement) {
					// Return larger height when text contains newlines
					return this.value?.includes('\n') ? 72 : 24;
				},
			});

			const { container } = renderComponent({
				props: {
					modelValue: '',
				},
				global: {
					stubs: ['N8nCallout', 'N8nScrollArea', 'N8nSendStopButton'],
				},
			});

			// Initially should be single-line
			expect(container.querySelector('.singleLineWrapper')).toBeTruthy();
			expect(container.querySelector('.multilineTextarea')).toBeFalsy();

			const textarea = container.querySelector('textarea') as HTMLTextAreaElement;

			// Update the textarea value with newlines
			textarea.value = 'Line 1\nLine 2\nLine 3';

			// Trigger the input event which calls adjustHeight
			await fireEvent.input(textarea);

			// Wait for Vue to update the DOM
			await vi.waitFor(() => {
				// After adjustHeight runs, should be in multiline mode
				return container.querySelector('.multilineTextarea');
			});

			// Verify we're now in multiline mode
			expect(container.querySelector('.multilineTextarea')).toBeTruthy();
			expect(container.querySelector('.singleLineWrapper')).toBeFalsy();

			// Restore original descriptor
			if (originalDescriptor) {
				Object.defineProperty(HTMLTextAreaElement.prototype, 'scrollHeight', originalDescriptor);
			}
		});

		it('should handle clearing text', async () => {
			const render = renderComponent({
				props: {
					modelValue: 'Some text',
				},
				global: {
					stubs: ['N8nCallout', 'N8nScrollArea', 'N8nSendStopButton'],
				},
			});

			const textarea = render.container.querySelector('textarea');
			expect(textarea).toHaveValue('Some text');

			// Clear the text
			await render.rerender({
				modelValue: '',
			});

			// Should have empty value
			expect(textarea).toHaveValue('');
			// Should always have single line wrapper when empty
			expect(render.container.querySelector('.singleLineWrapper')).toBeTruthy();
		});
	});

	describe('character limit', () => {
		it('should show warning banner when at character limit', () => {
			const { container } = renderComponent({
				props: {
					// Start at max length to trigger warning
					modelValue: '1234567890',
					maxLength: 10,
				},
				global: {
					stubs: ['N8nCallout', 'N8nScrollArea', 'N8nSendStopButton'],
				},
			});

			// Warning should appear - look for actual element with class
			const callout = container.querySelector('.warningCallout');
			expect(callout).toBeTruthy();
		});

		it('should set maxlength attribute on textarea', () => {
			const { container } = renderComponent({
				props: {
					maxLength: 100,
				},
				global: {
					stubs: ['N8nCallout', 'N8nScrollArea', 'N8nSendStopButton'],
				},
			});
			const textarea = container.querySelector('textarea');
			expect(textarea).toHaveAttribute('maxlength', '100');
		});

		it('should truncate pasted text that exceeds limit', async () => {
			const user = userEvent.setup();
			const render = renderComponent({
				props: {
					modelValue: '',
					maxLength: 5,
				},
				global: {
					stubs: ['N8nCallout', 'N8nScrollArea', 'N8nSendStopButton'],
				},
			});

			const textarea = render.container.querySelector('textarea') as HTMLTextAreaElement;
			await user.click(textarea);
			await user.paste('1234567890');

			// Browser should enforce maxlength, but we emit the truncated value
			expect(render.emitted('update:modelValue')).toBeTruthy();
		});

		it('should prevent input when at max length', async () => {
			const render = renderComponent({
				props: {
					modelValue: '12345',
					maxLength: 5,
				},
				global: {
					stubs: ['N8nCallout', 'N8nScrollArea', 'N8nSendStopButton'],
				},
			});

			const textarea = render.container.querySelector('textarea') as HTMLTextAreaElement;

			// Try to type when at max length
			await fireEvent.keyDown(textarea, { key: 'a' });

			// Should not emit update since we're at max
			const updates = render.emitted('update:modelValue');
			expect(updates).toBeFalsy();
		});
	});

	describe('user interactions', () => {
		it('should emit submit on Enter key in single-line mode', async () => {
			const render = renderComponent({
				props: {
					modelValue: 'Test message',
				},
				global: {
					stubs: ['N8nCallout', 'N8nScrollArea', 'N8nSendStopButton'],
				},
			});

			const textarea = render.container.querySelector('textarea') as HTMLTextAreaElement;
			await fireEvent.keyDown(textarea, { key: 'Enter' });

			expect(render.emitted('submit')).toBeTruthy();
		});

		it('should not emit submit on Shift+Enter', async () => {
			const render = renderComponent({
				props: {
					modelValue: 'Test message',
				},
				global: {
					stubs: ['N8nCallout', 'N8nScrollArea', 'N8nSendStopButton'],
				},
			});

			const textarea = render.container.querySelector('textarea') as HTMLTextAreaElement;
			await fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: true });

			expect(render.emitted('submit')).toBeFalsy();
		});

		it('should emit update:modelValue when typing', async () => {
			const user = userEvent.setup();
			const render = renderComponent({
				props: {
					modelValue: '',
				},
				global: {
					stubs: ['N8nCallout', 'N8nScrollArea', 'N8nSendStopButton'],
				},
			});

			const textarea = render.container.querySelector('textarea') as HTMLTextAreaElement;
			await user.type(textarea, 'Hello');

			const updateEvents = render.emitted('update:modelValue');
			expect(updateEvents).toBeTruthy();
			expect(updateEvents?.length).toBeGreaterThan(0);
		});
	});
});
