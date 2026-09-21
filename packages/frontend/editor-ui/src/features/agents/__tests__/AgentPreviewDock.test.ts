/* eslint-disable import-x/no-extraneous-dependencies -- test-only patterns */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { enableAutoUnmount, mount, shallowMount } from '@vue/test-utils';

import AgentPreviewDock from '../components/AgentPreviewDock.vue';
import AgentPreviewChatPage from '../components/AgentPreviewChatPage.vue';

enableAutoUnmount(afterEach);

const { useKeybindingsMock } = vi.hoisted(function createMocks() {
	return { useKeybindingsMock: vi.fn() };
});

vi.mock('@/app/composables/useKeybindings', function mockUseKeybindings() {
	return { useKeybindings: useKeybindingsMock };
});

vi.mock('../composables/useAgentSessionLangSmithExport', () => ({
	useAgentSessionLangSmithExport: () => ({
		isEnabled: false,
		isExporting: false,
		sendSession: vi.fn(),
	}),
}));

vi.mock('@n8n/i18n', () => ({
	useI18n: () => ({ baseText: (key: string) => key }),
}));

vi.mock('../agentSessions.store', () => ({
	useAgentSessionsStore: () => ({ loading: false }),
}));

vi.mock('@n8n/design-system', async (importOriginal) => ({
	useDropdownSearch: (await importOriginal<typeof import('@n8n/design-system')>())
		.useDropdownSearch,
	N8nActionDropdown: {
		name: 'N8nActionDropdown',
		template:
			'<div data-testid="action-dropdown" @click="!disabled && $emit(\'select\', items[0].id)"><slot name="activator" /></div>',
		props: { items: { type: Array, default: () => [] }, disabled: Boolean },
		emits: ['select'],
	},
	N8nButton: {
		name: 'N8nButton',
		template: '<button v-bind="$attrs" :data-variant="variant" :data-size="size"><slot /></button>',
		props: ['size', 'variant'],
	},
	N8nDropdownMenu: {
		name: 'N8nDropdownMenu',
		template:
			'<div><slot name="trigger" /><div v-for="item in items" :key="item.id" :data-testid="`session-row-${item.id}`" @click="!item.disabled && $emit(\'select\', item.id)"><slot name="item-label" :item="item" :ui="{ class: \'item-label\' }" /><slot name="item-trailing" :item="item" :ui="{ class: \'item-trailing\' }" /></div></div>',
		props: {
			items: { type: Array, default: () => [] },
			width: String,
			searchable: Boolean,
			searchPlaceholder: String,
			emptyText: String,
		},
		emits: ['select', 'search'],
	},
	N8nIcon: {
		name: 'N8nIcon',
		template: '<i :data-icon="icon" />',
		props: ['icon'],
	},
	N8nIconButton: {
		name: 'N8nIconButton',
		template:
			'<button v-bind="$attrs" :data-variant="variant" :data-size="size" :data-icon-size="iconSize" @click="$emit(\'click\')"><i :data-icon="icon" /></button>',
		props: ['icon', 'iconSize', 'size', 'variant'],
		emits: ['click'],
	},
	N8nKeyboardShortcut: { name: 'N8nKeyboardShortcut', template: '<span />' },
	N8nText: {
		name: 'N8nText',
		template: '<span v-bind="$attrs"><slot /></span>',
	},
	N8nTooltip: {
		name: 'N8nTooltip',
		template:
			'<div v-bind="$attrs" :data-content="content" :data-placement="placement" :data-show-after="showAfter"><slot /><slot name="content" /></div>',
		props: ['content', 'placement', 'showAfter'],
	},
	TOOLTIP_DELAY_MS: 500,
}));

const AgentPreviewChatPageStub = {
	name: 'AgentPreviewChatPage',
	props: ['beforeSend', 'initialPrompt', 'visible'],
	emits: ['continue-loaded', 'open-build', 'send-to-assistant', 'initial-consumed'],
	setup(_props: unknown, { expose }: { expose: (exposed: Record<string, unknown>) => void }) {
		expose({ focusInput: vi.fn(), getConversationMarkdown: () => '**User:**\n\nHello' });
	},
	template: '<div data-testid="agent-preview-chat-page-stub" />',
};

