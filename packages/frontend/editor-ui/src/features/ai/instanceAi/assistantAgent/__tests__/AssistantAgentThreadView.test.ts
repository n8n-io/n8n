import { createTestingPinia } from '@pinia/testing';
import { flushPromises } from '@vue/test-utils';
import { setActivePinia } from 'pinia';
import { defineComponent, h } from 'vue';

import { createComponentRenderer } from '@/__tests__/render';

import { stashPendingAssistantAgentMessage } from '../assistantAgentThreads';
import AssistantAgentThreadView from '../AssistantAgentThreadView.vue';

const { panelProps, sendMessageFromOutside } = vi.hoisted(() => ({
	panelProps: { current: {} as Record<string, unknown> },
	sendMessageFromOutside: vi.fn(),
}));

vi.mock('@/features/agents/components/AgentChatPanel.vue', () => ({
	default: defineComponent({
		inheritAttrs: false,
		setup(_props, { attrs, expose }) {
			expose({ sendMessageFromOutside });
			return () => {
				panelProps.current = { ...attrs };
				return h('div', { 'data-test-id': 'agent-chat-panel-stub' });
			};
		},
	}),
}));

const renderView = createComponentRenderer(AssistantAgentThreadView);

describe('AssistantAgentThreadView', () => {
	beforeEach(() => {
		setActivePinia(createTestingPinia());
		sendMessageFromOutside.mockReset();
		panelProps.current = {};
	});

	it('opens the chat of the Assistant agent on the system channel', async () => {
		renderView({ props: { threadId: 'thread-1', projectId: 'project-1' } });
		await flushPromises();

		expect(panelProps.current).toMatchObject({
			'project-id': 'project-1',
			'agent-id': 'assistant',
			'continue-session-id': 'thread-1',
			'new-session': false,
			channel: 'system',
		});
		expect(sendMessageFromOutside).not.toHaveBeenCalled();
	});

	it('sends the first message of a new thread, with its references in the first client context', async () => {
		const file = new File(['data'], 'report.pdf', { type: 'application/pdf' });
		const reference = { type: 'workflow' as const, id: 'wf-1', name: 'Digest' };
		stashPendingAssistantAgentMessage({
			threadId: 'thread-2',
			text: 'Build a digest',
			files: [file],
			references: [reference],
		});

		renderView({ props: { threadId: 'thread-2', projectId: 'project-1' } });
		await flushPromises();

		expect(panelProps.current['new-session']).toBe(true);
		expect(sendMessageFromOutside).toHaveBeenCalledWith('Build a digest', [file]);

		const clientContext = panelProps.current['client-context'] as () => Record<string, unknown>;
		expect(clientContext()).toMatchObject({
			timeZone: expect.any(String),
			attachments: [reference],
		});
		expect(clientContext()).not.toHaveProperty('attachments');
	});
});
