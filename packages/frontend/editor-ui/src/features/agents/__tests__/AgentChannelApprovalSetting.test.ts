import { mount } from '@vue/test-utils';
import { nextTick } from 'vue';
import { describe, it, expect, vi } from 'vitest';
import type { AgentApproval, ChatIntegrationApprovableAction } from '@n8n/api-types';

import AgentChannelApprovalSetting from '../components/AgentChannelApprovalSetting.vue';

vi.mock('@n8n/i18n', () => {
	const i18n = { baseText: (key: string) => key };
	return { useI18n: () => i18n, i18n, i18nInstance: { install: vi.fn() } };
});

vi.mock('@n8n/design-system', async () => {
	const { defineComponent, inject, provide } = await import('vue');

	const N8nSelect = defineComponent({
		name: 'N8nSelect',
		props: {
			modelValue: { type: [String, Array], default: '' },
			multiple: { type: Boolean, default: false },
		},
		emits: ['update:modelValue'],
		setup(props, { emit }) {
			provide('selectOption', (value: string) => {
				if (!props.multiple) {
					emit('update:modelValue', value);
					return;
				}
				const current = Array.isArray(props.modelValue) ? props.modelValue : [];
				emit('update:modelValue', [...current, value]);
			});
		},
		template: '<div :data-testid="$attrs[\'data-test-id\']"><slot /></div>',
	});

	return {
		N8nText: { template: '<span><slot /></span>' },
		N8nSwitch2: defineComponent({
			props: { modelValue: { type: Boolean, default: false } },
			emits: ['update:modelValue'],
			template: `
				<button
					type="button"
					:data-testid="$attrs['data-test-id']"
					:data-checked="String(modelValue)"
					@click="$emit('update:modelValue', !modelValue)"
				/>
			`,
		}),
		N8nSelect,
		N8nOption: defineComponent({
			props: {
				value: { type: String, required: true },
				label: { type: String, required: true },
			},
			setup() {
				return { selectOption: inject<(value: string) => void>('selectOption') };
			},
			template: `
				<button
					type="button"
					data-testid="channel-approval-option"
					:data-value="value"
					@click="selectOption?.(value)"
				/>
			`,
		}),
	};
});

const SLACK_ACTIONS: ChatIntegrationApprovableAction[] = [
	{ name: 'respond', sensitive: false },
	{ name: 'do_not_respond', sensitive: false },
	{ name: 'send_dm', sensitive: true },
	{ name: 'send_channel_message', sensitive: true },
	{ name: 'add_reaction', sensitive: false },
];

function renderComponent({
	modelValue,
	actions = SLACK_ACTIONS,
}: { modelValue?: AgentApproval; actions?: ChatIntegrationApprovableAction[] } = {}) {
	return mount(AgentChannelApprovalSetting, { props: { modelValue, actions } });
}

function toggle(wrapper: ReturnType<typeof renderComponent>) {
	return wrapper.find('[data-testid="agent-channel-approval-toggle"]');
}

describe('AgentChannelApprovalSetting', () => {
	it('starts off, with no selector, when the channel has no approval saved', () => {
		const wrapper = renderComponent();

		expect(toggle(wrapper).attributes('data-checked')).toBe('false');
		expect(wrapper.find('[data-testid="agent-channel-approval-mode"]').exists()).toBe(false);
	});

	it('pre-selects the sensitive actions when switched on', async () => {
		const wrapper = renderComponent();

		await toggle(wrapper).trigger('click');

		expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual([
			{ mode: 'selected', tools: ['send_dm', 'send_channel_message'] },
		]);
	});

	it('clears the whole selection when switched off', async () => {
		const wrapper = renderComponent({
			modelValue: { mode: 'selected', tools: ['send_dm'] },
		});

		await toggle(wrapper).trigger('click');

		expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual([undefined]);
	});

	it('shows the saved selection when approval is already on', () => {
		const wrapper = renderComponent({
			modelValue: { mode: 'selected', tools: ['send_dm'] },
		});

		expect(toggle(wrapper).attributes('data-checked')).toBe('true');
		expect(wrapper.find('[data-testid="agent-channel-approval-tools"]').exists()).toBe(true);
	});

	it('offers only the actions that reach outside the conversation', async () => {
		const wrapper = renderComponent({
			modelValue: { mode: 'selected', tools: ['send_dm'] },
		});
		await nextTick();

		const offered = wrapper
			.find('[data-testid="agent-channel-approval-tools"]')
			.findAll('[data-testid="channel-approval-option"]')
			.map((option) => option.attributes('data-value'));

		expect(offered).toEqual(['send_dm', 'send_channel_message', 'add_reaction']);
	});

	it('reports an empty selection as invalid, and valid again once switched off', async () => {
		const wrapper = renderComponent({
			modelValue: { mode: 'selected', tools: [] },
		});

		expect(wrapper.emitted('update:valid')?.at(-1)).toEqual([false]);

		await toggle(wrapper).trigger('click');
		await wrapper.setProps({ modelValue: undefined });

		expect(wrapper.emitted('update:valid')?.at(-1)).toEqual([true]);
	});

	it('asks for every action when the channel flags none as sensitive', async () => {
		const wrapper = renderComponent({
			actions: [{ name: 'add_reaction', sensitive: false }],
		});

		await toggle(wrapper).trigger('click');

		expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual([{ mode: 'global' }]);
	});
});
