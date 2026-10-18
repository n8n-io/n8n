import type {
	AgentSkillVersionInfo,
	SkillVersionDetail,
	SkillVersionSummary,
} from '@n8n/api-types';
import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils';
import { afterEach, describe, expect, it, vi } from 'vitest';

import AgentSkillVersionDiffDialog from './AgentSkillVersionDiffDialog.vue';
import type { SkillVersionLoader } from './useSkillVersionLoader';

enableAutoUnmount(afterEach);

vi.mock('@n8n/i18n', () => ({
	useI18n: () => ({
		baseText: (key: string, options?: { interpolate?: Record<string, string> }) => {
			const values = options?.interpolate ?? {};
			if (key === 'agents.builder.skills.version.number') return `v${values.version}`;
			if (key === 'agents.builder.skills.version.diff.taggedOption') {
				return `${values.version} (${values.tags})`;
			}
			if (key.startsWith('agents.builder.skills.version.diff.tag.')) return key.split('.').pop();
			return key;
		},
	}),
}));

vi.mock('@n8n/composables/useToast', () => ({ useToast: () => ({ showError: vi.fn() }) }));

const stubs = {
	AgentModal: {
		props: ['open', 'title'],
		template:
			'<div v-if="open"><h1>{{ title }}</h1><slot /><slot name="footerLeft" /><slot name="footerActions" /></div>',
	},
	SkillVersionDiff: {
		name: 'SkillVersionDiff',
		props: ['from', 'to', 'fromLabel', 'toLabel'],
		template: '<div data-testid="diff" />',
	},
};

vi.mock('@n8n/design-system', async (importOriginal) => ({
	...(await importOriginal<object>()),
	N8nSelect: { props: ['modelValue'], template: '<div><slot /></div>' },
	N8nOption: {
		props: ['value', 'label'],
		template: '<span data-testid="option">{{ label }}</span>',
	},
	N8nButton: { template: '<button><slot /></button>' },
	N8nText: { template: '<span><slot /></span>' },
}));

const summaries: SkillVersionSummary[] = [4, 3, 2].map((version) => ({
	id: `version-${version}`,
	version,
	label: null,
	createdBy: null,
	createdAt: '2026-10-01T00:00:00.000Z',
	sourceCommitSha: null,
}));

function detail(version: number): SkillVersionDetail {
	return {
		...summaries.find((summary) => summary.version === version)!,
		skill: { name: 'Refund policy', description: '', instructions: `Rule ${version}` },
	};
}

function mountDialog(
	info: AgentSkillVersionInfo,
	range: { from: number; to: number },
	load: (version: number) => SkillVersionDetail = detail,
) {
	const loader: SkillVersionLoader = {
		loadVersions: vi.fn(async () => summaries),
		loadVersion: vi.fn(async (_skillId: string, version: number) => load(version)),
	};
	const wrapper = mount(AgentSkillVersionDiffDialog, {
		props: { open: true, skillId: 'refund', skillName: 'Refund policy', info, range, loader },
		global: { stubs },
	});
	return { wrapper, loader };
}

describe('AgentSkillVersionDiffDialog', () => {
	it('tags the versions the agent uses and renders the diff of the pair', async () => {
		const { wrapper, loader } = mountDialog(
			{ draft: 4, live: 3, latest: 4, pinned: false, liveHasSameContent: false, scope: 'project' },
			{ from: 3, to: 4 },
		);
		await flushPromises();

		const fromOptions = wrapper
			.get('[data-testid="skill-version-compare-from"]')
			.findAll('[data-testid="option"]')
			.map((option) => option.text());
		expect(fromOptions).toEqual(['v4 (draft, latest)', 'v3 (live)', 'v2']);
		expect(loader.loadVersion).toHaveBeenCalledWith('refund', 3);
		expect(loader.loadVersion).toHaveBeenCalledWith('refund', 4);
		const diff = wrapper.getComponent({ name: 'SkillVersionDiff' });
		expect(diff.props('from')).toEqual(detail(3).skill);
		expect(diff.props('to')).toEqual(detail(4).skill);
		expect(wrapper.find('[data-testid="agent-skill-follow-latest"]').exists()).toBe(false);
		expect(wrapper.get('[data-testid="agent-skill-version-diff-note"]').text()).toBe(
			'agents.builder.skills.version.diff.note.liveBehind',
		);
	});

	it('says the published agent already runs the content when the server says so', async () => {
		const { wrapper } = mountDialog(
			{ draft: 4, live: 3, latest: 4, pinned: false, liveHasSameContent: true, scope: 'project' },
			{ from: 3, to: 4 },
		);
		await flushPromises();

		expect(wrapper.get('[data-testid="agent-skill-version-diff-note"]').text()).toBe(
			'agents.builder.skills.version.diff.note.sameContent',
		);
	});

	it('does not compare the loaded content to pick the note', async () => {
		// As after a restore: v4 saved the content of v3 again. Only the server decides.
		const { wrapper } = mountDialog(
			{ draft: 4, live: 3, latest: 4, pinned: false, liveHasSameContent: false, scope: 'project' },
			{ from: 3, to: 4 },
			(version) => ({ ...detail(version), skill: detail(3).skill }),
		);
		await flushPromises();

		expect(wrapper.get('[data-testid="agent-skill-version-diff-note"]').text()).toBe(
			'agents.builder.skills.version.diff.note.liveBehind',
		);
	});

	it('uses the shared compare bar and swaps the two sides', async () => {
		const { wrapper, loader } = mountDialog(
			{ draft: 4, live: 3, latest: 4, pinned: false, liveHasSameContent: false, scope: 'project' },
			{ from: 3, to: 4 },
		);
		await flushPromises();

		const bar = wrapper.getComponent({ name: 'SkillVersionCompareBar' });
		expect(bar.text()).toContain('settings.context.skills.versions.compare.title');
		await wrapper.get('[data-testid="skill-version-compare-swap"]').trigger('click');
		await flushPromises();

		const diff = wrapper.getComponent({ name: 'SkillVersionDiff' });
		expect(diff.props('from')).toEqual(detail(4).skill);
		expect(diff.props('to')).toEqual(detail(3).skill);
		expect(loader.loadVersion).toHaveBeenCalledTimes(4);
	});

	it('offers follow latest for a skill pinned behind the latest version', async () => {
		const { wrapper } = mountDialog(
			{ draft: 2, live: 2, latest: 4, pinned: true, liveHasSameContent: false, scope: 'project' },
			{ from: 2, to: 4 },
		);
		await flushPromises();

		await wrapper.get('[data-testid="agent-skill-follow-latest"]').trigger('click');
		await wrapper.get('[data-testid="agent-skill-version-diff-open-skill"]').trigger('click');

		expect(wrapper.emitted('follow-latest')).toEqual([[]]);
		expect(wrapper.emitted('open-skill')).toEqual([[]]);
	});
});
