import { enableAutoUnmount, mount } from '@vue/test-utils';
import { ref } from 'vue';
import { afterEach, describe, expect, it, vi } from 'vitest';

import AgentChipButton from '../components/AgentChipButton.vue';
import AgentSkillsSection from '../components/AgentSkillsSection.vue';

enableAutoUnmount(afterEach);

vi.mock('@n8n/i18n', () => ({
	useI18n: () => ({
		baseText: (key: string, options?: { interpolate?: Record<string, string> }) =>
			[key, ...Object.values(options?.interpolate ?? {})].join(' '),
	}),
}));

const workflowsInSkillsEnabled = ref(false);
vi.mock('@/app/stores/posthog.store', () => ({
	usePostHog: () => ({
		isVariantEnabled: (name: string, variant: string) =>
			workflowsInSkillsEnabled.value && name === '152_workflows_in_skills' && variant === 'variant',
	}),
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

		const noDirectTools = {
			...skill,
			name: 'Other',
			instructions: 'Run [Notify](n8n://workflow/wf-2).',
		};

		function mountWithTools() {
			return mount(AgentSkillsSection, {
				props: {
					skills: [
						{ id: 'weekly-ops', skill: weeklyOps },
						{ id: 'other', skill: noDirectTools },
					],
					tools,
				},
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

			const notes = wrapper
				.findAll('[data-testid="stub-tooltip-content"]')
				.map((note) => note.text())
				.filter((text) => text.startsWith('agents.builder.skills.workflowsAlreadyAttached'));
			expect(notes).toEqual(['agents.builder.skills.workflowsAlreadyAttached Send report']);
		});

		it('shows no note when the feature flag is off', () => {
			const wrapper = mountWithTools();

			expect(wrapper.text()).not.toContain('agents.builder.skills.workflowsAlreadyAttached');
		});
	});
});
