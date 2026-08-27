/* eslint-disable import-x/no-extraneous-dependencies, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access -- test-only patterns */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises, type VueWrapper } from '@vue/test-utils';
import { ref } from 'vue';

import type { AgentResource } from '../types';
import { instanceAiCreateAgentRoute } from '@/features/ai/instanceAi/createAgentRoute';

const ensureLoadedMock = vi.fn();
const agentsListRef = ref<AgentResource[] | null>(null);
const routerPush = vi.fn();
const routerResolve = vi.fn(
	(to: { name?: string; params?: { projectId?: string; agentId?: string } }) => ({
		href:
			to.name === 'AgentPreviewView'
				? `/projects/${to.params?.projectId ?? ''}/agents/${to.params?.agentId ?? ''}/preview`
				: `/projects/${to.params?.projectId ?? ''}/agents`,
	}),
);

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
	N8nButton: {
		template:
			'<component :is="href ? \'a\' : \'button\'" v-bind="$attrs" :href="href" :data-variant="variant" :data-icon="icon" :disabled="!href && disabled" :aria-disabled="disabled || undefined" @click="$emit(\'click\', $event)"><slot /></component>',
		props: ['variant', 'size', 'icon', 'iconOnly', 'disabled', 'href'],
		emits: ['click'],
	},
	N8nToggle: {
		name: 'N8nToggle',
		template:
			'<button v-bind="$attrs" :data-variant="variant" :data-icon="icon" :disabled="disabled" :aria-label="label" :aria-pressed="modelValue" @click="$emit(\'click\', $event)" />',
		props: ['modelValue', 'variant', 'size', 'icon', 'label', 'disabled'],
		emits: ['click'],
	},
	N8nDropdownMenuItem: {
		name: 'N8nDropdownMenuItem',
		template: '<button :data-testid="testId" @click="$emit(\'select\', id)">{{ label }}</button>',
		props: ['id', 'label', 'icon', 'testId'],
		emits: ['select'],
	},
	N8nTooltip: {
		name: 'N8nTooltip',
		template:
			'<span data-testid="stub-tooltip" :data-disabled="disabled" :data-content="content"><slot /></span>',
		props: ['disabled', 'content'],
	},
	N8nBreadcrumbs: {
		name: 'N8nBreadcrumbs',
		template: '<div data-testid="stub-breadcrumbs"><slot name="append" /></div>',
		props: ['items'],
		emits: ['itemSelected'],
	},
	N8nDropdownMenu: {
		name: 'N8nDropdownMenu',
		template: '<div v-bind="$attrs"><slot name="trigger" /><slot name="footer" /></div>',
		props: ['items', 'placement', 'extraPopperClass'],
		emits: ['select'],
	},
	'n8n-dropdown-menu': {
		name: 'N8nDropdownMenu',
		template: '<div v-bind="$attrs"><slot name="trigger" /><slot name="footer" /></div>',
		props: ['items', 'placement', 'extraPopperClass'],
		emits: ['select'],
	},
	N8nActionDropdown: {
		name: 'ActionDropdown',
		template: '<div v-bind="$attrs" />',
		props: ['items', 'activatorIcon', 'extraPopperClass'],
		emits: ['select'],
	},
}));

import AgentBuilderHeader from '../components/AgentBuilderHeader.vue';

type DropdownStubWrapper = VueWrapper<{
	items: Array<{ id: string; label?: string; disabled?: boolean }>;
	extraPopperClass?: string;
	$options: unknown;
	$emit: (event: 'select', value: string) => void;
}>;

function getDropdown(wrapper: ReturnType<typeof mountHeader>, testId: string) {
	return wrapper.getComponent(`[data-testid="${testId}"]`) as DropdownStubWrapper;
}

function getSwitcherOptions(wrapper: ReturnType<typeof mountHeader>) {
	return getDropdown(wrapper, 'agent-header-switcher').vm.items;
}

