import type {
	InstanceAiAgentNode,
	InstanceAiHandoffContext,
	InstanceAiMessage,
	InstanceAiToolCallState,
} from '@n8n/api-types';

import { toArtifactTurns } from '../agentTreeArtifactTurns';

function toolCall(toolCallId: string, overrides: Partial<InstanceAiToolCallState> = {}) {
	return { toolCallId, toolName: 'some-tool', args: {}, isLoading: false, ...overrides };
}

function agentNode(overrides: Partial<InstanceAiAgentNode> = {}): InstanceAiAgentNode {
	return {
		agentId: 'root',
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

function assistantMessage(agentTree: InstanceAiAgentNode): InstanceAiMessage {
	return {
		id: 'a1',
		role: 'assistant',
		createdAt: '2026-11-01T00:00:00.000Z',
		content: '',
		reasoning: '',
		isStreaming: false,
		agentTree,
	};
}

describe('toArtifactTurns', () => {
	it('keeps the attachments and the hand-off context of a user message', () => {
		const context: InstanceAiHandoffContext = {
			source: 'credential-modal',
			credential: { credentialType: 'slackApi', displayName: 'Slack' },
		};
		const [turn] = toArtifactTurns([
			{
				id: 'u1',
				role: 'user',
				createdAt: '2026-11-01T00:00:00.000Z',
				content: 'Fix it',
				reasoning: '',
				isStreaming: false,
				attachments: [{ type: 'workflow', id: 'wf-1', name: 'Digest' }],
				context,
			},
		]);

		expect(turn).toEqual({
			id: 'u1',
			role: 'user',
			isLive: false,
			toolCalls: [],
			attachments: [{ type: 'workflow', id: 'wf-1', name: 'Digest' }],
			context,
		});
	});

	it('puts the calls of a node before the calls of its sub-agents', () => {
		const tree = agentNode({
			toolCalls: [toolCall('root-1'), toolCall('root-2')],
			children: [
				agentNode({
					agentId: 'child-1',
					toolCalls: [toolCall('child-1')],
					children: [agentNode({ agentId: 'grandchild', toolCalls: [toolCall('grandchild')] })],
				}),
				agentNode({ agentId: 'child-2', toolCalls: [toolCall('child-2')] }),
			],
		});

		const [turn] = toArtifactTurns([assistantMessage(tree)]);

		expect(turn.toolCalls.map((call) => call.toolCallId)).toEqual([
			'root-1',
			'root-2',
			'child-1',
			'grandchild',
			'child-2',
		]);
	});

	it('marks the turn as live while its root agent is active', () => {
		const [completed] = toArtifactTurns([assistantMessage(agentNode())]);
		const [active] = toArtifactTurns([assistantMessage(agentNode({ status: 'active' }))]);

		expect(completed.isLive).toBe(false);
		expect(active.isLive).toBe(true);
	});

	it('keeps the setup announcement of the root agent', () => {
		const [turn] = toArtifactTurns([
			assistantMessage(
				agentNode({
					latestSetupAnnouncement: {
						workflowId: 'wf-1',
						agentId: 'root',
						timestamp: '2026-11-01T00:00:01.000Z',
					},
				}),
			),
		]);

		expect(turn.setupAnnouncement).toEqual({
			workflowId: 'wf-1',
			timestamp: '2026-11-01T00:00:01.000Z',
		});
	});
});
