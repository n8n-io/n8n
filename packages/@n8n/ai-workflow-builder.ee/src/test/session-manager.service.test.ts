import { AIMessage, HumanMessage, ToolMessage } from '@langchain/core/messages';
import { MemorySaver } from '@langchain/langgraph';
import type { Logger } from '@n8n/backend-common';
import { mock, mockClear } from 'jest-mock-extended';
import type { INodeTypeDescription } from 'n8n-workflow';

import { SessionManagerService } from '@/session-manager.service';
import { getBuilderToolsForDisplay } from '@/tools/builder-tools';
import type { ISessionStorage, StoredSession } from '@/types/session-storage';
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

		service = new SessionManagerService(mockParsedNodeTypes, undefined, mockLogger);
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

	describe('usesPersistence', () => {
		it('should return false when no storage configured', () => {
			expect(service.usesPersistence).toBe(false);
		});

		it('should return true when storage is configured', () => {
			const mockStorage: ISessionStorage = {
				getSession: jest.fn(),
				saveSession: jest.fn(),
				deleteSession: jest.fn(),
			};
			const serviceWithStorage = new SessionManagerService(
				mockParsedNodeTypes,
				mockStorage,
				mockLogger,
			);
			expect(serviceWithStorage.usesPersistence).toBe(true);
		});
	});

	describe('updateNodeTypes', () => {
		it('should update the node types', async () => {
			const newNodeTypes: INodeTypeDescription[] = [
				{
					displayName: 'New Node',
					name: 'new-node',
					group: ['transform'],
					version: 1,
					description: 'A new node',
					defaults: { name: 'New Node' },
					inputs: ['main'],
					outputs: ['main'],
					properties: [],
				},
			];

			service.updateNodeTypes(newNodeTypes);

			// Verify by calling getSessions which uses nodeTypes internally
			(mockMemorySaver.getTuple as jest.Mock).mockResolvedValue({
				checkpoint: {
					channel_values: {
						messages: [new HumanMessage('Test')],
					},
					ts: '2023-12-01T12:00:00Z',
				},
			});

			await service.getSessions('test-workflow', 'test-user');

			expect(getBuilderToolsForDisplay).toHaveBeenCalledWith({
				nodeTypes: newNodeTypes,
			});
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

		it('should append -code suffix when agentType is code-builder', () => {
			const threadId = SessionManagerService.generateThreadId(
				'workflow-123',
				'user-456',
				'code-builder',
			);
			expect(threadId).toBe('workflow-workflow-123-user-user-456-code');
		});

		it('should not append suffix when agentType is undefined', () => {
			const threadId = SessionManagerService.generateThreadId('workflow-123', 'user-456');
			expect(threadId).toBe('workflow-workflow-123-user-user-456');
			expect(threadId).not.toContain('-code');
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

		it('should query code-builder thread when agentType is code-builder', async () => {
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

			const result = await service.getSessions(workflowId, userId, 'code-builder');

			expect(result.sessions).toHaveLength(1);
			expect(result.sessions[0].sessionId).toBe('workflow-test-workflow-user-test-user-code');
			expect(mockMemorySaver.getTuple).toHaveBeenCalledWith({
				configurable: {
					thread_id: 'workflow-test-workflow-user-test-user-code',
				},
			});
		});

		it('should query default thread when agentType is not provided', async () => {
			const workflowId = 'test-workflow';
			const userId = 'test-user';
			const mockCheckpoint = {
				checkpoint: {
					channel_values: {
						messages: [new HumanMessage('Hello')],
					},
					ts: '2023-12-01T12:00:00Z',
				},
			};

			(mockMemorySaver.getTuple as jest.Mock).mockResolvedValue(mockCheckpoint);

			await service.getSessions(workflowId, userId);

			expect(mockMemorySaver.getTuple).toHaveBeenCalledWith({
				configurable: {
					thread_id: 'workflow-test-workflow-user-test-user',
				},
			});
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

			const customService = new SessionManagerService(customNodeTypes, undefined, mockLogger);
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
			expect(mockLogger.debug).toHaveBeenCalledWith('No messages found for truncation', {
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
			expect(mockLogger.debug).toHaveBeenCalledWith('No messages found for truncation', {
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

		it('should use code-builder thread ID when agentType is code-builder', async () => {
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

			const result = await service.truncateMessagesAfter(
				workflowId,
				userId,
				messageId,
				'code-builder',
			);

			expect(result).toBe(true);
			expect(mockMemorySaver.getTuple).toHaveBeenCalledWith({
				configurable: {
					thread_id: 'workflow-test-workflow-user-test-user-code',
				},
			});
		});

		it('should not use code-builder thread ID when agentType is undefined', async () => {
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
			};

			(mockMemorySaver.getTuple as jest.Mock).mockResolvedValue(mockCheckpoint);
			(mockMemorySaver.put as jest.Mock).mockResolvedValue(undefined);

			const result = await service.truncateMessagesAfter(workflowId, userId, messageId);

			expect(result).toBe(true);
			expect(mockMemorySaver.getTuple).toHaveBeenCalledWith({
				configurable: {
					thread_id: 'workflow-test-workflow-user-test-user',
				},
			});
		});

		it('should reset codeBuilderSession when agentType is code-builder', async () => {
			const workflowId = 'test-workflow';
			const userId = 'test-user';
			const messageId = 'msg-2';

			const msg1 = new HumanMessage({ content: 'Hello' });
			msg1.additional_kwargs = { messageId: 'msg-1' };

			const msg2 = new AIMessage({ content: 'Hi there' });
			msg2.additional_kwargs = { messageId: 'msg-2' };

			// Mock for the messages thread (getTuple calls)
			const messagesCheckpoint = {
				checkpoint: {
					channel_values: {
						messages: [msg1, msg2],
					},
					ts: '2023-12-01T12:00:00Z',
				},
				metadata: {
					source: 'update' as const,
					step: -1,
					parents: {},
				},
			};

			// Mock for the code-builder session thread (second getTuple call)
			const sessionCheckpoint = {
				checkpoint: {
					channel_values: {
						codeBuilderSession: {
							conversationEntries: [{ type: 'build-request', message: 'old message' }],
							previousSummary: 'old summary',
						},
					},
					ts: '2023-12-01T12:00:00Z',
				},
				metadata: {
					source: 'update' as const,
					step: -1,
					parents: {},
				},
			};

			(mockMemorySaver.getTuple as jest.Mock)
				.mockResolvedValueOnce(messagesCheckpoint) // loadMessagesForTruncation
				.mockResolvedValueOnce(messagesCheckpoint) // update checkpoint
				.mockResolvedValueOnce(sessionCheckpoint); // resetCodeBuilderSession
			(mockMemorySaver.put as jest.Mock).mockResolvedValue(undefined);

			const result = await service.truncateMessagesAfter(
				workflowId,
				userId,
				messageId,
				'code-builder',
			);

			expect(result).toBe(true);
			// First put: truncated messages
			// Second put: reset codeBuilderSession
			expect(mockMemorySaver.put).toHaveBeenCalledTimes(2);
			expect(mockMemorySaver.put).toHaveBeenNthCalledWith(
				2,
				{
					configurable: {
						thread_id: 'code-builder-test-workflow-test-user',
					},
				},
				expect.objectContaining({
					channel_values: expect.objectContaining({
						codeBuilderSession: {
							conversationEntries: [],
							previousSummary: undefined,
						},
					}),
				}),
				sessionCheckpoint.metadata,
			);
		});

		it('should not reset codeBuilderSession when agentType is undefined', async () => {
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

			const result = await service.truncateMessagesAfter(workflowId, userId, messageId);

			expect(result).toBe(true);
			// Only one put call for the messages truncation
			expect(mockMemorySaver.put).toHaveBeenCalledTimes(1);
		});
	});

	describe('HITL history and session replay', () => {
		const workflowId = 'test-workflow';
		const userId = 'test-user';
		const threadId = 'workflow-test-workflow-user-test-user';

		const questionsInterrupt = {
			type: 'questions' as const,
			introMessage: 'I need some info',
			questions: [{ id: 'q1', question: 'Source?', type: 'single' as const, options: ['A', 'B'] }],
		};

		const planOutput = {
			summary: 'A workflow',
			trigger: 'Manual',
			steps: [{ description: 'Step 1' }],
		};

		function mockCheckpointWithMessages(msgs: Array<Record<string, unknown>>) {
			(mockMemorySaver.getTuple as jest.Mock).mockResolvedValue({
				checkpoint: {
					channel_values: {
						messages: [new HumanMessage('initial request')],
					},
					ts: '2026-01-01T00:00:00Z',
				},
			});
			// formatMessages returns the checkpoint messages
			formatMessagesSpy.mockReturnValue(msgs);
		}

		it('should store and retrieve HITL history entries', () => {
			service.addHitlEntry(threadId, {
				type: 'questions_answered',
				afterMessageId: 'msg-1',
				interrupt: questionsInterrupt,
				answers: [{ questionId: 'q1', question: 'Source?', selectedOptions: ['A'] }],
			});

			const history = service.getHitlHistory(threadId);
			expect(history).toHaveLength(1);
			expect(history[0].type).toBe('questions_answered');
		});

		it('should store multiple HITL rounds in order', () => {
			// Round 1: questions + answers
			service.addHitlEntry(threadId, {
				type: 'questions_answered',
				afterMessageId: 'msg-1',
				interrupt: questionsInterrupt,
				answers: [{ questionId: 'q1', selectedOptions: ['A'] }],
			});
			// Round 1: plan rejected
			service.addHitlEntry(threadId, {
				type: 'plan_decided',
				afterMessageId: 'msg-1',
				plan: planOutput,
				decision: 'reject',
				feedback: 'Try again',
			});
			// Round 2: more questions
			service.addHitlEntry(threadId, {
				type: 'questions_answered',
				afterMessageId: 'msg-1',
				interrupt: questionsInterrupt,
				answers: [{ questionId: 'q1', selectedOptions: ['B'] }],
			});

			const history = service.getHitlHistory(threadId);
			expect(history).toHaveLength(3);
			expect(history[0].type).toBe('questions_answered');
			expect(history[1].type).toBe('plan_decided');
			expect(history[2].type).toBe('questions_answered');
		});

		it('should inject Q&A after triggering message in getSessions', async () => {
			mockCheckpointWithMessages([
				{ role: 'user', type: 'message', text: 'Build something', id: 'msg-1' },
				{ role: 'assistant', type: 'plan', plan: planOutput },
				{ role: 'user', type: 'message', text: 'Implement' },
				{ role: 'assistant', type: 'message', text: 'Done!' },
			]);

			service.addHitlEntry(threadId, {
				type: 'questions_answered',
				afterMessageId: 'msg-1',
				interrupt: questionsInterrupt,
				answers: [{ questionId: 'q1', selectedOptions: ['A'] }],
			});

			const result = await service.getSessions(workflowId, userId);
			const messages = result.sessions[0].messages;

			// Q&A should be inserted after 'msg-1', before the plan
			expect(messages[0]).toMatchObject({ role: 'user', text: 'Build something' });
			expect(messages[1]).toMatchObject({ role: 'assistant', type: 'questions' });
			expect(messages[2]).toMatchObject({ role: 'user', type: 'user_answers' });
			expect(messages[3]).toMatchObject({ role: 'assistant', type: 'plan' });
			expect(messages[4]).toMatchObject({ role: 'user', text: 'Implement' });
			expect(messages[5]).toMatchObject({ role: 'assistant', text: 'Done!' });
		});

		it('should inject rejected plan + feedback in getSessions', async () => {
			mockCheckpointWithMessages([
				{ role: 'user', type: 'message', text: 'Build something', id: 'msg-1' },
				{ role: 'assistant', type: 'plan', plan: planOutput }, // final approved plan
				{ role: 'user', type: 'message', text: 'Implement' },
			]);

			// Q&A then plan rejected then Q&A again
			service.addHitlEntry(threadId, {
				type: 'questions_answered',
				afterMessageId: 'msg-1',
				interrupt: questionsInterrupt,
				answers: [{ questionId: 'q1', selectedOptions: ['A'] }],
			});
			service.addHitlEntry(threadId, {
				type: 'plan_decided',
				afterMessageId: 'msg-1',
				plan: { ...planOutput, summary: 'First attempt' },
				decision: 'reject',
				feedback: 'Add error handling',
			});
			service.addHitlEntry(threadId, {
				type: 'questions_answered',
				afterMessageId: 'msg-1',
				interrupt: questionsInterrupt,
				answers: [{ questionId: 'q1', selectedOptions: ['B'] }],
			});

			const result = await service.getSessions(workflowId, userId);
			const messages = result.sessions[0].messages;

			// Full sequence: user → Q&A → rejected plan → feedback → Q&A → approved plan → implement
			expect(messages[0]).toMatchObject({ role: 'user', text: 'Build something' });
			expect(messages[1]).toMatchObject({ role: 'assistant', type: 'questions' });
			expect(messages[2]).toMatchObject({ role: 'user', type: 'user_answers' });
			expect(messages[3]).toMatchObject({ role: 'assistant', type: 'plan' });
			expect(messages[4]).toMatchObject({ role: 'user', text: 'Add error handling' });
			expect(messages[5]).toMatchObject({ role: 'assistant', type: 'questions' });
			expect(messages[6]).toMatchObject({ role: 'user', type: 'user_answers' });
			expect(messages[7]).toMatchObject({ role: 'assistant', type: 'plan' }); // approved plan from checkpoint
			expect(messages[8]).toMatchObject({ role: 'user', text: 'Implement' });
		});

		it('should handle multiple user requests with Q&A at correct positions', async () => {
			mockCheckpointWithMessages([
				{ role: 'user', type: 'message', text: 'Build invoices', id: 'msg-1' },
				{ role: 'assistant', type: 'plan', plan: planOutput },
				{ role: 'user', type: 'message', text: 'Implement' },
				{ role: 'assistant', type: 'message', text: 'Built it!' },
				{ role: 'user', type: 'message', text: 'Also add Slack', id: 'msg-2' },
				{ role: 'assistant', type: 'plan', plan: planOutput },
				{ role: 'user', type: 'message', text: 'Implement' },
				{ role: 'assistant', type: 'message', text: 'Updated!' },
			]);

			// Q&A for first request
			service.addHitlEntry(threadId, {
				type: 'questions_answered',
				afterMessageId: 'msg-1',
				interrupt: questionsInterrupt,
				answers: [{ questionId: 'q1', selectedOptions: ['A'] }],
			});
			// Q&A for second request
			service.addHitlEntry(threadId, {
				type: 'questions_answered',
				afterMessageId: 'msg-2',
				interrupt: { ...questionsInterrupt, introMessage: 'For Slack:' },
				answers: [{ questionId: 'q1', selectedOptions: ['B'] }],
			});

			const result = await service.getSessions(workflowId, userId);
			const messages = result.sessions[0].messages;

			// First Q&A after msg-1, second Q&A after msg-2
			expect(messages[0]).toMatchObject({ text: 'Build invoices' });
			expect(messages[1]).toMatchObject({ type: 'questions' }); // round 1
			expect(messages[2]).toMatchObject({ type: 'user_answers' }); // round 1
			expect(messages[3]).toMatchObject({ type: 'plan' }); // approved plan 1
			expect(messages[4]).toMatchObject({ text: 'Implement' });
			expect(messages[5]).toMatchObject({ text: 'Built it!' });
			expect(messages[6]).toMatchObject({ text: 'Also add Slack' });
			expect(messages[7]).toMatchObject({ type: 'questions' }); // round 2
			expect(messages[8]).toMatchObject({ type: 'user_answers' }); // round 2
			expect(messages[9]).toMatchObject({ type: 'plan' }); // approved plan 2
		});

		it('should fall back to first user message when afterMessageId not found', async () => {
			mockCheckpointWithMessages([
				{ role: 'user', type: 'message', text: 'Request', id: 'msg-1' },
				{ role: 'assistant', type: 'message', text: 'Response' },
			]);

			service.addHitlEntry(threadId, {
				type: 'questions_answered',
				afterMessageId: 'nonexistent-id',
				interrupt: questionsInterrupt,
				answers: [{ questionId: 'q1', selectedOptions: ['A'] }],
			});

			const result = await service.getSessions(workflowId, userId);
			const messages = result.sessions[0].messages;

			// Falls back to after first user message
			expect(messages[0]).toMatchObject({ text: 'Request' });
			expect(messages[1]).toMatchObject({ type: 'questions' });
			expect(messages[2]).toMatchObject({ type: 'user_answers' });
			expect(messages[3]).toMatchObject({ text: 'Response' });
		});

		it('should append pending HITL after injected history', async () => {
			mockCheckpointWithMessages([{ role: 'user', type: 'message', text: 'Request', id: 'msg-1' }]);

			// Answered questions
			service.addHitlEntry(threadId, {
				type: 'questions_answered',
				afterMessageId: 'msg-1',
				interrupt: questionsInterrupt,
				answers: [{ questionId: 'q1', selectedOptions: ['A'] }],
			});

			// Pending plan (not yet decided)
			service.setPendingHitl(threadId, { type: 'plan', plan: planOutput });

			const result = await service.getSessions(workflowId, userId);
			const messages = result.sessions[0].messages;

			expect(messages[0]).toMatchObject({ text: 'Request' });
			expect(messages[1]).toMatchObject({ type: 'questions' });
			expect(messages[2]).toMatchObject({ type: 'user_answers' });
			expect(messages[3]).toMatchObject({ type: 'plan', plan: planOutput }); // pending at end
		});

		it('should return empty history for unknown thread', () => {
			expect(service.getHitlHistory('unknown')).toEqual([]);
		});
	});

	describe('with persistent storage', () => {
		let mockStorage: jest.Mocked<ISessionStorage>;
		let serviceWithStorage: SessionManagerService;

		beforeEach(() => {
			mockStorage = {
				getSession: jest.fn(),
				saveSession: jest.fn(),
				deleteSession: jest.fn(),
			};
			serviceWithStorage = new SessionManagerService(mockParsedNodeTypes, mockStorage, mockLogger);
		});

		describe('loadSessionMessages', () => {
			it('should return empty array when no storage configured', async () => {
				const result = await service.loadSessionMessages('thread-123');
				expect(result).toEqual([]);
			});

			it('should return empty array when no session exists in storage', async () => {
				mockStorage.getSession.mockResolvedValue(null);

				const result = await serviceWithStorage.loadSessionMessages('thread-123');

				expect(result).toEqual([]);
				expect(mockStorage.getSession).toHaveBeenCalledWith('thread-123');
			});

			it('should return empty array when session has no messages', async () => {
				mockStorage.getSession.mockResolvedValue({
					messages: [],
					updatedAt: new Date(),
				});

				const result = await serviceWithStorage.loadSessionMessages('thread-123');

				expect(result).toEqual([]);
			});

			it('should return messages from storage', async () => {
				const storedMessages = [new HumanMessage('Hello'), new AIMessage('Hi there!')];
				mockStorage.getSession.mockResolvedValue({
					messages: storedMessages,
					updatedAt: new Date(),
				});

				const result = await serviceWithStorage.loadSessionMessages('thread-123');

				expect(result).toEqual(storedMessages);
				expect(mockLogger.debug).toHaveBeenCalledWith('Loaded session messages from storage', {
					threadId: 'thread-123',
					messageCount: 2,
				});
			});

			it('should strip cache_control markers from loaded messages', async () => {
				const messageWithCache = new HumanMessage('Hello');
				messageWithCache.content = [
					{
						type: 'text' as const,
						text: 'Hello',
						cache_control: { type: 'ephemeral' as const },
					},
				];
				mockStorage.getSession.mockResolvedValue({
					messages: [messageWithCache],
					updatedAt: new Date(),
				});

				const result = await serviceWithStorage.loadSessionMessages('thread-123');

				// Verify cache_control was stripped
				const content = result[0].content as Array<{ cache_control?: unknown }>;
				expect(content[0].cache_control).toBeUndefined();
			});
		});

		describe('saveSessionFromCheckpointer', () => {
			it('should do nothing when no storage configured', async () => {
				await service.saveSessionFromCheckpointer('thread-123');

				// Verify no storage operations were attempted
				expect(mockStorage.saveSession).not.toHaveBeenCalled();
				// Verify checkpointer was not accessed (no storage = no need to read checkpoint)
				expect(mockMemorySaver.getTuple).not.toHaveBeenCalled();
			});

			it('should do nothing when no checkpoint exists', async () => {
				(mockMemorySaver.getTuple as jest.Mock).mockResolvedValue(null);

				await serviceWithStorage.saveSessionFromCheckpointer('thread-123');

				expect(mockStorage.saveSession).not.toHaveBeenCalled();
			});

			it('should save messages from checkpointer to storage', async () => {
				const messages = [new HumanMessage('Hello'), new AIMessage('Hi there!')];
				(mockMemorySaver.getTuple as jest.Mock).mockResolvedValue({
					checkpoint: {
						channel_values: { messages },
					},
				});

				await serviceWithStorage.saveSessionFromCheckpointer('thread-123');

				expect(mockStorage.saveSession).toHaveBeenCalledWith('thread-123', {
					messages,
					previousSummary: undefined,
					updatedAt: expect.any(Date),
				});
				expect(mockLogger.debug).toHaveBeenCalledWith('Saved session from checkpointer', {
					threadId: 'thread-123',
					messageCount: 2,
				});
			});

			it('should include previousSummary when provided', async () => {
				const messages = [new HumanMessage('Hello')];
				(mockMemorySaver.getTuple as jest.Mock).mockResolvedValue({
					checkpoint: {
						channel_values: { messages },
					},
				});

				await serviceWithStorage.saveSessionFromCheckpointer('thread-123', 'Previous summary text');

				expect(mockStorage.saveSession).toHaveBeenCalledWith('thread-123', {
					messages,
					previousSummary: 'Previous summary text',
					updatedAt: expect.any(Date),
				});
			});

			it('should handle empty messages array', async () => {
				(mockMemorySaver.getTuple as jest.Mock).mockResolvedValue({
					checkpoint: {
						channel_values: { messages: [] },
					},
				});

				await serviceWithStorage.saveSessionFromCheckpointer('thread-123');

				expect(mockStorage.saveSession).toHaveBeenCalledWith('thread-123', {
					messages: [],
					previousSummary: undefined,
					updatedAt: expect.any(Date),
				});
			});

			it('should handle invalid messages by saving empty array', async () => {
				(mockMemorySaver.getTuple as jest.Mock).mockResolvedValue({
					checkpoint: {
						channel_values: { messages: [{ invalid: 'object' }] },
					},
				});

				await serviceWithStorage.saveSessionFromCheckpointer('thread-123');

				expect(mockStorage.saveSession).toHaveBeenCalledWith('thread-123', {
					messages: [],
					previousSummary: undefined,
					updatedAt: expect.any(Date),
				});
			});
		});

		describe('getSessions with storage', () => {
			it('should prefer storage over checkpointer when storage has data', async () => {
				const storedMessages = [new HumanMessage('Stored message')];
				const storedSession: StoredSession = {
					messages: storedMessages,
					updatedAt: new Date('2023-12-01T12:00:00Z'),
				};
				mockStorage.getSession.mockResolvedValue(storedSession);

				const result = await serviceWithStorage.getSessions('test-workflow', 'test-user');

				expect(result.sessions).toHaveLength(1);
				expect(mockStorage.getSession).toHaveBeenCalled();
				// Should not fall back to checkpointer
				expect(mockMemorySaver.getTuple).not.toHaveBeenCalled();
			});

			it('should fall back to checkpointer when storage is empty', async () => {
				mockStorage.getSession.mockResolvedValue(null);
				(mockMemorySaver.getTuple as jest.Mock).mockResolvedValue({
					checkpoint: {
						channel_values: { messages: [new HumanMessage('Checkpoint message')] },
						ts: '2023-12-01T12:00:00Z',
					},
				});

				const result = await serviceWithStorage.getSessions('test-workflow', 'test-user');

				expect(result.sessions).toHaveLength(1);
				expect(mockStorage.getSession).toHaveBeenCalled();
				expect(mockMemorySaver.getTuple).toHaveBeenCalled();
			});
		});

		describe('clearSession', () => {
			it('should delete from storage and clear in-memory checkpointer when configured', async () => {
				const existingCheckpoint = {
					checkpoint: {
						channel_values: { messages: [new HumanMessage('Old message')] },
						ts: '2023-12-01T12:00:00Z',
					},
					metadata: { source: 'input' as const, step: 1, parents: {} },
				};
				(mockMemorySaver.getTuple as jest.Mock).mockResolvedValue(existingCheckpoint);
				(mockMemorySaver.put as jest.Mock).mockResolvedValue(undefined);

				await serviceWithStorage.clearSession('thread-123');

				// Verify storage was cleared
				expect(mockStorage.deleteSession).toHaveBeenCalledWith('thread-123');

				// Verify in-memory checkpointer was cleared with empty messages
				expect(mockMemorySaver.put).toHaveBeenCalledWith(
					{ configurable: { thread_id: 'thread-123' } },
					expect.objectContaining({
						channel_values: expect.objectContaining({ messages: [] }),
					}),
					existingCheckpoint.metadata,
				);

				expect(mockLogger.debug).toHaveBeenCalledWith('Session cleared', {
					threadId: 'thread-123',
				});
			});

			it('should clear in-memory checkpointer even when no storage configured', async () => {
				const existingCheckpoint = {
					checkpoint: {
						channel_values: { messages: [new HumanMessage('Old message')] },
						ts: '2023-12-01T12:00:00Z',
					},
					metadata: { source: 'input' as const, step: 1, parents: {} },
				};
				(mockMemorySaver.getTuple as jest.Mock).mockResolvedValue(existingCheckpoint);
				(mockMemorySaver.put as jest.Mock).mockResolvedValue(undefined);

				await service.clearSession('thread-123');

				// Verify in-memory checkpointer was cleared
				expect(mockMemorySaver.put).toHaveBeenCalledWith(
					{ configurable: { thread_id: 'thread-123' } },
					expect.objectContaining({
						channel_values: expect.objectContaining({ messages: [] }),
					}),
					existingCheckpoint.metadata,
				);

				expect(mockLogger.debug).toHaveBeenCalledWith('Session cleared', {
					threadId: 'thread-123',
				});
			});

			it('should handle non-existent checkpointer state gracefully', async () => {
				(mockMemorySaver.getTuple as jest.Mock).mockResolvedValue(null);

				await service.clearSession('thread-123');

				// Should not attempt to put when no existing checkpoint
				expect(mockMemorySaver.put).not.toHaveBeenCalled();
				expect(mockLogger.debug).toHaveBeenCalledWith('Session cleared', {
					threadId: 'thread-123',
				});
			});

			it('should continue even if checkpointer clear fails', async () => {
				(mockMemorySaver.getTuple as jest.Mock).mockRejectedValue(new Error('Checkpointer error'));

				await serviceWithStorage.clearSession('thread-123');

				// Storage should still be cleared
				expect(mockStorage.deleteSession).toHaveBeenCalledWith('thread-123');
				// Should log the error but not fail
				expect(mockLogger.debug).toHaveBeenCalledWith(
					'Failed to clear in-memory checkpointer state',
					expect.objectContaining({ threadId: 'thread-123' }),
				);
				expect(mockLogger.debug).toHaveBeenCalledWith('Session cleared', {
					threadId: 'thread-123',
				});
			});

			it('should clear pending HITL state for the thread', async () => {
				(mockMemorySaver.getTuple as jest.Mock).mockResolvedValue(null);

				serviceWithStorage.setPendingHitl('thread-123', {
					type: 'questions',
					questions: [{ id: 'q1', question: 'Test?', type: 'single', options: ['A'] }],
				});
				serviceWithStorage.addHitlEntry('thread-123', {
					type: 'questions_answered',
					afterMessageId: 'msg-1',
					interrupt: {
						type: 'questions',
						questions: [{ id: 'q1', question: 'Test?', type: 'single', options: ['A'] }],
					},
					answers: [{ questionId: 'q1', selectedOptions: ['A'] }],
				});

				expect(serviceWithStorage.getPendingHitl('thread-123')).toBeDefined();
				expect(serviceWithStorage.getHitlHistory('thread-123')).toHaveLength(1);

				await serviceWithStorage.clearSession('thread-123');

				expect(serviceWithStorage.getPendingHitl('thread-123')).toBeUndefined();
				expect(serviceWithStorage.getHitlHistory('thread-123')).toEqual([]);
			});
		});

		describe('clearAllSessions', () => {
			it('should clear the main multi-agent thread', async () => {
				(mockMemorySaver.getTuple as jest.Mock).mockResolvedValue(null);
				mockStorage.deleteSession.mockResolvedValue(undefined);

				await serviceWithStorage.clearAllSessions('test-workflow', 'test-user');

				expect(mockStorage.deleteSession).toHaveBeenCalledWith(
					'workflow-test-workflow-user-test-user',
				);

				expect(mockLogger.debug).toHaveBeenCalledWith('All sessions cleared for workflow', {
					workflowId: 'test-workflow',
					userId: 'test-user',
				});
			});
		});

		describe('getPreviousSummary', () => {
			it('should return undefined when no storage configured', async () => {
				const result = await service.getPreviousSummary('thread-123');
				expect(result).toBeUndefined();
			});

			it('should return undefined when no session exists', async () => {
				mockStorage.getSession.mockResolvedValue(null);

				const result = await serviceWithStorage.getPreviousSummary('thread-123');

				expect(result).toBeUndefined();
			});

			it('should return previousSummary from stored session', async () => {
				mockStorage.getSession.mockResolvedValue({
					messages: [],
					previousSummary: 'Summary from previous conversation',
					updatedAt: new Date(),
				});

				const result = await serviceWithStorage.getPreviousSummary('thread-123');

				expect(result).toBe('Summary from previous conversation');
			});
		});

		describe('truncateMessagesAfter with storage', () => {
			it('should truncate from storage when available', async () => {
				const msg1 = new HumanMessage('First');
				msg1.additional_kwargs = { messageId: 'msg-1' };
				const msg2 = new AIMessage('Second');
				msg2.additional_kwargs = { messageId: 'msg-2' };

				mockStorage.getSession.mockResolvedValue({
					messages: [msg1, msg2],
					previousSummary: 'Summary',
					updatedAt: new Date(),
				});
				(mockMemorySaver.getTuple as jest.Mock).mockResolvedValue({
					checkpoint: { channel_values: {} },
				});
				(mockMemorySaver.put as jest.Mock).mockResolvedValue(undefined);

				const result = await serviceWithStorage.truncateMessagesAfter(
					'test-workflow',
					'test-user',
					'msg-2',
				);

				expect(result).toBe(true);
				expect(mockStorage.saveSession).toHaveBeenCalledWith(
					expect.any(String),
					expect.objectContaining({
						messages: [msg1],
						previousSummary: 'Summary',
					}),
				);
			});

			it('should return false when no stored session found', async () => {
				mockStorage.getSession.mockResolvedValue(null);

				const result = await serviceWithStorage.truncateMessagesAfter(
					'test-workflow',
					'test-user',
					'msg-1',
				);

				expect(result).toBe(false);
				expect(mockLogger.debug).toHaveBeenCalledWith(
					'No messages found for truncation',
					expect.any(Object),
				);
			});
		});
	});
});