const AgentPreviewMoreMenuStub = {
	name: 'AgentPreviewMoreMenu',
	props: [
		'projectId',
		'agentId',
		'effectiveSessionId',
		'hasSession',
		'isFullWidth',
		'isDeletingSession',
		'canDeleteSession',
		'getConversationMarkdown',
	],
	emits: ['toggle-full-width', 'delete-session', 'export-session'],
	template: '<button data-testid="agent-preview-more-btn" @click="$emit(\'toggle-full-width\')" />',
};

function mountDock(
	overrides: Partial<{
		hasSession: boolean;
		effectiveSessionId?: string;
		beforeSend: () => Promise<void> | void;
		isOpen: boolean;
		isDeletingSession: boolean;
		canDeleteSession: boolean;
		initialPrompt?: string;
		sessionOptions: Array<{
			id: string;
			title: string;
			disabled?: boolean;
			updatedAt?: string;
		}>;
	}> = {},
	attachTo?: HTMLElement,
) {
	return mount(AgentPreviewDock, {
		...(attachTo ? { attachTo } : {}),
		props: {
			isOpen: true,
			sessionTitle: 'Order help',
			sessionOptions: [],
			hasSession: true,
			initialized: true,
			projectId: 'project-1',
			agentId: 'agent-1',
			agent: null,
			localConfig: null,
			connectedTriggers: [],
			effectiveSessionId: 'thread-1',
			isDeletingSession: false,
			canDeleteSession: true,
			...overrides,
		},
		global: {
			stubs: {
				AgentPreviewChatPage: AgentPreviewChatPageStub,
				AgentPreviewMoreMenu: AgentPreviewMoreMenuStub,
			},
		},
	});
}

