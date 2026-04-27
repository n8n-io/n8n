/* eslint-disable import-x/no-extraneous-dependencies, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access -- test-only patterns */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { ref } from 'vue';

import type { AgentResource } from '../types';

const ensureLoadedMock = vi.fn();
const agentsListRef = ref<AgentResource[] | null>(null);

vi.mock('../composables/useProjectAgentsList', () => ({
	useProjectAgentsList: () => ({
		list: agentsListRef,
		ensureLoaded: ensureLoadedMock,
		refresh: vi.fn(),
	}),
}));

vi.mock('@n8n/i18n', () => ({
	useI18n: () => ({ baseText: (k: string) => k }),
	i18n: { baseText: (k: string) => k },
}));

vi.mock('vue-router', () => ({
	useRouter: () => ({ push: vi.fn() }),
	RouterLink: { template: '<a><slot/></a>' },
}));

import AgentBuilderHeader from '../components/AgentBuilderHeader.vue';

const baseAgent = {
	id: 'a1',
	name: 'Darwin',
	icon: { type: 'icon', value: 'robot' },
} as unknown as AgentResource;

const globalStubs = {
	N8nIcon: { template: '<i v-bind="$attrs"></i>', props: ['icon', 'size'] },
	N8nBreadcrumbs: {
		name: 'N8nBreadcrumbs',
		template: '<div data-testid="stub-breadcrumbs"><slot name="append" /></div>',
		props: ['items'],
	},
	N8nNavigationDropdown: {
		name: 'N8nNavigationDropdown',
		template: '<div data-testid="stub-nav-dropdown"><slot /></div>',
		props: ['menu'],
		emits: ['select'],
	},
	// N8nActionDropdown has no defineOptions name; Vue infers it as 'ActionDropdown' from filename
	ActionDropdown: {
		name: 'ActionDropdown',
		template: '<div data-testid="stub-action-dropdown" />',
		props: ['items', 'activatorIcon'],
		emits: ['select'],
	},
	AgentPublishButton: {
		name: 'AgentPublishButton',
		template: '<div data-testid="stub-publish" />',
		props: ['agent', 'projectId', 'agentId', 'isSaving'],
		emits: ['published', 'unpublished'],
	},
};

function mountHeader(
	overrides: Partial<{
		chatColumnCollapsed: boolean;
		agent: AgentResource | null;
		projectName: string | null;
		headerActions: unknown[];
	}> = {},
) {
	return mount(AgentBuilderHeader, {
		props: {
			agent: overrides.agent ?? baseAgent,
			projectId: 'p1',
			agentId: 'a1',
			projectName: 'projectName' in overrides ? (overrides.projectName ?? null) : 'My project',
			headerActions: (overrides.headerActions ?? []) as Array<{ id: string; label: string }>,
			chatColumnCollapsed: overrides.chatColumnCollapsed ?? false,
		},
		global: { stubs: globalStubs },
	});
}

