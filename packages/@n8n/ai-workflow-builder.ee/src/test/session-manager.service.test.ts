import { AIMessage, HumanMessage, ToolMessage } from '@langchain/core/messages';
import { MemorySaver } from '@langchain/langgraph';
import type { Logger } from '@n8n/backend-common';
import { mock, mockClear } from 'jest-mock-extended';
import type { INodeTypeDescription } from 'n8n-workflow';

import { SessionManagerService } from '@/session-manager.service';
import { getBuilderToolsForDisplay } from '@/tools/builder-tools';
import * as streamProcessor from '@/utils/stream-processor';

jest.mock('@langchain/langgraph', () => ({
	MemorySaver: jest.fn(),
}));
jest.mock('../utils/stream-processor');
jest.mock('../tools/builder-tools', () => ({
	getBuilderToolsForDisplay: jest.fn().mockReturnValue([]),
}));

describe('SessionManagerService', () => {
	let service: SessionManagerService;
	let mockLogger: ReturnType<typeof mock<Logger>>;
	let mockMemorySaver: ReturnType<typeof mock<MemorySaver>>;
	let mockParsedNodeTypes: INodeTypeDescription[];
	let formatMessagesSpy: jest.SpyInstance;

	const MockedMemorySaver = MemorySaver as jest.MockedClass<typeof MemorySaver>;

	beforeEach(() => {
		mockLogger = mock<Logger>();
		mockMemorySaver = mock<MemorySaver>();
		mockParsedNodeTypes = [
			{
				displayName: 'HTTP Request',
				name: 'n8n-nodes-base.httpRequest',
				group: ['transform'],
				version: 1,
				description: 'Makes HTTP requests',
				defaults: { name: 'HTTP Request' },
				inputs: ['main'],
				outputs: ['main'],
				properties: [],
			},
		];

		MockedMemorySaver.mockImplementation(() => mockMemorySaver);

		// Mock formatMessages to return a simple formatted array
		formatMessagesSpy = jest.spyOn(streamProcessor, 'formatMessages').mockImplementation(() => [
			{ role: 'human', content: 'Hello' },
			{ role: 'assistant', content: 'Hi there!' },
		]);

		service = new SessionManagerService(mockParsedNodeTypes, mockLogger);
	});

	afterEach(() => {
		mockClear(mockLogger);
		mockClear(mockMemorySaver);
		jest.clearAllMocks();
	});

	describe('constructor', () => {
		it('should initialize with provided dependencies', () => {
			expect(service).toBeDefined();
			expect(MockedMemorySaver).toHaveBeenCalled();
		});

		it('should work without logger', () => {
			const serviceWithoutLogger = new SessionManagerService(mockParsedNodeTypes);
			expect(serviceWithoutLogger).toBeDefined();
		});
	});

	describe('generateThreadId', () => {
		it('should generate thread ID with workflowId and userId', () => {
			const threadId = SessionManagerService.generateThreadId('workflow-123', 'user-456');
			expect(threadId).toBe('workflow-workflow-123-user-user-456');
		});

		it('should generate thread ID with workflowId but without userId', () => {
			const threadId = SessionManagerService.generateThreadId('workflow-123');
			expect(threadId).toMatch(/^workflow-workflow-123-user-\d+$/);
		});

		it('should generate random UUID when no workflowId provided', () => {
			const threadId = SessionManagerService.generateThreadId();
			// UUID v4 format check
			expect(threadId).toMatch(
				/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
			);
		});

		it('should generate random UUID when workflowId is undefined', () => {
			const threadId = SessionManagerService.generateThreadId(undefined, 'user-123');
			expect(threadId).toMatch(
				/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
			);
		});
	});

	describe('getCheckpointer', () => {
		it('should return the checkpointer instance', () => {
			const checkpointer = service.getCheckpointer();
			expect(checkpointer).toBe(mockMemorySaver);
		});

		it('should always return the same checkpointer instance', () => {
			const checkpointer1 = service.getCheckpointer();
			const checkpointer2 = service.getCheckpointer();
			expect(checkpointer1).toBe(checkpointer2);
		});
	});

	describe('getSessions', () => {
		it('should return empty sessions when no workflowId provided', async () => {
			const result = await service.getSessions(undefined, 'user-123');

			expect(result).toEqual({ sessions: [] });
			expect(mockMemorySaver.getTuple).not.toHaveBeenCalled();
		});

		it('should return session when checkpoint exists', async () => {
			const workflowId = 'test-workflow';
			const userId = 'test-user';
			const mockCheckpoint = {
				checkpoint: {
					channel_values: {
						messages: [new HumanMessage('Hello'), new AIMessage('Hi there!')],
					},
					ts: '2023-12-01T12:00:00Z',
				},
			};

			(mockMemorySaver.getTuple as jest.Mock).mockResolvedValue(mockCheckpoint);

			const result = await service.getSessions(workflowId, userId);

			expect(result.sessions).toHaveLength(1);
			expect(result.sessions[0]).toMatchObject({
				sessionId: 'workflow-test-workflow-user-test-user',
				lastUpdated: '2023-12-01T12:00:00Z',
			});
			expect(result.sessions[0].messages).toEqual([
				{ role: 'human', content: 'Hello' },
				{ role: 'assistant', content: 'Hi there!' },
			]);

			expect(mockMemorySaver.getTuple).toHaveBeenCalledWith({
				configurable: {
					thread_id: 'workflow-test-workflow-user-test-user',
				},
			});
		});

		it('should handle checkpoint without messages', async () => {
			const workflowId = 'test-workflow';
			const userId = 'test-user';
			const mockCheckpoint = {
				checkpoint: {
					channel_values: {},
					ts: '2023-12-01T12:00:00Z',
				},
			};

			(mockMemorySaver.getTuple as jest.Mock).mockResolvedValue(mockCheckpoint);

			// Since there are no messages, formatMessages will be called with empty array
			formatMessagesSpy.mockReturnValue([]);

			const result = await service.getSessions(workflowId, userId);

			expect(result.sessions).toHaveLength(1);
			expect(result.sessions[0].messages).toEqual([]);
		});

		it('should handle checkpoint with null channel_values', async () => {
			const workflowId = 'test-workflow';
			const userId = 'test-user';
			const mockCheckpoint = {
				checkpoint: {
					channel_values: null,
					ts: '2023-12-01T12:00:00Z',
				},
			};

			(mockMemorySaver.getTuple as jest.Mock).mockResolvedValue(mockCheckpoint);
			formatMessagesSpy.mockReturnValue([]);

			const result = await service.getSessions(workflowId, userId);

			expect(result.sessions).toHaveLength(1);
			expect(result.sessions[0].messages).toEqual([]);
		});

		it('should handle invalid messages gracefully', async () => {
			const workflowId = 'test-workflow';
			const userId = 'test-user';
			const mockCheckpoint = {
				checkpoint: {
					channel_values: {
						messages: [
							{ invalid: 'object' }, // Invalid message format
							'not an object', // Invalid type
							null, // Null value
						],
					},
					ts: '2023-12-01T12:00:00Z',
				},
			};

			(mockMemorySaver.getTuple as jest.Mock).mockResolvedValue(mockCheckpoint);
			formatMessagesSpy.mockReturnValue([]);

			const result = await service.getSessions(workflowId, userId);

			expect(result.sessions).toHaveLength(1);
			expect(result.sessions[0].messages).toEqual([]);
			expect(formatMessagesSpy).toHaveBeenCalledWith([], expect.anything());
		});

		it('should handle missing checkpoint gracefully', async () => {
			const workflowId = 'non-existent-workflow';
			const userId = 'test-user';

			(mockMemorySaver.getTuple as jest.Mock).mockResolvedValue(null);

			const result = await service.getSessions(workflowId, userId);

			expect(result.sessions).toEqual([]);
		});

		it('should handle checkpoint errors gracefully', async () => {
			const workflowId = 'error-workflow';
			const userId = 'test-user';
			const error = new Error('Failed to get checkpoint');

			(mockMemorySaver.getTuple as jest.Mock).mockRejectedValue(error);

			const result = await service.getSessions(workflowId, userId);

			expect(result.sessions).toEqual([]);
			expect(mockLogger.debug).toHaveBeenCalledWith('No session found for workflow:', {
				workflowId,
				error,
			});
		});

		it('should work without userId', async () => {
			const workflowId = 'test-workflow';
			const mockCheckpoint = {
				checkpoint: {
					channel_values: {
						messages: [new HumanMessage('Hello')],
					},
					ts: '2023-12-01T12:00:00Z',
				},
			};

			(mockMemorySaver.getTuple as jest.Mock).mockResolvedValue(mockCheckpoint);

			const result = await service.getSessions(workflowId, undefined);

			expect(result.sessions).toHaveLength(1);
			expect(result.sessions[0].sessionId).toMatch(/^workflow-test-workflow-user-\d+$/);
		});

		it('should pass correct parameters to formatMessages', async () => {
			const workflowId = 'test-workflow';
			const userId = 'test-user';
			const messages = [new HumanMessage('Test'), new AIMessage('Response')];
			const mockCheckpoint = {
				checkpoint: {
					channel_values: {
						messages,
					},
					ts: '2023-12-01T12:00:00Z',
				},
			};

			(mockMemorySaver.getTuple as jest.Mock).mockResolvedValue(mockCheckpoint);

			await service.getSessions(workflowId, userId);

			expect(formatMessagesSpy).toHaveBeenCalledWith(messages, expect.anything());
			expect(getBuilderToolsForDisplay).toHaveBeenCalledWith({
				nodeTypes: mockParsedNodeTypes,
			});
		});

		it('should handle ToolMessage in messages', async () => {
			const workflowId = 'test-workflow';
			const userId = 'test-user';
			const messages = [
				new HumanMessage('Test'),
				new AIMessage({
					content: 'Let me help',
					tool_calls: [{ name: 'test_tool', args: {}, id: 'tool-1' }],
				}),
				new ToolMessage({ content: 'Tool result', tool_call_id: 'tool-1', name: 'test_tool' }),
			];
			const mockCheckpoint = {
				checkpoint: {
					channel_values: {
						messages,
					},
					ts: '2023-12-01T12:00:00Z',
				},
			};

			(mockMemorySaver.getTuple as jest.Mock).mockResolvedValue(mockCheckpoint);
			formatMessagesSpy.mockReturnValue([
				{ role: 'human', content: 'Test' },
				{ role: 'assistant', content: 'Let me help', tool_calls: [{ name: 'test_tool' }] },
				{ role: 'tool', content: 'Tool result', name: 'test_tool' },
			]);

			const result = await service.getSessions(workflowId, userId);

			expect(result.sessions).toHaveLength(1);
			expect(result.sessions[0].messages).toHaveLength(3);
			expect(formatMessagesSpy).toHaveBeenCalledWith(messages, expect.anything());
		});

		it('should handle empty workflowId string', async () => {
			const result = await service.getSessions('', 'user-123');
			expect(result).toEqual({ sessions: [] });
			expect(mockMemorySaver.getTuple).not.toHaveBeenCalled();
		});
	});

	describe('integration with other components', () => {
		it('should use parsed node types from constructor', async () => {
			const customNodeTypes: INodeTypeDescription[] = [
				{
					displayName: 'Custom Node',
					name: 'custom.node',
					group: ['organization'],
					version: 1,
					description: 'Custom test node',
					defaults: { name: 'Custom' },
					inputs: ['main'],
					outputs: ['main'],
					properties: [],
				},
			];

			const customService = new SessionManagerService(customNodeTypes, mockLogger);
			const workflowId = 'test-workflow';
			const userId = 'test-user';
			const mockCheckpoint = {
				checkpoint: {
					channel_values: {
						messages: [new HumanMessage('Test')],
					},
					ts: '2023-12-01T12:00:00Z',
				},
			};

			(mockMemorySaver.getTuple as jest.Mock).mockResolvedValue(mockCheckpoint);

			await customService.getSessions(workflowId, userId);

			// Verify that the custom node types are used
			expect(formatMessagesSpy).toHaveBeenCalledWith(expect.anything(), expect.anything());
			expect(getBuilderToolsForDisplay).toHaveBeenCalledWith({
				nodeTypes: customNodeTypes,
			});
		});
	});

	describe('truncateMessagesAfter', () => {
		it('should return false when no checkpoint exists for the thread', async () => {
			const workflowId = 'test-workflow';
			const userId = 'test-user';
			const messageId = 'msg-123';

			(mockMemorySaver.getTuple as jest.Mock).mockResolvedValue(null);

			const result = await service.truncateMessagesAfter(workflowId, userId, messageId);

			expect(result).toBe(false);
			expect(mockLogger.debug).toHaveBeenCalledWith('No checkpoint found for truncation', {
				threadId: 'workflow-test-workflow-user-test-user',
				messageId: 'msg-123',
			});
		});

		it('should return false when checkpoint has no valid messages', async () => {
			const workflowId = 'test-workflow';
			const userId = 'test-user';
			const messageId = 'msg-123';
			const mockCheckpoint = {
				checkpoint: {
					channel_values: {
						messages: [{ invalid: 'message' }],
					},
					ts: '2023-12-01T12:00:00Z',
				},
			};

			(mockMemorySaver.getTuple as jest.Mock).mockResolvedValue(mockCheckpoint);

			const result = await service.truncateMessagesAfter(workflowId, userId, messageId);

			expect(result).toBe(false);
			expect(mockLogger.debug).toHaveBeenCalledWith('No valid messages found for truncation', {
				threadId: 'workflow-test-workflow-user-test-user',
				messageId: 'msg-123',
			});
		});

		it('should return false when messageId is not found in any message additional_kwargs', async () => {
			const workflowId = 'test-workflow';
			const userId = 'test-user';
			const messageId = 'non-existent-msg';

			const msg1 = new HumanMessage({ content: 'Hello' });
			msg1.additional_kwargs = { messageId: 'msg-1' };

			const msg2 = new AIMessage({ content: 'Hi there' });
			msg2.additional_kwargs = { messageId: 'msg-2' };

			const mockCheckpoint = {
				checkpoint: {
					channel_values: {
						messages: [msg1, msg2],
					},
					ts: '2023-12-01T12:00:00Z',
				},
			};

			(mockMemorySaver.getTuple as jest.Mock).mockResolvedValue(mockCheckpoint);

			const result = await service.truncateMessagesAfter(workflowId, userId, messageId);

			expect(result).toBe(false);
			expect(mockLogger.debug).toHaveBeenCalledWith('Message with messageId not found', {
				threadId: 'workflow-test-workflow-user-test-user',
				messageId: 'non-existent-msg',
			});
		});

		it('should truncate messages correctly (remove target message and all after it)', async () => {
			const workflowId = 'test-workflow';
			const userId = 'test-user';
			const messageId = 'msg-2';

			const msg1 = new HumanMessage({ content: 'Hello' });
			msg1.additional_kwargs = { messageId: 'msg-1' };

			const msg2 = new AIMessage({ content: 'Hi there' });
			msg2.additional_kwargs = { messageId: 'msg-2' };

			const msg3 = new HumanMessage({ content: 'How are you?' });
			msg3.additional_kwargs = { messageId: 'msg-3' };

			const msg4 = new AIMessage({ content: "I'm good" });
			msg4.additional_kwargs = { messageId: 'msg-4' };

			const mockCheckpoint = {
				checkpoint: {
					channel_values: {
						messages: [msg1, msg2, msg3, msg4],
					},
					ts: '2023-12-01T12:00:00Z',
				},
				metadata: {
					source: 'input' as const,
					step: 1,
					parents: {},
				},
			};

			(mockMemorySaver.getTuple as jest.Mock).mockResolvedValue(mockCheckpoint);
			(mockMemorySaver.put as jest.Mock).mockResolvedValue(undefined);

			const result = await service.truncateMessagesAfter(workflowId, userId, messageId);

			expect(result).toBe(true);
			expect(mockMemorySaver.put).toHaveBeenCalledWith(
				{
					configurable: {
						thread_id: 'workflow-test-workflow-user-test-user',
					},
				},
				{
					...mockCheckpoint.checkpoint,
					channel_values: {
						...mockCheckpoint.checkpoint.channel_values,
						messages: [msg1],
					},
				},
				mockCheckpoint.metadata,
			);
		});

		it('should preserve messages before the target message', async () => {
			const workflowId = 'test-workflow';
			const userId = 'test-user';
			const messageId = 'msg-3';

			const msg1 = new HumanMessage({ content: 'First' });
			msg1.additional_kwargs = { messageId: 'msg-1' };

			const msg2 = new AIMessage({ content: 'Second' });
			msg2.additional_kwargs = { messageId: 'msg-2' };

			const msg3 = new HumanMessage({ content: 'Third' });
			msg3.additional_kwargs = { messageId: 'msg-3' };

			const mockCheckpoint = {
				checkpoint: {
					channel_values: {
						messages: [msg1, msg2, msg3],
					},
					ts: '2023-12-01T12:00:00Z',
				},
			};

			(mockMemorySaver.getTuple as jest.Mock).mockResolvedValue(mockCheckpoint);
			(mockMemorySaver.put as jest.Mock).mockResolvedValue(undefined);

			const result = await service.truncateMessagesAfter(workflowId, userId, messageId);

			expect(result).toBe(true);
			// Verify the call to put includes only messages before msg-3
			const putCall = (mockMemorySaver.put as jest.Mock).mock.calls[0] as unknown[];
			const updatedCheckpoint = putCall[1] as { channel_values: { messages: unknown[] } };
			expect(updatedCheckpoint.channel_values.messages).toHaveLength(2);
			expect(updatedCheckpoint.channel_values.messages).toEqual([msg1, msg2]);
		});

		it('should update checkpoint with truncated messages via checkpointer.put()', async () => {
			const workflowId = 'test-workflow';
			const userId = 'test-user';
			const messageId = 'msg-2';

			const msg1 = new HumanMessage({ content: 'Hello' });
			msg1.additional_kwargs = { messageId: 'msg-1' };

			const msg2 = new AIMessage({ content: 'Hi there' });
			msg2.additional_kwargs = { messageId: 'msg-2' };

			const mockCheckpoint = {
				checkpoint: {
					channel_values: {
						messages: [msg1, msg2],
					},
					ts: '2023-12-01T12:00:00Z',
				},
			};

			(mockMemorySaver.getTuple as jest.Mock).mockResolvedValue(mockCheckpoint);
			(mockMemorySaver.put as jest.Mock).mockResolvedValue(undefined);

			await service.truncateMessagesAfter(workflowId, userId, messageId);

			expect(mockMemorySaver.put).toHaveBeenCalledTimes(1);
			expect(mockMemorySaver.put).toHaveBeenCalledWith(
				expect.objectContaining({
					configurable: {
						thread_id: 'workflow-test-workflow-user-test-user',
					},
				}),
				expect.objectContaining({
					channel_values: expect.objectContaining({
						messages: [msg1],
					}),
				}),
				expect.any(Object),
			);
		});

		it('should handle errors gracefully and return false', async () => {
			const workflowId = 'test-workflow';
			const userId = 'test-user';
			const messageId = 'msg-123';
			const error = new Error('Database error');

			(mockMemorySaver.getTuple as jest.Mock).mockRejectedValue(error);

			const result = await service.truncateMessagesAfter(workflowId, userId, messageId);

			expect(result).toBe(false);
			expect(mockLogger.error).toHaveBeenCalledWith('Failed to truncate messages', {
				threadId: 'workflow-test-workflow-user-test-user',
				messageId: 'msg-123',
				error,
			});
		});

		it('should log debug messages when truncation is successful', async () => {
			const workflowId = 'test-workflow';
			const userId = 'test-user';
			const messageId = 'msg-2';

			const msg1 = new HumanMessage({ content: 'Hello' });
			msg1.additional_kwargs = { messageId: 'msg-1' };

			const msg2 = new AIMessage({ content: 'Hi there' });
			msg2.additional_kwargs = { messageId: 'msg-2' };

			const msg3 = new HumanMessage({ content: 'Follow-up' });
			msg3.additional_kwargs = { messageId: 'msg-3' };

			const mockCheckpoint = {
				checkpoint: {
					channel_values: {
						messages: [msg1, msg2, msg3],
					},
					ts: '2023-12-01T12:00:00Z',
				},
			};

			(mockMemorySaver.getTuple as jest.Mock).mockResolvedValue(mockCheckpoint);
			(mockMemorySaver.put as jest.Mock).mockResolvedValue(undefined);

			await service.truncateMessagesAfter(workflowId, userId, messageId);

			expect(mockLogger.debug).toHaveBeenCalledWith('Messages truncated successfully', {
				threadId: 'workflow-test-workflow-user-test-user',
				messageId: 'msg-2',
				originalCount: 3,
				newCount: 1,
			});
		});

		it('should handle checkpoint without metadata', async () => {
			const workflowId = 'test-workflow';
			const userId = 'test-user';
			const messageId = 'msg-1';

			const msg1 = new HumanMessage({ content: 'Hello' });
			msg1.additional_kwargs = { messageId: 'msg-1' };

			const mockCheckpoint = {
				checkpoint: {
					channel_values: {
						messages: [msg1],
					},
					ts: '2023-12-01T12:00:00Z',
				},
				metadata: null,
			};

			(mockMemorySaver.getTuple as jest.Mock).mockResolvedValue(mockCheckpoint);
			(mockMemorySaver.put as jest.Mock).mockResolvedValue(undefined);

			const result = await service.truncateMessagesAfter(workflowId, userId, messageId);

			expect(result).toBe(true);
			expect(mockMemorySaver.put).toHaveBeenCalledWith(expect.anything(), expect.anything(), {
				source: 'update' as const,
				step: -1,
				parents: {},
			});
		});

		it('should work without userId', async () => {
			const workflowId = 'test-workflow';
			const messageId = 'msg-1';

			const msg1 = new HumanMessage({ content: 'Hello' });
			msg1.additional_kwargs = { messageId: 'msg-1' };

			const mockCheckpoint = {
				checkpoint: {
					channel_values: {
						messages: [msg1],
					},
					ts: '2023-12-01T12:00:00Z',
				},
			};

			(mockMemorySaver.getTuple as jest.Mock).mockResolvedValue(mockCheckpoint);
			(mockMemorySaver.put as jest.Mock).mockResolvedValue(undefined);

			const result = await service.truncateMessagesAfter(workflowId, undefined, messageId);

			expect(result).toBe(true);
			expect(mockMemorySaver.getTuple).toHaveBeenCalledWith(
				expect.objectContaining({
					configurable: {
						thread_id: expect.stringMatching(/^workflow-test-workflow-user-\d+$/),
					},
				}),
			);
		});
	});
});
