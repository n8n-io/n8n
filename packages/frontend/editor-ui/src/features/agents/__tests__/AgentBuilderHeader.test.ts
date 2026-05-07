/* eslint-disable import-x/no-extraneous-dependencies, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access -- test-only patterns */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises, type VueWrapper } from '@vue/test-utils';
import { ref } from 'vue';

import type { AgentResource } from '../types';

const ensureLoadedMock = vi.fn();
const agentsListRef = ref<AgentResource[] | null>(null);
const routerPush = vi.fn();
const routerResolve = vi.fn((to: { params?: { projectId?: string } }) => ({
	href: `/projects/${to.params?.projectId ?? ''}/workflows`,
}));

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
	useRouter: () => ({ push: routerPush, resolve: routerResolve }),
	RouterLink: { template: '<a><slot/></a>' },
}));

vi.mock('@n8n/design-system', () => ({
	N8nIcon: { template: '<i v-bind="$attrs"></i>', props: ['icon', 'size'] },
	N8nButton: { template: '<button><slot /></button>', props: ['variant', 'size'] },
	N8nBreadcrumbs: {
		name: 'N8nBreadcrumbs',
		template: '<div data-testid="stub-breadcrumbs"><slot name="append" /></div>',
		props: ['items'],
		emits: ['itemSelected'],
	},
	N8nDropdownMenu: {
		name: 'N8nDropdownMenu',
		template: '<div data-testid="agent-header-switcher"><slot name="trigger" /></div>',
		props: ['items'],
		emits: ['select'],
	},
	'n8n-dropdown-menu': {
		name: 'N8nDropdownMenu',
		template: '<div data-testid="agent-header-switcher"><slot name="trigger" /></div>',
		props: ['items'],
		emits: ['select'],
	},
	N8nActionDropdown: {
		name: 'ActionDropdown',
		template: '<div data-testid="stub-action-dropdown" />',
		props: ['items', 'activatorIcon'],
		emits: ['select'],
	},
}));

import AgentBuilderHeader from '../components/AgentBuilderHeader.vue';

type DropdownStubWrapper = VueWrapper<{
	items: Array<{ id: string; label?: string; disabled?: boolean }>;
	$options: unknown;
	$emit: (event: 'select', value: string) => void;
}>;

function getSwitcherOptions(wrapper: ReturnType<typeof mountHeader>) {
	const switcher = wrapper.findComponent(
		'[data-testid="agent-header-switcher"]',
	) as DropdownStubWrapper;
	return switcher.vm.items;
}

const baseAgent = {
	id: 'a1',
	name: 'Darwin',
	icon: { type: 'icon', value: 'robot' },
} as unknown as AgentResource;

const globalStubs = {
	AgentPublishButton: {
		name: 'AgentPublishButton',
		template: '<div data-testid="stub-publish" />',
		props: ['agent', 'projectId', 'agentId', 'isSaving', 'beforeRevertToPublished'],
		emits: ['published', 'unpublished', 'reverted'],
	},
};

function mountHeader(
	overrides: Partial<{
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
		},
		global: { stubs: globalStubs },
	});
}

describe('AgentBuilderHeader', () => {
	beforeEach(() => {
		ensureLoadedMock.mockReset();
		routerPush.mockReset();
		routerResolve.mockClear();
		agentsListRef.value = null;
	});

	it('renders breadcrumbs, publish and action dropdown', () => {
		const wrapper = mountHeader();
		expect(wrapper.find('[data-testid="stub-breadcrumbs"]').exists()).toBe(true);
		expect(wrapper.find('[data-testid="stub-publish"]').exists()).toBe(true);
		expect(wrapper.find('[data-testid="agent-header-actions"]').exists()).toBe(true);
	});

	it('uses the horizontal dots action menu icon', () => {
		const wrapper = mountHeader();
		const action = wrapper.findComponent({ name: 'ActionDropdown' });
		expect(action.props('activatorIcon')).toBe('ellipsis');
	});

	it('passes a single project breadcrumb (agent rendered as switcher button)', () => {
		const wrapper = mountHeader();
		const bc = wrapper.findComponent({ name: 'N8nBreadcrumbs' });
		const items = bc.props('items') as Array<{ id: string }>;
		expect(items.map((i) => i.id)).toEqual(['p1']);
		// Agent name should surface in the switcher button, not the breadcrumb.
		expect(wrapper.text()).toContain('Darwin');
	});

	it('links the project breadcrumb to the project workflows page', () => {
		const wrapper = mountHeader();
		const bc = wrapper.findComponent({ name: 'N8nBreadcrumbs' });
		const items = bc.props('items') as Array<{ href: string }>;
		expect(items[0].href).toBe('/projects/p1/workflows');

		bc.vm.$emit('itemSelected', { id: 'p1' });

		expect(routerPush).toHaveBeenCalledWith({
			name: 'ProjectsWorkflows',
			params: { projectId: 'p1' },
		});
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
		const options = getSwitcherOptions(wrapper);
		expect(options.map((option) => option.id)).toEqual(['a2']);
	});

	it('shows a disabled "No other agents" entry when the project has only this agent', async () => {
		agentsListRef.value = [baseAgent];
		ensureLoadedMock.mockResolvedValue(agentsListRef.value);
		const wrapper = mountHeader();
		await flushPromises();
		const options = getSwitcherOptions(wrapper);
		expect(options).toHaveLength(1);
		expect(options[0].disabled).toBe(true);
		expect(options[0].label).toBe('agents.builder.header.switcher.empty');
	});

	it('forwards publish events up', async () => {
		const wrapper = mountHeader();
		const publish = wrapper.findComponent({ name: 'AgentPublishButton' });
		publish.vm.$emit('published', { ...baseAgent, name: 'Darwin v2' });
		publish.vm.$emit('unpublished', baseAgent);
		publish.vm.$emit('reverted', baseAgent);
		expect(wrapper.emitted('published')).toBeTruthy();
		expect(wrapper.emitted('unpublished')).toBeTruthy();
		expect(wrapper.emitted('reverted')).toBeTruthy();
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
		const nav = wrapper.findComponent(
			'[data-testid="agent-header-switcher"]',
		) as DropdownStubWrapper;
		nav.vm.$emit('select', 'a2');
		expect(wrapper.emitted('switch-agent')).toEqual([['a2']]);
	});
});
