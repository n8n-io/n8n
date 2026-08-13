import { describe, expect, test } from 'vitest';
import type { InstanceAiAgentNode, InstanceAiMessage } from '@n8n/api-types';
import { messageHasVisibleContent } from '../builderAgents';

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

function makeMessage(agentTree: InstanceAiAgentNode): InstanceAiMessage {
	return {
		id: 'msg-1',
		role: 'assistant',
		content: '',
		reasoning: '',
		isStreaming: false,
		createdAt: '2026-04-01T00:00:00.000Z',
		agentTree,
	};
}

describe('messageHasVisibleContent', () => {
	test('hides the assistant shell when the only content is a build-agent row from the same response as an active builder child', () => {
		const builderChild = makeAgentNode({
			agentId: 'builder-1',
			role: 'agent-builder',
			kind: 'agent-builder',
			status: 'active',
		});

		const message = makeMessage(
			makeAgentNode({
				timeline: [
					{ type: 'tool-call', toolCallId: 'tc-build', responseId: 'r1' },
					{ type: 'child', agentId: 'builder-1', responseId: 'r1' },
				],
				toolCalls: [{ toolCallId: 'tc-build', toolName: 'build-agent', args: {}, isLoading: true }],
				children: [builderChild],
			}),
		);

		expect(messageHasVisibleContent(message)).toBe(false);
	});

	test('keeps an earlier build-agent row visible when a later response spawns the active builder child', () => {
		const builderChild = makeAgentNode({
			agentId: 'builder-1',
			role: 'agent-builder',
			kind: 'agent-builder',
			status: 'active',
		});

		const message = makeMessage(
			makeAgentNode({
				timeline: [
					{ type: 'tool-call', toolCallId: 'tc-build-old', responseId: 'r1' },
					{ type: 'child', agentId: 'builder-1', responseId: 'r2' },
				],
				toolCalls: [
					{ toolCallId: 'tc-build-old', toolName: 'build-agent', args: {}, isLoading: false },
				],
				children: [builderChild],
			}),
		);

		expect(messageHasVisibleContent(message)).toBe(true);
	});
});
