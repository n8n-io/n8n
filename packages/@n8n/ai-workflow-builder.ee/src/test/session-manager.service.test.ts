import { AIMessage, HumanMessage, ToolMessage } from '@langchain/core/messages';
import { MemorySaver } from '@langchain/langgraph';
import type { Logger } from '@n8n/backend-common';
import { mock, mockClear } from 'jest-mock-extended';
import type { INodeTypeDescription } from 'n8n-workflow';

import { SessionManagerService } from '../session-manager.service';
import { getBuilderToolsForDisplay } from '../tools/builder-tools';
import * as streamProcessor from '../utils/stream-processor';

jest.mock('@langchain/langgraph');
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
});
