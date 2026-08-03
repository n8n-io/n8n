/* eslint-disable import-x/no-extraneous-dependencies -- test-only patterns */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';

import AgentPreviewDock from '../components/AgentPreviewDock.vue';

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
	N8nButton: {
		name: 'N8nButton',
		template:
			'<button v-bind="$attrs" :data-variant="variant" :data-size="size" :disabled="disabled" @click="$emit(\'click\')">{{ label }}</button>',
		props: ['variant', 'size', 'label', 'disabled'],
		emits: ['click'],
	},
	N8nIconButton: {
		name: 'N8nIconButton',
		template:
			'<button v-bind="$attrs" :data-variant="variant" :data-size="size" @click="$emit(\'click\')"><i :data-icon="icon" /></button>',
		props: ['variant', 'size', 'icon'],
		emits: ['click'],
	},
	N8nKeyboardShortcut: { name: 'N8nKeyboardShortcut', template: '<span />' },
	N8nText: {
		name: 'N8nText',
		template: '<span v-bind="$attrs"><slot /></span>',
	},
	N8nTooltip: {
		name: 'N8nTooltip',
		template: '<div><slot /><slot name="content" /></div>',
	},
}));

const AgentPreviewChatPageStub = {
	name: 'AgentPreviewChatPage',
	props: [
		'initialized',
		'projectId',
		'agentId',
		'agent',
		'localConfig',
		'connectedTriggers',
		'effectiveSessionId',
		'initialPrompt',
		'canSendToAssistant',
		'layout',
	],
	emits: ['continue-loaded', 'open-build', 'send-to-assistant'],
	template: '<div data-testid="agent-preview-chat-page-stub" />',
};

function mountDock() {
	return mount(AgentPreviewDock, {
		props: {
			sessionTitle: 'Order help',
			initialized: true,
			projectId: 'project-1',
			agentId: 'agent-1',
			agent: null,
			localConfig: null,
			connectedTriggers: [],
			effectiveSessionId: 'thread-1',
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

	it('renders the compact session header in the approved order', () => {
		const wrapper = mountDock();

		expect(wrapper.get('[data-testid="agent-preview-session-title"]').text()).toBe('Order help');
		expect(
			wrapper
				.get('[data-testid="agent-preview-dock-header"]')
				.findAll('button')
				.map((button) => button.attributes('data-testid')),
		).toEqual([
			'agent-preview-view-session-btn',
			'agent-preview-new-chat-btn',
			'agent-preview-close-btn',
		]);
		expect(wrapper.get('[data-testid="agent-preview-view-session-btn"]').text()).toBe(
			'agents.builder.preview.viewSession',
		);
		expect(wrapper.get('[data-testid="agent-preview-new-chat-btn"]').text()).toBe(
			'agents.builder.chat.newChat.label',
		);
		expect(
			wrapper.get('[data-testid="agent-preview-view-session-btn"]').attributes('data-variant'),
		).toBe('ghost');
		expect(
			wrapper.get('[data-testid="agent-preview-new-chat-btn"]').attributes('data-variant'),
		).toBe('subtle');
		expect(wrapper.get('[data-testid="agent-preview-close-btn"]').attributes('data-variant')).toBe(
			'ghost',
		);
		expect(wrapper.get('[data-testid="agent-preview-close-btn"] [data-icon="x"]').exists()).toBe(
			true,
		);
	});

	it('emits all dock header actions', async () => {
		const wrapper = mountDock();

		await wrapper.get('[data-testid="agent-preview-view-session-btn"]').trigger('click');
		await wrapper.get('[data-testid="agent-preview-new-chat-btn"]').trigger('click');
		await wrapper.get('[data-testid="agent-preview-close-btn"]').trigger('click');

		expect(wrapper.emitted('view-trace')).toEqual([[]]);
		expect(wrapper.emitted('new-session')).toEqual([[]]);
		expect(wrapper.emitted('close')).toEqual([[]]);
	});

	it('forwards chat events and opts the chat page into dock layout', () => {
		const wrapper = mountDock();
		const chatPage = wrapper.findComponent({ name: 'AgentPreviewChatPage' });

		expect(chatPage.props('layout')).toBe('dock');
		chatPage.vm.$emit('continue-loaded', 3);
		chatPage.vm.$emit('open-build');
		chatPage.vm.$emit('send-to-assistant', 'execution-1');

		expect(wrapper.emitted('continue-loaded')).toEqual([[3]]);
		expect(wrapper.emitted('open-build')).toEqual([[]]);
		expect(wrapper.emitted('send-to-assistant')).toEqual([['execution-1']]);
	});

	it('does not render the removed breadcrumb or session picker controls', () => {
		const wrapper = mountDock();

		expect(wrapper.find('[data-testid="stub-breadcrumbs"]').exists()).toBe(false);
		expect(wrapper.find('[data-testid="agent-preview-session-picker"]').exists()).toBe(false);
	});

	it('registers the existing new-session and close shortcuts', () => {
		mountDock();

		expect(useKeybindingsMock).toHaveBeenCalledExactlyOnceWith({
			'ctrl+shift+;': expect.any(Function),
			Escape: expect.any(Function),
		});
	});
});
