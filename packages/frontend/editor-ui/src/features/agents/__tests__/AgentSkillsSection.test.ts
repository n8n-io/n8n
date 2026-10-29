import { enableAutoUnmount, mount } from '@vue/test-utils';
import { afterEach, describe, expect, it, vi } from 'vitest';

import AgentChipButton from '../components/AgentChipButton.vue';
import AgentSkillsSection from '../components/AgentSkillsSection.vue';

enableAutoUnmount(afterEach);

vi.mock('@n8n/i18n', () => ({
	useI18n: () => ({ baseText: (key: string) => key }),
}));

const skill = { name: 'Skill', description: 'A skill', instructions: 'Do it.' };

describe('AgentSkillsSection', () => {
	it('warns on the chips of skills that use an older version', () => {
		const wrapper = mount(AgentSkillsSection, {
			props: {
				skills: [
					{ id: 'outdated', skill: { ...skill, name: 'Outdated' } },
					{ id: 'current', skill: { ...skill, name: 'Current' } },
				],
				outdatedSkillIds: ['outdated'],
			},
		});

		const [outdated, current] = wrapper.findAllComponents(AgentChipButton);
		expect(outdated.props('warning')).toBe(true);
		expect(outdated.props('warningReasons')).toEqual(['agents.builder.skills.outdated.warning']);
		expect(outdated.find('[data-testid="agent-chip-warning-icon"]').exists()).toBe(true);
		expect(current.props('warning')).toBe(false);
		expect(current.find('[data-testid="agent-chip-warning-icon"]').exists()).toBe(false);
	});

	it('opens an outdated skill like any other skill', async () => {
		const wrapper = mount(AgentSkillsSection, {
			props: {
				skills: [
					{ id: 'outdated', skill: { ...skill, name: 'Outdated' } },
					{ id: 'current', skill: { ...skill, name: 'Current' } },
				],
				outdatedSkillIds: ['outdated'],
			},
		});
		const [outdated, current] = wrapper.findAllComponents(AgentChipButton);

		await outdated.trigger('click');
		await current.trigger('click');

		expect(wrapper.emitted('open-skill')).toEqual([['outdated'], ['current']]);
	});
});
