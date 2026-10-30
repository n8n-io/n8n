/* eslint-disable import-x/no-extraneous-dependencies -- test-only patterns */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TELEMETRY_EVENT } from '@n8n/telemetry';
import { enableAutoUnmount, mount, type VueWrapper } from '@vue/test-utils';

import AgentSessionTimelineHeader from '../components/AgentSessionTimelineHeader.vue';
import type { SessionTimelineMetadata } from '../types';

import AgentTestHeader from '../components/AgentTestHeader.vue';

const track = vi.fn();
vi.mock('@n8n/composables/useTelemetry', () => ({
	useTelemetry: () => ({ track }),
}));
vi.mock('@n8n/stores/useRootStore', () => ({
	useRootStore: () => ({ pushRef: 'session-xyz' }),
}));

beforeEach(() => vi.clearAllMocks());

vi.mock('@n8n/i18n', () => ({
	useI18n: () => ({ baseText: (key: string) => key }),
}));

vi.mock('@n8n/design-system', () => ({
	N8nText: { template: '<span><slot /></span>' },
	N8nIcon: { template: '<i v-bind="$attrs" :data-icon="icon"></i>', props: ['icon', 'size'] },
	N8nButton: {
		name: 'N8nButton',
		template:
			'<button v-bind="$attrs" :data-variant="variant" :data-size="size" :data-icon-only="iconOnly" :disabled="disabled" @click="$emit(\'click\')"><i v-if="icon" :data-icon="icon"></i><slot /></button>',
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
	N8nToggle: {
		name: 'N8nToggle',
		template: '<button v-bind="$attrs" @click="$emit(\'click\')">{{ label }}</button>',
		props: ['modelValue', 'variant', 'size', 'icon', 'label'],
		emits: ['click'],
	},
	N8nKeyboardShortcut: {
		name: 'N8nKeyboardShortcut',
		template: '<span />',
	},
	N8nBreadcrumbs: {
		name: 'N8nBreadcrumbs',
		template:
			'<div data-testid="stub-breadcrumbs"><slot name="prepend" /><slot name="append" /></div>',
		props: ['items'],
		emits: ['itemSelected'],
	},
	N8nDropdownMenu: {
		name: 'N8nDropdownMenu',
		template:
			'<div v-bind="$attrs"><slot name="trigger" /><slot v-if="items.length" name="item-label" :item="items[0]" /><slot v-if="items.length" name="item-trailing" :item="items[0]" /></div>',
		props: ['items', 'maxHeight', 'extraPopperClass'],
		emits: ['select'],
	},
}));

describe('AgentTestHeader', () => {
	function mountPreviewHeader() {
		return mount(AgentTestHeader, {
			props: {
				agentId: 'agent-1',
				agentName: 'Darwin',
				agentHref: '/projects/project-1/agents/agent-1',
				sessionTitle: 'Alpha',
				sessionOptions: [
					{ id: 'week', title: 'Week session', updatedAt: new Date().toISOString() },
				],
				hasTrace: false,
				isDeletingSession: false,
				canDeleteSession: true,
			},
			global: {
				stubs: {
					AgentSessionHistoryDropdown: {
						name: 'AgentSessionHistoryDropdown',
						template: '<div><slot name="trigger" /></div>',
						props: ['sessionOptions', 'canDeleteSession', 'isDeletingSession'],
						emits: ['select', 'delete'],
					},
				},
			},
		});
	}

	it('tracks the standalone New chat button once and preserves its event', async () => {
		const wrapper = mountPreviewHeader();
		expect(track).not.toHaveBeenCalled();
		await wrapper.get('[data-testid="agent-preview-new-chat-btn"]').trigger('click');

		expect(wrapper.emitted('new-session')).toEqual([[]]);
		expect(track).toHaveBeenCalledExactlyOnceWith(
			TELEMETRY_EVENT.AGENTS.USER_CLICKED_NEW_TEST_CHAT_ICON_FROM_TEST_PANEL,
			{ agent_id: 'agent-1', push_ref: 'session-xyz', source: 'standalone' },
		);
	});

	it('forwards history props and events', () => {
		const wrapper = mountPreviewHeader();
		const history = wrapper.findComponent({ name: 'AgentSessionHistoryDropdown' });

		expect(history.props()).toMatchObject({
			sessionOptions: [expect.objectContaining({ id: 'week', title: 'Week session' })],
			canDeleteSession: true,
			isDeletingSession: false,
		});
		history.vm.$emit('select', 'week');
		history.vm.$emit('delete', 'week');

		expect(wrapper.emitted('session-select')).toEqual([['week']]);
		expect(wrapper.emitted('delete-session')).toEqual([['week']]);
	});
});

const metadata: SessionTimelineMetadata = {
	trigger: { source: 'slack', icon: 'message-circle', label: 'Slack' },
	totalTokens: 1250,
	totalCost: 0.012,
	durationLabel: '12 seconds',
};

const iconStub = {
	props: ['icon'],
	template: '<span :data-icon="icon" />',
};

enableAutoUnmount(afterEach);

function mountHeader(
	props: Partial<InstanceType<typeof AgentSessionTimelineHeader>['$props']> = {},
) {
	return mount(AgentSessionTimelineHeader, {
		props: {
			breadcrumbItems: [],
			projectIcon: { type: 'icon', value: 'user' },
			sessionTitle: 'Review invoices',
			sessionOptions: [],
			showLangsmithExport: false,
			langsmithExportLoading: false,
			metadata,
			...props,
		},
		global: { stubs: { N8nIcon: iconStub } },
	});
}

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

describe('AgentSessionTimelineHeader', () => {
	function mountNavigationHeader() {
		return mount(AgentSessionTimelineHeader, {
			props: {
				breadcrumbItems,
				projectIcon: { type: 'icon', value: 'user' },
				sessionTitle: 'Support session',
				sessionOptions: [
					{
						id: 'thread-1',
						label: 'Support session',
						data: { date: 'Jan 1 10:00', active: true },
					},
				],
				showLangsmithExport: false,
				langsmithExportLoading: false,
			},
		});
	}

	it('renders breadcrumbs and the session picker', () => {
		const wrapper = mountNavigationHeader();
		const breadcrumbs = wrapper.findComponent({ name: 'N8nBreadcrumbs' }) as BreadcrumbsStubWrapper;

		expect(breadcrumbs.vm.items.map((item) => item.id)).toEqual(['project-1', 'agent-1']);
		expect(wrapper.find('[data-testid="session-header-switcher"]').exists()).toBe(true);
		expect(wrapper.text()).toContain('Support session');
		expect(wrapper.text()).toContain('Jan 1 10:00');
	});

	it('shows the project icon before the breadcrumb', () => {
		const wrapper = mountNavigationHeader();
		const icon = wrapper.getComponent({ name: 'ProjectIcon' });

		expect(icon.props('icon')).toEqual({ type: 'icon', value: 'user' });
		expect(icon.props('size')).toBe('mini');
	});

	it('does not render session metadata before it loads', () => {
		const wrapper = mountNavigationHeader();

		expect(wrapper.find('[data-testid="agent-session-timeline-metadata"]').exists()).toBe(false);
	});

	it('emits timeline header actions', async () => {
		const wrapper = mountNavigationHeader();
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

	it('shows a ghost Close button with an x icon', () => {
		const wrapper = mountNavigationHeader();
		const editButton = wrapper.find('[data-testid="agent-session-timeline-close"]');

		expect(editButton.attributes('data-variant')).toBe('ghost');
		expect(editButton.attributes('data-size')).toBe('medium');
		expect(editButton.attributes('data-icon-only')).toBe('true');
		expect(editButton.find('[data-icon="x"]').exists()).toBe(true);
		expect(editButton.text()).toBe('');
		expect(editButton.attributes('aria-label')).toBe('generic.close');
	});
});

describe('AgentSessionTimelineHeader metadata', () => {
	it('omits an empty trigger but keeps token, cost, and duration details', () => {
		const wrapper = mountHeader({
			metadata: { ...metadata, trigger: { source: null, icon: 'bolt-filled', label: '' } },
		});
		const details = wrapper.get('[data-testid="agent-session-timeline-metadata"]');

		expect(details.findAll('li')).toHaveLength(2);
		expect(details.find('[data-icon="bolt-filled"]').exists()).toBe(false);
		expect(details.text()).toContain('1.3K ($0.012)');
		expect(details.text()).toContain('12 seconds');
	});

	it('displays the trigger, cost, and duration', () => {
		const wrapper = mountHeader();

		expect(wrapper.text()).toContain('Slack');
		expect(wrapper.text()).toContain('($0.012)');
		expect(wrapper.text()).toContain('12 seconds');
	});

	it('uses the supplied trigger icon', () => {
		const wrapper = mountHeader({
			metadata: { ...metadata, trigger: { source: null, icon: 'calendar', label: 'Schedule' } },
		});

		expect(wrapper.find('[data-icon="calendar"]').exists()).toBe(true);
		expect(wrapper.find('[data-icon="message-circle"]').exists()).toBe(false);
	});

	it.each([
		[0, '0'],
		[999, '999'],
		[1250, '1.3K'],
		[1000000, '1M'],
	])('formats %i tokens as %s', (totalTokens, expected) => {
		const wrapper = mountHeader({ metadata: { ...metadata, totalTokens } });

		expect(
			wrapper.get('[data-testid="agent-session-timeline-metadata"] li:nth-child(2)').text(),
		).toBe(`${expected} ($0.012)`);
	});

	it.each([
		[0, '0'],
		[0.012, '0.012'],
		[0.123456, '0.1235'],
		[1.5, '1.5'],
	])('formats cost %s as %s', (totalCost, expected) => {
		const wrapper = mountHeader({ metadata: { ...metadata, totalCost } });

		expect(wrapper.get('[data-testid="agent-session-timeline-metadata"]').text()).toContain(
			`($${expected})`,
		);
	});

	it('does not show metadata before it loads', () => {
		const wrapper = mountHeader({ metadata: undefined });

		expect(wrapper.find('[data-testid="agent-session-timeline-metadata"]').exists()).toBe(false);
	});

	it('removes metadata when the loaded session is cleared', async () => {
		const wrapper = mountHeader();
		expect(wrapper.find('[data-testid="agent-session-timeline-metadata"]').exists()).toBe(true);

		await wrapper.setProps({ metadata: undefined });

		expect(wrapper.find('[data-testid="agent-session-timeline-metadata"]').exists()).toBe(false);
	});

	it('updates the displayed details when props change', async () => {
		const wrapper = mountHeader();

		await wrapper.setProps({
			metadata: {
				trigger: { source: null, icon: 'calendar', label: 'Schedule' },
				totalTokens: 1000000,
				totalCost: 0.5,
				durationLabel: '1 minute',
			},
		});

		expect(wrapper.text()).toContain('Schedule');
		expect(
			wrapper.get('[data-testid="agent-session-timeline-metadata"] li:nth-child(2)').text(),
		).toBe('1M ($0.5)');
		expect(wrapper.text()).toContain('1 minute');
		expect(wrapper.text()).not.toContain('Slack');
		expect(wrapper.text()).not.toContain('12 seconds');
		expect(wrapper.find('[data-icon="calendar"]').exists()).toBe(true);
	});
});

describe('AgentSessionTimelineHeader menu', () => {
	it('places session actions before Close', () => {
		const wrapper = mountHeader({
			hasSession: true,
			canDeleteSession: true,
			showLangsmithExport: true,
		});
		const menu = wrapper.getComponent(
			'[data-testid="agent-session-timeline-more-menu"]',
		) as DropdownStubWrapper;
		expect(menu.vm.items).toEqual([
			expect.objectContaining({ id: 'copy-link', disabled: false }),
			expect.objectContaining({ id: 'export-session', disabled: false }),
			expect.objectContaining({
				id: 'delete-session',
				disabled: false,
				divided: true,
				destructive: true,
			}),
		]);
		const buttons = wrapper.findAll('button');
		expect(buttons.at(-1)?.attributes('data-testid')).toBe('agent-session-timeline-close');
		expect(buttons.at(-2)?.attributes('data-testid')).toBe('agent-session-timeline-more-btn');
	});

	it('emits the enabled menu actions', () => {
		const wrapper = mountHeader({
			hasSession: true,
			canDeleteSession: true,
			showLangsmithExport: true,
		});
		const menu = wrapper.getComponent(
			'[data-testid="agent-session-timeline-more-menu"]',
		) as DropdownStubWrapper;
		for (const action of ['copy-link', 'export-session', 'delete-session'])
			menu.vm.$emit('select', action);
		expect(wrapper.emitted('copy-link')).toEqual([[]]);
		expect(wrapper.emitted('langsmith-export')).toEqual([[]]);
		expect(wrapper.emitted('delete-session')).toEqual([[]]);
	});

	it('omits unavailable export and delete actions', () => {
		const wrapper = mountHeader({ hasSession: true });
		const menu = wrapper.getComponent(
			'[data-testid="agent-session-timeline-more-menu"]',
		) as DropdownStubWrapper;
		expect(menu.vm.items).toEqual([expect.objectContaining({ id: 'copy-link' })]);
		menu.vm.$emit('select', 'export-session');
		menu.vm.$emit('select', 'delete-session');
		expect(wrapper.emitted('langsmith-export')).toBeUndefined();
		expect(wrapper.emitted('delete-session')).toBeUndefined();
	});

	it.each([
		{ hasSession: false, langsmithExportLoading: false, isDeletingSession: false },
		{ hasSession: true, langsmithExportLoading: true, isDeletingSession: true },
	])('blocks unavailable or pending actions: %j', (state) => {
		const wrapper = mountHeader({ canDeleteSession: true, showLangsmithExport: true, ...state });
		const menu = wrapper.getComponent(
			'[data-testid="agent-session-timeline-more-menu"]',
		) as DropdownStubWrapper;
		expect(menu.vm.items.slice(1)).toEqual([
			expect.objectContaining({ id: 'export-session', disabled: true }),
			expect.objectContaining({ id: 'delete-session', disabled: true }),
		]);
		menu.vm.$emit('select', 'export-session');
		menu.vm.$emit('select', 'delete-session');
		expect(wrapper.emitted('langsmith-export')).toBeUndefined();
		expect(wrapper.emitted('delete-session')).toBeUndefined();
	});
});