describe('AgentPreviewDock', () => {
	beforeEach(function resetMocks() {
		vi.clearAllMocks();
		localStorage.removeItem('N8N_AGENT_PREVIEW_LAYOUT');
	});

	it('renders the session switcher before the compact actions', () => {
		const wrapper = mountDock();
		const title = wrapper.get('[data-testid="agent-preview-session-title"]');

		expect(title.text()).toBe('Order help');
		expect(title.element.tagName).toBe('BUTTON');
		expect(title.attributes()).toMatchObject({
			'aria-label': 'agentSessions.sessionName',
			'data-size': 'small',
		});
		expect(
			wrapper
				.get('[data-testid="agent-preview-dock-header"]')
				.findAll('[data-testid="agent-preview-session-title"], button')
				.map((element) => element.attributes('data-testid')),
		).toEqual([
			'agent-preview-session-title',
			'agent-preview-view-session-btn',
			'agent-preview-new-chat-btn',
			'agent-preview-more-btn',
			'agent-preview-close-btn',
		]);
	});

	it('filters session options and updates the empty message during search', async () => {
		const wrapper = mountDock({
			sessionOptions: [
				{ id: 'first', title: 'First session', updatedAt: new Date().toISOString() },
				{ id: 'second', title: 'Second session', updatedAt: new Date().toISOString() },
			],
		});
		const dropdown = wrapper.getComponent({ name: 'N8nDropdownMenu' });

		expect(dropdown.props('emptyText')).toBe('agents.builder.chat.sessionPicker.empty');
		dropdown.vm.$emit('search', 'second');
		await wrapper.vm.$nextTick();
		expect(
			dropdown.props('items').filter((item: { header?: boolean }) => !item.header),
		).toHaveLength(1);
		expect(dropdown.props('emptyText')).toBe('agents.builder.chat.sessionPicker.noMatch');
	});

	it('forwards row deletion unless deletion is pending and omits disabled row actions', async () => {
		const wrapper = mountDock({
			sessionOptions: [
				{ id: 'thread-2', title: 'Second session' },
				{ id: '__empty__', title: 'No sessions', disabled: true },
			],
		});

		expect(wrapper.findAllComponents({ name: 'N8nActionDropdown' })).toHaveLength(1);
		expect(
			wrapper
				.get('[data-testid="session-row-__empty__"]')
				.find('[data-testid="action-dropdown"]')
				.exists(),
		).toBe(false);

		await wrapper
			.get('[data-testid="session-row-thread-2"] [aria-label="agentSessions.actions"]')
			.trigger('click');

		expect(wrapper.emitted('delete-session')).toEqual([['thread-2']]);
		expect(wrapper.emitted('session-select')).toBeUndefined();

		await wrapper.setProps({ isDeletingSession: true });
		await wrapper
			.get('[data-testid="session-row-thread-2"] [aria-label="agentSessions.actions"]')
			.trigger('click');
		expect(wrapper.emitted('delete-session')).toEqual([['thread-2']]);
	});

	it('hides and guards deletion for viewers', () => {
		const wrapper = mountDock({
			canDeleteSession: false,
			sessionOptions: [
				{ id: 'thread-2', title: 'Second session', updatedAt: new Date().toISOString() },
			],
		});

		expect(wrapper.findComponent({ name: 'N8nActionDropdown' }).exists()).toBe(false);
		wrapper.getComponent({ name: 'AgentPreviewMoreMenu' }).vm.$emit('delete-session');
		expect(wrapper.emitted('delete-session')).toBeUndefined();
	});

	it('renders accessible header actions and emits their events', async () => {
		const wrapper = mountDock();
		const expectedActions = [
			{
				testId: 'agent-preview-view-session-btn',
				icon: 'list-tree',
				label: 'agents.builder.preview.viewSession',
			},
			{
				testId: 'agent-preview-new-chat-btn',
				icon: 'message-circle-plus',
				label: 'agents.builder.chat.newChat.label',
			},
			{
				testId: 'agent-preview-close-btn',
				icon: 'chevrons-right',
				label: 'agents.builder.preview.hide',
			},
		];
		const traceTooltip = wrapper.get('[data-testid="agent-preview-view-session-tooltip"]');

		expect(traceTooltip.attributes()).toMatchObject({
			'data-content': 'agents.builder.preview.viewSession',
			'data-placement': 'bottom',
		});

		for (const action of expectedActions) {
			const button = wrapper.get(`[data-testid="${action.testId}"]`);
			expect(button.attributes()).toMatchObject({
				'aria-label': action.label,
				'data-icon-size': 'large',
				'data-size': 'small',
				'data-variant': 'ghost',
			});
			expect(button.find(`[data-icon="${action.icon}"]`).exists()).toBe(true);

			await button.trigger('click');
		}

		expect(wrapper.emitted('view-trace')).toEqual([[]]);
		expect(wrapper.emitted('new-session')).toEqual([[]]);
		expect(wrapper.emitted('close')).toEqual([[]]);
	});

	it.each([
		['until the session has persisted', { hasSession: false }],
		['without an effective session id', { effectiveSessionId: undefined }],
	] as const)('omits the trace control and tooltip %s', (_condition, overrides) => {
		const wrapper = mountDock(overrides);

		expect(wrapper.find('[data-testid="agent-preview-view-session-btn"]').exists()).toBe(false);
		expect(wrapper.find('[data-testid="agent-preview-view-session-tooltip"]').exists()).toBe(false);
	});

	it('keeps the preview page mounted when the dock closes and reopens', async () => {
		const wrapper = mountDock();
		const chatPage = wrapper.findComponent({ name: 'AgentPreviewChatPage' });
		expect(chatPage.props('visible')).toBe(true);
		await wrapper.setProps({ isOpen: false });
		expect(chatPage.props('visible')).toBe(false);
		expect(wrapper.findComponent({ name: 'AgentPreviewChatPage' }).vm).toBe(chatPage.vm);
		await wrapper.setProps({ isOpen: true });
		expect(chatPage.props('visible')).toBe(true);
	});

	it('forwards chat events to the preview page', () => {
		const beforeSend = vi.fn();
		const fixEvent = {
			executionId: 'execution-1',
			failures: [
				{
					toolCallId: 'call-1',
					toolName: 'http_request',
					toolDisplayName: 'HTTP request',
					error: 'Request failed',
				},
			],
		};
		const wrapper = mountDock({ beforeSend, initialPrompt: 'Test these instructions' });
		const chatPage = wrapper.findComponent({ name: 'AgentPreviewChatPage' });

		expect(chatPage.props('beforeSend')).toBe(beforeSend);
		expect(chatPage.props('initialPrompt')).toBe('Test these instructions');
		chatPage.vm.$emit('continue-loaded', { sessionId: 'thread-1', count: 3 });
		chatPage.vm.$emit('open-build');
		chatPage.vm.$emit('send-to-assistant', fixEvent);
		chatPage.vm.$emit('initial-consumed');

		expect(wrapper.emitted('continue-loaded')).toEqual([[{ sessionId: 'thread-1', count: 3 }]]);
		expect(wrapper.emitted('open-build')).toEqual([[]]);
		expect(wrapper.emitted('send-to-assistant')).toEqual([[fixEvent]]);
		expect(wrapper.emitted('initial-consumed')).toEqual([[]]);
	});

	it('shows the new-session shortcut tooltip', () => {
		const wrapper = mountDock();
		const tooltips = wrapper.findAllComponents({
			name: 'KeyboardShortcutTooltip',
		});

		expect(tooltips).toHaveLength(2);
		expect(tooltips[0]?.props()).toMatchObject({
			label: 'agents.builder.chat.newChat.label',
			placement: 'bottom',
			shortcut: { metaKey: true, shiftKey: true, keys: [';'] },
		});
		expect(tooltips[1]?.props()).toMatchObject({
			label: 'agents.builder.preview.hide',
			shortcut: { metaKey: false, shiftKey: false, keys: ['esc'] },
		});
	});

	it('passes the active session to the more menu and forwards its deletion request', () => {
		const wrapper = mountDock();
		const moreMenu = wrapper.getComponent({ name: 'AgentPreviewMoreMenu' });

		expect(moreMenu.props()).toMatchObject({
			projectId: 'project-1',
			agentId: 'agent-1',
			effectiveSessionId: 'thread-1',
			hasSession: true,
			isFullWidth: false,
		});

		moreMenu.vm.$emit('delete-session');
		expect(wrapper.emitted('delete-session')).toEqual([['thread-1']]);
	});

	it('creates a new session from the registered keyboard shortcut', () => {
		const wrapper = mountDock();
		const newSessionShortcut = useKeybindingsMock.mock.calls[0]?.[0]?.[
			'ctrl+shift+;'
		] as () => void;

		newSessionShortcut();

		expect(wrapper.emitted('new-session')).toEqual([[]]);
	});

	it('only enables Escape when the dock is open and contains focus', async function checksEscapeScope() {
		localStorage.setItem('N8N_AGENT_PREVIEW_LAYOUT', 'floating');
		const host = document.createElement('div');
		const outsideButton = document.createElement('button');
		document.body.append(host, outsideButton);
		const wrapper = mountDock({}, host);
		const escapeBinding = useKeybindingsMock.mock.calls[0]?.[0]?.Escape as {
			disabled: () => boolean;
			run: () => void;
		};

		outsideButton.focus();
		expect(escapeBinding.disabled()).toBe(true);

		(
			wrapper.get('[data-testid="agent-preview-new-chat-btn"]').element as HTMLButtonElement
		).focus();
		expect(escapeBinding.disabled()).toBe(false);
		escapeBinding.run();
		expect(wrapper.emitted('close')).toEqual([[]]);

		await wrapper.setProps({ isOpen: false });
		expect(escapeBinding.disabled()).toBe(true);

		wrapper.unmount();
		host.remove();
		outsideButton.remove();
	});

	it('docks the preview before opening the session view', async () => {
		/** TODO: Remove this test when https://linear.app/n8n/issue/AGENT-808 removes preview chat from the session trace view. */
		localStorage.setItem('N8N_AGENT_PREVIEW_LAYOUT', 'fullpage');
		const wrapper = mountDock();

		await wrapper.get('[data-testid="agent-preview-view-session-btn"]').trigger('click');

		expect(localStorage.getItem('N8N_AGENT_PREVIEW_LAYOUT')).toBe('docked');
		expect(wrapper.emitted('view-trace')).toEqual([[]]);
	});
});

