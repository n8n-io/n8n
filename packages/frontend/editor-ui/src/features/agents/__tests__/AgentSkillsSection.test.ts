import { enableAutoUnmount, mount } from '@vue/test-utils';
import type { AgentConfigValidationIssue, AgentSkillVersionInfo } from '@n8n/api-types';
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

	it.each([
		['no version state', undefined],
		['an empty version state, as with the hub off', {}],
	])('shows no version columns with %s', (_, skillVersions) => {
		const wrapper = mount(AgentSkillsSection, {
			props: { skills: [{ id: 'tone', skill }], skillVersions },
			global: { stubs: versionStubs },
		});

		expect(wrapper.find('[data-testid="agent-skill-table-header"]').exists()).toBe(false);
		expect(wrapper.findComponent(AgentSkillVersionBadge).exists()).toBe(false);
		expect(wrapper.find('[data-testid="agent-skill-draft-version"]').exists()).toBe(false);
		expect(wrapper.find('[data-testid="agent-skill-published-version"]').exists()).toBe(false);
		expect(wrapper.find('[data-testid="agent-skill-version-hint"]').exists()).toBe(false);
	});

	it('names the skill, draft, and published agent columns', () => {
		const header = mountWithVersion(versionInfo()).get('[data-testid="agent-skill-table-header"]');

		expect(header.text()).toBe(
			[
				'agents.builder.skills.version.column.skill',
				'agents.builder.skills.version.column.draft',
				'agents.builder.skills.version.column.published',
			].join(''),
		);
	});

	describe('version columns', () => {
		function cells(info: AgentSkillVersionInfo) {
			const wrapper = mountWithVersion(info);
			const published = wrapper.get('[data-testid="agent-skill-published-version"]');
			const publishedCaption = wrapper.find('[data-testid="agent-skill-published-caption"]');
			return {
				wrapper,
				draftCaption: wrapper.find('[data-testid="agent-skill-draft-caption"]').exists()
					? wrapper.get('[data-testid="agent-skill-draft-caption"]').text()
					: undefined,
				published,
				publishedCaption: publishedCaption.exists() ? publishedCaption.text() : undefined,
			};
		}

		it('shows the draft badge in the draft column', () => {
			const { wrapper } = cells(versionInfo());

			expect(
				wrapper
					.get('[data-testid="agent-skill-draft-version"]')
					.find('[data-testid="agent-skill-version-badge"]')
					.exists(),
			).toBe(true);
		});

		it.each<[string, AgentSkillVersionInfo, string]>([
			['follows the latest version', versionInfo(), 'caption.followsLatest'],
			['is pinned to the latest version', versionInfo({ pinned: true }), 'caption.pinnedLatest'],
		])('captions a draft that %s', (_, info, caption) => {
			expect(cells(info).draftCaption).toBe(`agents.builder.skills.version.${caption}`);
		});

		it('shows no caption, only the update link, for a draft pinned behind the latest version', () => {
			const { wrapper, draftCaption } = cells(
				versionInfo({ draft: 2, live: 2, latest: 4, pinned: true }),
			);

			expect(draftCaption).toBeUndefined();
			expect(wrapper.find('[data-testid="agent-skill-follow-latest"]').exists()).toBe(true);
		});

		it.each<[string, AgentSkillVersionInfo]>([
			['runs the draft version', versionInfo()],
			[
				'runs the same content',
				versionInfo({ draft: 10, live: 7, latest: 10, liveHasSameContent: true }),
			],
			['runs an older version', versionInfo({ draft: 5, live: 4, latest: 5 })],
		])('shows the published version as live when the published agent %s', (_, info) => {
			const { published, publishedCaption } = cells(info);

			expect(published.text()).toBe('agents.builder.skills.version.number');
			expect(published.attributes('data-state')).toBeUndefined();
			expect(published.element.tagName).toBe('SPAN');
			expect(publishedCaption).toBe('agents.builder.skills.version.caption.live');
		});

		it('offers "Update to" under the caption of a draft pinned behind the latest version', async () => {
			const { wrapper } = cells(versionInfo({ draft: 2, live: 2, latest: 4, pinned: true }));

			const link = wrapper
				.get('[data-testid="agent-skill-draft-version"]')
				.get('[data-testid="agent-skill-follow-latest"]');
			expect(link.text()).toBe('agents.builder.skills.version.updateTo');
			await link.trigger('click');

			expect(wrapper.emitted('set-skill-version')).toEqual([['tone', null]]);
		});

		it.each<[string, AgentSkillVersionInfo]>([
			['follows the latest version', versionInfo()],
			['is pinned to the latest version', versionInfo({ pinned: true })],
			[
				'is pinned to the latest version ahead of the published one',
				versionInfo({ draft: 3, live: 2, latest: 3, pinned: true }),
			],
		])('offers no "Update to" when the draft %s', (_, info) => {
			const { wrapper } = cells(info);

			expect(wrapper.find('[data-testid="agent-skill-follow-latest"]').exists()).toBe(false);
		});

		it('says "Not added" without a caption when the published agent does not use the skill', () => {
			const { published, publishedCaption } = cells(versionInfo({ live: null }));

			expect(published.text()).toBe('—');
			expect(published.attributes('aria-label')).toBe(
				'agents.builder.skills.version.published.notAdded',
			);
			expect(published.attributes('data-state')).toBe('notAdded');
			expect(publishedCaption).toBeUndefined();
		});
	});

	it.each<[string, AgentSkillVersionInfo, { from: number; to: number }]>([
		[
			'follows the latest version ahead of the published one',
			versionInfo({ draft: 5, live: 4, latest: 5 }),
			{ from: 4, to: 5 },
		],
		[
			'is pinned to the latest version ahead of the published one',
			versionInfo({ draft: 3, live: 2, latest: 3, pinned: true }),
			{ from: 2, to: 3 },
		],
		[
			'is pinned behind the latest version and differs from the published one',
			versionInfo({ draft: 2, live: 1, latest: 4, pinned: true }),
			{ from: 1, to: 2 },
		],
	])(
		'offers a compare button from the published version when the draft %s',
		async (_, info, range) => {
			const wrapper = mountWithVersion(info);

			expect(wrapper.find('[data-testid="agent-skill-version-hint"]').exists()).toBe(false);
			const compare = wrapper.get('[data-testid="agent-skill-see-changes"]');
			expect(compare.attributes('aria-label')).toBe('agents.builder.skills.version.seeChanges');
			await compare.trigger('click');
			expect(wrapper.findComponent(AgentSkillVersionDiffDialog).props('range')).toEqual(range);
		},
	);

	it.each<[string, AgentSkillVersionInfo]>([
		['the published agent runs the draft version', versionInfo()],
		[
			'the published agent runs the same content',
			versionInfo({ draft: 10, live: 7, latest: 10, liveHasSameContent: true }),
		],
		['the published agent does not use the skill', versionInfo({ live: null })],
	])('offers no compare button when %s', (_, info) => {
		expect(mountWithVersion(info).find('[data-testid="agent-skill-see-changes"]').exists()).toBe(
			false,
		);
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
						live: null,
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

	it('says a skill is not published yet when no published version uses it', () => {
		const wrapper = mountWithVersion(versionInfo({ live: null }));

		const hint = wrapper.get('[data-testid="agent-skill-version-hint"]');
		expect(hint.text()).toBe('agents.builder.skills.version.hint.notLive');
		expect(hint.find('[data-testid="agent-skill-see-changes"]').exists()).toBe(false);
	});

	it.each<[string, AgentSkillVersionInfo]>([
		[
			'the published agent runs the same content',
			versionInfo({ draft: 10, live: 7, latest: 10, liveHasSameContent: true }),
		],
		['the draft follows the latest version and the published agent runs it', versionInfo()],
		['the draft is pinned to the latest version', versionInfo({ pinned: true })],
		[
			'the draft is pinned behind the latest version on the published one',
			versionInfo({ draft: 2, live: 2, latest: 4, pinned: true }),
		],
	])('shows no hint when %s', (_, info) => {
		const wrapper = mountWithVersion(info);

		expect(wrapper.find('[data-testid="agent-skill-version-hint"]').exists()).toBe(false);
	});

	it('puts the update link in the draft column under a pin behind the latest version', () => {
		const wrapper = mountWithVersion(versionInfo({ draft: 2, live: 1, latest: 4, pinned: true }));

		expect(
			wrapper
				.get('[data-testid="agent-skill-draft-version"]')
				.find('[data-testid="agent-skill-follow-latest"]')
				.exists(),
		).toBe(true);
	});
	it('runs the update link from the keyboard', async () => {
		const wrapper = mountWithVersion(versionInfo({ draft: 2, live: 1, latest: 4, pinned: true }));

		const followLatest = wrapper.get('[data-testid="agent-skill-follow-latest"]');
		expect(followLatest.attributes('tabindex')).toBe('0');
		expect(followLatest.attributes('role')).toBe('button');
		await followLatest.trigger('keydown', { key: 'Tab' });
		expect(wrapper.emitted('set-skill-version')).toBeUndefined();
		await followLatest.trigger('keydown', { key: ' ' });
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
						live: 1,
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
