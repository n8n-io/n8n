import { enableAutoUnmount, mount } from '@vue/test-utils';
import type { AgentConfigValidationIssue } from '@n8n/api-types';
import { afterEach, describe, expect, it, vi } from 'vitest';

import AgentSkillsSection from '../components/AgentSkillsSection.vue';
import AgentSkillVersionBadge from '../components/skillVersions/AgentSkillVersionBadge.vue';
import AgentSkillVersionDiffDialog from '../components/skillVersions/AgentSkillVersionDiffDialog.vue';

enableAutoUnmount(afterEach);

vi.mock('@n8n/i18n', () => ({
	useI18n: () => ({ baseText: (key: string) => key }),
}));

vi.mock('../components/skillVersions/useSkillVersionLoader', () => ({
	useSkillVersionLoader: () => ({ loadVersions: vi.fn(), loadVersion: vi.fn() }),
}));

const versionStubs = {
	AgentSkillVersionBadge: {
		name: 'AgentSkillVersionBadge',
		props: ['skillId', 'info', 'loader', 'disabled'],
		emits: ['pin', 'follow-latest', 'compare'],
		template: '<span data-testid="agent-skill-version-badge" />',
	},
	AgentSkillVersionDiffDialog: {
		name: 'AgentSkillVersionDiffDialog',
		props: ['open', 'skillId', 'skillName', 'info', 'range', 'loader'],
		emits: ['update:open', 'open-skill', 'follow-latest'],
		template: '<div data-testid="agent-skill-version-diff-dialog" />',
	},
};

const skill = { name: 'Skill', description: 'A skill', instructions: 'Do it.' };

