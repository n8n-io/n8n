import type { BaseMessage } from '@langchain/core/messages';
import type { StructuredToolInterface } from '@langchain/core/tools';
import { jsonParse } from 'n8n-workflow';

import type {
	StreamOutput,
	ToolProgressChunk,
	WorkflowUpdateChunk,
} from '../../../types/streaming';
import { WarningTracker } from '../../state/warning-tracker';
import type { TextEditorHandler } from '../text-editor-handler';
import type { TextEditorToolHandler, PreviewParseResult } from '../text-editor-tool-handler';
import {
	ToolDispatchHandler,
	parseReplacements,
	type ToolDispatchResult,
} from '../tool-dispatch-handler';
import type { ValidateToolHandler } from '../validate-tool-handler';

/** Type guard for ToolProgressChunk */
function isToolProgressChunk(chunk: unknown): chunk is ToolProgressChunk {
	return (
		typeof chunk === 'object' &&
		chunk !== null &&
		'type' in chunk &&
		(chunk as ToolProgressChunk).type === 'tool'
	);
}

/** Type guard for WorkflowUpdateChunk */
function isWorkflowUpdateChunk(chunk: unknown): chunk is WorkflowUpdateChunk {
	return (
		typeof chunk === 'object' &&
		chunk !== null &&
		'type' in chunk &&
		(chunk as WorkflowUpdateChunk).type === 'workflow-updated'
	);
}

