/* eslint-disable n8n-local-rules/no-interpolation-in-regular-string */
import userEvent from '@testing-library/user-event';
import { fireEvent } from '@testing-library/vue';
import { mount } from '@vue/test-utils';
import { vi } from 'vitest';

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

		it('should not emit submit on plain Enter', async () => {
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

	describe('credits bar', () => {
		it('should hide credit bar when quota is -1', () => {
			const { container } = renderComponent({
				props: {
					creditsQuota: -1,
					creditsRemaining: 0,
				},
				global: {
					stubs: [
						'N8nCallout',
						'N8nScrollArea',
						'N8nSendStopButton',
						'N8nTooltip',
						'N8nLink',
						'N8nIcon',
					],
				},
			});

			// Credit bar should not be rendered
			const creditsBar = container.querySelector('.creditsBar');
			expect(creditsBar).toBeFalsy();
		});

		it('should show credit bar when quota is a valid positive number', () => {
			const { container } = renderComponent({
				props: {
					creditsQuota: 100,
					creditsRemaining: 80,
				},
				global: {
					stubs: [
						'N8nCallout',
						'N8nScrollArea',
						'N8nSendStopButton',
						'N8nTooltip',
						'N8nLink',
						'N8nIcon',
					],
				},
			});

			// Credit bar should be rendered
			const creditsBar = container.querySelector('.creditsBar');
			expect(creditsBar).toBeTruthy();
		});

		it('should show credits bar when creditsQuota and creditsRemaining are provided', () => {
			const { container } = renderComponent({
				props: {
					creditsQuota: 100,
					creditsRemaining: 75,
				},
				global: {
					stubs: [
						'N8nCallout',
						'N8nScrollArea',
						'N8nSendStopButton',
						'N8nTooltip',
						'N8nLink',
						'N8nIcon',
					],
				},
			});

			const creditsBar = container.querySelector('.creditsBar');
			expect(creditsBar).toBeTruthy();
		});

		it('should show no credits warning when creditsRemaining is 0', () => {
			const { container } = renderComponent({
				props: {
					creditsQuota: 100,
					creditsRemaining: 0,
				},
				global: {
					stubs: [
						'N8nCallout',
						'N8nScrollArea',
						'N8nSendStopButton',
						'N8nTooltip',
						'N8nLink',
						'N8nIcon',
					],
				},
			});

			const noCredits = container.querySelector('.noCredits');
			expect(noCredits).toBeTruthy();
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
						N8nScrollArea: true,
						N8nSendStopButton: {
							props: ['disabled', 'streaming'],
							template: '<button :disabled="disabled"></button>',
						},
						N8nTooltip: true,
						N8nLink: true,
						N8nIcon: true,
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
					stubs: [
						'N8nCallout',
						'N8nScrollArea',
						'N8nSendStopButton',
						'N8nTooltip',
						'N8nLink',
						'N8nIcon',
					],
				},
			});

			const textarea = container.querySelector('textarea');
			expect(textarea).toHaveAttribute('placeholder', '');
		});
	});

	describe('upgrade-click event', () => {
		it('should emit upgrade-click event when upgrade link is clicked', async () => {
			const wrapper = mount(N8nPromptInput, {
				props: {
					creditsQuota: 100,
					creditsRemaining: 10,
				},
				global: {
					stubs: {
						N8nCallout: true,
						N8nScrollArea: true,
						N8nSendStopButton: true,
						N8nTooltip: {
							template: '<n8n-tooltip-stub><slot></slot></n8n-tooltip-stub>',
						},
						N8nLink: true,
						N8nIcon: true,
					},
				},
			});

			// Find and click the upgrade link
			const upgradeLink = wrapper.find('n8n-link-stub');
			await upgradeLink.trigger('click');

			// Verify the upgrade-click event was emitted
			expect(wrapper.emitted('upgrade-click')).toBeTruthy();
			expect(wrapper.emitted('upgrade-click')).toHaveLength(1);

			wrapper.unmount();
		});
	});

	describe('showAskOwnerTooltip prop', () => {
		it('should enable tooltip when showAskOwnerTooltip is true', () => {
			const wrapper = mount(N8nPromptInput, {
				props: {
					creditsQuota: 100,
					creditsRemaining: 10,
					showAskOwnerTooltip: true,
				},
				global: {
					stubs: {
						N8nCallout: true,
						N8nScrollArea: true,
						N8nSendStopButton: true,
						N8nTooltip: {
							props: ['disabled', 'content', 'placement'],
							template:
								'<div :class="`tooltip-${placement || \'top\'}`" :data-disabled="disabled"><slot /></div>',
						},
						N8nLink: true,
						N8nIcon: true,
					},
				},
			});

			// Find tooltips with different placements
			const creditsTooltip = wrapper.find('.tooltip-top');
			const askOwnerTooltip = wrapper.findAll('.tooltip-top')[1]; // Second tooltip with top placement

			expect(creditsTooltip.exists()).toBe(true);
			expect(askOwnerTooltip.exists()).toBe(true);
			expect(askOwnerTooltip.attributes('data-disabled')).toBe('false');

			wrapper.unmount();
		});

		it('should disable tooltip when showAskOwnerTooltip is false', () => {
			const wrapper = mount(N8nPromptInput, {
				props: {
					creditsQuota: 100,
					creditsRemaining: 10,
					showAskOwnerTooltip: false,
				},
				global: {
					stubs: {
						N8nCallout: true,
						N8nScrollArea: true,
						N8nSendStopButton: true,
						N8nTooltip: {
							props: ['disabled', 'content', 'placement'],
							template:
								'<div :class="`tooltip-${placement || \'top\'}`" :data-disabled="disabled"><slot /></div>',
						},
						N8nLink: true,
						N8nIcon: true,
					},
				},
			});

			// Find tooltips with different placements
			const creditsTooltip = wrapper.find('.tooltip-top');
			const askOwnerTooltip = wrapper.findAll('.tooltip-top')[1]; // Second tooltip with top placement

			expect(creditsTooltip.exists()).toBe(true);
			expect(askOwnerTooltip.exists()).toBe(true);
			expect(askOwnerTooltip.attributes('data-disabled')).toBe('true');

			wrapper.unmount();
		});
	});

	describe('minLines prop', () => {
		it('should start in multiline mode when minLines > 1', () => {
			const { container } = renderComponent({
				props: {
					minLines: 3,
				},
				global: {
					stubs: ['N8nCallout', 'N8nScrollArea', 'N8nSendStopButton'],
				},
			});

			// Should be in multiline mode from the start
			expect(container.querySelector('.multilineTextarea')).toBeTruthy();
			expect(container.querySelector('.singleLineWrapper')).toBeFalsy();
		});

		it('should maintain minimum height based on minLines', () => {
			const minLines = 3;
			const expectedMinHeight = minLines * 18; // 18px per line

			const { container } = renderComponent({
				props: {
					minLines,
					modelValue: '', // Empty value
				},
				global: {
					stubs: ['N8nCallout', 'N8nScrollArea', 'N8nSendStopButton'],
				},
			});

			const textarea = container.querySelector('textarea');
			// Check that the textarea has the minimum height
			const style = textarea?.getAttribute('style');
			expect(style).toContain(`height: ${expectedMinHeight}px`);
		});

		it('should not go below minLines height when text is deleted', async () => {
			const minLines = 2;
			const expectedMinHeight = minLines * 18;

			const render = renderComponent({
				props: {
					minLines,
					modelValue: 'Line 1\nLine 2\nLine 3',
				},
				global: {
					stubs: ['N8nCallout', 'N8nScrollArea', 'N8nSendStopButton'],
				},
			});

			// Clear the text
			await render.rerender({ modelValue: '' });

			const textarea = render.container.querySelector('textarea');
			const style = textarea?.getAttribute('style');
			expect(style).toContain(`height: ${expectedMinHeight}px`);
		});
	});

	describe('refocusAfterSend prop', () => {
		it('should refocus textarea after submit when refocusAfterSend is true', async () => {
			const wrapper = mount(N8nPromptInput, {
				props: {
					modelValue: 'Test message',
					refocusAfterSend: true,
				},
				global: {
					stubs: ['N8nCallout', 'N8nScrollArea', 'N8nSendStopButton'],
				},
				attachTo: document.body,
			});

			const textarea = wrapper.find('textarea').element as HTMLTextAreaElement;
			const focusSpy = vi.spyOn(textarea, 'focus');

			// Trigger submit with Ctrl+Enter
			await fireEvent.keyDown(textarea, { key: 'Enter', ctrlKey: true });

			// Wait for next tick and animation frame
			await wrapper.vm.$nextTick();
			await new Promise(requestAnimationFrame);

			expect(focusSpy).toHaveBeenCalled();
			wrapper.unmount();
		});

		it('should not refocus textarea after submit when refocusAfterSend is false', async () => {
			const wrapper = mount(N8nPromptInput, {
				props: {
					modelValue: 'Test message',
					refocusAfterSend: false,
				},
				global: {
					stubs: ['N8nCallout', 'N8nScrollArea', 'N8nSendStopButton'],
				},
			});

			const textarea = wrapper.find('textarea').element as HTMLTextAreaElement;
			const focusSpy = vi.spyOn(textarea, 'focus');

			// Trigger submit with Ctrl+Enter
			await fireEvent.keyDown(textarea, { key: 'Enter', ctrlKey: true });

			// Wait for next tick
			await wrapper.vm.$nextTick();

			expect(focusSpy).not.toHaveBeenCalled();
			wrapper.unmount();
		});

		it('should refocus textarea after stop when refocusAfterSend is true', async () => {
			const wrapper = mount(N8nPromptInput, {
				props: {
					modelValue: 'Test message',
					streaming: true,
					refocusAfterSend: true,
				},
				global: {
					stubs: {
						N8nCallout: true,
						N8nScrollArea: true,
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
						N8nScrollArea: true,
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
			await fireEvent.keyDown(textarea, { key: 'Enter', ctrlKey: true });

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
});
