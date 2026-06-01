/**
 * Tests for Auto-Finalize Handler
 */

import type { BaseMessage } from '@langchain/core/messages';
import { AIMessage, ToolMessage } from '@langchain/core/messages';
import type { WorkflowJSON, NodeJSON } from '@n8n/workflow-sdk';

import { WarningTracker } from '../../state/warning-tracker';
import type { ParseAndValidateResult } from '../../types';
import { AutoFinalizeHandler } from '../auto-finalize-handler';

describe('AutoFinalizeHandler', () => {
	const mockParseAndValidate = jest.fn<Promise<ParseAndValidateResult>, [string, WorkflowJSON?]>();
	const mockGetErrorContext = jest.fn<string, [string, string]>();

	const createHandler = () =>
		new AutoFinalizeHandler({
			parseAndValidate: mockParseAndValidate,
			getErrorContext: mockGetErrorContext,
		});

	beforeEach(() => {
		jest.clearAllMocks();
		mockGetErrorContext.mockReturnValue('Error context here');
	});

	describe('execute', () => {
		it('should return success with workflow when validation passes', async () => {
			const handler = createHandler();
			const messages: BaseMessage[] = [];

			const mockNode: NodeJSON = {
				id: '1',
				name: 'Node',
				type: 'n8n-nodes-base.set',
				position: [0, 0],
				typeVersion: 1,
			};
			const mockWorkflow: WorkflowJSON = {
				id: 'test',
				name: 'Test',
				nodes: [mockNode],
				connections: {},
			};

			mockParseAndValidate.mockResolvedValue({
				workflow: mockWorkflow,
				warnings: [],
			});

			const gen = handler.execute({
				code: 'const workflow = { ... }',
				currentWorkflow: undefined,
				messages,
			});

			const result = await consumeGenerator(gen);

			expect(result.success).toBe(true);
			expect(result.workflow).toEqual(mockWorkflow);
			expect(result.parseDuration).toBeGreaterThanOrEqual(0);
		});

		it('should return failure with feedback when validation has warnings', async () => {
			const handler = createHandler();
			const existingAiMessage = new AIMessage({ content: 'Some response text' });
			const messages: BaseMessage[] = [existingAiMessage];

			const mockWorkflow: WorkflowJSON = {
				id: 'test',
				name: 'Test',
				nodes: [],
				connections: {},
			};

			mockParseAndValidate.mockResolvedValue({
				workflow: mockWorkflow,
				warnings: [{ code: 'W001', message: 'Warning message', nodeName: 'Node1' }],
			});

			const gen = handler.execute({
				code: 'const workflow = { ... }',
				currentWorkflow: undefined,
				messages,
			});

			const result = await consumeGenerator(gen);

			expect(result.success).toBe(false);
			expect(result.workflow).toBeUndefined();
			// Should replace AIMessage with new one containing tool_call + append ToolMessage
			expect(messages).toHaveLength(2);
			expect(messages[0]).toBeInstanceOf(AIMessage);
			expect((messages[0] as AIMessage).tool_calls).toHaveLength(1);
			expect((messages[0] as AIMessage).tool_calls![0].name).toBe('validate_workflow');
			expect(messages[1]).toBeInstanceOf(ToolMessage);
			expect((messages[1] as ToolMessage).content).toContain('Validation warnings');
		});

		it('should return failure with feedback when parsing fails', async () => {
			const handler = createHandler();
			const existingAiMessage = new AIMessage({ content: 'Some response text' });
			const messages: BaseMessage[] = [existingAiMessage];

			mockParseAndValidate.mockRejectedValue(new Error('Parse failed'));

			const gen = handler.execute({
				code: 'invalid code',
				currentWorkflow: undefined,
				messages,
			});

			const result = await consumeGenerator(gen);

			expect(result.success).toBe(false);
			expect(result.workflow).toBeUndefined();
			// Should replace AIMessage with new one containing tool_call + append ToolMessage
			expect(messages).toHaveLength(2);
			expect(messages[0]).toBeInstanceOf(AIMessage);
			expect((messages[0] as AIMessage).tool_calls).toHaveLength(1);
			expect((messages[0] as AIMessage).tool_calls![0].name).toBe('validate_workflow');
			expect(messages[1]).toBeInstanceOf(ToolMessage);
			expect((messages[1] as ToolMessage).content).toContain('Parse error');
		});

		it('should track parse duration on failure', async () => {
			const handler = createHandler();
			const messages: BaseMessage[] = [new AIMessage({ content: 'response' })];

			mockParseAndValidate.mockImplementation(async () => {
				await new Promise((resolve) => setTimeout(resolve, 10));
				throw new Error('Parse failed');
			});

			const gen = handler.execute({
				code: 'invalid code',
				currentWorkflow: undefined,
				messages,
			});

			const result = await consumeGenerator(gen);

			expect(result.parseDuration).toBeDefined();
		});

		it('should send only new warnings and mark them as seen via warningTracker', async () => {
			const handler = createHandler();
			const existingAiMessage = new AIMessage({ content: 'response' });
			const messages: BaseMessage[] = [existingAiMessage];
			const warningTracker = new WarningTracker();

			const mockWorkflow: WorkflowJSON = {
				id: 'test',
				name: 'Test',
				nodes: [],
				connections: {},
			};

			const seenWarning = { code: 'W001', message: 'Already seen', nodeName: 'Node1' };
			const newWarning = { code: 'W002', message: 'New warning', nodeName: 'Node2' };

			// Mark one warning as already seen
			warningTracker.markAsSeen([seenWarning]);

			mockParseAndValidate.mockResolvedValue({
				workflow: mockWorkflow,
				warnings: [seenWarning, newWarning],
			});

			const gen = handler.execute({
				code: 'const workflow = { ... }',
				currentWorkflow: undefined,
				messages,
				warningTracker,
			});

			const result = await consumeGenerator(gen);

			expect(result.success).toBe(false);
			// Should replace AIMessage with new one containing tool_call + append ToolMessage
			expect(messages).toHaveLength(2);
			expect(messages[0]).toBeInstanceOf(AIMessage);
			expect((messages[0] as AIMessage).tool_calls).toHaveLength(1);
			expect((messages[0] as AIMessage).tool_calls![0].name).toBe('validate_workflow');
			expect(messages[1]).toBeInstanceOf(ToolMessage);
			expect((messages[1] as ToolMessage).content).toContain('W002');
			expect((messages[1] as ToolMessage).content).not.toContain('W001');
			// New warning should now be marked as seen
			expect(warningTracker.filterNewWarnings([newWarning])).toHaveLength(0);
		});

		it('should annotate pre-existing warnings with [pre-existing] tag', async () => {
			const handler = createHandler();
			const existingAiMessage = new AIMessage({ content: 'Some response text' });
			const messages: BaseMessage[] = [existingAiMessage];
			const warningTracker = new WarningTracker();

			const mockWorkflow: WorkflowJSON = {
				id: 'test',
				name: 'Test',
				nodes: [],
				connections: {},
			};

			const preExistingWarning = { code: 'W001', message: 'Pre-existing issue', nodeName: 'Node1' };
			const newWarning = { code: 'W002', message: 'New issue', nodeName: 'Node2' };

			warningTracker.markAsPreExisting([preExistingWarning]);

			mockParseAndValidate.mockResolvedValue({
				workflow: mockWorkflow,
				warnings: [preExistingWarning, newWarning],
			});

			const gen = handler.execute({
				code: 'const workflow = { ... }',
				currentWorkflow: undefined,
				messages,
				warningTracker,
			});

			await consumeGenerator(gen);

			const toolMessage = messages[1] as ToolMessage;
			const content = toolMessage.content as string;
			expect(content).toContain('[W001] [pre-existing] Pre-existing issue');
			expect(content).toContain('[W002] New issue');
			expect(content).not.toContain('[W002] [pre-existing]');
		});

		it('should inject tool_use into content array when AIMessage has array content (extended thinking)', async () => {
			const handler = createHandler();
			const existingAiMessage = new AIMessage({
				content: [
					{ type: 'thinking', thinking: 'Let me think...' },
					{ type: 'text', text: 'Some response' },
				],
			});
			const messages: BaseMessage[] = [existingAiMessage];

			mockParseAndValidate.mockRejectedValue(new Error('Parse failed'));

			const gen = handler.execute({
				code: 'invalid code',
				currentWorkflow: undefined,
				messages,
			});

			const result = await consumeGenerator(gen);

			expect(result.success).toBe(false);
			expect(messages).toHaveLength(2);
			// tool_calls should be set
			expect((messages[0] as AIMessage).tool_calls).toHaveLength(1);
			expect((messages[0] as AIMessage).tool_calls![0].name).toBe('validate_workflow');
			// Content array should have tool_use block appended
			const content = (messages[0] as AIMessage).content as Array<Record<string, unknown>>;
			expect(content).toHaveLength(3);
			expect(content[2]).toMatchObject({
				type: 'tool_use',
				name: 'validate_workflow',
				input: {},
			});
			// ToolMessage should reference same ID
			const toolMessage = messages[1] as ToolMessage;
			expect(toolMessage.tool_call_id).toBe(content[2].id);
		});

		it('should treat all-repeated warnings as success', async () => {
			const handler = createHandler();
			const messages: BaseMessage[] = [];
			const warningTracker = new WarningTracker();

			const mockWorkflow: WorkflowJSON = {
				id: 'test',
				name: 'Test',
				nodes: [
					{ id: '1', name: 'Node', type: 'n8n-nodes-base.set', position: [0, 0], typeVersion: 1 },
				],
				connections: {},
			};

			const warning = {
				code: 'AGENT_NO_SYSTEM_MESSAGE',
				message: 'No system message',
				nodeName: 'Agent',
			};

			// Mark warning as already seen
			warningTracker.markAsSeen([warning]);

			mockParseAndValidate.mockResolvedValue({
				workflow: mockWorkflow,
				warnings: [warning],
			});

			const gen = handler.execute({
				code: 'const workflow = { ... }',
				currentWorkflow: undefined,
				messages,
				warningTracker,
			});

			const result = await consumeGenerator(gen);

			// All warnings repeated → treat as success
			expect(result.success).toBe(true);
			expect(result.workflow).toEqual(mockWorkflow);
			// Should NOT add any feedback message
			expect(messages).toHaveLength(0);
		});
	});
});

// Helper to consume an async generator and return the final result
async function consumeGenerator<T, R>(gen: AsyncGenerator<T, R>): Promise<R> {
	let result: IteratorResult<T, R>;
	do {
		result = await gen.next();
	} while (!result.done);
	return result.value;
}
