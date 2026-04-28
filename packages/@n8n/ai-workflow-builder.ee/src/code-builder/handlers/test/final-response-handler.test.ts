/**
 * Tests for FinalResponseHandler
 */

import type { BaseMessage } from '@langchain/core/messages';
import { AIMessage, ToolMessage } from '@langchain/core/messages';
import type { WorkflowJSON, NodeJSON } from '@n8n/workflow-sdk';

import { WarningTracker } from '../../state/warning-tracker';
import type { ParseAndValidateResult } from '../../types';
import { FinalResponseHandler } from '../final-response-handler';

describe('FinalResponseHandler', () => {
	const mockParseAndValidate = jest.fn<Promise<ParseAndValidateResult>, [string, WorkflowJSON?]>();

	const createHandler = () =>
		new FinalResponseHandler({
			parseAndValidate: mockParseAndValidate,
		});

	beforeEach(() => {
		jest.clearAllMocks();
	});

	describe('process', () => {
		const createResponse = (content: string) => new AIMessage({ content });

		it('should return success with workflow when validation passes', async () => {
			const handler = createHandler();
			const response = createResponse('```typescript\nconst workflow = {};\n```');
			const messages: BaseMessage[] = [response];
			const warningTracker = new WarningTracker();

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

			const result = await handler.process({
				response,
				currentWorkflow: undefined,
				messages,
				warningTracker,
			});

			expect(result.success).toBe(true);
			expect(result.workflow).toEqual(mockWorkflow);
			// Only the original response AIMessage, no feedback added
			expect(messages).toHaveLength(1);
		});

		it('should inject tool_call into existing AIMessage when structured output cannot be parsed', async () => {
			const handler = createHandler();
			const response = createResponse('Here is some text without code blocks');
			const messages: BaseMessage[] = [response];
			const warningTracker = new WarningTracker();

			const result = await handler.process({
				response,
				currentWorkflow: undefined,
				messages,
				warningTracker,
			});

			expect(result.success).toBe(false);
			expect(result.isParseError).toBe(true);
			// Should replace AIMessage with new one containing tool_call + append ToolMessage
			expect(messages).toHaveLength(2);
			expect(messages[0]).toBeInstanceOf(AIMessage);
			expect((messages[0] as AIMessage).tool_calls).toHaveLength(1);
			expect((messages[0] as AIMessage).tool_calls![0].name).toBe('validate_workflow');
			expect(messages[1]).toBeInstanceOf(ToolMessage);
			expect((messages[1] as ToolMessage).content).toContain('Could not parse');
		});

		it('should inject tool_call into existing AIMessage when validation has warnings', async () => {
			const handler = createHandler();
			const response = createResponse('```typescript\nconst workflow = {};\n```');
			const messages: BaseMessage[] = [response];
			const warningTracker = new WarningTracker();

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

			const result = await handler.process({
				response,
				currentWorkflow: undefined,
				messages,
				warningTracker,
			});

			expect(result.success).toBe(false);
			// Should replace AIMessage with new one containing tool_call + append ToolMessage
			expect(messages).toHaveLength(2);
			expect(messages[0]).toBeInstanceOf(AIMessage);
			expect((messages[0] as AIMessage).tool_calls).toHaveLength(1);
			expect((messages[0] as AIMessage).tool_calls![0].name).toBe('validate_workflow');
			expect(messages[1]).toBeInstanceOf(ToolMessage);
			expect((messages[1] as ToolMessage).content).toContain('W001');
		});

		it('should annotate pre-existing warnings with [pre-existing] tag', async () => {
			const handler = createHandler();
			const response = createResponse('```typescript\nconst workflow = {};\n```');
			const messages: BaseMessage[] = [response];
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

			await handler.process({
				response,
				currentWorkflow: undefined,
				messages,
				warningTracker,
			});

			const toolMessage = messages[1] as ToolMessage;
			const content = toolMessage.content as string;
			expect(content).toContain('[W001] [pre-existing] Pre-existing issue');
			expect(content).toContain('[W002] New issue');
			expect(content).not.toContain('[W002] [pre-existing]');
		});

		it('should inject tool_use into content array when AIMessage has array content (extended thinking)', async () => {
			const handler = createHandler();
			const response = new AIMessage({
				content: [
					{ type: 'thinking', thinking: 'Planning...' },
					{ type: 'text', text: '```typescript\nconst workflow = {};\n```' },
				],
			});
			const messages: BaseMessage[] = [response];
			const warningTracker = new WarningTracker();

			mockParseAndValidate.mockRejectedValue(new Error('Parse failed'));

			const result = await handler.process({
				response,
				currentWorkflow: undefined,
				messages,
				warningTracker,
			});

			expect(result.success).toBe(false);
			expect(result.isParseError).toBe(true);
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

		it('should inject tool_call into existing AIMessage when parsing fails', async () => {
			const handler = createHandler();
			const response = createResponse('```typescript\nconst workflow = {};\n```');
			const messages: BaseMessage[] = [response];
			const warningTracker = new WarningTracker();

			mockParseAndValidate.mockRejectedValue(new Error('Parse failed'));

			const result = await handler.process({
				response,
				currentWorkflow: undefined,
				messages,
				warningTracker,
			});

			expect(result.success).toBe(false);
			expect(result.isParseError).toBe(true);
			// Should replace AIMessage with new one containing tool_call + append ToolMessage
			expect(messages).toHaveLength(2);
			expect(messages[0]).toBeInstanceOf(AIMessage);
			expect((messages[0] as AIMessage).tool_calls).toHaveLength(1);
			expect((messages[0] as AIMessage).tool_calls![0].name).toBe('validate_workflow');
			expect(messages[1]).toBeInstanceOf(ToolMessage);
			expect((messages[1] as ToolMessage).content).toContain('parsing error');
		});
	});
});
