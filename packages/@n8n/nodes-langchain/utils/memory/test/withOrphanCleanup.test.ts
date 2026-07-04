import { AIMessage, HumanMessage, ToolMessage } from '@langchain/core/messages';
import type { Mocked } from 'vitest';
import { mock } from 'vitest-mock-extended';

import { withOrphanCleanup, type ChatMemoryWithKey } from '../withOrphanCleanup';

describe('withOrphanCleanup', () => {
	let mockMemory: Mocked<ChatMemoryWithKey>;

	beforeEach(() => {
		vi.clearAllMocks();
		mockMemory = mock<ChatMemoryWithKey>();
		mockMemory.memoryKey = 'chat_history';
	});

	it('strips a leading orphaned ToolMessage (window cut mid tool-call sequence)', async () => {
		const orphanToolMessage = new ToolMessage({ content: '42', tool_call_id: 'call-1' });
		const humanMessage = new HumanMessage('Thanks');
		const aiMessage = new AIMessage('You are welcome');

		mockMemory.loadMemoryVariables.mockResolvedValue({
			chat_history: [orphanToolMessage, humanMessage, aiMessage],
		});

		const wrapped = withOrphanCleanup(mockMemory);
		const result = await wrapped.loadMemoryVariables({});

		expect(result.chat_history).toEqual([humanMessage, aiMessage]);
	});

	it('strips a leading orphaned AIMessage(tool_calls) with no following ToolMessage', async () => {
		const orphanAIMessage = new AIMessage({
			content: '',
			tool_calls: [{ id: 'call-1', name: 'search', args: {}, type: 'tool_call' }],
		});
		const humanMessage = new HumanMessage('Hello again');

		mockMemory.loadMemoryVariables.mockResolvedValue({
			chat_history: [orphanAIMessage, humanMessage],
		});

		const wrapped = withOrphanCleanup(mockMemory);
		const result = await wrapped.loadMemoryVariables({});

		expect(result.chat_history).toEqual([humanMessage]);
	});

	it('leaves a valid, intact tool-call sequence untouched', async () => {
		const aiMessage = new AIMessage({
			content: '',
			tool_calls: [{ id: 'call-1', name: 'search', args: {}, type: 'tool_call' }],
		});
		const toolMessage = new ToolMessage({ content: 'result', tool_call_id: 'call-1' });
		const chatHistory = [aiMessage, toolMessage];

		mockMemory.loadMemoryVariables.mockResolvedValue({ chat_history: chatHistory });

		const wrapped = withOrphanCleanup(mockMemory);
		const result = await wrapped.loadMemoryVariables({});

		expect(result.chat_history).toEqual(chatHistory);
	});

	it('passes through non-array / missing history untouched', async () => {
		mockMemory.loadMemoryVariables.mockResolvedValue({});

		const wrapped = withOrphanCleanup(mockMemory);
		const result = await wrapped.loadMemoryVariables({});

		expect(result).toEqual({});
	});

	it('forwards the input values to the original loadMemoryVariables', async () => {
		mockMemory.loadMemoryVariables.mockResolvedValue({ chat_history: [] });

		const originalSpy = mockMemory.loadMemoryVariables;
		const wrapped = withOrphanCleanup(mockMemory);
		await wrapped.loadMemoryVariables({ input: 'hi' });

		expect(originalSpy).toHaveBeenCalledWith({ input: 'hi' });
	});
});