const baseAgent = {
	id: 'a1',
	name: 'Darwin',
	icon: { type: 'icon', value: 'robot' },
	isRunnable: true,
} as unknown as AgentResource;

const globalStubs = {
	AgentPublishButton: {
		name: 'AgentPublishButton',
		template: '<div data-testid="stub-publish" />',
		props: [
			'agent',
			'projectId',
			'agentId',
			'isSaving',
			'beforeRevertToPublished',
			'configValidationStatus',
			'beforePublish',
		],
		emits: ['published', 'unpublished', 'reverted'],
	},
};

function mountHeader(
	overrides: Partial<{
		agent: AgentResource | null;
		projectName: string | null;
		headerActions: unknown[];
		mode: 'edit' | 'preview';
		artifactMode: boolean;
		isPreviewOpen: boolean;
		currentSessionTitle: string;
		sessionOptions: Array<{ id: string; label: string }>;
		configValidationStatus: 'valid' | 'invalid' | null;
		beforePublish: () => Promise<boolean>;
	}> = {},
) {
	return mount(AgentBuilderHeader, {
		props: {
			agent: overrides.agent ?? baseAgent,
			projectId: 'p1',
			agentId: 'a1',
			projectName: 'projectName' in overrides ? (overrides.projectName ?? null) : 'My project',
			headerActions: (overrides.headerActions ?? []) as Array<{ id: string; label: string }>,
			mode: overrides.mode,
			artifactMode: overrides.artifactMode,
			isPreviewOpen: overrides.isPreviewOpen,
			currentSessionTitle: overrides.currentSessionTitle,
			sessionOptions: overrides.sessionOptions,
			configValidationStatus: overrides.configValidationStatus,
			beforePublish: overrides.beforePublish,
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
		const wrapper = mountHeader({ headerActions: [{ id: 'delete', label: 'Delete' }] });
		expect(wrapper.find('[data-testid="stub-breadcrumbs"]').exists()).toBe(true);
		expect(wrapper.find('[data-testid="agent-header-preview-btn"]').exists()).toBe(true);
		expect(wrapper.find('[data-testid="stub-publish"]').exists()).toBe(true);
		expect(wrapper.find('[data-testid="agent-header-actions"]').exists()).toBe(true);
	});

	it('hides breadcrumbs and switcher in artifact mode', () => {
		const wrapper = mountHeader({ artifactMode: true });

		expect(wrapper.find('[data-testid="stub-breadcrumbs"]').exists()).toBe(false);
		expect(wrapper.find('[data-testid="agent-header-switcher"]').exists()).toBe(false);
	});

	it('hides header management actions in artifact mode', () => {
		const wrapper = mountHeader({
			artifactMode: true,
			agent: { ...baseAgent, hasPublishHistory: true } as AgentResource,
			headerActions: [{ id: 'delete', label: 'Delete' }],
		});

		expect(wrapper.find('[data-testid="agent-header-version-history-btn"]').exists()).toBe(false);
		expect(wrapper.find('[data-testid="agent-header-actions"]').exists()).toBe(false);
	});

	it('uses the horizontal dots action menu icon', () => {
		const wrapper = mountHeader({ headerActions: [{ id: 'delete', label: 'Delete' }] });
		const action = wrapper.get('[data-testid="agent-header-actions"]');
		expect(action.get('button').attributes('data-icon')).toBe('ellipsis');
	});

	it('widens the header action menu so labels are readable from the icon trigger', () => {
		const wrapper = mountHeader({ headerActions: [{ id: 'delete', label: 'Delete agent' }] });
		const action = getDropdown(wrapper, 'agent-header-actions');
		expect(action.vm.extraPopperClass).toBeTruthy();
	});

	it('hides the action dropdown when no header actions are available', () => {
		const wrapper = mountHeader({ headerActions: [] });
		expect(wrapper.find('[data-testid="agent-header-actions"]').exists()).toBe(false);
	});

	it('passes a single project breadcrumb (agent rendered as switcher button)', () => {
		const wrapper = mountHeader();
		const bc = wrapper.findComponent({ name: 'N8nBreadcrumbs' });
		const items = bc.props('items') as Array<{ id: string }>;
		expect(items.map((i) => i.id)).toEqual(['p1']);
		// Agent name should surface in the switcher button, not the breadcrumb.
		expect(wrapper.text()).toContain('Darwin');
	});

	it('links the project breadcrumb to the project agents page', () => {
		const wrapper = mountHeader();
		const bc = wrapper.findComponent({ name: 'N8nBreadcrumbs' });
		const items = bc.props('items') as Array<{ href: string }>;
		expect(items[0].href).toBe('/projects/p1/agents');

		bc.vm.$emit('itemSelected', { id: 'p1' });

		expect(routerPush).toHaveBeenCalledWith({
			name: 'ProjectAgents',
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

	it('forwards header-action from the action menu', () => {
		const wrapper = mountHeader({ headerActions: [{ id: 'delete', label: 'Delete' }] });
		const action = getDropdown(wrapper, 'agent-header-actions');
		action.vm.$emit('select', 'delete');
		expect(wrapper.emitted('header-action')).toEqual([['delete']]);
	});

	it.each([
		{
			label: 'opens',
			isPreviewOpen: false,
			event: 'open-preview',
			accessibleLabel: 'agents.builder.preview.button',
		},
		{
			label: 'closes',
			isPreviewOpen: true,
			event: 'close-preview',
			accessibleLabel: 'agents.builder.preview.button',
		},
	])(
		'$label Preview from the preview action',
		async ({ isPreviewOpen, event, accessibleLabel }) => {
			const wrapper = mountHeader({ isPreviewOpen });
			const previewButton = wrapper.find('[data-testid="agent-header-preview-btn"]');
			expect(previewButton.attributes('data-icon')).toBe('message-circle');
			expect(previewButton.attributes('aria-label')).toBe(accessibleLabel);
			expect(previewButton.attributes('aria-pressed')).toBe(String(isPreviewOpen));

			await previewButton.trigger('click');
			expect(wrapper.emitted(event)).toEqual([[]]);
			expect(wrapper.emitted(isPreviewOpen ? 'open-preview' : 'close-preview')).toBeUndefined();
		},
	);

	it('disables preview with a tooltip when the agent is not runnable', async () => {
		const wrapper = mountHeader({
			agent: { ...baseAgent, isRunnable: false } as AgentResource,
		});
		const previewButton = wrapper.find('[data-testid="agent-header-preview-btn"]');

		expect(previewButton.attributes('disabled')).toBeDefined();
		expect(wrapper.find('[data-testid="stub-tooltip"]').attributes('data-disabled')).toBe('false');
		expect(wrapper.find('[data-testid="stub-tooltip"]').attributes('data-content')).toBe(
			'agents.builder.preview.disabledTooltip',
		);

		await previewButton.trigger('click');

		expect(wrapper.emitted('open-preview')).toBeUndefined();
	});

	it('keeps the close action enabled when the open preview agent is not runnable', async () => {
		const wrapper = mountHeader({
			isPreviewOpen: true,
			agent: { ...baseAgent, isRunnable: false } as AgentResource,
		});
		const previewButton = wrapper.find('[data-testid="agent-header-preview-btn"]');

		expect(previewButton.attributes('disabled')).toBeUndefined();

		await previewButton.trigger('click');

		expect(wrapper.emitted('close-preview')).toEqual([[]]);
		expect(wrapper.emitted('open-preview')).toBeUndefined();
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

	it('navigates to Instance AI for agent creation from the switcher footer', async () => {
		const wrapper = mountHeader();

		await wrapper.find('[data-testid="agent-header-new-agent"]').trigger('click');

		expect(routerPush).toHaveBeenCalledWith(instanceAiCreateAgentRoute('p1'));
	});
});
