import { describe, test, expect, vi, beforeEach } from 'vitest';
import { reactive, ref, nextTick, type Ref } from 'vue';
import type {
	InstanceAiMessage,
	InstanceAiAgentNode,
	InstanceAiToolCallState,
} from '@n8n/api-types';
import { useAgentMutationRefresh } from '../useAgentMutationRefresh';
import { agentsEventBus } from '@/features/agents/agents.eventBus';
import type { ThreadRuntime } from '../../instanceAi.store';

function makeToolCall(overrides: Partial<InstanceAiToolCallState>): InstanceAiToolCallState {
	return {
		toolCallId: 'tc-1',
		toolName: 'some-tool',
		args: {},
		isLoading: false,
		...overrides,
	};
}

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

function makeMessage(overrides: Partial<InstanceAiMessage> = {}): InstanceAiMessage {
	return {
		id: 'msg-1',
		role: 'assistant',
		content: '',
		createdAt: new Date().toISOString(),
		...overrides,
	} as InstanceAiMessage;
}

function makeConfigMutationTree(toolCallId: string) {
	return makeAgentNode({
		toolCalls: [
			makeToolCall({
				toolCallId,
				toolName: 'patch_config',
				isLoading: false,
				result: { ok: true, configMutated: true, agentId: 'agent-1' },
			}),
		],
	});
}

function createMockThread() {
	const messages = ref<InstanceAiMessage[]>([]) as Ref<InstanceAiMessage[]>;
	const isHydratingThread = ref(false);
	return reactive({ id: 'thread-1', messages, isHydratingThread });
}

describe('useAgentMutationRefresh', () => {
	beforeEach(() => {
		vi.restoreAllMocks();
	});

	test('emits agentUpdated for each new config mutation', async () => {
		const emitSpy = vi.spyOn(agentsEventBus, 'emit');
		const thread = createMockThread();
		useAgentMutationRefresh(thread as unknown as ThreadRuntime);

		thread.messages = [makeMessage({ agentTree: makeConfigMutationTree('tc-1') })];
		await nextTick();

		expect(emitSpy).toHaveBeenCalledWith('agentUpdated', {
			agentId: 'agent-1',
			source: 'instance-ai',
		});

		thread.messages = [makeMessage({ agentTree: makeConfigMutationTree('tc-2') })];
		await nextTick();

		expect(emitSpy).toHaveBeenCalledTimes(2);
		expect(emitSpy).toHaveBeenNthCalledWith(2, 'agentUpdated', {
			agentId: 'agent-1',
			source: 'instance-ai',
		});
	});

	test('does not emit again when the same config mutation is re-assigned', async () => {
		const emitSpy = vi.spyOn(agentsEventBus, 'emit');
		const thread = createMockThread();
		useAgentMutationRefresh(thread as unknown as ThreadRuntime);

		thread.messages = [makeMessage({ agentTree: makeConfigMutationTree('tc-1') })];
		await nextTick();
		expect(emitSpy).toHaveBeenCalledTimes(1);

		// Same toolCallId re-assigned (e.g. an unrelated re-render) - no new mutation.
		thread.messages = [makeMessage({ agentTree: makeConfigMutationTree('tc-1') })];
		await nextTick();
		expect(emitSpy).toHaveBeenCalledTimes(1);

		// A message with no config mutation at all.
		thread.messages = [makeMessage({ agentTree: makeAgentNode() })];
		await nextTick();
		expect(emitSpy).toHaveBeenCalledTimes(1);
	});

	test('does not emit while hydrating the thread', async () => {
		const emitSpy = vi.spyOn(agentsEventBus, 'emit');
		const thread = createMockThread();
		thread.isHydratingThread = true;
		useAgentMutationRefresh(thread as unknown as ThreadRuntime);

		thread.messages = [makeMessage({ agentTree: makeConfigMutationTree('tc-1') })];
		await nextTick();

		expect(emitSpy).not.toHaveBeenCalled();
	});
});