describe('AgentBuilderHeader', () => {
	beforeEach(() => {
		ensureLoadedMock.mockReset();
		agentsListRef.value = null;
	});

	it('renders the back button, toggle, breadcrumbs, publish and action dropdown', () => {
		const wrapper = mountHeader();
		expect(wrapper.find('[data-testid="agent-header-back"]').exists()).toBe(true);
		expect(wrapper.find('[data-testid="agent-header-toggle-chat"]').exists()).toBe(true);
		expect(wrapper.find('[data-testid="stub-breadcrumbs"]').exists()).toBe(true);
		expect(wrapper.find('[data-testid="stub-publish"]').exists()).toBe(true);
		expect(wrapper.find('[data-testid="agent-header-actions"]').exists()).toBe(true);
	});

	it('emits back when the back button is clicked', async () => {
		const wrapper = mountHeader();
		await wrapper.find('[data-testid="agent-header-back"]').trigger('click');
		expect(wrapper.emitted('back')).toBeTruthy();
	});

	it('emits toggle-chat-column when the toggle is clicked', async () => {
		const wrapper = mountHeader();
		await wrapper.find('[data-testid="agent-header-toggle-chat"]').trigger('click');
		expect(wrapper.emitted('toggle-chat-column')).toBeTruthy();
	});

	it('passes a single project breadcrumb (agent rendered as switcher button)', () => {
		const wrapper = mountHeader();
		const bc = wrapper.findComponent({ name: 'N8nBreadcrumbs' });
		const items = bc.props('items') as Array<{ id: string }>;
		expect(items.map((i) => i.id)).toEqual(['p1']);
		// Agent name should surface in the switcher button, not the breadcrumb.
		expect(wrapper.text()).toContain('Darwin');
	});

	it('falls back to the project fallback label when projectName is null', () => {
		const wrapper = mountHeader({ projectName: null });
		const bc = wrapper.findComponent({ name: 'N8nBreadcrumbs' });
		const items = bc.props('items') as Array<{ id: string; label: string }>;
		expect(items[0].label).toBe('agents.builder.header.projectFallback');
	});

	it('loads the project agents list on mount', async () => {
		ensureLoadedMock.mockResolvedValue([baseAgent]);
		mountHeader();
		await flushPromises();
		expect(ensureLoadedMock).toHaveBeenCalledTimes(1);
	});

	it('builds switcher menu from other agents and excludes the current one', async () => {
		agentsListRef.value = [
			baseAgent,
			{
				id: 'a2',
				name: 'Other',
				icon: { type: 'icon', value: 'robot' },
			} as unknown as AgentResource,
		];
		ensureLoadedMock.mockResolvedValue(agentsListRef.value);
		const wrapper = mountHeader();
		await flushPromises();
		const nav = wrapper.findComponent({ name: 'N8nNavigationDropdown' });
		const menu = nav.props('menu') as Array<{ id: string; disabled?: boolean }>;
		expect(menu.map((m) => m.id)).toEqual(['a2']);
	});

	it('shows a disabled "No other agents" entry when the project has only this agent', async () => {
		agentsListRef.value = [baseAgent];
		ensureLoadedMock.mockResolvedValue(agentsListRef.value);
		const wrapper = mountHeader();
		await flushPromises();
		const nav = wrapper.findComponent({ name: 'N8nNavigationDropdown' });
		const menu = nav.props('menu') as Array<{ id: string; title: string; disabled?: boolean }>;
		expect(menu).toHaveLength(1);
		expect(menu[0].disabled).toBe(true);
		expect(menu[0].title).toBe('agents.builder.header.switcher.empty');
	});

	it('forwards published/unpublished up', async () => {
		const wrapper = mountHeader();
		const publish = wrapper.findComponent({ name: 'AgentPublishButton' });
		publish.vm.$emit('published', { ...baseAgent, name: 'Darwin v2' });
		publish.vm.$emit('unpublished', baseAgent);
		expect(wrapper.emitted('published')).toBeTruthy();
		expect(wrapper.emitted('unpublished')).toBeTruthy();
	});

	it('forwards header-action from the action dropdown', async () => {
		const wrapper = mountHeader({ headerActions: [{ id: 'delete', label: 'Delete' }] });
		const action = wrapper.findComponent({ name: 'ActionDropdown' });
		action.vm.$emit('select', 'delete');
		expect(wrapper.emitted('header-action')).toEqual([['delete']]);
	});

	it('emits switch-agent when a switcher item is selected', async () => {
		agentsListRef.value = [baseAgent, { id: 'a2', name: 'Other' } as unknown as AgentResource];
		ensureLoadedMock.mockResolvedValue(agentsListRef.value);
		const wrapper = mountHeader();
		await flushPromises();
		const nav = wrapper.findComponent({ name: 'N8nNavigationDropdown' });
		nav.vm.$emit('select', 'a2');
		expect(wrapper.emitted('switch-agent')).toEqual([['a2']]);
	});
});
