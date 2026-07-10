/* eslint-disable import-x/no-extraneous-dependencies -- test-only pattern */
import { mount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';

import AgentBuilderChatColumn from '../components/AgentBuilderChatColumn.vue';

vi.mock('@n8n/i18n', () => ({
	useI18n: () => ({ baseText: (key: string) => key }),
	i18n: { baseText: (key: string) => key },
}));

function mountChatColumn({
	isBuildChatStreaming,
	chatActionsDisabled = false,
}: {
	isBuildChatStreaming: boolean;
	chatActionsDisabled?: boolean;
}) {
	return mount(AgentBuilderChatColumn, {
		props: {
			initialized: true,
			projectId: 'p1',
			agentId: 'a1',
			agentName: 'Agent One',
			agent: null,
			localConfig: null,
			connectedTriggers: [],
			isBuilderConfigured: true,
			isFullWidth: false,
			canEditAgent: true,
			isBuildChatStreaming,
		},
		global: {
			stubs: {
				N8nButton: {
					template: '<button @click="$emit(\'click\')"><slot /><slot name="icon" /></button>',
					emits: ['click'],
				},
				N8nIcon: {
					template: '<span :data-icon="icon" />',
					props: ['icon'],
				},
				N8nTooltip: { template: '<span><slot /></span>' },
				AgentBuilderUnconfiguredEmptyState: { template: '<div />' },
				AgentChatPanel: {
					name: 'AgentChatPanel',
					template: '<div><slot name="above-input" :disabled="chatActionsDisabled" /></div>',
					props: [
						'inputDraft',
						'projectId',
						'agentId',
						'mode',
						'endpoint',
						'initialMessage',
						'agentConfig',
						'agentStatus',
						'connectedTriggers',
						'canEditAgent',
						'beforeSend',
						'chatActionsDisabled',
					],
					data: () => ({ chatActionsDisabled }),
				},
				AgentChatQuickActions: {
					name: 'AgentChatQuickActions',
					template: '<div data-testid="stub-agent-chat-quick-actions" />',
					props: [
						'tools',
						'mcpServers',
						'projectId',
						'agentId',
						'connectedTriggers',
						'isPublished',
						'disabled',
					],
				},
			},
		},
	});
}

describe('AgentBuilderChatColumn', () => {
	it('emits hide when the floating hide button is clicked', async () => {
		const wrapper = mountChatColumn({ isBuildChatStreaming: false });

		await wrapper.find('[data-testid="agent-build-chat-hide-toggle"]').trigger('click');

		expect(wrapper.emitted('hide')).toEqual([[]]);
	});

	it('uses a close-panel arrow icon for the floating hide button', () => {
		const wrapper = mountChatColumn({ isBuildChatStreaming: false });

		expect(
			wrapper
				.find('[data-testid="agent-build-chat-hide-toggle"] [data-icon="panel-left-close"]')
				.exists(),
		).toBe(true);
	});

	it('disables quick actions while the build chat is streaming', () => {
		const wrapper = mountChatColumn({ isBuildChatStreaming: true });

		expect(wrapper.findComponent({ name: 'AgentChatQuickActions' }).props('disabled')).toBe(true);
	});

	it('disables quick actions while the chat panel has an open HITL interaction', () => {
		const wrapper = mountChatColumn({
			isBuildChatStreaming: false,
			chatActionsDisabled: true,
		});

		expect(wrapper.findComponent({ name: 'AgentChatQuickActions' }).props('disabled')).toBe(true);
	});

	it('keeps quick actions enabled while the build chat is idle', () => {
		const wrapper = mountChatColumn({ isBuildChatStreaming: false });

		expect(wrapper.findComponent({ name: 'AgentChatQuickActions' }).props('disabled')).toBe(false);
	});
});
