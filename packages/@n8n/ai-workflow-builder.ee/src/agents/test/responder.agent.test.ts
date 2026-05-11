import { AIMessage, HumanMessage } from '@langchain/core/messages';
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
			workflowJSON: { nodes: [], connections: {}, name: '' },
		};
	}

	it('should return the last message from agent as the response', async () => {
		const mockAgent = createMockAgent('Here is your workflow summary');

		const messages: BaseMessage[] = [new HumanMessage('Build a workflow')];
		const result = await invokeResponderAgent(mockAgent, createContext(messages));

		expect(result.response).toBeInstanceOf(AIMessage);
		expect(result.response.content).toBe('Here is your workflow summary');
	});

	it('should return fallback response when agent returns empty messages', async () => {
		const mockAgent = {
			invoke: jest.fn().mockResolvedValue({ messages: [] }),
		} as unknown as ResponderAgentType;

		const messages: BaseMessage[] = [new HumanMessage('Build a workflow')];
		const result = await invokeResponderAgent(mockAgent, createContext(messages));

		expect(result.response).toBeInstanceOf(AIMessage);
		expect(result.response.content).toContain('encountered an issue');
	});

	it('should pass messages and context to agent.invoke', async () => {
		const mockAgent = createMockAgent();
		const messages: BaseMessage[] = [
			new HumanMessage('Build a workflow'),
			new AIMessage({ content: 'Sure, I can help' }),
		];

		await invokeResponderAgent(mockAgent, createContext(messages));

		const invokeCall = (mockAgent.invoke as jest.Mock).mock.calls[0] as [
			{ messages: BaseMessage[] },
			Record<string, unknown>,
		];
		expect(invokeCall[0].messages).toHaveLength(2);
		expect(invokeCall[1].context).toEqual(
			expect.objectContaining({ coordinationLog: [], workflowJSON: expect.any(Object) }),
		);
	});
});
