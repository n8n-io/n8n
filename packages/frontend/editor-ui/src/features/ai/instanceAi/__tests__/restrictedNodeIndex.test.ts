import type {
	InstanceAiAgentNode,
	InstanceAiMessage,
	InstanceAiToolCallState,
} from '@n8n/api-types';
import { describe, expect, test } from 'vitest';
import { nextTick, ref } from 'vue';

import {
	collectRestrictedNodes,
	pickEntriesByDisplayName,
	useRestrictedNodeIndex,
} from '../restrictedNodeIndex';

const gmailTrigger = {
	nodeType: 'n8n-nodes-base.gmailTrigger',
	displayName: 'Gmail Trigger',
	scope: 'instance' as const,
};

function toolCall(
	toolCallId: string,
	restrictedNodes?: InstanceAiToolCallState['restrictedNodes'],
): InstanceAiToolCallState {
	return { toolCallId, toolName: 'nodes', args: {}, isLoading: false, restrictedNodes };
}

function agentNode(overrides: Partial<InstanceAiAgentNode> = {}): InstanceAiAgentNode {
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

function message(id: string, agentTree?: InstanceAiAgentNode): InstanceAiMessage {
	return {
		id,
		role: 'assistant',
		content: '',
		createdAt: new Date().toISOString(),
		agentTree,
	} as InstanceAiMessage;
}

describe('collectRestrictedNodes', () => {
	test('keys each restricted type by its node type, so shared display names stay apart', () => {
		const found = collectRestrictedNodes([
			message('m1', agentNode({ toolCalls: [toolCall('tc-1', [gmailTrigger])] })),
		]);

		expect([...found.keys()]).toEqual([gmailTrigger.nodeType]);
		expect(found.get(gmailTrigger.nodeType)).toEqual(gmailTrigger);
	});

	test('spans runs, so a later reply can cite what an earlier search found', () => {
		const found = collectRestrictedNodes([
			message('m1', agentNode({ toolCalls: [toolCall('tc-1', [gmailTrigger])] })),
			message('m2', agentNode({ toolCalls: [] })),
		]);

		expect(found.has(gmailTrigger.nodeType)).toBe(true);
	});

	test('reads sub-agent tool calls', () => {
		const found = collectRestrictedNodes([
			message(
				'm1',
				agentNode({
					children: [
						agentNode({ agentId: 'builder', toolCalls: [toolCall('tc-2', [gmailTrigger])] }),
					],
				}),
			),
		]);

		expect(found.has(gmailTrigger.nodeType)).toBe(true);
	});

	test('finds nothing when no tool call reports a restriction', () => {
		expect(
			collectRestrictedNodes([
				message('m1', agentNode({ toolCalls: [toolCall('tc-1')] })),
				message('m2'),
			]).size,
		).toBe(0);
	});
});

describe('useRestrictedNodeIndex', () => {
	test('follows the messages and drops what leaves the thread', async () => {
		const messages = ref<InstanceAiMessage[]>([]);
		const index = useRestrictedNodeIndex(() => messages.value);
		expect(index.size).toBe(0);

		messages.value = [message('m1', agentNode({ toolCalls: [toolCall('tc-1', [gmailTrigger])] }))];
		await nextTick();
		expect(index.get(gmailTrigger.nodeType)).toEqual(gmailTrigger);

		messages.value = [];
		await nextTick();
		expect(index.size).toBe(0);
	});

	test('keeps the same entry object when a rebuild changes nothing', async () => {
		const messages = ref<InstanceAiMessage[]>([
			message('m1', agentNode({ toolCalls: [toolCall('tc-1', [gmailTrigger])] })),
		]);
		const index = useRestrictedNodeIndex(() => messages.value);
		const before = index.get(gmailTrigger.nodeType);

		messages.value = [...messages.value];
		await nextTick();

		expect(index.get(gmailTrigger.nodeType)).toBe(before);
	});
});

describe('pickEntriesByDisplayName', () => {
	const legacy = {
		nodeType: 'n8n-nodes-base.gmailTriggerLegacy',
		displayName: 'Gmail Trigger',
		scope: 'project' as const,
	};

	test('lets the instance scope win when two types share a display name, in either order', () => {
		expect(pickEntriesByDisplayName([legacy, gmailTrigger]).get('gmail trigger')).toBe(
			gmailTrigger,
		);
		expect(pickEntriesByDisplayName([gmailTrigger, legacy]).get('gmail trigger')).toBe(
			gmailTrigger,
		);
	});

	test('keys by the lowercased display name', () => {
		expect([...pickEntriesByDisplayName([gmailTrigger]).keys()]).toEqual(['gmail trigger']);
	});
});
