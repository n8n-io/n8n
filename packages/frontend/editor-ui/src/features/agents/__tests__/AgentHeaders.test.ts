/* eslint-disable import-x/no-extraneous-dependencies -- test-only patterns */
import { describe, expect, it, vi } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';

import AgentBuilderPreviewHeader from '../components/AgentBuilderPreviewHeader.vue';
import AgentSessionTimelineHeader from '../components/AgentSessionTimelineHeader.vue';

const routerPush = vi.fn();

vi.mock('@n8n/i18n', () => ({
	useI18n: () => ({ baseText: (key: string) => key }),
}));

vi.mock('vue-router', () => ({
	useRouter: () => ({ push: routerPush }),
}));

vi.mock('@n8n/design-system', () => ({
	N8nIcon: { template: '<i v-bind="$attrs" :data-icon="icon"></i>', props: ['icon', 'size'] },
	N8nButton: {
		name: 'N8nButton',
		template:
			'<button v-bind="$attrs" :data-variant="variant" :data-size="size" :data-icon-only="iconOnly" :disabled="disabled" @click="$emit(\'click\')"><slot /></button>',
		props: ['variant', 'size', 'icon', 'iconOnly', 'disabled'],
		emits: ['click'],
	},
	N8nIconButton: {
		name: 'N8nIconButton',
		template:
			'<button v-bind="$attrs" :data-variant="variant" :data-size="size" data-icon-only="true" @click="$emit(\'click\')"><i :data-icon="icon"></i></button>',
		props: ['variant', 'size', 'icon'],
		emits: ['click'],
	},
	N8nTooltip: {
		name: 'N8nTooltip',
		template: '<div><slot /><slot name="content" /></div>',
	},
	N8nKeyboardShortcut: {
		name: 'N8nKeyboardShortcut',
		template: '<span />',
	},
	N8nBreadcrumbs: {
		name: 'N8nBreadcrumbs',
		template: '<div data-testid="stub-breadcrumbs"><slot name="append" /></div>',
		props: ['items'],
		emits: ['itemSelected'],
	},
	N8nDropdownMenu: {
		name: 'N8nDropdownMenu',
		template:
			'<div v-bind="$attrs"><slot name="trigger" /><slot name="item-label" :item="items[0]" /><slot name="item-trailing" :item="items[0]" /></div>',
		props: ['items', 'maxHeight', 'extraPopperClass'],
		emits: ['select'],
	},
}));

type DropdownStubWrapper = VueWrapper<{
	items: Array<{ id: string; label?: string; data?: { date: string; active: boolean } }>;
	$emit: (event: 'select', value: string) => void;
}>;

type BreadcrumbsStubWrapper = VueWrapper<{
	items: Array<{ id: string; label: string; href?: string }>;
	$emit: (event: 'itemSelected', value: { id: string }) => void;
}>;

const breadcrumbItems = [
	{ id: 'project-1', label: 'My project', href: '/projects/project-1' },
	{ id: 'agent-1', label: 'Darwin', href: '/projects/project-1/agents/agent-1' },
];

const sessionOptions = [{ id: 'thread-1', label: 'Support session' }];

