import { describe, it, expect, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { ref, type Component } from 'vue';
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

function mountFilter(modelValue = {}) {
	return mount(AgentMemorySourceFilter, {
		props: { groups, modelValue, 'onUpdate:modelValue': vi.fn() },
	});
}

/** N8nDropdownMenu is generic, so `findComponent` cannot infer its props on its own. */
function findMenu(wrapper: ReturnType<typeof mountFilter>) {
	const menu = wrapper.findComponent(N8nDropdownMenu as Component);
	const { items } = menu.props() as { items: Array<DropdownMenuItemProps<string>> };
	return {
		items,
		select: (id: string | undefined) => menu.vm.$emit('select', id),
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
});
