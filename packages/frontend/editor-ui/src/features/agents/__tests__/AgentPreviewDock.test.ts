/* eslint-disable import-x/no-extraneous-dependencies -- test-only patterns */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { enableAutoUnmount, flushPromises, mount, shallowMount } from '@vue/test-utils';

import { MODAL_CANCEL, MODAL_CONFIRM } from '@/app/constants/modals';

import AgentPreviewDock from '../components/AgentPreviewDock.vue';
import AgentPreviewChatPage from '../components/AgentPreviewChatPage.vue';

enableAutoUnmount(afterEach);

const { confirm, deleteThread, showError, showMessage, useKeybindingsMock } = vi.hoisted(
	function createMocks() {
		return {
			confirm: vi.fn(),
			deleteThread: vi.fn(),
			showError: vi.fn(),
			showMessage: vi.fn(),
			useKeybindingsMock: vi.fn(),
		};
	},
);

vi.mock('@/app/composables/useKeybindings', function mockUseKeybindings() {
	return { useKeybindings: useKeybindingsMock };
});

vi.mock('@/app/composables/useMessage', function mockUseMessage() {
	return {
		useMessage: function useMessage() {
			return { confirm };
		},
	};
});

vi.mock('@n8n/composables/useToast', function mockUseToast() {
	return {
		useToast: function useToast() {
			return { showMessage, showError };
		},
	};
});

vi.mock('../agentSessions.store', function mockAgentSessionsStore() {
	return {
		useAgentSessionsStore: function useAgentSessionsStore() {
			return { deleteThread };
		},
	};
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
	props: ['beforeSend'],
	emits: ['continue-loaded', 'open-build', 'send-to-assistant'],
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
			},
		},
	});
}

describe('AgentPreviewDock', () => {
	beforeEach(function resetMocks() {
		vi.clearAllMocks();
		confirm.mockReset().mockResolvedValue(MODAL_CONFIRM);
		deleteThread.mockReset().mockResolvedValue(undefined);
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
		const wrapper = mountDock({ beforeSend });
		const chatPage = wrapper.findComponent({ name: 'AgentPreviewChatPage' });

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

	it('confirms deletion and starts a new session after success', async function deletesSession() {
		const wrapper = mountDock();
		const menu = wrapper.getComponent({ name: 'AgentPreviewMoreMenu' });

		menu.vm.$emit('delete-session');
		await flushPromises();

		expect(confirm).toHaveBeenCalledExactlyOnceWith(
			'agentSessions.deleteConfirm.message',
			'agentSessions.deleteConfirm.headline',
			{
				type: 'warning',
				confirmButtonText: 'agentSessions.deleteConfirm.confirmButtonText',
				cancelButtonText: '',
			},
		);
		expect(deleteThread).toHaveBeenCalledExactlyOnceWith('project-1', 'agent-1', 'thread-1');
		expect(showMessage).toHaveBeenCalledExactlyOnceWith({
			title: 'agentSessions.showMessage.deleted',
			type: 'success',
		});
		expect(wrapper.emitted('new-session')).toEqual([[]]);
		expect(wrapper.emitted('session-deleted')).toEqual([['thread-1']]);
		expect(menu.props('isDeletingSession')).toBe(false);
	});

	it('keeps the session when deletion is cancelled', async function cancelsDeletion() {
		confirm.mockResolvedValueOnce(MODAL_CANCEL);
		const wrapper = mountDock();
		const menu = wrapper.getComponent({ name: 'AgentPreviewMoreMenu' });

		menu.vm.$emit('delete-session');
		await flushPromises();

		expect(deleteThread).not.toHaveBeenCalled();
		expect(showMessage).not.toHaveBeenCalled();
		expect(showError).not.toHaveBeenCalled();
		expect(wrapper.emitted('new-session')).toBeUndefined();
		expect(wrapper.emitted('session-deleted')).toBeUndefined();
		expect(menu.props('isDeletingSession')).toBe(false);
	});

	it('reports a deletion failure and keeps the session', async function reportsDeletionError() {
		const error = new Error('Delete failed');
		deleteThread.mockRejectedValueOnce(error);
		const wrapper = mountDock();
		const menu = wrapper.getComponent({ name: 'AgentPreviewMoreMenu' });

		menu.vm.$emit('delete-session');
		await flushPromises();

		expect(showError).toHaveBeenCalledExactlyOnceWith(error, 'agentSessions.showError.delete');
		expect(showMessage).not.toHaveBeenCalled();
		expect(wrapper.emitted('new-session')).toBeUndefined();
		expect(wrapper.emitted('session-deleted')).toBeUndefined();
		expect(menu.props('isDeletingSession')).toBe(false);
	});

	it('blocks repeated deletion while confirmation or deletion is pending', async function blocksRepeatedDeletion() {
		const confirmation = Promise.withResolvers<string>();
		const deletion = Promise.withResolvers<void>();
		confirm.mockReturnValueOnce(confirmation.promise);
		deleteThread.mockReturnValueOnce(deletion.promise);
		const wrapper = mountDock();
		const menu = wrapper.getComponent({ name: 'AgentPreviewMoreMenu' });

		menu.vm.$emit('delete-session');
		menu.vm.$emit('delete-session');
		await flushPromises();
		expect(confirm).toHaveBeenCalledTimes(1);
		expect(deleteThread).not.toHaveBeenCalled();
		expect(menu.props('isDeletingSession')).toBe(true);

		confirmation.resolve(MODAL_CONFIRM);
		await flushPromises();
		menu.vm.$emit('delete-session');
		expect(confirm).toHaveBeenCalledTimes(1);
		expect(deleteThread).toHaveBeenCalledTimes(1);

		deletion.resolve();
		await flushPromises();
		expect(menu.props('isDeletingSession')).toBe(false);
	});

	it('does not replace a session selected while deletion is pending', async function preservesSelectedSession() {
		const deletion = Promise.withResolvers<void>();
		deleteThread.mockReturnValueOnce(deletion.promise);
		const wrapper = mountDock();

		wrapper.getComponent({ name: 'AgentPreviewMoreMenu' }).vm.$emit('delete-session');
		await flushPromises();
		await wrapper.setProps({ effectiveSessionId: 'thread-2' });
		deletion.resolve();
		await flushPromises();

		expect(wrapper.emitted('new-session')).toBeUndefined();
		expect(wrapper.emitted('session-deleted')).toEqual([['thread-1']]);
	});

	it.each([{ hasSession: false }, { effectiveSessionId: undefined }])(
		'does not confirm deletion without a saved session: %j',
		async function skipsDeletion(overrides) {
			const wrapper = mountDock(overrides);

			wrapper.getComponent({ name: 'AgentPreviewMoreMenu' }).vm.$emit('delete-session');
			await flushPromises();

			expect(confirm).not.toHaveBeenCalled();
			expect(deleteThread).not.toHaveBeenCalled();
		},
	);

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

	it('forwards the pre-send guard to the chat panel', () => {
		const beforeSend = vi.fn();
		const wrapper = mountChatPage(beforeSend);

		expect(wrapper.findComponent({ name: 'AgentChatPanel' }).props('beforeSend')).toBe(beforeSend);
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
