import { mount } from '@vue/test-utils';
import { nextTick } from 'vue';
import { describe, it, expect, vi } from 'vitest';
import type { AgentApproval } from '@n8n/api-types';

import AgentApprovalSelector, {
	type ApprovalEntryOption,
} from '../components/AgentApprovalSelector.vue';

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
				<button type="button" :data-value="value" @click="selectOption?.(value)">
					{{ label }}
				</button>
			`,
		}),
	};
});

const OPTIONS: ApprovalEntryOption[] = [
	{ label: 'Send a DM', value: 'send_dm' },
	{ label: 'Send to a channel', value: 'send_channel_message' },
];

function renderComponent({
	modelValue,
	options = OPTIONS,
}: { modelValue?: AgentApproval; options?: ApprovalEntryOption[] } = {}) {
	return mount(AgentApprovalSelector, {
		props: {
			modelValue,
			options,
			label: 'label',
			hint: 'hint',
			placeholder: 'placeholder',
			testIdPrefix: 'approval',
		},
	});
}

function pickMode(wrapper: ReturnType<typeof renderComponent>, mode: string) {
	return wrapper.find(`[data-testid="approval-mode"] [data-value="${mode}"]`).trigger('click');
}

describe('AgentApprovalSelector', () => {
	it('reports no approval and a valid state for the disabled mode', async () => {
		const wrapper = renderComponent({ modelValue: { mode: 'global' } });

		await pickMode(wrapper, 'disabled');

		expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual([undefined]);
		expect(wrapper.emitted('update:valid')?.at(-1)).toEqual([true]);
	});

	it('reports the selected mode as invalid until something is selected', async () => {
		const wrapper = renderComponent();

		await pickMode(wrapper, 'selected');
		expect(wrapper.emitted('update:valid')?.at(-1)).toEqual([false]);

		await wrapper.find('[data-testid="approval-tools"] [data-value="send_dm"]').trigger('click');

		expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual([
			{ mode: 'selected', tools: ['send_dm'] },
		]);
		expect(wrapper.emitted('update:valid')?.at(-1)).toEqual([true]);
	});

	it('announces the mode so a caller can load its entries lazily', async () => {
		const wrapper = renderComponent();

		await pickMode(wrapper, 'selected');

		expect(wrapper.emitted('update:mode')?.at(-1)).toEqual(['selected']);
	});

	it('hides the entry list unless the mode needs one', async () => {
		const wrapper = renderComponent();

		expect(wrapper.find('[data-testid="approval-tools"]').exists()).toBe(false);

		await pickMode(wrapper, 'global');
		expect(wrapper.find('[data-testid="approval-tools"]').exists()).toBe(false);

		await pickMode(wrapper, 'selected');
		expect(wrapper.find('[data-testid="approval-tools"]').exists()).toBe(true);
	});

	it('drops selections the caller stops offering', async () => {
		const wrapper = renderComponent({
			modelValue: { mode: 'selected', tools: ['send_dm', 'send_channel_message'] },
		});

		await wrapper.setProps({ options: [OPTIONS[0]] });
		await nextTick();

		expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual([
			{ mode: 'selected', tools: ['send_dm'] },
		]);
	});

	it('prunes stale entries that are absent from the options at mount', () => {
		const wrapper = renderComponent({
			modelValue: { mode: 'selected', tools: ['send_dm', 'gone'] },
			options: OPTIONS,
		});

		expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual([
			{ mode: 'selected', tools: ['send_dm'] },
		]);
	});

	it('keeps a saved selection while the entries have not arrived yet', async () => {
		const wrapper = renderComponent({
			modelValue: { mode: 'selected', tools: ['send_dm'] },
			options: [],
		});

		await wrapper.setProps({ options: [] });
		await nextTick();

		expect(wrapper.emitted('update:modelValue')).toBeUndefined();
	});

	it('shows the caller’s error only while the mode needs entries', async () => {
		const wrapper = renderComponent();

		await wrapper.setProps({ error: 'Could not load' });
		expect(wrapper.text()).not.toContain('Could not load');

		await pickMode(wrapper, 'selected');
		expect(wrapper.text()).toContain('Could not load');
	});
});
