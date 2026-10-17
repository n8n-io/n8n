import { enableAutoUnmount, mount } from '@vue/test-utils';
import type { AgentConfigValidationIssue, AgentSkillVersionInfo } from '@n8n/api-types';
import { N8nStatusDot } from '@n8n/design-system';
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

function versionInfo(overrides: Partial<AgentSkillVersionInfo> = {}): AgentSkillVersionInfo {
	return {
		draft: 3,
		live: 3,
		latest: 3,
		pinned: false,
		liveHasSameContent: false,
		scope: 'project',
		...overrides,
	};
}

function mountWithVersion(info: AgentSkillVersionInfo) {
	return mount(AgentSkillsSection, {
		props: { skills: [{ id: 'tone', skill }], skillVersions: { tone: info } },
		global: { stubs: versionStubs },
	});
}

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
		const info = {
			draft: 2,
			live: 2,
			latest: 3,
			pinned: true,
			liveHasSameContent: false,
			scope: 'project',
		} satisfies AgentSkillVersionInfo;
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
				skillVersions: {
					tone: {
						draft: 3,
						live: 3,
						latest: 3,
						pinned: false,
						liveHasSameContent: false,
						scope: 'project',
					},
				},
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
				skillVersions: {
					tone: {
						draft: 2,
						live: 2,
						latest: 4,
						pinned: true,
						liveHasSameContent: false,
						scope: 'project',
					},
				},
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
					tone: {
						draft: 3,
						live: 3,
						latest: 3,
						pinned: false,
						liveHasSameContent: false,
						scope: 'project',
					},
					sql: {
						draft: 2,
						live: 2,
						latest: 4,
						pinned: true,
						liveHasSameContent: false,
						scope: 'project',
					},
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

	it('names the version the published agent uses when it is behind the draft', () => {
		const wrapper = mountWithVersion(versionInfo({ draft: 5, live: 4, latest: 5 }));

		const hint = wrapper.get('[data-testid="agent-skill-version-hint"]');
		expect(hint.text()).toContain('agents.builder.skills.version.hint.liveBehind');
		expect(hint.text()).not.toContain('testThenPublish');
		expect(hint.findComponent(N8nStatusDot).props('variant')).toBe('warning');
		expect(hint.find('[data-testid="agent-skill-see-changes"]').exists()).toBe(true);
		expect(hint.find('[data-testid="agent-skill-follow-latest"]').exists()).toBe(false);
	});

	it('says a skill is not published yet when no published version uses it', () => {
		const wrapper = mountWithVersion(versionInfo({ live: null }));

		const hint = wrapper.get('[data-testid="agent-skill-version-hint"]');
		expect(hint.text()).toBe('agents.builder.skills.version.hint.notLive');
		expect(hint.findComponent(N8nStatusDot).props('variant')).toBe('warning');
		expect(hint.find('[data-testid="agent-skill-see-changes"]').exists()).toBe(false);
	});

	it.each<[string, AgentSkillVersionInfo]>([
		[
			'the published agent runs the same content',
			versionInfo({ draft: 10, live: 7, latest: 10, liveHasSameContent: true }),
		],
		['the draft is pinned to the latest version', versionInfo({ pinned: true })],
	])('shows no hint when %s', (_, info) => {
		const wrapper = mountWithVersion(info);

		expect(wrapper.find('[data-testid="agent-skill-version-hint"]').exists()).toBe(false);
	});

	it('shows a pinned hint without the status dot', () => {
		const wrapper = mountWithVersion(versionInfo({ draft: 2, live: 2, latest: 4, pinned: true }));

		const hint = wrapper.get('[data-testid="agent-skill-version-hint"]');
		expect(hint.findComponent(N8nStatusDot).exists()).toBe(false);
		expect(hint.get('[data-testid="agent-skill-follow-latest"]').text()).toBe(
			'agents.builder.skills.version.useLatest',
		);
	});

	it('runs the hint links from the keyboard', async () => {
		const wrapper = mountWithVersion(versionInfo({ draft: 2, live: 2, latest: 4, pinned: true }));

		const seeChanges = wrapper.get('[data-testid="agent-skill-see-changes"]');
		expect(seeChanges.attributes('tabindex')).toBe('0');
		expect(seeChanges.attributes('role')).toBe('button');
		await seeChanges.trigger('keydown', { key: 'Enter' });
		expect(wrapper.findComponent(AgentSkillVersionDiffDialog).props('range')).toEqual({
			from: 2,
			to: 4,
		});

		await wrapper.get('[data-testid="agent-skill-follow-latest"]').trigger('keydown', { key: ' ' });
		expect(wrapper.emitted('set-skill-version')).toEqual([['tone', null]]);
	});

	it('labels the remove button as detaching the skill', () => {
		const wrapper = mountWithVersion(versionInfo());

		expect(wrapper.get('[data-testid="agent-skill-row-remove"]').attributes('aria-label')).toBe(
			'agents.builder.skills.version.detachSkill',
		);
	});

	describe('scope label', () => {
		function subtitle(info: AgentSkillVersionInfo) {
			return mountWithVersion(info).get('[data-testid="agent-skill-row-description"]').text();
		}

		it('names a project skill "Project"', () => {
			expect(subtitle(versionInfo())).toBe('tools.connection.categories.project · A skill');
		});

		it('keeps the agent and instance scope words', () => {
			expect(subtitle(versionInfo({ scope: 'agent' }))).toBe(
				'tools.connection.categories.thisAgent · A skill',
			);
			expect(subtitle(versionInfo({ scope: 'instance' }))).toBe(
				'tools.connection.categories.global · A skill',
			);
		});
	});

	it('opens the diff on the live version and the draft from "See changes"', async () => {
		const info = {
			draft: 5,
			live: 4,
			latest: 5,
			pinned: false,
			liveHasSameContent: false,
			scope: 'project',
		} satisfies AgentSkillVersionInfo;
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
				skillVersions: {
					tone: {
						draft: 3,
						live: 3,
						latest: 3,
						pinned: false,
						liveHasSameContent: false,
						scope: 'project',
					},
				},
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
				skillVersions: {
					tone: {
						draft: 2,
						live: 2,
						latest: 4,
						pinned: true,
						liveHasSameContent: false,
						scope: 'project',
					},
				},
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
