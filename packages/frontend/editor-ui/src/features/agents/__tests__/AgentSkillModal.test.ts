/* eslint-disable import-x/no-extraneous-dependencies -- test-only pattern */
import { describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import AgentSkillModal from '../components/AgentSkillModal.vue';

vi.mock('@n8n/i18n', () => ({
	useI18n: () => ({ baseText: (key: string) => key }),
}));

describe('AgentSkillModal', () => {
	it('emits a new enabled skill with a generated id', async () => {
		const onConfirm = vi.fn();
		const wrapper = mount(AgentSkillModal, {
			props: {
				modalName: 'agentSkillModal',
				data: { onConfirm },
			},
			global: { stubs },
		});

		await wrapper.find('[data-testid="agent-skill-name"]').setValue('Support triage');
		await wrapper
			.find('[data-testid="agent-skill-description"]')
			.setValue('Classify support requests.');
		await wrapper.find('[data-testid="agent-skill-definition"]').setValue('Identify urgency.');
		await wrapper.find('[data-testid="agent-skill-save"]').trigger('click');

		expect(onConfirm).toHaveBeenCalledWith(
			expect.objectContaining({
				id: expect.any(String),
				name: 'Support triage',
				description: 'Classify support requests.',
				enabled: true,
				definition: 'Identify urgency.',
			}),
		);
	});

	it('does not save when required fields are blank', async () => {
		const onConfirm = vi.fn();
		const wrapper = mount(AgentSkillModal, {
			props: {
				modalName: 'agentSkillModal',
				data: { onConfirm },
			},
			global: { stubs },
		});

		await wrapper.find('[data-testid="agent-skill-save"]').trigger('click');

		expect(onConfirm).not.toHaveBeenCalled();
	});
});

const stubs = {
	Modal: {
		template:
			'<div><slot name="header" /><slot name="content" /><slot name="footer" /><slot /></div>',
		props: ['name'],
	},
	N8nButton: { template: '<button v-bind="$attrs"><slot /></button>' },
	N8nInput: {
		template:
			'<input v-bind="$attrs" :value="modelValue" @input="$emit(`update:modelValue`, $event.target.value)" />',
		props: ['modelValue'],
	},
	N8nText: { template: '<span><slot /></span>', props: ['tag', 'size', 'color', 'bold'] },
};
