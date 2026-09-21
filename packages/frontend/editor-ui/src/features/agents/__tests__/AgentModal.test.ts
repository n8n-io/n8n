import { flushPromises, mount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';

import AgentModal from '../components/modals/AgentModal.vue';
import AgentModalMultiStep from '../components/modals/AgentModalMultiStep.vue';

vi.mock('@n8n/design-system', async () => {
	const { defineComponent, onMounted } = await import('vue');
	return {
		N8nDialog: defineComponent({
			props: {
				open: Boolean,
				size: String,
				trapFocus: Boolean,
				disableOutsidePointerEvents: Boolean,
			},
			emits: ['update:open', 'interactOutside', 'openAutoFocus'],
			setup(_, { emit }) {
				onMounted(() => emit('openAutoFocus', new Event('open-auto-focus', { cancelable: true })));
			},
			template: `
				<section
					v-if="open"
					role="dialog"
					:data-size="size"
					:data-trap-focus="trapFocus"
					:data-disable-outside-pointer-events="disableOutsidePointerEvents"
				>
					<slot />
					<button data-test-id="dialog-dismiss" @click="$emit('update:open', false)" />
				</section>
			`,
		}),
		N8nDialogHeader: defineComponent({ template: '<header><slot /></header>' }),
		N8nDialogFooter: defineComponent({ template: '<footer><slot /></footer>' }),
		N8nDialogTitle: defineComponent({ template: '<div><slot /></div>' }),
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

	it('edits the title and focuses the first body field', async () => {
		const wrapper = mountModal({ editableTitle: true });
		await flushPromises();

		const title = wrapper.get<HTMLInputElement>('[data-test-id="agent-modal-title-input"]');
		await title.setValue('Slack messages');

		expect(wrapper.emitted('update:title')).toEqual([['Slack messages']]);
		expect(document.activeElement).toBe(wrapper.get('[data-test-id="first-body-field"]').element);
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
