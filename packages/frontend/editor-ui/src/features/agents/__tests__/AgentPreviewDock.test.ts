/* eslint-disable import-x/no-extraneous-dependencies -- test-only patterns */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mount, shallowMount } from '@vue/test-utils';
import { TOOLTIP_DELAY_MS } from '@n8n/design-system';

import AgentPreviewDock from '../components/AgentPreviewDock.vue';
import AgentPreviewChatPage from '../components/AgentPreviewChatPage.vue';

const { useKeybindingsMock } = vi.hoisted(() => ({
	useKeybindingsMock: vi.fn(),
}));

vi.mock('@/app/composables/useKeybindings', () => ({
	useKeybindings: useKeybindingsMock,
}));

vi.mock('@n8n/i18n', () => ({
	useI18n: () => ({ baseText: (key: string) => key }),
}));

vi.mock('@n8n/design-system', () => ({
	N8nIconButton: {
		name: 'N8nIconButton',
		template:
			'<button v-bind="$attrs" :data-variant="variant" :data-size="size" :data-icon-size="iconSize" @click="$emit(\'click\')"><i :data-icon="icon" /></button>',
		props: ['icon', 'iconSize', 'size', 'variant'],
		emits: ['click'],
	},
	N8nKeyboardShortcut: { name: 'N8nKeyboardShortcut', template: '<span />' },
	N8nHeading: {
		name: 'N8nHeading',
		template: '<component :is="tag" v-bind="$attrs" :data-size="size"><slot /></component>',
		props: ['size', 'tag'],
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
	template: '<div data-testid="agent-preview-chat-page-stub" />',
};

function mountDock(
	overrides: Partial<{
		hasSession: boolean;
		effectiveSessionId?: string;
		beforeSend: () => Promise<void> | void;
	}> = {},
	attachTo?: HTMLElement,
) {
	return mount(AgentPreviewDock, {
		...(attachTo ? { attachTo } : {}),
		props: {
			sessionTitle: 'Order help',
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
			stubs: { AgentPreviewChatPage: AgentPreviewChatPageStub },
		},
	});
}

describe('AgentPreviewDock', () => {
	beforeEach(() => {
		useKeybindingsMock.mockClear();
	});

	it('renders the Instance AI session heading before the compact actions', () => {
		const wrapper = mountDock();
		const title = wrapper.get('[data-testid="agent-preview-session-title"]');

		expect(title.text()).toBe('Order help');
		expect(title.element.tagName).toBe('H2');
		expect(title.attributes('data-size')).toBe('small');
		expect(
			wrapper
				.get('[data-testid="agent-preview-dock-header"]')
				.findAll('[data-testid="agent-preview-session-title"], button')
				.map((element) => element.attributes('data-testid')),
		).toEqual([
			'agent-preview-session-title',
			'agent-preview-view-session-btn',
			'agent-preview-new-chat-btn',
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
				icon: 'x',
				label: 'agents.builder.preview.close.ariaLabel',
			},
		];
		const traceTooltip = wrapper.get('[data-testid="agent-preview-view-session-tooltip"]');

		expect(traceTooltip.attributes()).toMatchObject({
			'data-content': 'agents.builder.preview.viewSession',
			'data-placement': 'bottom',
			'data-show-after': String(TOOLTIP_DELAY_MS),
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

	it('shows shortcut tooltips for the new-session and close actions', () => {
		const wrapper = mountDock();
		const tooltips = wrapper.findAllComponents({
			name: 'KeyboardShortcutTooltip',
		});
		const [newSessionTooltip, closeTooltip] = tooltips;

		expect(tooltips).toHaveLength(2);
		expect(newSessionTooltip?.props()).toMatchObject({
			label: 'agents.builder.chat.newChat.label',
			placement: 'bottom',
			shortcut: { metaKey: true, shiftKey: true, keys: [';'] },
		});
		expect(closeTooltip?.props()).toMatchObject({
			label: 'generic.close',
			placement: 'bottom',
			shortcut: { keys: ['Esc'] },
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

		(wrapper.get('[data-testid="agent-preview-close-btn"]').element as HTMLButtonElement).focus();
		expect(escapeBinding.disabled()).toBe(false);
		escapeBinding.run();
		expect(wrapper.emitted('close')).toEqual([[]]);

		wrapper.unmount();
		host.remove();
		outsideButton.remove();
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
