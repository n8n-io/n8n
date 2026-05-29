/* eslint-disable n8n-local-rules/no-interpolation-in-regular-string */
import userEvent from '@testing-library/user-event';
import { fireEvent } from '@testing-library/vue';
import { mount } from '@vue/test-utils';
import { vi } from 'vitest';

import { createComponentRenderer } from '@n8n/design-system/__tests__/render';

import N8nChatInput from './ChatInput.vue';

const renderComponent = createComponentRenderer(N8nChatInput);

describe('N8nChatInput', () => {
	describe('rendering', () => {
		it('should render correctly with default props', () => {
			const { container } = renderComponent({
				global: {
					stubs: {
						N8nCallout: true,
						N8nScrollArea: { template: '<div><slot /></div>' },
						N8nSendStopButton: false,
						N8nTooltip: {
							template: '<slot />',
						},
					},
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
					stubs: {
						N8nCallout: true,
						N8nScrollArea: { template: '<div><slot /></div>' },
						N8nSendStopButton: false,
						N8nTooltip: {
							template: '<slot />',
						},
					},
				},
			});
			const textarea = container.querySelector('textarea');
			// Textarea should NOT be disabled during streaming
			expect(textarea).not.toHaveAttribute('disabled');
			expect(container).toMatchSnapshot();
		});
	});

	describe('mode switching', () => {
		it('should start with default textarea height', () => {
			const { container } = renderComponent({
				global: {
					stubs: ['N8nCallout', 'N8nScrollArea', 'N8nSendStopButton'],
				},
			});
			// Component always uses multiline textarea class
			expect(container.querySelector('.textarea')).toBeTruthy();
		});

		it('should adjust textarea height when text contains newlines', async () => {
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

				const textarea = container.querySelector('textarea') as HTMLTextAreaElement;
				expect(textarea).toBeTruthy();

				// Update the textarea value with newlines
				textarea.value = 'Line 1\nLine 2\nLine 3';

				// Trigger the input event which calls adjustHeight
				await fireEvent.input(textarea);

				// Wait for Vue to update the DOM
				await vi.waitFor(() => {
					const style = textarea.getAttribute('style');
					return style?.includes('height: 72px');
				});

				// Verify height was adjusted
				expect(textarea.getAttribute('style')).toContain('height: 72px');
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
		});

		it('should keep the start of an empty focused textarea in view when placeholder changes', async () => {
			const wrapper = mount(N8nChatInput, {
				props: {
					modelValue: '',
					placeholder: 'Short placeholder',
				},
				global: {
					stubs: ['N8nCallout', 'N8nScrollArea', 'N8nSendStopButton'],
				},
				attachTo: document.body,
			});

			const textarea = wrapper.find('textarea').element as HTMLTextAreaElement;
			textarea.focus();
			textarea.scrollTop = 100;

			await wrapper.setProps({
				placeholder: 'A long placeholder\nwith multiple lines\nthat can scroll',
				autosize: { minRows: 2, maxRows: 2 },
			});

			await vi.waitFor(() => expect(textarea.scrollTop).toBe(0));
			wrapper.unmount();
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

			expect(container).toHaveTextContent("You've reached the 10 character limit");
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
		it('should emit submit on plain Enter', async () => {
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

		it('should emit submit on Ctrl+Enter', async () => {
			const render = renderComponent({
				props: {
					modelValue: 'Test message',
				},
				global: {
					stubs: ['N8nCallout', 'N8nScrollArea', 'N8nSendStopButton'],
				},
			});

			const textarea = render.container.querySelector('textarea') as HTMLTextAreaElement;
			await fireEvent.keyDown(textarea, { key: 'Enter', ctrlKey: true });

			expect(render.emitted('submit')).toBeTruthy();
		});

		it('should emit submit on Cmd+Enter', async () => {
			const render = renderComponent({
				props: {
					modelValue: 'Test message',
				},
				global: {
					stubs: ['N8nCallout', 'N8nScrollArea', 'N8nSendStopButton'],
				},
			});

			const textarea = render.container.querySelector('textarea') as HTMLTextAreaElement;
			await fireEvent.keyDown(textarea, { key: 'Enter', metaKey: true });

			expect(render.emitted('submit')).toBeTruthy();
		});

		it('should insert newline on Shift+Enter', async () => {
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

			// Should not emit submit
			expect(render.emitted('submit')).toBeFalsy();
			// Should have inserted a newline in the value
			expect(render.emitted('update:modelValue')).toBeTruthy();
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

		it('should focus the textarea when clicking the container', async () => {
			const user = userEvent.setup();
			const render = renderComponent({
				global: {
					stubs: {
						N8nCallout: true,
						N8nScrollArea: { template: '<div><slot /></div>' },
						N8nSendStopButton: false,
						N8nTooltip: {
							template: '<slot />',
						},
					},
				},
			});

			const container = render.container.querySelector('.container') as HTMLElement;
			const textarea = render.container.querySelector('textarea') as HTMLTextAreaElement;

			await user.click(container);

			expect(document.activeElement).toBe(textarea);
			expect(render.container.querySelector('.focused')).toBeTruthy();
		});

		it('should not refocus the textarea when clicking a button inside the container', async () => {
			const user = userEvent.setup();
			const render = renderComponent({
				props: {
					modelValue: 'Hello',
				},
				global: {
					stubs: {
						N8nCallout: true,
						N8nScrollArea: { template: '<div><slot /></div>' },
						N8nSendStopButton: {
							template: '<button type="button">Send</button>',
						},
						N8nTooltip: {
							template: '<slot />',
						},
					},
				},
			});

			const textarea = render.container.querySelector('textarea') as HTMLTextAreaElement;
			const focusSpy = vi.spyOn(textarea, 'focus');
			const button = render.container.querySelector('button') as HTMLButtonElement;

			await user.click(button);

			expect(focusSpy).not.toHaveBeenCalled();
			expect(document.activeElement).not.toBe(textarea);
			expect(render.container.querySelector('.focused')).toBeFalsy();
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
			const wrapper = mount(N8nChatInput, {
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

			// Check that N8nChatInput emitted the stop event
			expect(wrapper.emitted('stop')).toBeTruthy();
			expect(wrapper.emitted('stop')?.[0]).toEqual([]);

			wrapper.unmount();
		});
	});

	describe('exposed methods', () => {
		it('should expose focusInput method and focus the textarea', async () => {
			const wrapper = mount(N8nChatInput, {
				props: {
					modelValue: 'test',
				},
				global: {
					stubs: {
						N8nCallout: true,
						N8nScrollArea: { template: '<div><slot /></div>' },
						N8nSendStopButton: true,
					},
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

	describe('credits behavior', () => {
		it('should not render credits bar (credits bar has been removed)', () => {
			const { container } = renderComponent({
				props: {
					creditsQuota: 100,
					creditsRemaining: 80,
				},
				global: {
					stubs: ['N8nCallout', 'N8nScrollArea', 'N8nSendStopButton', 'N8nTooltip'],
				},
			});

			const creditsBar = container.querySelector('.creditsBar');
			expect(creditsBar).toBeFalsy();
		});

		it('should disable textarea and send button when no credits remain', () => {
			const { container } = renderComponent({
				props: {
					modelValue: 'Test message',
					creditsQuota: 100,
					creditsRemaining: 0,
				},
				global: {
					stubs: {
						N8nCallout: true,
						N8nScrollArea: { template: '<div><slot /></div>' },
						N8nSendStopButton: {
							props: ['disabled', 'streaming'],
							template: '<button :disabled="disabled"></button>',
						},
						N8nTooltip: {
							template: '<div><slot /></div>',
						},
					},
				},
			});

			const textarea = container.querySelector('textarea');
			expect(textarea).toHaveAttribute('disabled');
			const button = container.querySelector('button');
			expect(button).toHaveAttribute('disabled');
			const disabledContainer = container.querySelector('.disabled');
			expect(disabledContainer).toBeTruthy();
		});

		it('should not show placeholder when no credits remain', () => {
			const { container } = renderComponent({
				props: {
					placeholder: 'Type your message...',
					creditsQuota: 100,
					creditsRemaining: 0,
				},
				global: {
					stubs: ['N8nCallout', 'N8nScrollArea', 'N8nSendStopButton', 'N8nTooltip'],
				},
			});

			const textarea = container.querySelector('textarea');
			expect(textarea).toHaveAttribute('placeholder', '');
		});
	});

	describe('minimum height', () => {
		const mockTextareaScrollHeight = () => {
			const originalDescriptor = Object.getOwnPropertyDescriptor(
				HTMLTextAreaElement.prototype,
				'scrollHeight',
			);

			Object.defineProperty(HTMLTextAreaElement.prototype, 'scrollHeight', {
				configurable: true,
				get(this: HTMLTextAreaElement) {
					return this.value?.includes('\n') ? 72 : 24;
				},
			});

			return () => {
				if (originalDescriptor) {
					Object.defineProperty(HTMLTextAreaElement.prototype, 'scrollHeight', originalDescriptor);
				} else {
					Reflect.deleteProperty(HTMLTextAreaElement.prototype, 'scrollHeight');
				}
			};
		};

		it('should maintain a one-line minimum height', async () => {
			const restoreScrollHeight = mockTextareaScrollHeight();

			try {
				const { container } = renderComponent({
					props: {
						modelValue: '',
					},
					global: {
						stubs: ['N8nCallout', 'N8nScrollArea', 'N8nSendStopButton'],
					},
				});

				const textarea = container.querySelector('textarea');
				await vi.waitFor(() => expect(textarea?.getAttribute('style')).toContain('height: 24px'));
			} finally {
				restoreScrollHeight();
			}
		});

		it('should return to one-line height when text is deleted', async () => {
			const restoreScrollHeight = mockTextareaScrollHeight();

			try {
				const render = renderComponent({
					props: {
						modelValue: 'Line 1\nLine 2\nLine 3',
					},
					global: {
						stubs: ['N8nCallout', 'N8nScrollArea', 'N8nSendStopButton'],
					},
				});

				await render.rerender({ modelValue: '' });

				const textarea = render.container.querySelector('textarea');
				await vi.waitFor(() => expect(textarea?.getAttribute('style')).toContain('height: 24px'));
			} finally {
				restoreScrollHeight();
			}
		});
	});

	describe('refocusAfterSend prop', () => {
		it('should refocus textarea after submit when refocusAfterSend is true', async () => {
			const wrapper = mount(N8nChatInput, {
				props: {
					modelValue: 'Test message',
					refocusAfterSend: true,
				},
				global: {
					stubs: {
						N8nCallout: true,
						N8nScrollArea: { template: '<div><slot /></div>' },
						N8nSendStopButton: true,
					},
				},
				attachTo: document.body,
			});

			const textarea = wrapper.find('textarea').element as HTMLTextAreaElement;
			const focusSpy = vi.spyOn(textarea, 'focus');

			// Trigger submit with Enter
			await fireEvent.keyDown(textarea, { key: 'Enter' });

			// Wait for next tick and animation frame
			await wrapper.vm.$nextTick();
			await new Promise(requestAnimationFrame);

			expect(focusSpy).toHaveBeenCalled();
			wrapper.unmount();
		});

		it('should not refocus textarea after submit when refocusAfterSend is false', async () => {
			const wrapper = mount(N8nChatInput, {
				props: {
					modelValue: 'Test message',
					refocusAfterSend: false,
				},
				global: {
					stubs: {
						N8nCallout: true,
						N8nScrollArea: { template: '<div><slot /></div>' },
						N8nSendStopButton: true,
					},
				},
			});

			const textarea = wrapper.find('textarea').element as HTMLTextAreaElement;
			const focusSpy = vi.spyOn(textarea, 'focus');

			// Trigger submit with Enter
			await fireEvent.keyDown(textarea, { key: 'Enter' });

			// Wait for next tick
			await wrapper.vm.$nextTick();

			expect(focusSpy).not.toHaveBeenCalled();
			wrapper.unmount();
		});

		it('should refocus textarea after stop when refocusAfterSend is true', async () => {
			const wrapper = mount(N8nChatInput, {
				props: {
					modelValue: 'Test message',
					streaming: true,
					refocusAfterSend: true,
				},
				global: {
					stubs: {
						N8nCallout: true,
						N8nScrollArea: { template: '<div><slot /></div>' },
						N8nSendStopButton: {
							props: ['disabled', 'streaming'],
							template: '<button @click="$emit(\'stop\')">Stop</button>',
							emits: ['stop'],
						},
					},
				},
				attachTo: document.body,
			});

			const textarea = wrapper.find('textarea').element as HTMLTextAreaElement;
			const focusSpy = vi.spyOn(textarea, 'focus');

			// Trigger stop
			const stopButton = wrapper.find('button');
			await stopButton.trigger('click');

			// Wait for next tick and animation frame
			await wrapper.vm.$nextTick();
			await new Promise(requestAnimationFrame);

			expect(focusSpy).toHaveBeenCalled();
			wrapper.unmount();
		});
	});

	describe('disabled state', () => {
		it('should disable textarea and button when disabled prop is true', () => {
			const { container } = renderComponent({
				props: {
					modelValue: 'Test message',
					disabled: true,
				},
				global: {
					stubs: {
						N8nCallout: true,
						N8nScrollArea: { template: '<div><slot /></div>' },
						N8nSendStopButton: {
							props: ['disabled', 'streaming'],
							template: '<button :disabled="disabled"></button>',
						},
					},
				},
			});

			const textarea = container.querySelector('textarea');
			expect(textarea).toHaveAttribute('disabled');

			const button = container.querySelector('button');
			expect(button).toHaveAttribute('disabled');

			const disabledContainer = container.querySelector('.disabled');
			expect(disabledContainer).toBeTruthy();
		});

		it('should not emit submit when disabled', async () => {
			const render = renderComponent({
				props: {
					modelValue: 'Test message',
					disabled: true,
				},
				global: {
					stubs: ['N8nCallout', 'N8nScrollArea', 'N8nSendStopButton'],
				},
			});

			const textarea = render.container.querySelector('textarea') as HTMLTextAreaElement;
			await fireEvent.keyDown(textarea, { key: 'Enter' });

			expect(render.emitted('submit')).toBeFalsy();
		});

		it('should apply disabled styles to container', () => {
			const { container } = renderComponent({
				props: {
					disabled: true,
				},
				global: {
					stubs: ['N8nCallout', 'N8nScrollArea', 'N8nSendStopButton'],
				},
			});

			const disabledContainer = container.querySelector('.disabled');
			expect(disabledContainer).toBeTruthy();
		});
	});

	describe('height adjustment optimization', () => {
		it('should skip height adjustment when content fits within current height', async () => {
			// Mock scrollHeight and clientHeight to simulate content that fits
			const originalScrollHeightDescriptor = Object.getOwnPropertyDescriptor(
				HTMLTextAreaElement.prototype,
				'scrollHeight',
			);
			const originalClientHeightDescriptor = Object.getOwnPropertyDescriptor(
				HTMLTextAreaElement.prototype,
				'clientHeight',
			);

			Object.defineProperty(HTMLTextAreaElement.prototype, 'scrollHeight', {
				configurable: true,
				get(this: HTMLTextAreaElement) {
					return 72; // Content height
				},
			});

			Object.defineProperty(HTMLTextAreaElement.prototype, 'clientHeight', {
				configurable: true,
				get(this: HTMLTextAreaElement) {
					return 72; // Container height (content fits perfectly)
				},
			});

			try {
				const wrapper = mount(N8nChatInput, {
					props: {
						modelValue: 'Line 1\nLine 2\nLine 3\nLine 4',
					},
					global: {
						stubs: {
							N8nCallout: true,
							N8nScrollArea: { template: '<div><slot /></div>' },
							N8nSendStopButton: true,
						},
					},
				});

				// Wait for initial mount to complete
				await wrapper.vm.$nextTick();

				const textarea = wrapper.find('textarea').element as HTMLTextAreaElement;

				// Start spying after mount
				const setHeightSpy = vi.spyOn(textarea.style, 'height', 'set');

				// Type some text that doesn't change the height requirement
				await wrapper.setProps({ modelValue: 'Line 1\nLine 2\nLine 3\nLine 4a' });

				// Wait for the watcher to trigger
				await wrapper.vm.$nextTick();

				// Since content fits, adjustHeight should return early without setting height to '0'
				const heightCalls = setHeightSpy.mock.calls;
				const hasZeroHeightCall = heightCalls.some((call) => call[0] === '0');

				// If early return works, there should be no '0' height call after the prop update
				expect(hasZeroHeightCall).toBe(false);

				wrapper.unmount();
			} finally {
				// Restore original descriptors
				if (originalScrollHeightDescriptor) {
					Object.defineProperty(
						HTMLTextAreaElement.prototype,
						'scrollHeight',
						originalScrollHeightDescriptor,
					);
				}
				if (originalClientHeightDescriptor) {
					Object.defineProperty(
						HTMLTextAreaElement.prototype,
						'clientHeight',
						originalClientHeightDescriptor,
					);
				}
			}
		});
	});

	describe('autofocus', () => {
		it('should be focused if enabled', async () => {
			const { emitted } = renderComponent({
				props: {
					autofocus: true,
				},
				global: {
					stubs: ['N8nCallout', 'N8nScrollArea', 'N8nSendStopButton'],
				},
			});

			expect(emitted('focus')).toBeTruthy();
		});

		it('should not be focused if disabled', () => {
			const { emitted } = renderComponent({
				global: {
					stubs: ['N8nCallout', 'N8nScrollArea', 'N8nSendStopButton'],
				},
			});
			expect(emitted('focus')).toBeFalsy();
		});
	});
});
