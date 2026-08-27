/* eslint-disable import-x/no-extraneous-dependencies -- test-only patterns */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mount, shallowMount } from '@vue/test-utils';

import AgentPreviewDock from '../components/AgentPreviewDock.vue';
import AgentPreviewChatPage from '../components/AgentPreviewChatPage.vue';

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

vi.mock('../components/AgentSessionTimelinePanel.vue', () => ({
	default: {
		name: 'AgentSessionTimelinePanel',
		props: ['projectId', 'agentId', 'threadId'],
		template: '<div data-testid="agent-preview-session-timeline" />',
	},
}));

vi.mock('@n8n/design-system', () => ({
	N8nButton: {
		name: 'N8nButton',
		template: '<button v-bind="$attrs" :data-variant="variant" :data-size="size"><slot /></button>',
		props: ['size', 'variant'],
	},
	N8nDropdownMenu: {
		name: 'N8nDropdownMenu',
		template: '<div><slot name="trigger" /></div>',
		emits: ['select'],
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
	props: ['beforeSend', 'layout'],
	emits: ['continue-loaded', 'open-build', 'send-to-assistant'],
	setup(_props: unknown, { expose }: { expose: (exposed: Record<string, unknown>) => void }) {
		expose({ focusInput: vi.fn(), getConversationMarkdown: () => '**User:**\n\nHello' });
	},
	template: '<div data-testid="agent-preview-chat-page-stub" />',
};

const AgentSessionTimelinePanelStub = {
	name: 'AgentSessionTimelinePanel',
	props: ['projectId', 'agentId', 'threadId'],
	template: '<div data-testid="agent-preview-session-timeline" />',
};

const AgentPreviewMoreMenuStub = {
	name: 'AgentPreviewMoreMenu',
	props: [
		'projectId',
		'agentId',
		'effectiveSessionId',
		'hasSession',
		'isFullWidth',
		'getConversationMarkdown',
	],
	emits: ['toggle-full-width'],
	template: '<button data-testid="agent-preview-more-btn" @click="$emit(\'toggle-full-width\')" />',
};

function mountDock(
	overrides: Partial<{
		hasSession: boolean;
		effectiveSessionId?: string;
		beforeSend: () => Promise<void> | void;
		isOpen: boolean;
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
			...overrides,
		},
		global: {
			stubs: {
				AgentPreviewChatPage: AgentPreviewChatPageStub,
				AgentPreviewMoreMenu: AgentPreviewMoreMenuStub,
				AgentSessionTimelinePanel: AgentSessionTimelinePanelStub,
			},
		},
	});
}

describe('AgentPreviewDock', () => {
	beforeEach(() => {
		useKeybindingsMock.mockClear();
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
		]);
	});

	it('renders accessible header actions and emits their events', async () => {
		localStorage.setItem('N8N_AGENT_PREVIEW_LAYOUT', 'floating');
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
		expect(wrapper.emitted('close')).toBeUndefined();
	});

	it.each([
		['until the session has persisted', { hasSession: false }],
		['without an effective session id', { effectiveSessionId: undefined }],
	] as const)('omits the trace control and tooltip %s', (_condition, overrides) => {
		const wrapper = mountDock(overrides);

		expect(wrapper.find('[data-testid="agent-preview-view-session-btn"]').exists()).toBe(false);
		expect(wrapper.find('[data-testid="agent-preview-view-session-tooltip"]').exists()).toBe(false);
	});

	it('forwards chat events and opts the chat page into dock layout', () => {
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
		const wrapper = mountDock({ beforeSend });
		const chatPage = wrapper.findComponent({ name: 'AgentPreviewChatPage' });

		expect(chatPage.props('layout')).toBe('dock');
		expect(chatPage.props('beforeSend')).toBe(beforeSend);
		chatPage.vm.$emit('continue-loaded', { sessionId: 'thread-1', count: 3 });
		chatPage.vm.$emit('open-build');
		chatPage.vm.$emit('send-to-assistant', fixEvent);

		expect(wrapper.emitted('continue-loaded')).toEqual([[{ sessionId: 'thread-1', count: 3 }]]);
		expect(wrapper.emitted('open-build')).toEqual([[]]);
		expect(wrapper.emitted('send-to-assistant')).toEqual([[fixEvent]]);
	});

	it('shows the new-session shortcut tooltip', () => {
		const wrapper = mountDock();
		const tooltips = wrapper.findAllComponents({
			name: 'KeyboardShortcutTooltip',
		});

		expect(tooltips).toHaveLength(1);
		expect(tooltips[0]?.props()).toMatchObject({
			label: 'agents.builder.chat.newChat.label',
			placement: 'bottom',
			shortcut: { metaKey: true, shiftKey: true, keys: [';'] },
		});
	});

	it('passes the active session to the more menu', () => {
		const wrapper = mountDock();
		const moreMenu = wrapper.getComponent({ name: 'AgentPreviewMoreMenu' });

		expect(moreMenu.props()).toMatchObject({
			projectId: 'project-1',
			agentId: 'agent-1',
			effectiveSessionId: 'thread-1',
			hasSession: true,
			isFullWidth: false,
		});
	});

	it('creates a new session from the registered keyboard shortcut', () => {
		const wrapper = mountDock();
		const newSessionShortcut = useKeybindingsMock.mock.calls[0]?.[0]?.[
			'ctrl+shift+;'
		] as () => void;

		newSessionShortcut();

		expect(wrapper.emitted('new-session')).toEqual([[]]);
	});

	it('only enables Escape while focus is within the dock', () => {
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

		wrapper.unmount();
		host.remove();
		outsideButton.remove();
	});

	it('shows the session timeline in full-page layout without navigating', async () => {
		localStorage.setItem('N8N_AGENT_PREVIEW_LAYOUT', 'fullpage');
		const wrapper = mountDock();

		await wrapper.get('[data-testid="agent-preview-view-session-btn"]').trigger('click');

		expect(wrapper.emitted('view-trace')).toBeUndefined();
		expect(wrapper.find('[data-testid="agent-preview-session-timeline"]').exists()).toBe(true);
		expect(wrapper.find('[data-testid="agent-preview-chat-page-stub"]').isVisible()).toBe(false);
		expect(wrapper.find('[data-testid="agent-preview-show-chat-btn"]').exists()).toBe(true);
		expect(
			wrapper
				.find('[data-testid="agent-preview-show-chat-btn"]')
				.find('[data-icon="message-circle"]')
				.exists(),
		).toBe(true);
	});

	it('returns to chat from the full-page timeline view', async () => {
		localStorage.setItem('N8N_AGENT_PREVIEW_LAYOUT', 'fullpage');
		const wrapper = mountDock();

		await wrapper.get('[data-testid="agent-preview-view-session-btn"]').trigger('click');
		await wrapper.get('[data-testid="agent-preview-show-chat-btn"]').trigger('click');

		expect(wrapper.find('[data-testid="agent-preview-session-timeline"]').exists()).toBe(false);
		expect(wrapper.find('[data-testid="agent-preview-chat-page-stub"]').isVisible()).toBe(true);
		expect(wrapper.find('[data-testid="agent-preview-view-session-btn"]').exists()).toBe(true);
		expect(wrapper.emitted('view-trace')).toBeUndefined();
	});

	it('returns to chat when switching from full-page timeline to docked layout', async () => {
		localStorage.setItem('N8N_AGENT_PREVIEW_LAYOUT', 'fullpage');
		const wrapper = mountDock();
		const moreMenu = wrapper.getComponent({ name: 'AgentPreviewMoreMenu' });

		await wrapper.get('[data-testid="agent-preview-view-session-btn"]').trigger('click');
		expect(wrapper.find('[data-testid="agent-preview-session-timeline"]').exists()).toBe(true);

		moreMenu.vm.$emit('toggle-full-width');
		await wrapper.vm.$nextTick();

		expect(wrapper.find('[data-testid="agent-preview-session-timeline"]').exists()).toBe(false);
		expect(wrapper.find('[data-testid="agent-preview-chat-page-stub"]').isVisible()).toBe(true);
		expect(wrapper.emitted('view-trace')).toBeUndefined();
	});

	it('returns to chat when starting a new session from the full-page timeline', async () => {
		localStorage.setItem('N8N_AGENT_PREVIEW_LAYOUT', 'fullpage');
		const wrapper = mountDock();

		await wrapper.get('[data-testid="agent-preview-view-session-btn"]').trigger('click');
		await wrapper.get('[data-testid="agent-preview-new-chat-btn"]').trigger('click');

		expect(wrapper.find('[data-testid="agent-preview-session-timeline"]').exists()).toBe(false);
		expect(wrapper.find('[data-testid="agent-preview-chat-page-stub"]').isVisible()).toBe(true);
		expect(wrapper.emitted('new-session')).toEqual([[]]);
		expect(wrapper.emitted('view-trace')).toBeUndefined();
	});

	it('returns to chat when the dock closes while showing the timeline', async () => {
		localStorage.setItem('N8N_AGENT_PREVIEW_LAYOUT', 'fullpage');
		const wrapper = mountDock();

		await wrapper.get('[data-testid="agent-preview-view-session-btn"]').trigger('click');
		expect(wrapper.find('[data-testid="agent-preview-session-timeline"]').exists()).toBe(true);

		await wrapper.setProps({ isOpen: false });
		await wrapper.setProps({ isOpen: true });

		expect(wrapper.find('[data-testid="agent-preview-session-timeline"]').exists()).toBe(false);
		expect(wrapper.find('[data-testid="agent-preview-view-session-btn"]').exists()).toBe(true);
	});
});

