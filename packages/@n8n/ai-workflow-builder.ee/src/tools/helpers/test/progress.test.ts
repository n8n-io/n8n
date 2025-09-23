import type { ToolRunnableConfig } from '@langchain/core/tools';
import type { LangGraphRunnableConfig } from '@langchain/langgraph';

import type { ToolError } from '../../../types/tools';
import {
	createProgressReporter,
	reportStart,
	reportProgress,
	reportComplete,
	reportError,
	createBatchProgressReporter,
} from '../progress';

describe('progress helpers', () => {
	let mockWriter: jest.MockedFunction<(chunk: unknown) => void>;
	let mockConfig: ToolRunnableConfig & LangGraphRunnableConfig;

	beforeEach(() => {
		mockWriter = jest.fn();
		mockConfig = {
			writer: mockWriter,
			toolCall: {
				id: 'test-tool-call-id',
				name: 'test-tool',
				args: {},
			},
		};
	});

	describe('createProgressReporter', () => {
		it('should create a progress reporter with all methods', () => {
			const reporter = createProgressReporter(mockConfig, 'test_tool', 'Test Tool');

			expect(reporter).toHaveProperty('start');
			expect(reporter).toHaveProperty('progress');
			expect(reporter).toHaveProperty('complete');
			expect(reporter).toHaveProperty('error');
			expect(reporter).toHaveProperty('createBatchReporter');
			expect(typeof reporter.start).toBe('function');
			expect(typeof reporter.progress).toBe('function');
			expect(typeof reporter.complete).toBe('function');
			expect(typeof reporter.error).toBe('function');
			expect(typeof reporter.createBatchReporter).toBe('function');
		});

		it('should emit start message with input data', () => {
			const reporter = createProgressReporter(
				mockConfig,
				'add_node',
				'Adding Node',
				'Adding Code Node',
			);
			const input = { nodeType: 'code', name: 'Test Node' };

			reporter.start(input);

			expect(mockWriter).toHaveBeenCalledWith({
				type: 'tool',
				toolName: 'add_node',
				toolCallId: 'test-tool-call-id',
				displayTitle: 'Adding Node',
				customDisplayTitle: 'Adding Code Node',
				status: 'running',
				updates: [
					{
						type: 'input',
						data: input,
					},
				],
			});
		});

		it('should emit progress message with string message', () => {
			const reporter = createProgressReporter(mockConfig, 'connect_nodes', 'Connecting Nodes');

			reporter.progress('Connecting node A to node B');

			expect(mockWriter).toHaveBeenCalledWith({
				type: 'tool',
				toolName: 'connect_nodes',
				toolCallId: 'test-tool-call-id',
				displayTitle: 'Connecting Nodes',
				customDisplayTitle: undefined,
				status: 'running',
				updates: [
					{
						type: 'progress',
						data: { message: 'Connecting node A to node B' },
					},
				],
			});
		});

		it('should emit progress message with custom data', () => {
			const reporter = createProgressReporter(mockConfig, 'search_nodes', 'Searching Nodes');
			const customData = { found: 5, query: 'http' };

			reporter.progress('Found nodes', customData);

			expect(mockWriter).toHaveBeenCalledWith({
				type: 'tool',
				toolName: 'search_nodes',
				toolCallId: 'test-tool-call-id',
				displayTitle: 'Searching Nodes',
				customDisplayTitle: undefined,
				status: 'running',
				updates: [
					{
						type: 'progress',
						data: customData,
					},
				],
			});
		});

		it('should emit complete message with output data', () => {
			const reporter = createProgressReporter(mockConfig, 'remove_node', 'Removing Node');
			const output = { nodeId: 'node123', success: true };

			reporter.complete(output);

			expect(mockWriter).toHaveBeenCalledWith({
				type: 'tool',
				toolName: 'remove_node',
				toolCallId: 'test-tool-call-id',
				displayTitle: 'Removing Node',
				customDisplayTitle: undefined,
				status: 'completed',
				updates: [
					{
						type: 'output',
						data: output,
					},
				],
			});
		});

		it('should emit error message with error details', () => {
			const reporter = createProgressReporter(mockConfig, 'update_node', 'Updating Node');
			const error: ToolError = {
				message: 'Node not found',
				code: 'NODE_NOT_FOUND',
				details: { nodeId: 'missing-node' },
			};

			reporter.error(error);

			expect(mockWriter).toHaveBeenCalledWith({
				type: 'tool',
				toolName: 'update_node',
				toolCallId: 'test-tool-call-id',
				displayTitle: 'Updating Node',
				customDisplayTitle: undefined,
				status: 'error',
				updates: [
					{
						type: 'error',
						data: {
							message: 'Node not found',
							code: 'NODE_NOT_FOUND',
							details: { nodeId: 'missing-node' },
						},
					},
				],
			});
		});

		it('should handle missing writer gracefully', () => {
			const configWithoutWriter = { ...mockConfig, writer: undefined };
			const reporter = createProgressReporter(configWithoutWriter, 'test_tool', 'Test Tool');

			expect(() => reporter.start({ test: 'data' })).not.toThrow();
			expect(() => reporter.progress('test message')).not.toThrow();
			expect(() => reporter.complete({ result: 'success' })).not.toThrow();
			expect(() => reporter.error({ message: 'test error' })).not.toThrow();
		});

		it('should handle missing toolCallId', () => {
			const configWithoutToolCallId = { ...mockConfig, toolCall: undefined };
			const reporter = createProgressReporter(configWithoutToolCallId, 'test_tool', 'Test Tool');

			reporter.start({ test: 'data' });

			expect(mockWriter).toHaveBeenCalledWith(
				expect.objectContaining({
					toolCallId: undefined,
				}),
			);
		});
	});

	describe('batch reporter', () => {
		it('should create batch reporter with correct interface', () => {
			const reporter = createProgressReporter(mockConfig, 'batch_tool', 'Batch Tool');
			const batchReporter = reporter.createBatchReporter('Processing items');

			expect(batchReporter).toHaveProperty('init');
			expect(batchReporter).toHaveProperty('next');
			expect(batchReporter).toHaveProperty('complete');
			expect(typeof batchReporter.init).toBe('function');
			expect(typeof batchReporter.next).toBe('function');
			expect(typeof batchReporter.complete).toBe('function');
		});

		it('should track batch progress correctly', () => {
			const reporter = createProgressReporter(mockConfig, 'batch_tool', 'Batch Tool');
			const batchReporter = reporter.createBatchReporter('Processing nodes');

			batchReporter.init(3);
			batchReporter.next('First node');
			batchReporter.next('Second node');
			batchReporter.next('Third node');
			batchReporter.complete();

			expect(mockWriter).toHaveBeenCalledTimes(4);
			expect(mockWriter).toHaveBeenNthCalledWith(
				1,
				expect.objectContaining({
					updates: [
						{
							type: 'progress',
							data: { message: 'Processing nodes: Processing item 1 of 3: First node' },
						},
					],
				}),
			);
			expect(mockWriter).toHaveBeenNthCalledWith(
				2,
				expect.objectContaining({
					updates: [
						{
							type: 'progress',
							data: { message: 'Processing nodes: Processing item 2 of 3: Second node' },
						},
					],
				}),
			);
			expect(mockWriter).toHaveBeenNthCalledWith(
				3,
				expect.objectContaining({
					updates: [
						{
							type: 'progress',
							data: { message: 'Processing nodes: Processing item 3 of 3: Third node' },
						},
					],
				}),
			);
			expect(mockWriter).toHaveBeenNthCalledWith(
				4,
				expect.objectContaining({
					updates: [
						{ type: 'progress', data: { message: 'Processing nodes: Completed all 3 items' } },
					],
				}),
			);
		});

		it('should reset counter when init is called again', () => {
			const reporter = createProgressReporter(mockConfig, 'batch_tool', 'Batch Tool');
			const batchReporter = reporter.createBatchReporter('Testing reset');

			batchReporter.init(2);
			batchReporter.next('Item 1');
			batchReporter.init(1); // Reset
			batchReporter.next('New item');

			expect(mockWriter).toHaveBeenNthCalledWith(
				1,
				expect.objectContaining({
					updates: [
						{
							type: 'progress',
							data: { message: 'Testing reset: Processing item 1 of 2: Item 1' },
						},
					],
				}),
			);
			expect(mockWriter).toHaveBeenNthCalledWith(
				2,
				expect.objectContaining({
					updates: [
						{
							type: 'progress',
							data: { message: 'Testing reset: Processing item 1 of 1: New item' },
						},
					],
				}),
			);
		});
	});

	describe('helper functions', () => {
		it('should call reporter.start through reportStart', () => {
			const reporter = createProgressReporter(mockConfig, 'test_tool', 'Test Tool');
			const input = { test: 'input' };

			reportStart(reporter, input);

			expect(mockWriter).toHaveBeenCalledWith(
				expect.objectContaining({
					status: 'running',
					updates: [{ type: 'input', data: input }],
				}),
			);
		});

		it('should call reporter.progress through reportProgress', () => {
			const reporter = createProgressReporter(mockConfig, 'test_tool', 'Test Tool');

			reportProgress(reporter, 'Test message');

			expect(mockWriter).toHaveBeenCalledWith(
				expect.objectContaining({
					status: 'running',
					updates: [{ type: 'progress', data: { message: 'Test message' } }],
				}),
			);
		});

		it('should call reporter.progress with custom data through reportProgress', () => {
			const reporter = createProgressReporter(mockConfig, 'test_tool', 'Test Tool');
			const customData = { step: 2, total: 5 };

			reportProgress(reporter, 'Processing step', customData);

			expect(mockWriter).toHaveBeenCalledWith(
				expect.objectContaining({
					status: 'running',
					updates: [{ type: 'progress', data: customData }],
				}),
			);
		});

		it('should call reporter.complete through reportComplete', () => {
			const reporter = createProgressReporter(mockConfig, 'test_tool', 'Test Tool');
			const output = { result: 'success' };

			reportComplete(reporter, output);

			expect(mockWriter).toHaveBeenCalledWith(
				expect.objectContaining({
					status: 'completed',
					updates: [{ type: 'output', data: output }],
				}),
			);
		});

		it('should call reporter.error through reportError', () => {
			const reporter = createProgressReporter(mockConfig, 'test_tool', 'Test Tool');
			const error: ToolError = { message: 'Test error', code: 'TEST_ERROR' };

			reportError(reporter, error);

			expect(mockWriter).toHaveBeenCalledWith(
				expect.objectContaining({
					status: 'error',
					updates: [
						{
							type: 'error',
							data: { message: 'Test error', code: 'TEST_ERROR', details: undefined },
						},
					],
				}),
			);
		});

		it('should create batch reporter through createBatchProgressReporter', () => {
			const reporter = createProgressReporter(mockConfig, 'test_tool', 'Test Tool');
			const batchReporter = createBatchProgressReporter(reporter, 'Batch operation');

			batchReporter.init(1);
			batchReporter.next('Test item');

			expect(mockWriter).toHaveBeenCalledWith(
				expect.objectContaining({
					updates: [
						{
							type: 'progress',
							data: { message: 'Batch operation: Processing item 1 of 1: Test item' },
						},
					],
				}),
			);
		});

		it('should update customDisplayTitle when provided in start options', () => {
			const reporter = createProgressReporter(mockConfig, 'test_tool', 'Test Tool');
			const input = { test: 'data' };

			reporter.start(input, { customDisplayTitle: 'Custom Title from Options' });

			expect(mockWriter).toHaveBeenCalledWith({
				type: 'tool',
				toolName: 'test_tool',
				toolCallId: 'test-tool-call-id',
				displayTitle: 'Test Tool',
				customDisplayTitle: 'Custom Title from Options',
				status: 'running',
				updates: [
					{
						type: 'input',
						data: input,
					},
				],
			});
		});

		it('should preserve initial custom title when start is called without options', () => {
			const reporter = createProgressReporter(
				mockConfig,
				'test_tool',
				'Test Tool',
				'Initial Custom Title',
			);
			const input = { test: 'data' };

			reporter.start(input);

			expect(mockWriter).toHaveBeenCalledWith({
				type: 'tool',
				toolName: 'test_tool',
				toolCallId: 'test-tool-call-id',
				displayTitle: 'Test Tool',
				customDisplayTitle: 'Initial Custom Title',
				status: 'running',
				updates: [
					{
						type: 'input',
						data: input,
					},
				],
			});
		});
	});
});