describe('ToolDispatchHandler', () => {
	const mockValidateToolHandler = {} as ValidateToolHandler;

	function createHandler(
		toolsMap: Map<string, StructuredToolInterface>,
		toolDisplayTitles?: Map<string, string>,
	) {
		return new ToolDispatchHandler({
			toolsMap,
			validateToolHandler: mockValidateToolHandler,
			toolDisplayTitles,
		});
	}

	/** Helper: drain an async generator and return its final return value. */
	async function drainGenerator(
		gen: AsyncGenerator<StreamOutput, ToolDispatchResult, unknown>,
	): Promise<ToolDispatchResult> {
		let result = await gen.next();
		while (!result.done) {
			result = await gen.next();
		}
		return result.value;
	}

	beforeEach(() => {
		jest.clearAllMocks();
	});

	describe('executeGeneralToolCall (via dispatch)', () => {
		it('should include toolCallId in all tool progress events for successful tool', async () => {
			const mockTool = {
				name: 'mock_tool',
				invoke: jest.fn().mockResolvedValue('result'),
			} as unknown as StructuredToolInterface;

			const handler = createHandler(new Map([['mock_tool', mockTool]]));
			const warningTracker = new WarningTracker();

			const chunks: StreamOutput[] = [];
			const generator = handler.dispatch({
				toolCalls: [{ id: 'call-123', name: 'mock_tool', args: {} }],
				messages: [],
				iteration: 1,
				warningTracker,
			});

			for await (const chunk of generator) {
				chunks.push(chunk);
			}

			const toolChunks = chunks.flatMap((c) => c.messages ?? []).filter(isToolProgressChunk);

			// All tool progress chunks should include toolCallId
			expect(toolChunks.length).toBeGreaterThanOrEqual(2);
			for (const chunk of toolChunks) {
				expect(chunk.toolCallId).toBe('call-123');
			}
		});

		it('should include toolCallId in tool progress events when tool not found', async () => {
			const handler = createHandler(new Map());
			const warningTracker = new WarningTracker();

			const chunks: StreamOutput[] = [];
			const generator = handler.dispatch({
				toolCalls: [{ id: 'call-456', name: 'nonexistent_tool', args: {} }],
				messages: [],
				iteration: 1,
				warningTracker,
			});

			for await (const chunk of generator) {
				chunks.push(chunk);
			}

			const toolChunks = chunks.flatMap((c) => c.messages ?? []).filter(isToolProgressChunk);

			expect(toolChunks.length).toBeGreaterThanOrEqual(2);
			for (const chunk of toolChunks) {
				expect(chunk.toolCallId).toBe('call-456');
			}
		});

		it('should include toolCallId in tool progress events when tool throws', async () => {
			const mockTool = {
				name: 'failing_tool',
				invoke: jest.fn().mockRejectedValue(new Error('Tool failed')),
			} as unknown as StructuredToolInterface;

			const handler = createHandler(new Map([['failing_tool', mockTool]]));
			const warningTracker = new WarningTracker();

			const chunks: StreamOutput[] = [];
			const generator = handler.dispatch({
				toolCalls: [{ id: 'call-789', name: 'failing_tool', args: {} }],
				messages: [],
				iteration: 1,
				warningTracker,
			});

			for await (const chunk of generator) {
				chunks.push(chunk);
			}

			const toolChunks = chunks.flatMap((c) => c.messages ?? []).filter(isToolProgressChunk);

			expect(toolChunks.length).toBeGreaterThanOrEqual(2);
			for (const chunk of toolChunks) {
				expect(chunk.toolCallId).toBe('call-789');
			}
		});

		it('should include displayTitle in tool progress chunks when toolDisplayTitles is provided', async () => {
			const mockTool = {
				name: 'get_node_types',
				invoke: jest.fn().mockResolvedValue('result'),
			} as unknown as StructuredToolInterface;

			const toolDisplayTitles = new Map([['get_node_types', 'Getting node definitions']]);
			const handler = createHandler(new Map([['get_node_types', mockTool]]), toolDisplayTitles);
			const warningTracker = new WarningTracker();

			const chunks: StreamOutput[] = [];
			const generator = handler.dispatch({
				toolCalls: [{ id: 'call-dt-1', name: 'get_node_types', args: {} }],
				messages: [],
				iteration: 1,
				warningTracker,
			});

			for await (const chunk of generator) {
				chunks.push(chunk);
			}

			const toolChunks = chunks.flatMap((c) => c.messages ?? []).filter(isToolProgressChunk);

			// All tool progress chunks should include displayTitle
			for (const chunk of toolChunks) {
				expect(chunk.displayTitle).toBe('Getting node definitions');
			}
		});

		it('should not include displayTitle when toolDisplayTitles is not provided', async () => {
			const mockTool = {
				name: 'mock_tool',
				invoke: jest.fn().mockResolvedValue('result'),
			} as unknown as StructuredToolInterface;

			const handler = createHandler(new Map([['mock_tool', mockTool]]));
			const warningTracker = new WarningTracker();

			const chunks: StreamOutput[] = [];
			const generator = handler.dispatch({
				toolCalls: [{ id: 'call-dt-2', name: 'mock_tool', args: {} }],
				messages: [],
				iteration: 1,
				warningTracker,
			});

			for await (const chunk of generator) {
				chunks.push(chunk);
			}

			const toolChunks = chunks.flatMap((c) => c.messages ?? []).filter(isToolProgressChunk);

			for (const chunk of toolChunks) {
				expect(chunk.displayTitle).toBeUndefined();
			}
		});

		it('should include displayTitle in error chunks when tool throws', async () => {
			const mockTool = {
				name: 'search_nodes',
				invoke: jest.fn().mockRejectedValue(new Error('Search failed')),
			} as unknown as StructuredToolInterface;

			const toolDisplayTitles = new Map([['search_nodes', 'Searching nodes']]);
			const handler = createHandler(new Map([['search_nodes', mockTool]]), toolDisplayTitles);
			const warningTracker = new WarningTracker();

			const chunks: StreamOutput[] = [];
			const generator = handler.dispatch({
				toolCalls: [{ id: 'call-dt-3', name: 'search_nodes', args: {} }],
				messages: [],
				iteration: 1,
				warningTracker,
			});

			for await (const chunk of generator) {
				chunks.push(chunk);
			}

			const toolChunks = chunks.flatMap((c) => c.messages ?? []).filter(isToolProgressChunk);

			for (const chunk of toolChunks) {
				expect(chunk.displayTitle).toBe('Searching nodes');
			}
		});

		it('should yield error status when tool is not found', async () => {
			const handler = createHandler(new Map());
			const warningTracker = new WarningTracker();

			const chunks: StreamOutput[] = [];
			const generator = handler.dispatch({
				toolCalls: [{ id: 'test-id', name: 'nonexistent_tool', args: {} }],
				messages: [],
				iteration: 1,
				warningTracker,
			});

			for await (const chunk of generator) {
				chunks.push(chunk);
			}

			// Should have at least 2 chunks: running and error
			expect(chunks.length).toBeGreaterThanOrEqual(2);

			// Find the tool progress chunks
			const toolChunks = chunks.flatMap((c) => c.messages ?? []).filter(isToolProgressChunk);

			// Should have running status
			const runningChunk = toolChunks.find((c) => c.status === 'running');
			expect(runningChunk).toBeDefined();
			expect(runningChunk?.toolName).toBe('nonexistent_tool');

			// Should have error status (this is the bug - currently missing)
			const errorChunk = toolChunks.find((c) => c.status === 'error');
			expect(errorChunk).toBeDefined();
			expect(errorChunk?.toolName).toBe('nonexistent_tool');
			expect(errorChunk?.error).toContain('not found');
		});
	});

	describe('hasUnvalidatedEdits tracking', () => {
		/** Create a mock TextEditorToolHandler whose execute() yields nothing and returns empty */
		function createMockTextEditorToolHandler(): TextEditorToolHandler {
			return {
				// eslint-disable-next-line require-yield
				execute: jest.fn().mockImplementation(async function* () {
					return undefined;
				}),
			} as unknown as TextEditorToolHandler;
		}

		/** Create a mock TextEditorHandler */
		function createMockTextEditorHandler(): TextEditorHandler {
			return {
				getWorkflowCode: jest.fn().mockReturnValue('const wf = {};'),
			} as unknown as TextEditorHandler;
		}

		/** Create a mock ValidateToolHandler whose execute() yields nothing and returns a result */
		function createMockValidateToolHandler(workflowReady = false): ValidateToolHandler {
			return {
				// eslint-disable-next-line require-yield
				execute: jest.fn().mockImplementation(async function* () {
					return { workflowReady, parseDuration: 10 };
				}),
			} as unknown as ValidateToolHandler;
		}

		it('should set hasUnvalidatedEdits to true after str_replace command', async () => {
			const mockTextEditorToolHandler = createMockTextEditorToolHandler();
			const handler = new ToolDispatchHandler({
				toolsMap: new Map(),
				validateToolHandler: mockValidateToolHandler,
			});

			const result = await drainGenerator(
				handler.dispatch({
					toolCalls: [
						{
							id: 'call-1',
							name: 'str_replace_based_edit_tool',
							args: { command: 'str_replace' },
						},
					],
					messages: [],
					iteration: 1,
					warningTracker: new WarningTracker(),
					textEditorToolHandler: mockTextEditorToolHandler,
				}),
			);

			expect(result.hasUnvalidatedEdits).toBe(true);
		});

		it('should set hasUnvalidatedEdits to true after insert command', async () => {
			const mockTextEditorToolHandler = createMockTextEditorToolHandler();
			const handler = new ToolDispatchHandler({
				toolsMap: new Map(),
				validateToolHandler: mockValidateToolHandler,
			});

			const result = await drainGenerator(
				handler.dispatch({
					toolCalls: [
						{
							id: 'call-2',
							name: 'str_replace_based_edit_tool',
							args: { command: 'insert' },
						},
					],
					messages: [],
					iteration: 1,
					warningTracker: new WarningTracker(),
					textEditorToolHandler: mockTextEditorToolHandler,
				}),
			);

			expect(result.hasUnvalidatedEdits).toBe(true);
		});

		it('should set hasUnvalidatedEdits to false after create command (auto-validates)', async () => {
			const mockTextEditorToolHandler = createMockTextEditorToolHandler();
			const handler = new ToolDispatchHandler({
				toolsMap: new Map(),
				validateToolHandler: mockValidateToolHandler,
			});

			const result = await drainGenerator(
				handler.dispatch({
					toolCalls: [
						{
							id: 'call-3',
							name: 'str_replace_based_edit_tool',
							args: { command: 'create' },
						},
					],
					messages: [],
					iteration: 1,
					warningTracker: new WarningTracker(),
					textEditorToolHandler: mockTextEditorToolHandler,
				}),
			);

			expect(result.hasUnvalidatedEdits).toBe(false);
		});

		it('should set hasUnvalidatedEdits to false after validate_workflow tool', async () => {
			const mockValidate = createMockValidateToolHandler();
			const mockTextEditorToolHandler = createMockTextEditorToolHandler();
			const mockTextEditorHandler = createMockTextEditorHandler();
			const handler = new ToolDispatchHandler({
				toolsMap: new Map(),
				validateToolHandler: mockValidate,
			});

			const result = await drainGenerator(
				handler.dispatch({
					toolCalls: [{ id: 'call-4', name: 'validate_workflow', args: {} }],
					messages: [],
					iteration: 1,
					warningTracker: new WarningTracker(),
					textEditorToolHandler: mockTextEditorToolHandler,
					textEditorHandler: mockTextEditorHandler,
				}),
			);

			expect(result.hasUnvalidatedEdits).toBe(false);
		});

		it('should leave hasUnvalidatedEdits undefined after view command', async () => {
			const mockTextEditorToolHandler = createMockTextEditorToolHandler();
			const handler = new ToolDispatchHandler({
				toolsMap: new Map(),
				validateToolHandler: mockValidateToolHandler,
			});

			const result = await drainGenerator(
				handler.dispatch({
					toolCalls: [
						{
							id: 'call-5',
							name: 'str_replace_based_edit_tool',
							args: { command: 'view' },
						},
					],
					messages: [],
					iteration: 1,
					warningTracker: new WarningTracker(),
					textEditorToolHandler: mockTextEditorToolHandler,
				}),
			);

			expect(result.hasUnvalidatedEdits).toBeUndefined();
		});

		it('should set hasUnvalidatedEdits to false when str_replace is followed by validate_workflow', async () => {
			const mockValidate = createMockValidateToolHandler();
			const mockTextEditorToolHandler = createMockTextEditorToolHandler();
			const mockTextEditorHandler = createMockTextEditorHandler();
			const handler = new ToolDispatchHandler({
				toolsMap: new Map(),
				validateToolHandler: mockValidate,
			});

			const result = await drainGenerator(
				handler.dispatch({
					toolCalls: [
						{
							id: 'call-6a',
							name: 'str_replace_based_edit_tool',
							args: { command: 'str_replace' },
						},
						{ id: 'call-6b', name: 'validate_workflow', args: {} },
					],
					messages: [],
					iteration: 1,
					warningTracker: new WarningTracker(),
					textEditorToolHandler: mockTextEditorToolHandler,
					textEditorHandler: mockTextEditorHandler,
				}),
			);

			expect(result.hasUnvalidatedEdits).toBe(false);
		});

		it('should set hasUnvalidatedEdits to true when validate_workflow is followed by str_replace', async () => {
			const mockValidate = createMockValidateToolHandler();
			const mockTextEditorToolHandler = createMockTextEditorToolHandler();
			const mockTextEditorHandler = createMockTextEditorHandler();
			const handler = new ToolDispatchHandler({
				toolsMap: new Map(),
				validateToolHandler: mockValidate,
			});

			const result = await drainGenerator(
				handler.dispatch({
					toolCalls: [
						{ id: 'call-7a', name: 'validate_workflow', args: {} },
						{
							id: 'call-7b',
							name: 'str_replace_based_edit_tool',
							args: { command: 'str_replace' },
						},
					],
					messages: [],
					iteration: 1,
					warningTracker: new WarningTracker(),
					textEditorToolHandler: mockTextEditorToolHandler,
					textEditorHandler: mockTextEditorHandler,
				}),
			);

			expect(result.hasUnvalidatedEdits).toBe(true);
		});

		it('should leave hasUnvalidatedEdits undefined for general tools', async () => {
			const mockTool = {
				name: 'search_nodes',
				invoke: jest.fn().mockResolvedValue('result'),
			} as unknown as StructuredToolInterface;

			const handler = new ToolDispatchHandler({
				toolsMap: new Map([['search_nodes', mockTool]]),
				validateToolHandler: mockValidateToolHandler,
			});

			const result = await drainGenerator(
				handler.dispatch({
					toolCalls: [{ id: 'call-8', name: 'search_nodes', args: {} }],
					messages: [],
					iteration: 1,
					warningTracker: new WarningTracker(),
				}),
			);

			expect(result.hasUnvalidatedEdits).toBeUndefined();
		});

		it('should set hasUnvalidatedEdits to true after batch_str_replace', async () => {
			const mockTextEditorHandler = {
				executeBatch: jest.fn().mockReturnValue('All 2 replacements applied successfully.'),
			} as unknown as TextEditorHandler;

			const handler = new ToolDispatchHandler({
				toolsMap: new Map(),
				validateToolHandler: mockValidateToolHandler,
			});

			const result = await drainGenerator(
				handler.dispatch({
					toolCalls: [
						{
							id: 'call-batch-1',
							name: 'batch_str_replace',
							args: {
								replacements: [
									{ old_str: 'a', new_str: 'b' },
									{ old_str: 'c', new_str: 'd' },
								],
							},
						},
					],
					messages: [],
					iteration: 1,
					warningTracker: new WarningTracker(),
					textEditorHandler: mockTextEditorHandler,
				}),
			);

			expect(result.hasUnvalidatedEdits).toBe(true);
			expect(mockTextEditorHandler.executeBatch).toHaveBeenCalledWith([
				{ old_str: 'a', new_str: 'b' },
				{ old_str: 'c', new_str: 'd' },
			]);
		});
	});

	describe('batch_str_replace', () => {
		async function collectChunks(
			gen: AsyncGenerator<StreamOutput, ToolDispatchResult, unknown>,
		): Promise<{ chunks: StreamOutput[]; result: ToolDispatchResult }> {
			const chunks: StreamOutput[] = [];
			let genResult = await gen.next();
			while (!genResult.done) {
				chunks.push(genResult.value);
				genResult = await gen.next();
			}
			return { chunks, result: genResult.value };
		}

		it('should route to textEditorHandler.executeBatch', async () => {
			const mockTextEditorHandler = {
				executeBatch: jest.fn().mockReturnValue('All 1 replacements applied successfully.'),
			} as unknown as TextEditorHandler;

			const handler = new ToolDispatchHandler({
				toolsMap: new Map(),
				validateToolHandler: mockValidateToolHandler,
			});

			const messages: BaseMessage[] = [];
			await drainGenerator(
				handler.dispatch({
					toolCalls: [
						{
							id: 'call-b1',
							name: 'batch_str_replace',
							args: { replacements: [{ old_str: 'x', new_str: 'y' }] },
						},
					],
					messages,
					iteration: 1,
					warningTracker: new WarningTracker(),
					textEditorHandler: mockTextEditorHandler,
				}),
			);

			expect(mockTextEditorHandler.executeBatch).toHaveBeenCalledWith([
				{ old_str: 'x', new_str: 'y' },
			]);
			// Check that success message was pushed to messages
			expect(messages).toHaveLength(1);
			expect(messages[0].content).toBe('All 1 replacements applied successfully.');
		});

		it('should handle errors gracefully and push error ToolMessage', async () => {
			const mockTextEditorHandler = {
				executeBatch: jest.fn().mockImplementation(() => {
					throw new Error('Batch replacement failed at index 1 of 2: No match found');
				}),
			} as unknown as TextEditorHandler;

			const handler = new ToolDispatchHandler({
				toolsMap: new Map(),
				validateToolHandler: mockValidateToolHandler,
			});

			const messages: BaseMessage[] = [];
			const { chunks } = await collectChunks(
				handler.dispatch({
					toolCalls: [
						{
							id: 'call-b2',
							name: 'batch_str_replace',
							args: { replacements: [{ old_str: 'a', new_str: 'b' }] },
						},
					],
					messages,
					iteration: 1,
					warningTracker: new WarningTracker(),
					textEditorHandler: mockTextEditorHandler,
				}),
			);

			// Should have error message in messages
			expect(messages).toHaveLength(1);
			expect(messages[0].content as string).toContain('Error:');

			// Should have error status in progress chunks
			const toolChunks = chunks.flatMap((c) => c.messages ?? []).filter(isToolProgressChunk);
			const errorChunk = toolChunks.find((c) => c.status === 'error');
			expect(errorChunk).toBeDefined();
			expect(errorChunk?.error).toContain('Batch replacement failed');
		});

		it('should yield running and completed progress chunks on success', async () => {
			const mockTextEditorHandler = {
				executeBatch: jest.fn().mockReturnValue('All 2 replacements applied successfully.'),
			} as unknown as TextEditorHandler;

			const handler = new ToolDispatchHandler({
				toolsMap: new Map(),
				validateToolHandler: mockValidateToolHandler,
			});

			const { chunks } = await collectChunks(
				handler.dispatch({
					toolCalls: [
						{
							id: 'call-b3',
							name: 'batch_str_replace',
							args: {
								replacements: [
									{ old_str: 'a', new_str: 'b' },
									{ old_str: 'c', new_str: 'd' },
								],
							},
						},
					],
					messages: [],
					iteration: 1,
					warningTracker: new WarningTracker(),
					textEditorHandler: mockTextEditorHandler,
				}),
			);

			const toolChunks = chunks.flatMap((c) => c.messages ?? []).filter(isToolProgressChunk);
			expect(toolChunks).toHaveLength(2);

			expect(toolChunks[0].status).toBe('running');
			expect(toolChunks[0].displayTitle).toBe('Editing workflow');

			expect(toolChunks[1].status).toBe('completed');
			expect(toolChunks[1].displayTitle).toBe('Editing workflow');
		});

		it('should yield WorkflowUpdateChunk after successful batch_str_replace when parse succeeds', async () => {
			const mockWorkflow = {
				id: 'test',
				name: 'Test',
				nodes: [{ id: 'n1', name: 'Node 1', type: 'test' }],
				connections: {},
			};

			const mockTextEditorHandler = {
				executeBatch: jest.fn().mockReturnValue('All 1 replacements applied successfully.'),
			} as unknown as TextEditorHandler;

			const mockTextEditorToolHandler = {
				tryParseForPreview: jest.fn().mockResolvedValue({
					chunk: {
						messages: [
							{
								role: 'assistant',
								type: 'workflow-updated',
								codeSnippet: JSON.stringify(mockWorkflow, null, 2),
							},
						],
					},
				} satisfies PreviewParseResult),
			} as unknown as TextEditorToolHandler;

			const handler = new ToolDispatchHandler({
				toolsMap: new Map(),
				validateToolHandler: mockValidateToolHandler,
			});

			const { chunks } = await collectChunks(
				handler.dispatch({
					toolCalls: [
						{
							id: 'call-bp1',
							name: 'batch_str_replace',
							args: { replacements: [{ old_str: 'x', new_str: 'y' }] },
						},
					],
					messages: [],
					iteration: 1,
					warningTracker: new WarningTracker(),
					textEditorHandler: mockTextEditorHandler,
					textEditorToolHandler: mockTextEditorToolHandler,
				}),
			);

			const workflowChunks = chunks.flatMap((c) => c.messages ?? []).filter(isWorkflowUpdateChunk);
			expect(workflowChunks).toHaveLength(1);
			expect(jsonParse(workflowChunks[0].codeSnippet)).toEqual(mockWorkflow);
		});

		it('should append parse error to tool message when parse fails after batch_str_replace', async () => {
			const mockTextEditorHandler = {
				executeBatch: jest.fn().mockReturnValue('All 1 replacements applied successfully.'),
			} as unknown as TextEditorHandler;

			const mockTextEditorToolHandler = {
				tryParseForPreview: jest.fn().mockResolvedValue({
					parseError: 'Unexpected token',
				} satisfies PreviewParseResult),
			} as unknown as TextEditorToolHandler;

			const handler = new ToolDispatchHandler({
				toolsMap: new Map(),
				validateToolHandler: mockValidateToolHandler,
			});

			const messages: BaseMessage[] = [];
			await drainGenerator(
				handler.dispatch({
					toolCalls: [
						{
							id: 'call-bp2',
							name: 'batch_str_replace',
							args: { replacements: [{ old_str: 'x', new_str: 'y' }] },
						},
					],
					messages,
					iteration: 1,
					warningTracker: new WarningTracker(),
					textEditorHandler: mockTextEditorHandler,
					textEditorToolHandler: mockTextEditorToolHandler,
				}),
			);

			expect(messages).toHaveLength(1);
			const content = messages[0].content as string;
			expect(content).toContain('All 1 replacements applied successfully.');
			expect(content).toContain('Parse error: Unexpected token');
		});

		it('should skip preview when textEditorToolHandler is not provided', async () => {
			const mockTextEditorHandler = {
				executeBatch: jest.fn().mockReturnValue('All 1 replacements applied successfully.'),
			} as unknown as TextEditorHandler;

			const handler = new ToolDispatchHandler({
				toolsMap: new Map(),
				validateToolHandler: mockValidateToolHandler,
			});

			const messages: BaseMessage[] = [];
			const { chunks } = await collectChunks(
				handler.dispatch({
					toolCalls: [
						{
							id: 'call-bp3',
							name: 'batch_str_replace',
							args: { replacements: [{ old_str: 'x', new_str: 'y' }] },
						},
					],
					messages,
					iteration: 1,
					warningTracker: new WarningTracker(),
					textEditorHandler: mockTextEditorHandler,
					// No textEditorToolHandler provided
				}),
			);

			// No WorkflowUpdateChunk should be yielded
			const workflowChunks = chunks.flatMap((c) => c.messages ?? []).filter(isWorkflowUpdateChunk);
			expect(workflowChunks).toHaveLength(0);

			// Only the batch result should be in messages, no parse error appended
			expect(messages).toHaveLength(1);
			expect(messages[0].content).toBe('All 1 replacements applied successfully.');
		});

		it('should parse replacements when sent as JSON string', async () => {
			const mockTextEditorHandler = {
				executeBatch: jest.fn().mockReturnValue('All 1 replacements applied successfully.'),
			} as unknown as TextEditorHandler;

			const handler = new ToolDispatchHandler({
				toolsMap: new Map(),
				validateToolHandler: mockValidateToolHandler,
			});

			const messages: BaseMessage[] = [];
			await drainGenerator(
				handler.dispatch({
					toolCalls: [
						{
							id: 'call-str-1',
							name: 'batch_str_replace',
							args: {
								replacements: JSON.stringify([{ old_str: 'x', new_str: 'y' }]),
							},
						},
					],
					messages,
					iteration: 1,
					warningTracker: new WarningTracker(),
					textEditorHandler: mockTextEditorHandler,
				}),
			);

			expect(mockTextEditorHandler.executeBatch).toHaveBeenCalledWith([
				{ old_str: 'x', new_str: 'y' },
			]);
			expect(messages).toHaveLength(1);
			expect(messages[0].content).toBe('All 1 replacements applied successfully.');
		});

		it('should return error when replacements item missing old_str', async () => {
			const mockTextEditorHandler = {
				executeBatch: jest.fn(),
			} as unknown as TextEditorHandler;

			const handler = new ToolDispatchHandler({
				toolsMap: new Map(),
				validateToolHandler: mockValidateToolHandler,
			});

			const messages: BaseMessage[] = [];
			await drainGenerator(
				handler.dispatch({
					toolCalls: [
						{
							id: 'call-missing-old',
							name: 'batch_str_replace',
							args: {
								replacements: [{ new_str: 'y' }],
							},
						},
					],
					messages,
					iteration: 1,
					warningTracker: new WarningTracker(),
					textEditorHandler: mockTextEditorHandler,
				}),
			);

			expect(mockTextEditorHandler.executeBatch).not.toHaveBeenCalled();
			expect(messages).toHaveLength(1);
			expect(messages[0].content as string).toContain('old_str');
		});

		it('should return error when replacements item missing new_str', async () => {
			const mockTextEditorHandler = {
				executeBatch: jest.fn(),
			} as unknown as TextEditorHandler;

			const handler = new ToolDispatchHandler({
				toolsMap: new Map(),
				validateToolHandler: mockValidateToolHandler,
			});

			const messages: BaseMessage[] = [];
			await drainGenerator(
				handler.dispatch({
					toolCalls: [
						{
							id: 'call-missing-new',
							name: 'batch_str_replace',
							args: {
								replacements: [{ old_str: 'x' }],
							},
						},
					],
					messages,
					iteration: 1,
					warningTracker: new WarningTracker(),
					textEditorHandler: mockTextEditorHandler,
				}),
			);

			expect(mockTextEditorHandler.executeBatch).not.toHaveBeenCalled();
			expect(messages).toHaveLength(1);
			expect(messages[0].content as string).toContain('new_str');
		});

		it('should return error when replacements is not an array or string', async () => {
			const mockTextEditorHandler = {
				executeBatch: jest.fn(),
			} as unknown as TextEditorHandler;

			const handler = new ToolDispatchHandler({
				toolsMap: new Map(),
				validateToolHandler: mockValidateToolHandler,
			});

			const messages: BaseMessage[] = [];
			await drainGenerator(
				handler.dispatch({
					toolCalls: [
						{
							id: 'call-bad-type',
							name: 'batch_str_replace',
							args: {
								replacements: 123,
							},
						},
					],
					messages,
					iteration: 1,
					warningTracker: new WarningTracker(),
					textEditorHandler: mockTextEditorHandler,
				}),
			);

			expect(mockTextEditorHandler.executeBatch).not.toHaveBeenCalled();
			expect(messages).toHaveLength(1);
			expect(messages[0].content as string).toContain('Error');
		});

		it('should return error when replacements item has non-string old_str', async () => {
			const mockTextEditorHandler = {
				executeBatch: jest.fn(),
			} as unknown as TextEditorHandler;

			const handler = new ToolDispatchHandler({
				toolsMap: new Map(),
				validateToolHandler: mockValidateToolHandler,
			});

			const messages: BaseMessage[] = [];
			await drainGenerator(
				handler.dispatch({
					toolCalls: [
						{
							id: 'call-non-string',
							name: 'batch_str_replace',
							args: {
								replacements: [{ old_str: 123, new_str: 'y' }],
							},
						},
					],
					messages,
					iteration: 1,
					warningTracker: new WarningTracker(),
					textEditorHandler: mockTextEditorHandler,
				}),
			);

			expect(mockTextEditorHandler.executeBatch).not.toHaveBeenCalled();
			expect(messages).toHaveLength(1);
			expect(messages[0].content as string).toContain('old_str');
		});
	});

	describe('parseReplacements', () => {
		it('should pass through a valid array', () => {
			const input = [{ old_str: 'a', new_str: 'b' }];
			expect(parseReplacements(input)).toEqual(input);
		});

		it('should parse a JSON string into an array', () => {
			const input = JSON.stringify([{ old_str: 'a', new_str: 'b' }]);
			expect(parseReplacements(input)).toEqual([{ old_str: 'a', new_str: 'b' }]);
		});

		it('should throw for non-array, non-string input', () => {
			expect(() => parseReplacements(123)).toThrow('replacements must be an array');
		});

		it('should throw for invalid JSON string', () => {
			expect(() => parseReplacements('not valid json')).toThrow();
		});

		it('should throw for JSON string that parses to non-array', () => {
			expect(() => parseReplacements(JSON.stringify({ old_str: 'a' }))).toThrow(
				'replacements must be an array',
			);
		});

		it('should throw when item missing old_str', () => {
			expect(() => parseReplacements([{ new_str: 'b' }])).toThrow('old_str');
		});

		it('should throw when item missing new_str', () => {
			expect(() => parseReplacements([{ old_str: 'a' }])).toThrow('new_str');
		});

		it('should throw when old_str is not a string', () => {
			expect(() => parseReplacements([{ old_str: 123, new_str: 'b' }])).toThrow('old_str');
		});

		it('should throw when new_str is not a string', () => {
			expect(() => parseReplacements([{ old_str: 'a', new_str: 123 }])).toThrow('new_str');
		});
	});
});
