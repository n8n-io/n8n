import { flushPromises, mount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';

import AgentModal from '../components/modals/AgentModal.vue';
import AgentModalMultiStep from '../components/modals/AgentModalMultiStep.vue';

vi.mock('@n8n/design-system', async () => {
	const { defineComponent, nextTick, onMounted, ref } = await import('vue');
	return {
		N8nDialog: defineComponent({
			props: {
				open: Boolean,
				size: String,
				trapFocus: Boolean,
				disableOutsidePointerEvents: Boolean,
			},
			emits: ['update:open', 'escapeKeyDown', 'interactOutside', 'openAutoFocus'],
			setup(_, { emit }) {
				const dialog = ref<HTMLElement>();
				const escapePrevented = ref(false);
				onMounted(() => {
					const event = new Event('open-auto-focus', { cancelable: true });
					emit('openAutoFocus', event);
					if (!event.defaultPrevented) {
						void nextTick(() =>
							dialog.value?.querySelector<HTMLElement>('button:not([disabled])')?.focus(),
						);
					}
				});
				function pressEscape() {
					const event = new KeyboardEvent('keydown', { key: 'Escape', cancelable: true });
					emit('escapeKeyDown', event);
					escapePrevented.value = event.defaultPrevented;
				}
				return { dialog, escapePrevented, pressEscape };
			},
			template: `
				<section
					ref="dialog"
					v-if="open"
					role="dialog"
					:data-size="size"
					:data-trap-focus="trapFocus"
					:data-disable-outside-pointer-events="disableOutsidePointerEvents"
					:data-escape-prevented="escapePrevented"
				>
					<slot />
					<button data-test-id="dialog-escape" @click="pressEscape" />
					<button data-test-id="dialog-dismiss" @click="$emit('update:open', false)" />
				</section>
			`,
		}),
		N8nDialogHeader: defineComponent({ template: '<header><slot /></header>' }),
		N8nDialogFooter: defineComponent({ template: '<footer><slot /></footer>' }),
		N8nDialogTitle: defineComponent({ template: '<div><slot /></div>' }),
		N8nButton: defineComponent({
			props: ['disabled'],
			emits: ['click'],
			template: '<button :disabled="disabled" @click="$emit(\'click\')"><slot /></button>',
		}),
		N8nInlineTextEdit: defineComponent({
			props: ['modelValue', 'disabled'],
			emits: ['update:modelValue'],
			template: `
				<input
					data-test-id="agent-modal-title-input"
					:value="modelValue"
					:disabled="disabled"
					@input="$emit('update:modelValue', $event.target.value)"
				/>
			`,
		}),
		N8nIcon: defineComponent({ template: '<i />' }),
		N8nIconButton: defineComponent({
			inheritAttrs: false,
			props: ['disabled', 'icon'],
			emits: ['click'],
			template:
				'<button v-bind="$attrs" :data-icon="icon" :disabled="disabled" @click="$emit(\'click\')" />',
		}),
		N8nText: defineComponent({ template: '<span v-bind="$attrs"><slot /></span>' }),
	};
});

function mountModal(
	props: Partial<InstanceType<typeof AgentModal>['$props']> = {},
	slots: Record<string, string> = { default: '<input data-test-id="first-body-field" />' },
) {
	return mount(AgentModal, {
		attachTo: document.body,
		props: {
			open: true,
			title: 'Tool settings',
			...props,
		},
		slots,
	});
}

describe('AgentModal', () => {
	it('uses the large agent size and infers footer visibility from its slots', () => {
		const withoutFooter = mountModal();
		expect(withoutFooter.get('[role="dialog"]').attributes('data-size')).toBe('2xlarge');
		expect(withoutFooter.text()).toContain('Tool settings');
		expect(withoutFooter.find('footer').exists()).toBe(false);
		withoutFooter.unmount();

		const withFooter = mountModal({}, { footerActions: '<button>Save</button>' });
		expect(withFooter.get('footer').text()).toContain('Save');
		withFooter.unmount();

		const hiddenFooter = mountModal(
			{ showFooter: false },
			{ footerActions: '<button>Save</button>' },
		);
		expect(hiddenFooter.find('footer').exists()).toBe(false);
	});

	it('preserves inferred footer visibility through the multi-step shell', () => {
		const wrapper = mount(AgentModalMultiStep, {
			props: {
				open: true,
				step: 'configure',
				title: 'Configure tool',
			},
			slots: {
				footerActions: '<button>Save</button>',
			},
		});

		expect(wrapper.get('footer').text()).toContain('Save');
	});

	it.each(['select', 'list'])('keeps the outer modal body fixed for the %s picker step', (step) => {
		const wrapper = mount(AgentModalMultiStep, {
			props: {
				open: true,
				step,
				title: 'Add asset',
			},
		});

		expect(wrapper.getComponent(AgentModal).props('bodyScrollable')).toBe(false);
	});

	it('keeps the outer modal body scrollable for configuration steps', () => {
		const wrapper = mount(AgentModalMultiStep, {
			props: {
				open: true,
				step: 'configure',
				title: 'Configure asset',
			},
		});

		expect(wrapper.getComponent(AgentModal).props('bodyScrollable')).toBe(true);
	});

	it('edits the title and focuses the first body field', async () => {
		const wrapper = mountModal({ editableTitle: true });
		await flushPromises();

		const title = wrapper.get<HTMLInputElement>('[data-test-id="agent-modal-title-input"]');
		await title.setValue('Slack messages');

		expect(wrapper.emitted('update:title')).toEqual([['Slack messages']]);
		expect(document.activeElement).toBe(wrapper.get('[data-test-id="first-body-field"]').element);
	});

	it('uses the dialog fallback focus when the body has no interactive control', async () => {
		const wrapper = mountModal({}, { default: '<span>Delete this agent?</span>' });
		await flushPromises();

		expect(document.activeElement).toBe(wrapper.get('[data-testid="dialog-close-button"]').element);
	});

	it('blocks parent dismissal while a nested credential dialog is open', async () => {
		const wrapper = mountModal({ trapFocus: false, showBack: true });

		await wrapper.get('[data-test-id="dialog-escape"]').trigger('click');
		await wrapper.get('[data-test-id="dialog-dismiss"]').trigger('click');

		expect(wrapper.get('[role="dialog"]').attributes('data-escape-prevented')).toBe('true');
		expect(wrapper.get('[data-testid="agent-modal-back"]').attributes('disabled')).toBeDefined();
		expect(wrapper.get('[data-testid="dialog-close-button"]').attributes('disabled')).toBeDefined();
		expect(wrapper.emitted('update:open')).toBeUndefined();
	});

	it('emits Back and Close when the modal is idle', async () => {
		const wrapper = mountModal({ showBack: true });

		await wrapper.get('[data-testid="agent-modal-back"]').trigger('click');
		await wrapper.get('[data-testid="dialog-close-button"]').trigger('click');

		expect(wrapper.emitted('back')).toHaveLength(1);
		expect(wrapper.emitted('update:open')).toEqual([[false]]);
	});

	it('keeps Back, Close, and dismiss disabled while busy', async () => {
		const wrapper = mountModal({ showBack: true, busy: true });

		expect(wrapper.get('[data-testid="agent-modal-back"]').attributes('disabled')).toBeDefined();
		expect(wrapper.get('[data-testid="dialog-close-button"]').attributes('disabled')).toBeDefined();
		await wrapper.get('[data-test-id="dialog-dismiss"]').trigger('click');

		expect(wrapper.emitted('back')).toBeUndefined();
		expect(wrapper.emitted('update:open')).toBeUndefined();
	});
});
