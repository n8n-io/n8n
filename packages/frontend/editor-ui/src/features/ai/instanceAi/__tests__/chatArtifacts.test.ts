import type { InstanceAiAgentNode, InstanceAiMessage } from '@n8n/api-types';
import { collectChatArtifacts } from '@n8n/chat-hub';
import { describe, expect, it } from 'vitest';

import { collectInstanceAiChatArtifactChunks } from '../chatArtifacts';

function artifactCommand(title: string, content: string): string {
	return `<command:artifact-create><title>${title}</title><type>md</type><content>${content}</content></command:artifact-create>`;
}

function makeAgentNode(overrides: Partial<InstanceAiAgentNode>): InstanceAiAgentNode {
	return {
		agentId: 'agent-root',
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

function makeAssistantMessage(overrides: Partial<InstanceAiMessage>): InstanceAiMessage {
	return {
		id: 'message-1',
		role: 'assistant',
		createdAt: '2026-04-01T00:00:00.000Z',
		content: '',
		reasoning: '',
		isStreaming: false,
		...overrides,
	};
}

describe('collectInstanceAiChatArtifactChunks', () => {
	it('collects assistant artifacts from plain message content', () => {
		const chunks = collectInstanceAiChatArtifactChunks([
			makeAssistantMessage({ content: artifactCommand('Root report', '# Root') }),
		]);

		expect(collectChatArtifacts(chunks)).toEqual([
			{ title: 'Root report', type: 'md', content: '# Root' },
		]);
	});

	it('collects agent-tree child artifacts in timeline order without duplicating root content', () => {
		const rootContent = artifactCommand('Root report', '# Root');
		const childContent = artifactCommand('Builder report', '# Builder');
		const child = makeAgentNode({
			agentId: 'agent-builder',
			role: 'workflow-builder',
			textContent: childContent,
			timeline: [{ type: 'text', content: childContent }],
		});

		const chunks = collectInstanceAiChatArtifactChunks([
			makeAssistantMessage({
				content: rootContent,
				agentTree: makeAgentNode({
					textContent: rootContent,
					timeline: [
						{ type: 'text', content: rootContent },
						{ type: 'child', agentId: 'agent-builder' },
					],
					children: [child],
				}),
			}),
		]);

		expect(collectChatArtifacts(chunks)).toEqual([
			{ title: 'Root report', type: 'md', content: '# Root' },
			{ title: 'Builder report', type: 'md', content: '# Builder' },
		]);
	});
});