describe('AgentPreviewChatPage', () => {
	function mountChatPage(layout?: 'page' | 'dock', beforeSend?: () => Promise<void> | void) {
		return shallowMount(AgentPreviewChatPage, {
			props: {
				initialized: true,
				projectId: 'project-1',
				agentId: 'agent-1',
				agent: null,
				localConfig: null,
				connectedTriggers: [],
				effectiveSessionId: 'thread-1',
				layout,
				beforeSend,
			},
		});
	}

	it('keeps the main landmark for the standalone page layout', () => {
		expect(mountChatPage().element.tagName).toBe('MAIN');
	});

	it('uses a neutral root inside the complementary dock landmark', () => {
		expect(mountChatPage('dock').element.tagName).toBe('DIV');
	});

	it('forwards the pre-send guard to the chat panel', () => {
		const beforeSend = vi.fn();
		const wrapper = mountChatPage('dock', beforeSend);

		expect(wrapper.findComponent({ name: 'AgentChatPanel' }).props('beforeSend')).toBe(beforeSend);
	});

	it('forwards the session-aware history event from the chat panel', () => {
		const wrapper = mountChatPage('dock');

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
		const wrapper = mountChatPage('dock');

		wrapper.findComponent({ name: 'AgentChatPanel' }).vm.$emit('send-to-assistant', fixEvent);

		expect(wrapper.emitted('send-to-assistant')).toEqual([[fixEvent]]);
	});
});
