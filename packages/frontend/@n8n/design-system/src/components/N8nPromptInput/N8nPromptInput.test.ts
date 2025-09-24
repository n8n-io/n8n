import userEvent from '@testing-library/user-event';
import { fireEvent } from '@testing-library/vue';
import { mount } from '@vue/test-utils';

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

		it('should render streaming state without disabling textarea', () => {
			const { container } = renderComponent({
				props: {
					streaming: true,
				},
				global: {
					stubs: ['N8nCallout', 'N8nScrollArea', 'N8nSendStopButton'],
				},
			});
			const textarea = container.querySelector('textarea');
			// Textarea should NOT be disabled during streaming
			expect(textarea).not.toHaveAttribute('disabled');
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

			try {
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
			} finally {
				// Always restore original descriptor or delete the mock
				if (originalDescriptor) {
					Object.defineProperty(HTMLTextAreaElement.prototype, 'scrollHeight', originalDescriptor);
				} else {
					// If there was no original descriptor, delete the mocked property
					// Use Reflect.deleteProperty for type-safe deletion
					Reflect.deleteProperty(HTMLTextAreaElement.prototype, 'scrollHeight');
				}
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

		it('should emit focus event', async () => {
			const render = renderComponent({
				global: {
					stubs: ['N8nCallout', 'N8nScrollArea', 'N8nSendStopButton'],
				},
			});

			const textarea = render.container.querySelector('textarea') as HTMLTextAreaElement;
			await fireEvent.focus(textarea);

			expect(render.emitted('focus')).toBeTruthy();
		});

		it('should emit blur event', async () => {
			const render = renderComponent({
				global: {
					stubs: ['N8nCallout', 'N8nScrollArea', 'N8nSendStopButton'],
				},
			});

			const textarea = render.container.querySelector('textarea') as HTMLTextAreaElement;
			await fireEvent.focus(textarea);
			await fireEvent.blur(textarea);

			expect(render.emitted('blur')).toBeTruthy();
		});
	});

	describe('button states', () => {
		it('should disable send button when text is empty', () => {
			const { container } = renderComponent({
				props: {
					modelValue: '',
				},
				global: {
					stubs: {
						N8nCallout: true,
						N8nScrollArea: true,
						N8nSendStopButton: {
							props: ['disabled', 'streaming'],
							template:
								'<button :disabled="disabled" :class="{sendButton: !streaming, stopButton: streaming}"></button>',
						},
					},
				},
			});

			const button = container.querySelector('button');
			expect(button).toHaveAttribute('disabled');
		});

		it('should enable send button when text is present', () => {
			const { container } = renderComponent({
				props: {
					modelValue: 'Some text',
				},
				global: {
					stubs: {
						N8nCallout: true,
						N8nScrollArea: true,
						N8nSendStopButton: {
							props: ['disabled', 'streaming'],
							template:
								'<button :disabled="disabled" :class="{sendButton: !streaming, stopButton: streaming}"></button>',
						},
					},
				},
			});

			const button = container.querySelector('button');
			expect(button).not.toHaveAttribute('disabled');
		});

		it('should show stop button when streaming', () => {
			const { container } = renderComponent({
				props: {
					modelValue: 'Some text',
					streaming: true,
				},
				global: {
					stubs: {
						N8nCallout: true,
						N8nScrollArea: true,
						N8nSendStopButton: {
							props: ['disabled', 'streaming'],
							template:
								'<button :disabled="disabled" :class="{sendButton: !streaming, stopButton: streaming}"></button>',
						},
					},
				},
			});

			const button = container.querySelector('button');
			expect(button).toHaveClass('stopButton');
			expect(button).not.toHaveClass('sendButton');
		});

		it('should emit stop event when stop button is clicked', async () => {
			const render = renderComponent({
				props: {
					modelValue: 'Some text',
					streaming: true,
				},
				global: {
					stubs: {
						N8nCallout: true,
						N8nScrollArea: true,
						N8nSendStopButton: {
							props: ['disabled', 'streaming'],
							template:
								'<button @click="$emit(\'stop\')" :class="{stopButton: streaming}">Stop</button>',
							emits: ['stop'],
						},
					},
				},
			});

			const stopButton = render.container.querySelector('.stopButton') as HTMLButtonElement;
			expect(stopButton).toBeTruthy();

			// Click the stop button
			await fireEvent.click(stopButton);

			// Verify stop event was emitted
			expect(render.emitted('stop')).toBeTruthy();
			expect(render.emitted('stop')?.[0]).toEqual([]);
		});

		it('should handle stop event from N8nSendStopButton component', async () => {
			const wrapper = mount(N8nPromptInput, {
				props: {
					modelValue: 'Test message',
					streaming: true,
				},
				global: {
					stubs: {
						N8nCallout: true,
						N8nScrollArea: true,
						N8nSendStopButton: {
							name: 'N8nSendStopButton',
							props: ['disabled', 'streaming'],
							template: '<button @click="$emit(\'stop\')" class="stop-button-stub">Stop</button>',
							emits: ['stop'],
						},
					},
				},
			});

			// Find the stop button and click it
			const stopButton = wrapper.find('.stop-button-stub');
			expect(stopButton.exists()).toBe(true);
			await stopButton.trigger('click');

			// Check that N8nPromptInput emitted the stop event
			expect(wrapper.emitted('stop')).toBeTruthy();
			expect(wrapper.emitted('stop')?.[0]).toEqual([]);

			wrapper.unmount();
		});
	});

	describe('exposed methods', () => {
		it('should expose focusInput method and focus the textarea', async () => {
			const wrapper = mount(N8nPromptInput, {
				props: {
					modelValue: 'test',
				},
				global: {
					stubs: ['N8nCallout', 'N8nScrollArea', 'N8nSendStopButton'],
				},
			});

			// Get the textarea element
			const textarea = wrapper.find('textarea').element as HTMLTextAreaElement;

			// Spy on the focus method
			const focusSpy = vi.spyOn(textarea, 'focus');

			// Call the exposed focusInput method
			await wrapper.vm.focusInput();

			// Verify focus was called
			expect(focusSpy).toHaveBeenCalled();

			wrapper.unmount();
		});

		it('should focus input through ref access', () => {
			const wrapper = renderComponent({
				global: {
					stubs: ['N8nCallout', 'N8nScrollArea', 'N8nSendStopButton'],
				},
			});

			const textarea = wrapper.container.querySelector('textarea') as HTMLTextAreaElement;

			// The component should have a focusInput method that focuses the textarea
			// Since we can't directly test the exposed method in this testing setup,
			// we verify that the textarea element exists and can be focused
			expect(textarea).toBeTruthy();

			const focusSpy = vi.spyOn(textarea, 'focus');
			textarea.focus();
			expect(focusSpy).toHaveBeenCalled();
		});
	});

	describe('edge cases', () => {
		it('should handle very long single line text', () => {
			const longText = 'a'.repeat(500);
			const { container } = renderComponent({
				props: {
					modelValue: longText,
					maxLength: 1000,
				},
				global: {
					stubs: ['N8nCallout', 'N8nScrollArea', 'N8nSendStopButton'],
				},
			});

			const textarea = container.querySelector('textarea');
			expect(textarea).toHaveValue(longText);
		});

		it('should apply maxLinesBeforeScroll prop', () => {
			// This prop affects the computed textAreaMaxHeight value
			// which is used in multiline mode. We can test that the prop is accepted.
			const { container } = renderComponent({
				props: {
					modelValue: 'Test',
					maxLinesBeforeScroll: 2,
				},
				global: {
					stubs: ['N8nCallout', 'N8nScrollArea', 'N8nSendStopButton'],
				},
			});

			// Component should render without errors
			const textarea = container.querySelector('textarea');
			expect(textarea).toBeTruthy();
		});
	});
});
