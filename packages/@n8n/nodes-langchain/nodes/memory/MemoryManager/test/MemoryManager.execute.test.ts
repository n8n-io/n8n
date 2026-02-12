/* eslint-disable @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/unbound-method, @typescript-eslint/no-explicit-any */
import type { BaseChatMemory } from '@langchain/community/memory/chat_memory';
import type { BaseMessage } from '@langchain/core/messages';
import { SystemMessage } from '@langchain/core/messages';
import { mock } from 'jest-mock-extended';
import type { IExecuteFunctions, INode, INodeExecutionData } from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';

import { MemoryManager } from '../MemoryManager.node';

/**
 * These tests verify that the Memory Manager resolves sub-node expressions
 * (e.g. Session ID) per input item, not just once for item 0.
 *
 * See: https://github.com/n8n-io/n8n/issues/23890
 */

interface MockMemory {
	memory: BaseChatMemory;
	getMessages: jest.Mock;
	addMessage: jest.Mock;
	clear: jest.Mock;
}

function createMockMemory(messages: BaseMessage[] = []): MockMemory {
	const getMessages = jest.fn().mockResolvedValue([...messages]);
	const addMessage = jest.fn().mockResolvedValue(undefined);
	const clear = jest.fn().mockResolvedValue(undefined);

	const memory = { chatHistory: { getMessages, addMessage, clear } } as unknown as BaseChatMemory;

	return { memory, getMessages, addMessage, clear };
}

function createMockContext() {
	const mockHelpers = mock<IExecuteFunctions['helpers']>();
	(mockHelpers.constructExecutionMetaData as any).mockImplementation(
		(items: INodeExecutionData[], meta: { itemData: any }) =>
			items.map((item) => ({ ...item, pairedItem: meta.itemData })),
	);
	mockHelpers.returnJsonArray.mockImplementation(
		(data) =>
			(Array.isArray(data) ? data : [data]).map((d) => ({
				json: d,
			})) as INodeExecutionData[],
	);

	const ctx = mock<IExecuteFunctions>({ helpers: mockHelpers });
	ctx.getNode.mockReturnValue({
		name: 'Chat Memory Manager',
		typeVersion: 1.1,
		parameters: {},
	} as INode);

	return ctx;
}

