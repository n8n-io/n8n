import { enableAutoUnmount, mount } from '@vue/test-utils';
import { ref } from 'vue';
import { afterEach, describe, expect, it, vi } from 'vitest';

import AgentChipButton from '../components/AgentChipButton.vue';
import AgentSkillsSection from '../components/AgentSkillsSection.vue';

enableAutoUnmount(afterEach);

vi.mock('@n8n/i18n', () => ({
	useI18n: () => ({ baseText: (key: string) => key }),
}));

const workflowsInSkillsEnabled = ref(false);
vi.mock('@/app/stores/posthog.store', () => ({
	usePostHog: () => ({ isFeatureEnabled: () => workflowsInSkillsEnabled.value }),
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

	describe('workflows that are attached directly', () => {
		const weeklyOps = {
			...skill,
			name: 'Weekly ops',
			instructions: 'Run [Send report](n8n://workflow/wf-1) and [Notify](n8n://workflow/wf-2).',
		};
		const tools = [{ type: 'workflow' as const, workflow: 'Send report', workflowId: 'wf-1' }];

		function mountWithTools() {
			return mount(AgentSkillsSection, {
				props: { skills: [{ id: 'weekly-ops', skill: weeklyOps }], tools },
				global: {
					stubs: {
						N8nTooltip: {
							props: ['disabled'],
							template:
								'<span><slot /><span v-if="!disabled" data-testid="stub-tooltip-content"><slot name="content" /></span></span>',
						},
					},
				},
			});
		}

		afterEach(() => {
			workflowsInSkillsEnabled.value = false;
		});

		it('notes on the skill that a workflow it mentions is already attached as a tool', () => {
			workflowsInSkillsEnabled.value = true;

			const wrapper = mountWithTools();

			expect(wrapper.text()).toContain('agents.builder.skills.workflowsAlreadyAttached');
		});

		it('shows no note when the feature flag is off', () => {
			const wrapper = mountWithTools();

			expect(wrapper.text()).not.toContain('agents.builder.skills.workflowsAlreadyAttached');
		});
	});
});
