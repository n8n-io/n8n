import { describe, expect, it } from 'vitest';
import type {
	InstanceAiAgentNode,
	InstanceAiMessage,
	InstanceAiToolCallState,
} from '@n8n/api-types';

import { collectToolCalls } from '../agentTreeToolCalls';

function makeToolCall(toolCallId: string): InstanceAiToolCallState {
	return { toolCallId, toolName: 'some-tool', args: {}, isLoading: false };
}

function makeAgentNode(
	toolCallIds: string[],
	children: InstanceAiAgentNode[] = [],
): InstanceAiAgentNode {
	return {
		agentId: 'agent',
		role: 'orchestrator',
		status: 'completed',
		textContent: '',
		reasoning: '',
		toolCalls: toolCallIds.map(makeToolCall),
		children,
		timeline: [],
	};
}

function makeMessage(agentTree?: InstanceAiAgentNode): InstanceAiMessage {
	return {
		id: 'msg',
		role: agentTree ? 'assistant' : 'user',
		createdAt: '2026-10-07T00:00:00.000Z',
		content: '',
		reasoning: '',
		isStreaming: false,
		agentTree,
	};
}

const ids = (calls: InstanceAiToolCallState[]) => calls.map((call) => call.toolCallId);

describe('collectToolCalls', () => {
	it('returns no calls for no messages', () => {
		expect(collectToolCalls([])).toEqual([]);
	});

	it('skips messages without an agent tree', () => {
		const messages = [makeMessage(), makeMessage(makeAgentNode(['a'])), makeMessage()];

		expect(ids(collectToolCalls(messages))).toEqual(['a']);
	});

	it('lists calls in message order', () => {
		const messages = [makeMessage(makeAgentNode(['a', 'b'])), makeMessage(makeAgentNode(['c']))];

		expect(ids(collectToolCalls(messages))).toEqual(['a', 'b', 'c']);
	});

	it('lists the calls of a node before the calls of its nested children', () => {
		const tree = makeAgentNode(
			['root-1', 'root-2'],
			[makeAgentNode(['child-1'], [makeAgentNode(['grandchild-1'])]), makeAgentNode(['child-2'])],
		);

		expect(ids(collectToolCalls([makeMessage(tree)]))).toEqual([
			'root-1',
			'root-2',
			'child-1',
			'grandchild-1',
			'child-2',
		]);
	});

	it('returns the same call objects, not copies', () => {
		const tree = makeAgentNode(['a']);

		expect(collectToolCalls([makeMessage(tree)])[0]).toBe(tree.toolCalls[0]);
	});
});
