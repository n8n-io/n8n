/**
 * Tests for TextEditorToolHandler
 */

import type { BaseMessage } from '@langchain/core/messages';
import { ToolMessage } from '@langchain/core/messages';
import { jsonParse } from 'n8n-workflow';

import type {
	StreamOutput,
	ToolProgressChunk,
	WorkflowUpdateChunk,
} from '../../../types/streaming';
import { WarningTracker } from '../../state/warning-tracker';
import { TextEditorToolHandler } from '../text-editor-tool-handler';

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

describe('TextEditorToolHandler', () => {
	let handler: TextEditorToolHandler;
	let mockTextEditorExecute: jest.Mock;
	let mockTextEditorGetCode: jest.Mock;
	let mockParseAndValidate: jest.Mock;
	let mockGetErrorContext: jest.Mock;
	let messages: BaseMessage[];

	beforeEach(() => {
		mockTextEditorExecute = jest.fn();
		mockTextEditorGetCode = jest.fn();
		mockParseAndValidate = jest.fn();
		mockGetErrorContext = jest.fn().mockReturnValue('Code context:\n1: const x = 1;');
		messages = [];

		handler = new TextEditorToolHandler({
			textEditorExecute: mockTextEditorExecute,
			textEditorGetCode: mockTextEditorGetCode,
			parseAndValidate: mockParseAndValidate,
			getErrorContext: mockGetErrorContext,
		});
	});

	describe('execute', () => {
		const baseParams = {
			toolCallId: 'test-id',
			args: { command: 'view', path: '/workflow.js' },
			currentWorkflow: undefined,
			iteration: 1,
		};

		it('should execute view command and return undefined', async () => {
			mockTextEditorExecute.mockReturnValue('1: const x = 1;');

			const generator = handler.execute({
				...baseParams,
				messages,
			});

			const chunks: unknown[] = [];
			for await (const chunk of generator) {
				chunks.push(chunk);
			}

			// Should yield running and completed
			expect(chunks.length).toBeGreaterThanOrEqual(2);

			// Should add tool result to messages
			expect(messages.length).toBe(1);
			expect(messages[0]).toBeInstanceOf(ToolMessage);
			const toolMessage = messages[0] as ToolMessage;
			expect(toolMessage.content).toBe('1: const x = 1;');
		});

		it('should execute str_replace command and return undefined', async () => {
			mockTextEditorExecute.mockReturnValue('Edit applied successfully.');

			const generator = handler.execute({
				...baseParams,
				args: { command: 'str_replace', path: '/workflow.js', old_str: 'x', new_str: 'y' },
				messages,
			});

			const chunks: unknown[] = [];
			for await (const chunk of generator) {
				chunks.push(chunk);
			}

			expect(messages.length).toBe(1);
			const toolMessage = messages[0] as ToolMessage;
			expect(toolMessage.content).toBe('Edit applied successfully.');
		});

		it('should auto-validate after create and return workflowReady true on success', async () => {
			const mockWorkflow = {
				id: 'test',
				name: 'Test',
				nodes: [{ id: 'n1', name: 'Node 1', type: 'test' }],
				connections: {},
			};

			mockTextEditorExecute.mockReturnValue('File created.');
			mockTextEditorGetCode.mockReturnValue('const workflow = {};');
			mockParseAndValidate.mockResolvedValue({
				workflow: mockWorkflow,
				warnings: [],
			});

			const generator = handler.execute({
				...baseParams,
				args: { command: 'create', path: '/workflow.js', file_text: 'const workflow = {};' },
				messages,
			});

			const chunks: StreamOutput[] = [];
			for await (const chunk of generator) {
				chunks.push(chunk);
			}

			// Should have create result in messages (no additional validation message on success)
			expect(messages.length).toBe(1);
			expect(messages[0]).toBeInstanceOf(ToolMessage);

			// Should yield a WorkflowUpdateChunk for progressive canvas rendering
			const workflowChunks = chunks.flatMap((c) => c.messages ?? []).filter(isWorkflowUpdateChunk);
			expect(workflowChunks).toHaveLength(1);
			expect(jsonParse(workflowChunks[0].codeSnippet)).toEqual(mockWorkflow);
		});

		it('should auto-validate after create and return workflowReady false on warnings', async () => {
			const mockWorkflow = {
				id: 'test',
				name: 'Test',
				nodes: [],
				connections: {},
			};

			mockTextEditorExecute.mockReturnValue('File created.');
			mockTextEditorGetCode.mockReturnValue('const workflow = {};');
			mockParseAndValidate.mockResolvedValue({
				workflow: mockWorkflow,
				warnings: [{ code: 'WARN001', message: 'Missing parameter' }],
			});

			const generator = handler.execute({
				...baseParams,
				args: { command: 'create', path: '/workflow.js', file_text: 'const workflow = {};' },
				messages,
			});

			const chunks: StreamOutput[] = [];
			for await (const chunk of generator) {
				chunks.push(chunk);
			}

			// Should have single ToolMessage combining create result + validation warning
			expect(messages.length).toBe(1);
			expect(messages[0]).toBeInstanceOf(ToolMessage);
			const content = (messages[0] as ToolMessage).content as string;
			expect(content).toContain('File created.');
			expect(content).toContain('WARN001');

			// Should still yield a WorkflowUpdateChunk even with warnings
			const workflowChunks = chunks.flatMap((c) => c.messages ?? []).filter(isWorkflowUpdateChunk);
			expect(workflowChunks).toHaveLength(1);
			expect(jsonParse(workflowChunks[0].codeSnippet)).toEqual(mockWorkflow);
		});

		it('should auto-validate after create and return workflowReady false on parse error', async () => {
			mockTextEditorExecute.mockReturnValue('File created.');
			mockTextEditorGetCode.mockReturnValue('const workflow = {};');
			mockParseAndValidate.mockRejectedValue(new Error('Syntax error'));

			const generator = handler.execute({
				...baseParams,
				args: { command: 'create', path: '/workflow.js', file_text: 'const workflow = {};' },
				messages,
			});

			const chunks: StreamOutput[] = [];
			for await (const chunk of generator) {
				chunks.push(chunk);
			}

			// Should have single ToolMessage combining create result + parse error
			expect(messages.length).toBe(1);
			expect(messages[0]).toBeInstanceOf(ToolMessage);
			const content = (messages[0] as ToolMessage).content as string;
			expect(content).toContain('File created.');
			expect(content).toContain('Parse error');

			// Should NOT yield a WorkflowUpdateChunk when parse fails
			const workflowChunks = chunks.flatMap((c) => c.messages ?? []).filter(isWorkflowUpdateChunk);
			expect(workflowChunks).toHaveLength(0);
		});

		it('should handle text editor execution error', async () => {
			mockTextEditorExecute.mockImplementation(() => {
				throw new Error('No match found');
			});

			const generator = handler.execute({
				...baseParams,
				args: { command: 'str_replace', path: '/workflow.js', old_str: 'x', new_str: 'y' },
				messages,
			});

			const chunks: unknown[] = [];
			for await (const chunk of generator) {
				chunks.push(chunk);
			}

			// Should add error message
			expect(messages.length).toBe(1);
			const toolMessage = messages[0] as ToolMessage;
			expect(toolMessage.content).toContain('Error: No match found');
		});

		it('should include toolCallId in all tool progress chunks', async () => {
			mockTextEditorExecute.mockReturnValue('Done');

			const generator = handler.execute({
				...baseParams,
				toolCallId: 'call-abc',
				messages,
			});

			const chunks: StreamOutput[] = [];
			for await (const chunk of generator) {
				chunks.push(chunk);
			}

			const toolChunks = chunks.flatMap((c) => c.messages ?? []).filter(isToolProgressChunk);

			expect(toolChunks.length).toBeGreaterThanOrEqual(2);
			for (const chunk of toolChunks) {
				expect(chunk.toolCallId).toBe('call-abc');
			}
		});

		it('should include toolCallId in progress chunks on error', async () => {
			mockTextEditorExecute.mockImplementation(() => {
				throw new Error('No match found');
			});

			const generator = handler.execute({
				...baseParams,
				toolCallId: 'call-def',
				args: { command: 'str_replace', path: '/workflow.js', old_str: 'x', new_str: 'y' },
				messages,
			});

			const chunks: StreamOutput[] = [];
			for await (const chunk of generator) {
				chunks.push(chunk);
			}

			const toolChunks = chunks.flatMap((c) => c.messages ?? []).filter(isToolProgressChunk);

			expect(toolChunks.length).toBeGreaterThanOrEqual(2);
			for (const chunk of toolChunks) {
				expect(chunk.toolCallId).toBe('call-def');
			}
		});

		it('should yield tool progress chunks', async () => {
			mockTextEditorExecute.mockReturnValue('Done');

			const generator = handler.execute({
				...baseParams,
				messages,
			});

			const chunks: unknown[] = [];
			for await (const chunk of generator) {
				chunks.push(chunk);
			}

			// Find running and completed chunks
			const runningChunk = chunks.find((c: unknown) =>
				(c as { messages?: Array<{ status?: string }> }).messages?.some(
					(m) => m.status === 'running',
				),
			);
			const completedChunk = chunks.find((c: unknown) =>
				(c as { messages?: Array<{ status?: string }> }).messages?.some(
					(m) => m.status === 'completed',
				),
			);

			expect(runningChunk).toBeDefined();
			expect(completedChunk).toBeDefined();
		});

		it('should send only new warnings after create when warningTracker is provided', async () => {
			const warningTracker = new WarningTracker();
			const mockWorkflow = {
				id: 'test',
				name: 'Test',
				nodes: [],
				connections: {},
			};

			const seenWarning = { code: 'WARN001', message: 'Already seen' };
			const newWarning = { code: 'WARN002', message: 'New warning' };

			warningTracker.markAsSeen([seenWarning]);

			mockTextEditorExecute.mockReturnValue('File created.');
			mockTextEditorGetCode.mockReturnValue('const workflow = {};');
			mockParseAndValidate.mockResolvedValue({
				workflow: mockWorkflow,
				warnings: [seenWarning, newWarning],
			});

			const generator = handler.execute({
				...baseParams,
				args: { command: 'create', path: '/workflow.js', file_text: 'const workflow = {};' },
				messages,
				warningTracker,
			});

			const chunks: unknown[] = [];
			for await (const chunk of generator) {
				chunks.push(chunk);
			}

			// Should have single ToolMessage combining create result + only new warning
			expect(messages).toHaveLength(1);
			expect(messages[0]).toBeInstanceOf(ToolMessage);
			const content = (messages[0] as ToolMessage).content as string;
			expect(content).toContain('WARN002');
			expect(content).not.toContain('WARN001');
			// New warning should now be marked as seen
			expect(warningTracker.filterNewWarnings([newWarning])).toHaveLength(0);
		});

		it('should annotate pre-existing warnings with [pre-existing] tag after create', async () => {
			const warningTracker = new WarningTracker();
			const mockWorkflow = {
				id: 'test',
				name: 'Test',
				nodes: [],
				connections: {},
			};

			const preExistingWarning = {
				code: 'WARN001',
				message: 'Pre-existing issue',
				nodeName: 'Node1',
			};
			const newWarning = { code: 'WARN002', message: 'New issue' };

			warningTracker.markAsPreExisting([preExistingWarning]);

			mockTextEditorExecute.mockReturnValue('File created.');
			mockTextEditorGetCode.mockReturnValue('const workflow = {};');
			mockParseAndValidate.mockResolvedValue({
				workflow: mockWorkflow,
				warnings: [preExistingWarning, newWarning],
			});

			const generator = handler.execute({
				...baseParams,
				args: { command: 'create', path: '/workflow.js', file_text: 'const workflow = {};' },
				messages,
				warningTracker,
			});

			for await (const _ of generator) {
				// consume
			}

			expect(messages).toHaveLength(1);
			const content = (messages[0] as ToolMessage).content as string;
			expect(content).toContain('[WARN001] [pre-existing] Pre-existing issue');
			expect(content).toContain('[WARN002] New issue');
			expect(content).not.toContain('[WARN002] [pre-existing]');
		});

		it('should treat all-repeated warnings as workflowReady after create', async () => {
			const warningTracker = new WarningTracker();
			const mockWorkflow = {
				id: 'test',
				name: 'Test',
				nodes: [{ id: 'n1', name: 'Node 1', type: 'test' }],
				connections: {},
			};

			const warning = {
				code: 'AGENT_NO_SYSTEM_MESSAGE',
				message: 'No system message',
				nodeName: 'Agent',
			};

			warningTracker.markAsSeen([warning]);

			mockTextEditorExecute.mockReturnValue('File created.');
			mockTextEditorGetCode.mockReturnValue('const workflow = {};');
			mockParseAndValidate.mockResolvedValue({
				workflow: mockWorkflow,
				warnings: [warning],
			});

			const generator = handler.execute({
				...baseParams,
				args: { command: 'create', path: '/workflow.js', file_text: 'const workflow = {};' },
				messages,
				warningTracker,
			});

			const chunks: StreamOutput[] = [];
			let iterResult = await generator.next();
			while (!iterResult.done) {
				chunks.push(iterResult.value);
				iterResult = await generator.next();
			}
			const result = iterResult.value;

			// All warnings repeated → treat as workflowReady
			expect(result).toEqual(
				expect.objectContaining({ workflowReady: true, workflow: mockWorkflow }),
			);
			// Should have single ToolMessage with create result, no validation warnings
			expect(messages).toHaveLength(1);
			expect(messages[0]).toBeInstanceOf(ToolMessage);

			// Should yield a WorkflowUpdateChunk
			const workflowChunks = chunks.flatMap((c) => c.messages ?? []).filter(isWorkflowUpdateChunk);
			expect(workflowChunks).toHaveLength(1);
			expect(jsonParse(workflowChunks[0].codeSnippet)).toEqual(mockWorkflow);
		});

		it('should yield WorkflowUpdateChunk after successful str_replace when parse succeeds', async () => {
			const mockWorkflow = {
				id: 'test',
				name: 'Test',
				nodes: [{ id: 'n1', name: 'Node 1', type: 'test' }],
				connections: {},
			};

			mockTextEditorExecute.mockReturnValue('Edit applied successfully.');
			mockTextEditorGetCode.mockReturnValue('const workflow = {};');
			mockParseAndValidate.mockResolvedValue({
				workflow: mockWorkflow,
				warnings: [],
			});

			const generator = handler.execute({
				...baseParams,
				args: { command: 'str_replace', path: '/workflow.js', old_str: 'x', new_str: 'y' },
				messages,
			});

			const chunks: StreamOutput[] = [];
			for await (const chunk of generator) {
				chunks.push(chunk);
			}

			const workflowChunks = chunks.flatMap((c) => c.messages ?? []).filter(isWorkflowUpdateChunk);
			expect(workflowChunks).toHaveLength(1);
			expect(jsonParse(workflowChunks[0].codeSnippet)).toEqual(mockWorkflow);

			// Tool message should NOT contain parse error
			expect(messages).toHaveLength(1);
			expect((messages[0] as ToolMessage).content).toBe('Edit applied successfully.');
		});

		it('should yield WorkflowUpdateChunk after successful insert when parse succeeds', async () => {
			const mockWorkflow = {
				id: 'test',
				name: 'Test',
				nodes: [{ id: 'n1', name: 'Node 1', type: 'test' }],
				connections: {},
			};

			mockTextEditorExecute.mockReturnValue('Insert applied successfully.');
			mockTextEditorGetCode.mockReturnValue('const workflow = {};');
			mockParseAndValidate.mockResolvedValue({
				workflow: mockWorkflow,
				warnings: [],
			});

			const generator = handler.execute({
				...baseParams,
				args: { command: 'insert', path: '/workflow.js', insert_line: 1, new_str: 'line' },
				messages,
			});

			const chunks: StreamOutput[] = [];
			for await (const chunk of generator) {
				chunks.push(chunk);
			}

			const workflowChunks = chunks.flatMap((c) => c.messages ?? []).filter(isWorkflowUpdateChunk);
			expect(workflowChunks).toHaveLength(1);
			expect(jsonParse(workflowChunks[0].codeSnippet)).toEqual(mockWorkflow);
		});

		it('should append parse error to tool message when parse fails after str_replace', async () => {
			mockTextEditorExecute.mockReturnValue('Edit applied successfully.');
			mockTextEditorGetCode.mockReturnValue('const workflow = { broken');
			mockParseAndValidate.mockRejectedValue(new Error('Unexpected token'));

			const generator = handler.execute({
				...baseParams,
				args: { command: 'str_replace', path: '/workflow.js', old_str: 'x', new_str: 'y' },
				messages,
			});

			const chunks: StreamOutput[] = [];
			for await (const chunk of generator) {
				chunks.push(chunk);
			}

			// No WorkflowUpdateChunk should be yielded
			const workflowChunks = chunks.flatMap((c) => c.messages ?? []).filter(isWorkflowUpdateChunk);
			expect(workflowChunks).toHaveLength(0);

			// Parse error should be appended to the tool message
			expect(messages).toHaveLength(1);
			const content = (messages[0] as ToolMessage).content as string;
			expect(content).toContain('Edit applied successfully.');
			expect(content).toContain('Parse error: Unexpected token');
		});

		it('should NOT call parse after view command', async () => {
			mockTextEditorExecute.mockReturnValue('1: const x = 1;');
			mockTextEditorGetCode.mockReturnValue('const x = 1;');

			const generator = handler.execute({
				...baseParams,
				args: { command: 'view', path: '/workflow.js' },
				messages,
			});

			for await (const _ of generator) {
				// consume
			}

			// parseAndValidate should NOT have been called for view
			expect(mockParseAndValidate).not.toHaveBeenCalled();
		});
	});

	describe('tryParseForPreview', () => {
		it('should return chunk on successful parse', async () => {
			const mockWorkflow = {
				id: 'test',
				name: 'Test',
				nodes: [{ id: 'n1', name: 'Node 1', type: 'test' }],
				connections: {},
			};

			mockTextEditorGetCode.mockReturnValue('const workflow = {};');
			mockParseAndValidate.mockResolvedValue({
				workflow: mockWorkflow,
				warnings: [],
			});

			const result = await handler.tryParseForPreview();

			expect(result.chunk).toBeDefined();
			expect(result.parseError).toBeUndefined();

			const workflowChunks = (result.chunk?.messages ?? []).filter(isWorkflowUpdateChunk);
			expect(workflowChunks).toHaveLength(1);
			expect(jsonParse(workflowChunks[0].codeSnippet)).toEqual(mockWorkflow);
		});

		it('should return parseError on parse failure', async () => {
			mockTextEditorGetCode.mockReturnValue('const workflow = { broken');
			mockParseAndValidate.mockRejectedValue(new Error('Unexpected token'));

			const result = await handler.tryParseForPreview();

			expect(result.chunk).toBeUndefined();
			expect(result.parseError).toBe('Unexpected token');
		});

		it('should return empty object when no code exists', async () => {
			mockTextEditorGetCode.mockReturnValue(null);

			const result = await handler.tryParseForPreview();

			expect(result.chunk).toBeUndefined();
			expect(result.parseError).toBeUndefined();
			expect(mockParseAndValidate).not.toHaveBeenCalled();
		});

		it('should pass currentWorkflow to parseAndValidate', async () => {
			const currentWorkflow = { id: 'existing', name: 'Existing', nodes: [], connections: {} };
			const mockWorkflow = {
				id: 'test',
				name: 'Test',
				nodes: [],
				connections: {},
			};

			mockTextEditorGetCode.mockReturnValue('const workflow = {};');
			mockParseAndValidate.mockResolvedValue({
				workflow: mockWorkflow,
				warnings: [],
			});

			await handler.tryParseForPreview(currentWorkflow);

			expect(mockParseAndValidate).toHaveBeenCalledWith('const workflow = {};', currentWorkflow);
		});
	});
});
