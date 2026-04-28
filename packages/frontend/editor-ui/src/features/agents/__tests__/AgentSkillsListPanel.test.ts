/* eslint-disable import-x/no-extraneous-dependencies -- test-only pattern */
import { describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import type { AgentJsonSkillRef } from '@n8n/api-types';
import AgentSkillsListPanel from '../components/AgentSkillsListPanel.vue';

vi.mock('@n8n/i18n', () => ({
	useI18n: () => ({
		baseText: (key: string, options?: { interpolate?: Record<string, string> }) =>
			options?.interpolate?.count ?? key,
	}),
}));

const skills: AgentJsonSkillRef[] = [
	{
		id: 'support-triage',
		name: 'Support triage',
		description: 'Classify support requests.',
		enabled: true,
		definition: 'Identify urgency and next action.',
	},
	{
		id: 'renewal-risk',
		name: 'Renewal risk',
		enabled: false,
		definition: 'Summarize risk signals.',
	},
];

describe('AgentSkillsListPanel', () => {
	it('renders an empty state when no skills are configured', () => {
		const wrapper = mount(AgentSkillsListPanel, {
			props: { skills: [] },
			global: { stubs: designSystemStubs },
		});

		expect(wrapper.find('[data-testid="agent-skills-empty"]').exists()).toBe(true);
	});

	it('renders configured skills and emits toggle/remove actions', async () => {
		const wrapper = mount(AgentSkillsListPanel, {
			props: { skills },
			global: { stubs: designSystemStubs },
		});

		expect(wrapper.text()).toContain('Support triage');
		expect(wrapper.text()).toContain('Classify support requests.');

		await wrapper.find('[data-testid="agent-skill-enabled"]').trigger('click');
		expect(wrapper.emitted('toggle-skill')).toEqual([['support-triage', false]]);

		await wrapper.find('[data-testid="agent-skill-remove"]').trigger('click');
		expect(wrapper.emitted('remove-skill')).toEqual([['support-triage']]);
	});

	it('emits add-skill when the add button is clicked', async () => {
		const wrapper = mount(AgentSkillsListPanel, {
			props: { skills },
			global: { stubs: designSystemStubs },
		});

		await wrapper.find('[data-testid="agent-skills-add"]').trigger('click');
		expect(wrapper.emitted('add-skill')).toHaveLength(1);
	});
});

const designSystemStubs = {
	N8nButton: {
		template: '<button v-bind="$attrs"><slot name="prefix" /><slot /></button>',
	},
	N8nIcon: { template: '<i />', props: ['icon', 'size'] },
	N8nIconButton: {
		template: '<button v-bind="$attrs" />',
		props: ['icon'],
	},
	N8nSwitch2: {
		template: '<button v-bind="$attrs" @click="$emit(\'update:modelValue\', !modelValue)" />',
		props: ['modelValue'],
	},
	N8nText: { template: '<span><slot /></span>', props: ['tag', 'size', 'color', 'bold'] },
	N8nTooltip: { template: '<span><slot /></span>', props: ['content', 'placement'] },
};
