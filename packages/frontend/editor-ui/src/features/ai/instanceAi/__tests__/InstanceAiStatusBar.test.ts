import { describe, it, expect, beforeEach } from 'vitest';
import { createTestingPinia } from '@pinia/testing';
import type { InstanceAiAgentNode, InstanceAiMessage } from '@n8n/api-types';
import { createThreadComponentRenderer } from './createThreadComponentRenderer';
import InstanceAiStatusBar from '../components/InstanceAiStatusBar.vue';
import type { ThreadRuntime } from '../instanceAi.store';

let thread: ThreadRuntime;
const renderComponent = createThreadComponentRenderer(InstanceAiStatusBar, {}, () => thread);

function makeAgentNode(overrides: Partial<InstanceAiAgentNode> = {}): InstanceAiAgentNode {
	return {
		agentId: 'agent-1',
		role: 'orchestrator',
		status: 'completed',
		textContent: '',
		reasoning: '',
		toolCalls: [],
		children: [],
		timeline: [],
		...overrides,
	};
}

/** A finished orchestrator turn with a builder still running in the background. */
function messageWithActiveBuilder(builder: Partial<InstanceAiAgentNode>): InstanceAiMessage {
	return {
		id: 'msg-1',
		role: 'assistant',
		content: '',
		reasoning: '',
		isStreaming: false,
		createdAt: '2026-09-08T00:00:00.000Z',
		agentTree: makeAgentNode({
			children: [
				makeAgentNode({
					agentId: 'builder-1',
					kind: 'builder',
					role: 'workflow-builder',
					status: 'active',
					...builder,
				}),
			],
		}),
	};
}

describe('InstanceAiStatusBar', () => {
	beforeEach(() => {
		createTestingPinia();
	});

	function renderWith(builder: Partial<InstanceAiAgentNode>) {
		thread = {
			id: 'thread-1',
			messages: [messageWithActiveBuilder(builder)],
			isStreaming: false,
			isAwaitingConfirmation: false,
		} as unknown as ThreadRuntime;
		return renderComponent();
	}

	it('labels the bar with the active builder title', () => {
		const { getByTestId } = renderWith({ title: 'Building workflow' });

		expect(getByTestId('instance-ai-status-bar')).toHaveTextContent('Building workflow');
	});

	it('falls back to the role label when the title is blank', () => {
		const { getByTestId } = renderWith({ title: '' });

		expect(getByTestId('instance-ai-status-bar')).toHaveTextContent('Building workflow');
	});
});
