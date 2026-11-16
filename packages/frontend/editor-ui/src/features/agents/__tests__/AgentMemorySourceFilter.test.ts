import { describe, it, expect, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { nextTick, ref, type Component } from 'vue';
import { N8nDropdownMenu, type DropdownMenuItemProps } from '@n8n/design-system';
import type { AgentMemorySourceFacetGroupDto } from '@n8n/api-types';

import AgentMemorySourceFilter from '../components/AgentMemorySourceFilter.vue';

vi.mock('../composables/useAgentIntegrationsCatalog', () => ({
	useAgentIntegrationsCatalog: () => ({
		catalog: ref([{ type: 'slack', label: 'Slack', icon: 'zap' }]),
		ensureLoaded: vi.fn(),
	}),
}));

vi.mock('@n8n/i18n', () => ({
	useI18n: () => ({
		baseText: (key: string, options?: { interpolate?: Record<string, string> }) =>
			options?.interpolate ? `${key} ${Object.values(options.interpolate).join(',')}` : key,
	}),
}));

const groups: AgentMemorySourceFacetGroupDto[] = [
	{
		kind: 'slack',
		users: [{ id: 'U1', name: 'Sin' }],
		channels: [{ id: 'C1', name: 'finance-ops' }],
	},
	{ kind: 'users', users: [{ id: 'viewer-1', name: 'Robin', isViewer: true }] },
];

/** Enough Slack sources for a searchable sub-menu. */
const manyGroups: AgentMemorySourceFacetGroupDto[] = [
	{
		kind: 'slack',
		channels: ['finance-ops', 'general', 'random', 'design', 'eng', 'sales', 'support', 'ops'].map(
			(name, index) => ({ id: `C${index}`, name }),
		),
		users: [
			{ id: 'U1', name: 'Sin' },
			{ id: 'U2', name: 'Finley' },
		],
	},
	{ kind: 'users', users: [{ id: 'viewer-1', name: 'Robin', isViewer: true }] },
];

function mountFilter(modelValue = {}, filterGroups = groups) {
	return mount(AgentMemorySourceFilter, {
		props: { groups: filterGroups, modelValue, 'onUpdate:modelValue': vi.fn() },
	});
}

/** N8nDropdownMenu is generic, so `findComponent` cannot infer its props on its own. */
function findMenu(wrapper: ReturnType<typeof mountFilter>) {
	const menu = wrapper.findComponent(N8nDropdownMenu as Component);
	const { items } = menu.props() as { items: Array<DropdownMenuItemProps<string>> };
	return {
		items,
		select: (id: string | undefined) => menu.vm.$emit('select', id),
		search: (term: string, itemId: string) => menu.vm.$emit('search', term, itemId),
	};
}

describe('AgentMemorySourceFilter', () => {
	it('nests the sources of each integration under it', () => {
		const { items } = findMenu(mountFilter());

		expect(items.map(({ label }) => label)).toEqual([
			'agents.builder.memory.entries.filter.all',
			'Slack',
			'agents.builder.memory.entries.filter.users',
		]);
		expect(items[1].children?.map(({ label }) => label)).toEqual([
			'agents.builder.memory.entries.filter.allFrom Slack',
			'agents.builder.memory.entries.filter.channels',
			'#finance-ops',
			'agents.builder.memory.entries.filter.users',
			'Sin',
		]);
		// One section, so no header: all users, then each user.
		expect(items[2].children?.map(({ label }) => label)).toEqual([
			'agents.builder.memory.entries.filter.allUsers',
			'agents.builder.memory.entries.source.you',
		]);
	});

	it('selects a channel, a whole integration, or all sources', async () => {
		const wrapper = mountFilter();
		const { items, select } = findMenu(wrapper);
		const [all, slack] = items;

		select(slack.children?.[2].id);
		select(slack.children?.[0].id);
		select(all.id);

		expect(wrapper.emitted('update:modelValue')).toEqual([
			[{ source: 'slack', sourceFacet: 'channel', sourceFacetId: 'C1' }],
			[{ source: 'slack' }],
			[{}],
		]);
	});

	it('names the selected source in the trigger', () => {
		const wrapper = mountFilter({ source: 'slack', sourceFacet: 'user', sourceFacetId: 'U1' });

		expect(wrapper.find('[data-testid="agent-memory-source-filter"]').text()).toContain(
			'agents.builder.memory.entries.filter.trigger Sin',
		);
	});

	it('filters a searchable sub-menu by the search term', async () => {
		const wrapper = mountFilter({}, manyGroups);
		findMenu(wrapper).search('fin', 'slack-group');
		await nextTick();

		const [, slack, users] = findMenu(wrapper).items;
		expect(slack.searchable).toBe(true);
		expect(slack.children?.map(({ label }) => label)).toEqual([
			'agents.builder.memory.entries.filter.channels',
			'#finance-ops',
			'agents.builder.memory.entries.filter.users',
			'Finley',
		]);
		// The search of one sub-menu does not filter the others.
		expect(users.children).toHaveLength(2);
	});

	it('drops the header of a section with no match', async () => {
		const wrapper = mountFilter({}, manyGroups);
		findMenu(wrapper).search('SALES', 'slack-group');
		await nextTick();

		const [, slack] = findMenu(wrapper).items;
		expect(slack.children?.map(({ label }) => label)).toEqual([
			'agents.builder.memory.entries.filter.channels',
			'#sales',
		]);
	});

	it('shows all the sources again when the search is cleared', async () => {
		const wrapper = mountFilter({}, manyGroups);
		findMenu(wrapper).search('fin', 'slack-group');
		await nextTick();
		findMenu(wrapper).search('', 'slack-group');
		await nextTick();

		const [, slack] = findMenu(wrapper).items;
		// All Slack, two headers, eight channels and two users.
		expect(slack.children).toHaveLength(13);
	});
});