describe('AgentSkillsSection', () => {
	it('lists each skill as a row with its name and description', () => {
		const wrapper = mount(AgentSkillsSection, {
			props: {
				skills: [
					{ id: 'tone', skill: { ...skill, name: 'Tone', description: 'How to write' } },
					{ id: 'sql', skill: { ...skill, name: 'SQL', description: '' } },
				],
			},
		});

		const rows = wrapper.findAll('[data-testid="agent-skill-row"]');
		expect(rows).toHaveLength(2);
		expect(rows[0].attributes('data-skill-id')).toBe('tone');
		expect(rows[0].get('[data-testid="agent-capabilities-skill-row"]').text()).toBe('Tone');
		expect(rows[0].get('[data-testid="agent-skill-row-description"]').text()).toBe('How to write');
		expect(rows[1].find('[data-testid="agent-skill-row-description"]').exists()).toBe(false);
	});

	it('warns on the rows of skills that use an older version', () => {
		const wrapper = mount(AgentSkillsSection, {
			props: {
				skills: [
					{ id: 'outdated', skill: { ...skill, name: 'Outdated' } },
					{ id: 'current', skill: { ...skill, name: 'Current' } },
				],
				outdatedSkillIds: ['outdated'],
			},
		});

		const [outdated, current] = wrapper.findAll('[data-testid="agent-skill-row"]');
		expect(outdated.find('[data-testid="agent-chip-warning-icon"]').exists()).toBe(true);
		expect(current.find('[data-testid="agent-chip-warning-icon"]').exists()).toBe(false);
	});

	it('marks the row of a skill with validation issues', () => {
		const wrapper = mount(AgentSkillsSection, {
			props: {
				skills: [{ id: 'tone', skill }],
				outdatedSkillIds: ['tone'],
				validationIssues: [
					{
						code: 'missing_reference',
						path: 'skills[0]',
						capability: { kind: 'skill', id: 'tone' },
					},
				] satisfies AgentConfigValidationIssue[],
			},
		});

		const row = wrapper.get('[data-testid="agent-skill-row"]');
		expect(row.find('[data-testid="agent-chip-invalid-icon"]').exists()).toBe(true);
		expect(row.find('[data-testid="agent-chip-warning-icon"]').exists()).toBe(false);
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
		const [outdated, current] = wrapper.findAll('[data-testid="agent-capabilities-skill-row"]');

		await outdated.trigger('click');
		await current.trigger('click');

		expect(wrapper.emitted('open-skill')).toEqual([['outdated'], ['current']]);
	});

	it('removes a skill from its row', async () => {
		const wrapper = mount(AgentSkillsSection, {
			props: {
				skills: [
					{ id: 'tone', skill },
					{ id: 'sql', skill: { ...skill, name: 'SQL' } },
				],
			},
		});

		const rows = wrapper.findAll('[data-testid="agent-skill-row"]');
		await rows[1].get('[data-testid="agent-skill-row-remove"]').trigger('click');

		expect(wrapper.emitted('remove-skill')).toEqual([['sql']]);
		expect(wrapper.emitted('open-skill')).toBeUndefined();
	});

	it('adds a skill with or without skills in the list', async () => {
		const wrapper = mount(AgentSkillsSection, { props: { skills: [] } });
		await wrapper.get('[data-testid="agent-capabilities-add-skill"]').trigger('click');
		await wrapper.setProps({ skills: [{ id: 'tone', skill }] });
		await wrapper.get('[data-testid="agent-capabilities-add-skill"]').trigger('click');

		expect(wrapper.emitted('add-skill')).toHaveLength(2);
	});

	it('disables the row and the add buttons for a read-only host', () => {
		const wrapper = mount(AgentSkillsSection, {
			props: { skills: [{ id: 'tone', skill }], disabled: true },
		});

		expect(
			wrapper.get('[data-testid="agent-capabilities-skill-row"]').attributes('disabled'),
		).toBeDefined();
		expect(
			wrapper.get('[data-testid="agent-skill-row-remove"]').attributes('disabled'),
		).toBeDefined();
		expect(
			wrapper.get('[data-testid="agent-capabilities-add-skill"]').attributes('disabled'),
		).toBeDefined();
	});

	it('shows no version badge without version state, as with the hub off', () => {
		const wrapper = mount(AgentSkillsSection, {
			props: { skills: [{ id: 'tone', skill }] },
			global: { stubs: versionStubs },
		});

		expect(wrapper.findComponent(AgentSkillVersionBadge).exists()).toBe(false);
		expect(wrapper.find('[data-testid="agent-skill-version-hint"]').exists()).toBe(false);
	});

	it('shows a version badge instead of the outdated warning when the server sends version state', () => {
		const info = { draft: 2, live: 2, latest: 3, pinned: true, scope: 'project' };
		const wrapper = mount(AgentSkillsSection, {
			props: {
				skills: [{ id: 'tone', skill }],
				outdatedSkillIds: ['tone'],
				skillVersions: { tone: info },
			},
			global: { stubs: versionStubs },
		});

		expect(wrapper.findComponent(AgentSkillVersionBadge).props('info')).toEqual(info);
		expect(wrapper.find('[data-testid="agent-chip-warning-icon"]').exists()).toBe(false);
	});

	it('emits the version the badge pins, and null to follow the latest version', async () => {
		const wrapper = mount(AgentSkillsSection, {
			props: {
				skills: [{ id: 'tone', skill }],
				skillVersions: { tone: { draft: 3, live: 3, latest: 3, pinned: false, scope: 'project' } },
			},
			global: { stubs: versionStubs },
		});
		const badge = wrapper.findComponent(AgentSkillVersionBadge);

		badge.vm.$emit('pin', 'version-uuid', 2);
		badge.vm.$emit('follow-latest');

		expect(wrapper.emitted('set-skill-version')).toEqual([
			['tone', 'version-uuid'],
			['tone', null],
		]);
	});

	it('offers follow latest under a skill pinned behind the latest version', async () => {
		const wrapper = mount(AgentSkillsSection, {
			props: {
				skills: [{ id: 'tone', skill }],
				skillVersions: { tone: { draft: 2, live: 2, latest: 4, pinned: true, scope: 'project' } },
			},
			global: { stubs: versionStubs },
		});

		const hint = wrapper.get(
			'[data-testid="agent-skill-row"] [data-testid="agent-skill-version-hint"]',
		);
		expect(hint.text()).toContain('agents.builder.skills.version.hint.pinned');
		await hint.get('[data-testid="agent-skill-follow-latest"]').trigger('click');

		expect(wrapper.emitted('set-skill-version')).toEqual([['tone', null]]);
	});

	it('shows each hint in the row of its skill', () => {
		const wrapper = mount(AgentSkillsSection, {
			props: {
				skills: [
					{ id: 'tone', skill },
					{ id: 'sql', skill: { ...skill, name: 'SQL' } },
				],
				skillVersions: {
					tone: { draft: 3, live: 3, latest: 3, pinned: false, scope: 'project' },
					sql: { draft: 2, live: 2, latest: 4, pinned: true, scope: 'project' },
				},
			},
			global: { stubs: versionStubs },
		});

		const [tone, sql] = wrapper.findAll('[data-testid="agent-skill-row"]');
		expect(tone.find('[data-testid="agent-skill-version-hint"]').exists()).toBe(false);
		expect(tone.find('[data-testid="agent-skill-version-badge"]').exists()).toBe(true);
		expect(sql.find('[data-testid="agent-skill-version-hint"]').exists()).toBe(true);
		expect(sql.find('[data-testid="agent-skill-version-badge"]').exists()).toBe(true);
	});

	it('asks to test and publish when the live agent runs an older version', () => {
		const wrapper = mount(AgentSkillsSection, {
			props: {
				skills: [{ id: 'tone', skill }],
				skillVersions: { tone: { draft: 5, live: 4, latest: 5, pinned: false, scope: 'project' } },
			},
			global: { stubs: versionStubs },
		});

		const hint = wrapper.get('[data-testid="agent-skill-version-hint"]');
		expect(hint.text()).toContain('agents.builder.skills.version.hint.testThenPublish');
		expect(hint.find('[data-testid="agent-skill-follow-latest"]').exists()).toBe(false);
	});

	it('opens the diff on the live version and the draft from "See what changed"', async () => {
		const info = { draft: 5, live: 4, latest: 5, pinned: false, scope: 'project' };
		const wrapper = mount(AgentSkillsSection, {
			props: { skills: [{ id: 'tone', skill }], skillVersions: { tone: info } },
			global: { stubs: versionStubs },
		});
		expect(wrapper.findComponent(AgentSkillVersionDiffDialog).exists()).toBe(false);

		await wrapper.get('[data-testid="agent-skill-see-changes"]').trigger('click');

		const dialog = wrapper.findComponent(AgentSkillVersionDiffDialog);
		expect(dialog.props()).toMatchObject({
			skillId: 'tone',
			skillName: 'Skill',
			info,
			range: { from: 4, to: 5 },
		});
	});

	it('opens the diff from the badge and closes it to open the skill', async () => {
		const wrapper = mount(AgentSkillsSection, {
			props: {
				skills: [{ id: 'tone', skill }],
				skillVersions: { tone: { draft: 3, live: 3, latest: 3, pinned: false, scope: 'project' } },
			},
			global: { stubs: versionStubs },
		});

		wrapper.findComponent(AgentSkillVersionBadge).vm.$emit('compare', 3, 1);
		await wrapper.vm.$nextTick();
		const dialog = wrapper.findComponent(AgentSkillVersionDiffDialog);
		expect(dialog.props('range')).toEqual({ from: 3, to: 1 });

		dialog.vm.$emit('open-skill');
		await wrapper.vm.$nextTick();

		expect(wrapper.emitted('open-skill')).toEqual([['tone']]);
		expect(wrapper.findComponent(AgentSkillVersionDiffDialog).exists()).toBe(false);
	});

	it('follows the latest version from the diff dialog', async () => {
		const wrapper = mount(AgentSkillsSection, {
			props: {
				skills: [{ id: 'tone', skill }],
				skillVersions: { tone: { draft: 2, live: 2, latest: 4, pinned: true, scope: 'project' } },
			},
			global: { stubs: versionStubs },
		});
		await wrapper.get('[data-testid="agent-skill-see-changes"]').trigger('click');

		wrapper.findComponent(AgentSkillVersionDiffDialog).vm.$emit('follow-latest');
		await wrapper.vm.$nextTick();

		expect(wrapper.emitted('set-skill-version')).toEqual([['tone', null]]);
		expect(wrapper.findComponent(AgentSkillVersionDiffDialog).exists()).toBe(false);
	});
});
