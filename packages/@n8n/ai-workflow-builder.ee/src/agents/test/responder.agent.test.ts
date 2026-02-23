import { AIMessage, HumanMessage, ToolMessage } from '@langchain/core/messages';
import type { BaseMessage } from '@langchain/core/messages';

import {
	invokeResponderAgent,
	type ResponderAgentType,
	type ResponderContext,
} from '../responder.agent';

describe('invokeResponderAgent', () => {
	function createMockAgent(responseContent = 'Test response'): ResponderAgentType {
		return {
			invoke: jest.fn().mockResolvedValue({
				messages: [new AIMessage({ content: responseContent })],
			}),
		} as unknown as ResponderAgentType;
	}

	function createContext(messages: BaseMessage[]): ResponderContext {
		return {
			messages,
			coordinationLog: [],
			workflowJSON: { nodes: [], connections: {} },
		};
	}

	it('should strip cache_control markers from messages before invoking the agent', async () => {
		const mockAgent = createMockAgent();

		// Messages with cache_control markers (as they would arrive from subgraph persistence)
		const messages: BaseMessage[] = [
			new HumanMessage('Build a workflow'),
			new AIMessage({
				content: '',
				tool_calls: [{ name: 'add_node', args: {}, id: 'call-1' }],
			}),
			new ToolMessage({
				content: [{ type: 'text', text: 'Node added', cache_control: { type: 'ephemeral' } }],
				tool_call_id: 'call-1',
			}),
		];

		await invokeResponderAgent(mockAgent, createContext(messages));

		// Verify the messages passed to agent.invoke have been stripped
		const invokeCall = (mockAgent.invoke as jest.Mock).mock.calls[0];
		const passedMessages = invokeCall[0].messages as BaseMessage[];

		const toolMsg = passedMessages[2];
		expect(Array.isArray(toolMsg.content)).toBe(true);
		const block = (toolMsg.content as Array<Record<string, unknown>>)[0];
		expect(block.cache_control).toBeUndefined();
	});

	it('should strip multiple cache_control markers across messages', async () => {
		const mockAgent = createMockAgent();

		const messages: BaseMessage[] = [
			new HumanMessage({
				content: [{ type: 'text', text: 'Build a workflow', cache_control: { type: 'ephemeral' } }],
			}),
			new AIMessage({
				content: '',
				tool_calls: [{ name: 'search', args: {}, id: 'call-1' }],
			}),
			new ToolMessage({
				content: [{ type: 'text', text: 'Found nodes', cache_control: { type: 'ephemeral' } }],
				tool_call_id: 'call-1',
			}),
			new AIMessage({
				content: '',
				tool_calls: [{ name: 'add_node', args: {}, id: 'call-2' }],
			}),
			new ToolMessage({
				content: [{ type: 'text', text: 'Node added', cache_control: { type: 'ephemeral' } }],
				tool_call_id: 'call-2',
			}),
		];

		await invokeResponderAgent(mockAgent, createContext(messages));

		const invokeCall = (mockAgent.invoke as jest.Mock).mock.calls[0];
		const passedMessages = invokeCall[0].messages as BaseMessage[];

		// Verify all cache_control markers are stripped
		for (const msg of passedMessages) {
			if (Array.isArray(msg.content)) {
				for (const block of msg.content) {
					expect((block as Record<string, unknown>).cache_control).toBeUndefined();
				}
			}
		}
	});

	it('should handle messages without cache_control markers', async () => {
		const mockAgent = createMockAgent();

		const messages: BaseMessage[] = [
			new HumanMessage('Build a workflow'),
			new AIMessage({ content: 'Sure, I can help' }),
		];

		const result = await invokeResponderAgent(mockAgent, createContext(messages));

		expect(result.response).toBeInstanceOf(AIMessage);
		expect(result.response.content).toBe('Test response');
	});
});
