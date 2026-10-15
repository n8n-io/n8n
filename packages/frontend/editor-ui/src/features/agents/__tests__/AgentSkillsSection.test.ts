import { enableAutoUnmount, mount } from '@vue/test-utils';
import { afterEach, describe, expect, it, vi } from 'vitest';

import AgentChipButton from '../components/AgentChipButton.vue';
import AgentSkillsSection from '../components/AgentSkillsSection.vue';

enableAutoUnmount(afterEach);

vi.mock('@n8n/i18n', () => ({
	useI18n: () => ({ baseText: (key: string) => key }),
}));

const showMessage = vi.fn();
vi.mock('@n8n/composables/useToast', () => ({ useToast: () => ({ showMessage }) }));

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

	it('does not open an outdated skill and tells the user to add it again', async () => {
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

		expect(wrapper.emitted('open-skill')).toEqual([['current']]);
		expect(showMessage).toHaveBeenCalledWith({
			type: 'warning',
			title: 'agents.builder.skills.outdated.title',
			message: 'agents.builder.skills.outdated.warning',
		});
	});
});