describe('MemoryManager.execute - multi-item session context', () => {
	let node: MemoryManager;

	beforeEach(() => {
		node = new MemoryManager();
		jest.clearAllMocks();
	});

	describe('insert mode', () => {
		it('should request memory with correct itemIndex for each input item', async () => {
			const ctx = createMockContext();

			ctx.getInputData.mockReturnValue([
				{ json: { name: 'First item', code: 1 } },
				{ json: { name: 'Second item', code: 2 } },
				{ json: { name: 'Third item', code: 3 } },
			]);

			ctx.getNodeParameter.mockImplementation((param, _i, defaultValue) => {
				if (param === 'mode') return 'insert';
				if (param === 'insertMode') return 'insert';
				if (param === 'messages.messageValues')
					return [{ type: 'system', message: 'test', hideFromUI: false }];
				return defaultValue;
			});

			const memories = [createMockMemory(), createMockMemory(), createMockMemory()];
			ctx.getInputConnectionData
				.mockResolvedValueOnce(memories[0].memory)
				.mockResolvedValueOnce(memories[1].memory)
				.mockResolvedValueOnce(memories[2].memory);

			await node.execute.call(ctx);

			expect(ctx.getInputConnectionData).toHaveBeenCalledTimes(3);
			expect(ctx.getInputConnectionData).toHaveBeenNthCalledWith(
				1,
				NodeConnectionTypes.AiMemory,
				0,
			);
			expect(ctx.getInputConnectionData).toHaveBeenNthCalledWith(
				2,
				NodeConnectionTypes.AiMemory,
				1,
			);
			expect(ctx.getInputConnectionData).toHaveBeenNthCalledWith(
				3,
				NodeConnectionTypes.AiMemory,
				2,
			);
		});

		it('should insert messages into separate sessions for each item', async () => {
			const ctx = createMockContext();

			ctx.getInputData.mockReturnValue([
				{ json: { name: 'First item', code: 1 } },
				{ json: { name: 'Second item', code: 2 } },
			]);

			ctx.getNodeParameter.mockImplementation((param, i, defaultValue) => {
				if (param === 'mode') return 'insert';
				if (param === 'insertMode') return 'insert';
				if (param === 'messages.messageValues')
					return [{ type: 'system', message: `Message for item ${i}`, hideFromUI: false }];
				return defaultValue;
			});

			const mock1 = createMockMemory();
			const mock2 = createMockMemory();

			ctx.getInputConnectionData
				.mockResolvedValueOnce(mock1.memory)
				.mockResolvedValueOnce(mock2.memory);

			await node.execute.call(ctx);

			expect(mock1.addMessage).toHaveBeenCalledTimes(1);
			expect(mock2.addMessage).toHaveBeenCalledTimes(1);
		});

		it('should not cross-contaminate sessions in override mode with multiple items', async () => {
			const ctx = createMockContext();

			ctx.getInputData.mockReturnValue([
				{ json: { name: 'First item', code: 1 } },
				{ json: { name: 'Second item', code: 2 } },
			]);

			ctx.getNodeParameter.mockImplementation((param, i, defaultValue) => {
				if (param === 'mode') return 'insert';
				if (param === 'insertMode') return 'override';
				if (param === 'messages.messageValues') {
					const names = ['First item', 'Second item'];
					return [{ type: 'system', message: names[i], hideFromUI: false }];
				}
				return defaultValue;
			});

			const mock1 = createMockMemory();
			const mock2 = createMockMemory();

			ctx.getInputConnectionData
				.mockResolvedValueOnce(mock1.memory)
				.mockResolvedValueOnce(mock2.memory);

			await node.execute.call(ctx);

			// Each memory should be cleared and written to exactly once
			expect(mock1.clear).toHaveBeenCalledTimes(1);
			expect(mock2.clear).toHaveBeenCalledTimes(1);
			expect(mock1.addMessage).toHaveBeenCalledTimes(1);
			expect(mock2.addMessage).toHaveBeenCalledTimes(1);
		});
	});

	describe('load mode', () => {
		it('should load messages from the correct session for each item', async () => {
			const ctx = createMockContext();

			ctx.getInputData.mockReturnValue([
				{ json: { sessionId: 'session-A' } },
				{ json: { sessionId: 'session-B' } },
			]);

			ctx.getNodeParameter.mockImplementation((param, _i, defaultValue) => {
				if (param === 'mode') return 'load';
				if (param === 'simplifyOutput') return true;
				if (param === 'options') return { groupMessages: false };
				return defaultValue;
			});

			const mockA = createMockMemory([new SystemMessage('Message from session A')]);
			const mockB = createMockMemory([new SystemMessage('Message from session B')]);

			ctx.getInputConnectionData
				.mockResolvedValueOnce(mockA.memory)
				.mockResolvedValueOnce(mockB.memory);

			const result = await node.execute.call(ctx);

			expect(result[0]).toHaveLength(2);

			const item0Message = result[0][0].json;
			const item1Message = result[0][1].json;

			expect(item0Message).toHaveProperty('system', 'Message from session A');
			expect(item1Message).toHaveProperty('system', 'Message from session B');
		});
	});

	describe('delete mode', () => {
		it('should delete messages from the correct session for each item', async () => {
			const ctx = createMockContext();

			ctx.getInputData.mockReturnValue([{ json: { code: 1 } }, { json: { code: 2 } }]);

			ctx.getNodeParameter.mockImplementation((param, _i, defaultValue) => {
				if (param === 'mode') return 'delete';
				if (param === 'deleteMode') return 'all';
				return defaultValue;
			});

			const mock1 = createMockMemory([new SystemMessage('Session 1 msg')]);
			const mock2 = createMockMemory([new SystemMessage('Session 2 msg')]);

			ctx.getInputConnectionData
				.mockResolvedValueOnce(mock1.memory)
				.mockResolvedValueOnce(mock2.memory);

			await node.execute.call(ctx);

			expect(mock1.clear).toHaveBeenCalledTimes(1);
			expect(mock2.clear).toHaveBeenCalledTimes(1);
		});

		it('should delete last N messages from the correct session for each item', async () => {
			const ctx = createMockContext();

			ctx.getInputData.mockReturnValue([{ json: { code: 1 } }, { json: { code: 2 } }]);

			ctx.getNodeParameter.mockImplementation((param, _i, defaultValue) => {
				if (param === 'mode') return 'delete';
				if (param === 'deleteMode') return 'lastN';
				if (param === 'lastMessagesCount') return 1;
				return defaultValue;
			});

			const mock1 = createMockMemory([
				new SystemMessage('Session 1 keep'),
				new SystemMessage('Session 1 delete'),
			]);
			const mock2 = createMockMemory([
				new SystemMessage('Session 2 keep'),
				new SystemMessage('Session 2 delete'),
			]);

			ctx.getInputConnectionData
				.mockResolvedValueOnce(mock1.memory)
				.mockResolvedValueOnce(mock2.memory);

			await node.execute.call(ctx);

			expect(mock1.clear).toHaveBeenCalledTimes(1);
			expect(mock2.clear).toHaveBeenCalledTimes(1);

			// After deleting last 1 message, each memory should have its "keep" message re-added
			expect(mock1.addMessage).toHaveBeenCalledWith(
				expect.objectContaining({ content: 'Session 1 keep' }),
			);
			expect(mock2.addMessage).toHaveBeenCalledWith(
				expect.objectContaining({ content: 'Session 2 keep' }),
			);
		});
	});
});
