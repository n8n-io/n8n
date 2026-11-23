import { mount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';

import AgentMemoryGuidanceModal from '../components/AgentMemoryGuidanceModal.vue';

vi.mock('@n8n/i18n', () => ({
	useI18n: () => ({
		baseText: (key: string) => key,
	}),
}));

vi.mock('@n8n/design-system', () => ({
	N8nButton: {
		template:
			'<button :data-testid="$attrs[\'data-testid\']" :disabled="disabled" @click="$emit(\'click\')"><slot /></button>',
		props: ['disabled'],
		emits: ['click'],
	},
	N8nTagsInput2: {
		name: 'N8nTagsInput2',
		template: '<div :data-testid="$attrs[\'data-testid\']" />',
		props: ['modelValue', 'max', 'placeholder', 'disabled'],
		emits: ['update:modelValue'],
	},
	N8nText: { template: '<span><slot /></span>' },
	TagsInputInput: { template: '<input />' },
}));

vi.mock('../components/modals/AgentModal.vue', () => ({
	default: {
		template: '<div v-if="open"><slot /><slot name="footerActions" /></div>',
		props: ['open', 'title'],
		emits: ['update:open'],
	},
}));

function mountModal(guidance?: { include?: string[]; exclude?: string[] }) {
	return mount(AgentMemoryGuidanceModal, { props: { open: true, guidance } });
}

function tagsInput(wrapper: ReturnType<typeof mountModal>, field: 'include' | 'exclude') {
	return wrapper
		.findAllComponents({ name: 'N8nTagsInput2' })
		.find((input) => input.attributes('data-testid') === `agent-memory-guidance-${field}`)!;
}

describe('AgentMemoryGuidanceModal', () => {
	it('shows saved topics and saves trimmed, unique topics', async () => {
		const wrapper = mountModal({ include: ['timezone'], exclude: ['passwords'] });
		expect(tagsInput(wrapper, 'include').props('modelValue')).toEqual(['timezone']);
		expect(tagsInput(wrapper, 'exclude').props('modelValue')).toEqual(['passwords']);

		tagsInput(wrapper, 'include').vm.$emit('update:modelValue', [
			'timezone',
			' timezone ',
			'  ',
			'tool preferences',
		]);
		await wrapper.find('[data-testid="agent-memory-guidance-save"]').trigger('click');

		expect(wrapper.emitted('save')).toEqual([
			[{ include: ['timezone', 'tool preferences'], exclude: ['passwords'] }],
		]);
		expect(wrapper.emitted('update:open')).toEqual([[false]]);
	});

	it('saves no guidance when every topic is removed', async () => {
		const wrapper = mountModal({ include: ['timezone'] });

		tagsInput(wrapper, 'include').vm.$emit('update:modelValue', []);
		await wrapper.find('[data-testid="agent-memory-guidance-save"]').trigger('click');

		expect(wrapper.emitted('save')).toEqual([[undefined]]);
	});
});
