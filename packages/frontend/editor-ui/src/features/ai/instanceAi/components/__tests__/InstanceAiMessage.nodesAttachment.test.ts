import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createThreadComponentRenderer } from '../../__tests__/createThreadComponentRenderer';
import { createTestingPinia } from '@pinia/testing';
import InstanceAiMessageComponent from '../InstanceAiMessage.vue';
import type { InstanceAiMessage } from '@n8n/api-types';

vi.mock('@/features/ai/chatHub/components/ChatMarkdownChunk.vue', () => ({
	default: {
		template: '<span>{{ source.content }}</span>',
		props: ['source'],
	},
}));

const renderComponent = createThreadComponentRenderer(InstanceAiMessageComponent, {
	global: {
		stubs: {
			AgentActivityTree: {
				template: '<div data-test-id="agent-activity-tree" />',
				props: ['agentNode', 'isRoot'],
			},
		},
	},
});

function makeMessage(overrides: Partial<InstanceAiMessage> = {}): InstanceAiMessage {
	return {
		id: 'msg-1',
		role: 'assistant',
		content: '',
		reasoning: '',
		isStreaming: false,
		createdAt: new Date().toISOString(),
		...overrides,
	};
}

describe('InstanceAiMessage — nodes attachment (history)', () => {
	beforeEach(() => {
		createTestingPinia({ stubActions: false });
	});

	it('renders a stored nodes attachment as chips (non-removable)', () => {
		const { getAllByTestId, queryAllByTestId } = renderComponent({
			props: {
				message: makeMessage({
					role: 'user',
					content: 'look at these',
					attachments: [
						{ type: 'nodes', workflowId: 'w1', sets: [{ nodes: [{ id: 'n1', name: 'A' }] }] },
					],
				}),
			},
		});

		expect(getAllByTestId('nodes-chip-node')).toHaveLength(1);
		expect(queryAllByTestId('nodes-chip-remove')).toHaveLength(0); // not removable in history
	});
});
