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

/** Render the row menu items as buttons, so a test can select one without opening the menu. */
vi.mock('@n8n/design-system', async (importOriginal) => {
	const actual = await importOriginal<object>();
	return {
		...actual,
		N8nDropdownMenu: {
			name: 'N8nDropdownMenu',
			inheritAttrs: false,
			props: ['items', 'disabled', 'placement'],
			emits: ['select'],
			template: `<div v-bind="$attrs">
				<slot name="trigger" />
				<button
					v-for="item in items"
					:key="item.id"
					:data-testid="item.testId"
					:data-destructive="item.destructive ? 'true' : undefined"
					:data-divided="item.divided ? 'true' : undefined"
					@click="$emit('select', item.id)"
				>{{ item.label }}</button>
			</div>`,
		},
	};
});

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
			wrapper.get('[data-testid="agent-skill-row-actions"]').attributes('disabled'),
		).toBeDefined();
		expect(wrapper.findComponent({ name: 'N8nDropdownMenu' }).props('disabled')).toBe(true);
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
			return {
				wrapper,
				draftCaption: wrapper.find('[data-testid="agent-skill-draft-caption"]').exists()
					? wrapper.get('[data-testid="agent-skill-draft-caption"]').text()
					: undefined,
				published,
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
			['is pinned to the latest version', versionInfo({ pinned: true }), 'caption.followsLatest'],
			[
				'is pinned behind the latest version',
				versionInfo({ draft: 2, live: 2, latest: 4, pinned: true }),
				'caption.available',
			],
		])('captions a draft that %s', (_, info, caption) => {
			expect(cells(info).draftCaption).toBe(`agents.builder.skills.version.${caption}`);
		});

		it('offers no "Update to" link under a draft pinned behind the latest version', () => {
			const { wrapper } = cells(versionInfo({ draft: 2, live: 2, latest: 4, pinned: true }));

			expect(wrapper.find('[data-testid="agent-skill-follow-latest"]').exists()).toBe(false);
		});

		it.each<[string, AgentSkillVersionInfo]>([
			['runs the draft version', versionInfo()],
			[
				'runs the same content',
				versionInfo({ draft: 10, live: 7, latest: 10, liveHasSameContent: true }),
			],
			['runs an older version', versionInfo({ draft: 5, live: 4, latest: 5 })],
		])('shows only the published version tag when the published agent %s', (_, info) => {
			const { wrapper, published } = cells(info);

			expect(published.text()).toBe('agents.builder.skills.version.number');
			expect(published.attributes('data-state')).toBeUndefined();
			expect(published.element.tagName).toBe('SPAN');
			expect(wrapper.find('[data-testid="agent-skill-published-caption"]').exists()).toBe(false);
		});

		it('says "Not added" without a caption when the published agent does not use the skill', () => {
			const { wrapper, published } = cells(versionInfo({ live: null }));

			expect(published.text()).toBe('—');
			expect(published.attributes('aria-label')).toBe(
				'agents.builder.skills.version.published.notAdded',
			);
			expect(published.attributes('data-state')).toBe('notAdded');
			expect(wrapper.find('[data-testid="agent-skill-published-caption"]').exists()).toBe(false);
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

	it.each<[string, AgentSkillVersionInfo]>([
		['the published agent does not use the skill', versionInfo({ live: null })],
		[
			'the published agent runs the same content',
			versionInfo({ draft: 10, live: 7, latest: 10, liveHasSameContent: true }),
		],
		['the draft is ahead of the published agent', versionInfo({ draft: 5, live: 4, latest: 5 })],
		[
			'the draft is pinned behind the latest version',
			versionInfo({ draft: 2, live: 2, latest: 4, pinned: true }),
		],
	])('shows no hint line when %s, because the version columns say it', (_, info) => {
		const wrapper = mountWithVersion(info);

		expect(wrapper.find('[data-testid="agent-skill-version-hint"]').exists()).toBe(false);
		expect(wrapper.find('[data-testid="agent-skill-version-badge"]').exists()).toBe(true);
	});

	it('labels the row menu trigger', () => {
		const wrapper = mountWithVersion(versionInfo());

		expect(wrapper.get('[data-testid="agent-skill-row-actions"]').attributes('aria-label')).toBe(
			'agents.builder.skills.version.rowActions',
		);
	});

	describe('row menu', () => {
		function menuItemIds(wrapper: ReturnType<typeof mountWithVersion>) {
			const items = wrapper.findComponent({ name: 'N8nDropdownMenu' }).props('items') as Array<{
				id: string;
			}>;
			return items.map((item) => item.id);
		}

		it.each<[string, AgentSkillVersionInfo]>([
			['the draft is ahead of the published agent', versionInfo({ draft: 5, live: 4, latest: 5 })],
			[
				'the draft is pinned behind the latest version and differs from the published one',
				versionInfo({ draft: 2, live: 1, latest: 4, pinned: true }),
			],
		])('offers compare and then remove when %s', (_, info) => {
			const wrapper = mountWithVersion(info);

			expect(menuItemIds(wrapper)).toEqual(['compare', 'remove']);
			const remove = wrapper.get('[data-testid="agent-skill-row-remove"]');
			expect(remove.text()).toBe('agents.builder.skills.version.removeFromAgent');
			expect(remove.attributes('data-destructive')).toBe('true');
			expect(remove.attributes('data-divided')).toBe('true');
			expect(wrapper.get('[data-testid="agent-skill-row-compare"]').text()).toBe(
				'agents.builder.skills.version.compareDraftWithPublished',
			);
		});

		it.each<[string, AgentSkillVersionInfo | undefined]>([
			['there are no version columns', undefined],
			['the published agent runs the draft version', versionInfo()],
			[
				'the published agent runs the same content',
				versionInfo({ draft: 10, live: 7, latest: 10, liveHasSameContent: true }),
			],
			['the published agent does not use the skill', versionInfo({ live: null })],
		])('offers only remove when %s', (_, info) => {
			const wrapper = mount(AgentSkillsSection, {
				props: {
					skills: [{ id: 'tone', skill }],
					skillVersions: info ? { tone: info } : undefined,
				},
				global: { stubs: versionStubs },
			});

			expect(menuItemIds(wrapper)).toEqual(['remove']);
			expect(wrapper.find('[data-testid="agent-skill-row-compare"]').exists()).toBe(false);
			expect(
				wrapper.get('[data-testid="agent-skill-row-remove"]').attributes('data-divided'),
			).toBeUndefined();
		});

		it('emits remove-skill from the remove item', async () => {
			const wrapper = mountWithVersion(versionInfo({ draft: 5, live: 4, latest: 5 }));

			await wrapper.get('[data-testid="agent-skill-row-remove"]').trigger('click');

			expect(wrapper.emitted('remove-skill')).toEqual([['tone']]);
			expect(wrapper.findComponent(AgentSkillVersionDiffDialog).exists()).toBe(false);
		});

		it('opens the diff from the published version to the draft from the compare item', async () => {
			const wrapper = mountWithVersion(versionInfo({ draft: 2, live: 1, latest: 4, pinned: true }));

			await wrapper.get('[data-testid="agent-skill-row-compare"]').trigger('click');

			expect(wrapper.findComponent(AgentSkillVersionDiffDialog).props()).toMatchObject({
				skillId: 'tone',
				range: { from: 1, to: 2 },
			});
			expect(wrapper.emitted('remove-skill')).toBeUndefined();
		});
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