describe('AgentPreviewChatPage', () => {
	function mountChatPage(beforeSend?: () => Promise<void> | void) {
		return shallowMount(AgentPreviewChatPage, {
			props: {
				initialized: true,
				projectId: 'project-1',
				agentId: 'agent-1',
				agent: null,
				localConfig: null,
				connectedTriggers: [],
				effectiveSessionId: 'thread-1',
				beforeSend,
			},
		});
	}

	it('uses a neutral root inside the complementary dock landmark', () => {
		expect(mountChatPage().element.tagName).toBe('DIV');
	});

	it('keeps the standalone chat visible when no dock state is provided', () => {
		const wrapper = mountChatPage();

		expect(wrapper.findComponent({ name: 'AgentChatPanel' }).props('visible')).toBe(true);
	});

	it('keeps the chat panel mounted when visibility changes', async () => {
		const wrapper = mountChatPage();
		const chatPanel = wrapper.findComponent({ name: 'AgentChatPanel' });
		await wrapper.setProps({ visible: false });
		expect(chatPanel.props('visible')).toBe(false);
		expect(wrapper.findComponent({ name: 'AgentChatPanel' }).vm).toBe(chatPanel.vm);
		await wrapper.setProps({ visible: true });
		expect(chatPanel.props('visible')).toBe(true);
	});

	it('forwards the pre-send guard to the chat panel', () => {
		const beforeSend = vi.fn();
		const wrapper = mountChatPage(beforeSend);

		expect(wrapper.findComponent({ name: 'AgentChatPanel' }).props('beforeSend')).toBe(beforeSend);
	});

	it('sends the initial prompt once when the chat panel is ready', async () => {
		const sendMessageFromOutside = vi.fn();
		const wrapper = shallowMount(AgentPreviewChatPage, {
			props: {
				initialized: true,
				projectId: 'project-1',
				agentId: 'agent-1',
				agent: null,
				localConfig: null,
				connectedTriggers: [],
				effectiveSessionId: 'thread-1',
				initialPrompt: 'Test these instructions',
			},
			global: {
				stubs: {
					AgentChatPanel: {
						name: 'AgentChatPanel',
						template: '<div />',
						methods: { sendMessageFromOutside },
					},
				},
			},
		});

		await wrapper.vm.$nextTick();

		expect(sendMessageFromOutside).toHaveBeenCalledExactlyOnceWith('Test these instructions');
		expect(wrapper.emitted('initial-consumed')).toEqual([[]]);

		await wrapper.setProps({ visible: false });
		expect(sendMessageFromOutside).toHaveBeenCalledTimes(1);
	});

	it('forwards the session-aware history event from the chat panel', () => {
		const wrapper = mountChatPage();

		wrapper
			.findComponent({ name: 'AgentChatPanel' })
			.vm.$emit('continue-loaded', { sessionId: 'thread-1', count: 3 });

		expect(wrapper.emitted('continue-loaded')).toEqual([[{ sessionId: 'thread-1', count: 3 }]]);
	});

	it('forwards Fix with Assistant metadata from the chat panel', () => {
		const fixEvent = {
			executionId: 'execution-1',
			failures: [
				{
					toolCallId: 'call-1',
					toolName: 'http_request',
					toolDisplayName: 'HTTP request',
					error: 'Request failed',
				},
			],
		};
		const wrapper = mountChatPage();

		wrapper.findComponent({ name: 'AgentChatPanel' }).vm.$emit('send-to-assistant', fixEvent);

		expect(wrapper.emitted('send-to-assistant')).toEqual([[fixEvent]]);
	});
});