describe('AgentBuilderPreviewHeader', () => {
	function mountHeader() {
		return mount(AgentBuilderPreviewHeader, {
			props: {
				breadcrumbItems,
				sessionTitle: 'Support session',
				sessionId: 'thread-1',
				hasSession: true,
				sessionOptions,
			},
		});
	}

	it('renders static agent breadcrumbs and no agent switcher dropdown', () => {
		const wrapper = mountHeader();
		const breadcrumbs = wrapper.findComponent({ name: 'N8nBreadcrumbs' }) as BreadcrumbsStubWrapper;

		expect(breadcrumbs.vm.items.map((item) => item.id)).toEqual(['project-1', 'agent-1']);
		expect(wrapper.find('[data-testid="agent-header-switcher"]').exists()).toBe(false);
		expect(wrapper.find('[data-testid="agent-preview-session-picker"]').exists()).toBe(true);
		expect(wrapper.text()).toContain('Support session');
	});

	it('emits preview header actions', async () => {
		const wrapper = mountHeader();
		const breadcrumbs = wrapper.findComponent({ name: 'N8nBreadcrumbs' }) as BreadcrumbsStubWrapper;
		const sessionPicker = wrapper.findComponent(
			'[data-testid="agent-preview-session-picker"]',
		) as DropdownStubWrapper;

		breadcrumbs.vm.$emit('itemSelected', { id: 'agent-1' });
		sessionPicker.vm.$emit('select', 'thread-1');
		await wrapper.find('[data-testid="agent-preview-new-chat-btn"]').trigger('click');
		await wrapper.find('[data-testid="agent-preview-close-btn"]').trigger('click');

		expect(wrapper.emitted('breadcrumb-select')).toEqual([[{ id: 'agent-1' }]]);
		expect(wrapper.emitted('session-select')).toEqual([['thread-1']]);
		expect(wrapper.emitted('new-chat')).toEqual([[]]);
		expect(wrapper.emitted('close-preview')).toEqual([[]]);
	});

	it('routes to the current session', async () => {
		routerPush.mockReset();
		const wrapper = mountHeader();

		await wrapper.find('[data-testid="agent-preview-view-session-btn"]').trigger('click');

		expect(routerPush).toHaveBeenCalledWith({
			name: 'AgentSessionDetailView',
			params: { projectId: 'project-1', agentId: 'agent-1', threadId: 'thread-1' },
		});
	});

	it('hides the view session button when the current chat has no persisted session', () => {
		const wrapper = mount(AgentBuilderPreviewHeader, {
			props: {
				breadcrumbItems,
				sessionTitle: 'New chat',
				sessionId: 'empty-thread-id',
				hasSession: false,
				sessionOptions,
			},
		});

		expect(wrapper.find('[data-testid="agent-preview-view-session-btn"]').exists()).toBe(false);
	});

	it('uses the preview close button style', () => {
		const wrapper = mountHeader();
		const closeButton = wrapper.find('[data-testid="agent-preview-close-btn"]');

		expect(closeButton.attributes('data-variant')).toBe('ghost');
		expect(closeButton.attributes('data-size')).toBe('medium');
		expect(closeButton.attributes('data-icon-only')).toBeDefined();
		expect(closeButton.find('[data-icon="x"]').exists()).toBe(true);
	});
});

describe('AgentSessionTimelineHeader', () => {
	function mountHeader(overrides: Partial<{ showMetrics: boolean }> = {}) {
		return mount(AgentSessionTimelineHeader, {
			props: {
				breadcrumbItems,
				sessionTitle: 'Support session',
				sessionOptions: [
					{
						id: 'thread-1',
						label: 'Support session',
						data: { date: 'Jan 1 10:00', active: true },
					},
				],
				showMetrics: overrides.showMetrics ?? true,
				triggerSource: 'slack',
				triggerIcon: 'slack',
				triggerLabel: 'Slack',
				totalTokens: 1234,
				totalCost: 0.1234,
				durationLabel: '1.2s',
			},
		});
	}

	it('renders breadcrumbs, session picker, session metadata, and metrics', () => {
		const wrapper = mountHeader();
		const breadcrumbs = wrapper.findComponent({ name: 'N8nBreadcrumbs' }) as BreadcrumbsStubWrapper;

		expect(breadcrumbs.vm.items.map((item) => item.id)).toEqual(['project-1', 'agent-1']);
		expect(wrapper.find('[data-testid="session-header-switcher"]').exists()).toBe(true);
		expect(wrapper.text()).toContain('Support session');
		expect(wrapper.text()).toContain('Jan 1 10:00');
		expect(wrapper.text()).toContain('Slack');
		expect(wrapper.text()).toContain('1,234t ($0.1234)');
		expect(wrapper.text()).toContain('1.2s');
	});

	it('hides metrics and close button while metrics are unavailable', () => {
		const wrapper = mountHeader({ showMetrics: false });

		expect(wrapper.text()).not.toContain('Slack');
		expect(wrapper.find('[data-testid="agent-session-timeline-close"]').exists()).toBe(false);
	});

	it('emits timeline header actions', async () => {
		const wrapper = mountHeader();
		const breadcrumbs = wrapper.findComponent({ name: 'N8nBreadcrumbs' }) as BreadcrumbsStubWrapper;
		const sessionPicker = wrapper.findComponent(
			'[data-testid="session-header-switcher"]',
		) as DropdownStubWrapper;

		breadcrumbs.vm.$emit('itemSelected', { id: 'project-1' });
		sessionPicker.vm.$emit('select', 'thread-1');
		await wrapper.find('[data-testid="agent-session-timeline-close"]').trigger('click');

		expect(wrapper.emitted('breadcrumb-select')).toEqual([[{ id: 'project-1' }]]);
		expect(wrapper.emitted('session-select')).toEqual([['thread-1']]);
		expect(wrapper.emitted('close')).toEqual([[]]);
	});

	it('uses the same close button style as the preview header', () => {
		const wrapper = mountHeader();
		const closeButton = wrapper.find('[data-testid="agent-session-timeline-close"]');

		expect(closeButton.attributes('data-variant')).toBe('ghost');
		expect(closeButton.attributes('data-size')).toBe('medium');
		expect(closeButton.attributes('data-icon-only')).toBeDefined();
		expect(closeButton.find('[data-icon="x"]').exists()).toBe(true);
	});
});
