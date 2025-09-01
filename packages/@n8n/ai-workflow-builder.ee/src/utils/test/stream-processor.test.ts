import { AIMessage, HumanMessage, ToolMessage } from '@langchain/core/messages';
import type { DynamicStructuredTool } from '@langchain/core/tools';

import type {
	AgentMessageChunk,
	ToolProgressChunk,
	WorkflowUpdateChunk,
	StreamOutput,
} from '../../types/streaming';
import { processStreamChunk, createStreamProcessor, formatMessages } from '../stream-processor';

describe('stream-processor', () => {
	describe('processStreamChunk', () => {
		describe('updates mode', () => {
			it('should process agent messages with text content', () => {
				const chunk = {
					agent: {
						messages: [{ content: 'Hello, this is a test message' }],
					},
				};

				const result = processStreamChunk('updates', chunk);

				expect(result).toBeDefined();
				expect(result?.messages).toHaveLength(1);
				const message = result?.messages[0] as AgentMessageChunk;
				expect(message.role).toBe('assistant');
				expect(message.type).toBe('message');
				expect(message.text).toBe('Hello, this is a test message');
			});

			it('should process agent messages with array content (multi-part)', () => {
				const chunk = {
					agent: {
						messages: [
							{
								content: [
									{ type: 'text', text: 'Part 1' },
									{ type: 'text', text: 'Part 2' },
									{ type: 'image', url: 'http://example.com/image.png' },
								],
							},
						],
					},
				};

				const result = processStreamChunk('updates', chunk);

				expect(result).toBeDefined();
				expect(result?.messages).toHaveLength(1);
				const message = result?.messages[0] as AgentMessageChunk;
				expect(message.text).toBe('Part 1\nPart 2');
			});

			it('should handle delete_messages with refresh message', () => {
				const chunk = {
					delete_messages: {
						messages: [{ content: 'Some deleted message' }],
					},
				};

				const result = processStreamChunk('updates', chunk);

				expect(result).toBeDefined();
				expect(result?.messages).toHaveLength(1);
				const message = result?.messages[0] as AgentMessageChunk;
				expect(message.text).toBe('Deleted, refresh?');
			});

			it('should handle compact_messages returning last message', () => {
				const chunk = {
					compact_messages: {
						messages: [
							{ content: 'First message' },
							{ content: 'Second message' },
							{ content: 'Last message to display' },
						],
					},
				};

				const result = processStreamChunk('updates', chunk);

				expect(result).toBeDefined();
				expect(result?.messages).toHaveLength(1);
				const message = result?.messages[0] as AgentMessageChunk;
				expect(message.text).toBe('Last message to display');
			});

			it('should handle compact_messages with empty content', () => {
				const chunk = {
					agent: {
						messages: [{ content: 'First message' }, { content: [{ type: 'text', text: '' }] }],
					},
				};

				const result = processStreamChunk('updates', chunk);

				expect(result).toEqual(null);
			});

			it('should handle process_operations with workflow update', () => {
				const workflowData = {
					nodes: [{ id: 'node1', name: 'Test Node' }],
					connections: {},
				};
				const chunk = {
					process_operations: {
						workflowJSON: workflowData,
						workflowOperations: null, // Cleared after processing
					},
				};

				const result = processStreamChunk('updates', chunk);

				expect(result).toBeDefined();
				expect(result?.messages).toHaveLength(1);
				const message = result?.messages[0] as WorkflowUpdateChunk;
				expect(message.role).toBe('assistant');
				expect(message.type).toBe('workflow-updated');
				expect(message.codeSnippet).toBe(JSON.stringify(workflowData, null, 2));
			});

			it('should ignore chunks without relevant content', () => {
				const chunk = {
					agent: {
						messages: [{ content: '' }], // Empty content
					},
				};

				const result = processStreamChunk('updates', chunk);

				expect(result).toBeNull();
			});

			it('should ignore process_operations without workflowJSON', () => {
				const chunk = {
					process_operations: {
						workflowOperations: [],
					},
				};

				const result = processStreamChunk('updates', chunk);

				expect(result).toBeNull();
			});

			it('should handle empty messages arrays', () => {
				const chunk = {
					agent: {
						messages: [],
					},
				};

				const result = processStreamChunk('updates', chunk);

				expect(result).toBeNull();
			});
		});

		describe('custom mode', () => {
			it('should process tool progress chunks', () => {
				const toolChunk: ToolProgressChunk = {
					id: 'tool-1',
					toolCallId: 'call-1',
					type: 'tool',
					role: 'assistant',
					toolName: 'add_nodes',
					status: 'running',
					updates: [
						{
							type: 'input',
							data: { nodeType: 'n8n-nodes-base.code' },
						},
					],
				};

				const result = processStreamChunk('custom', toolChunk);

				expect(result).toBeDefined();
				expect(result?.messages).toHaveLength(1);
				expect(result?.messages[0]).toEqual(toolChunk);
			});

			it('should ignore non-tool chunks in custom mode', () => {
				const chunk = {
					type: 'something-else',
					data: 'test',
				};

				const result = processStreamChunk('custom', chunk);

				expect(result).toBeNull();
			});
		});

		describe('unknown modes', () => {
			it('should return null for unknown stream modes', () => {
				const chunk = { data: 'test' };

				const result = processStreamChunk('unknown-mode', chunk);

				expect(result).toBeNull();
			});
		});
	});

	describe('createStreamProcessor', () => {
		it('should yield only non-null outputs', async () => {
			async function* mockStream(): AsyncGenerator<[string, unknown], void, unknown> {
				yield ['updates', { agent: { messages: [{ content: 'Test' }] } }];
				yield ['updates', { agent: { messages: [{ content: '' }] } }]; // Will produce null
				yield ['updates', { agent: { messages: [{ content: 'Test 2' }] } }];
			}

			const processor = createStreamProcessor(mockStream());
			const results: StreamOutput[] = [];

			for await (const output of processor) {
				results.push(output);
			}

			expect(results).toHaveLength(2);
			expect((results[0].messages[0] as AgentMessageChunk).text).toBe('Test');
			expect((results[1].messages[0] as AgentMessageChunk).text).toBe('Test 2');
		});

		it('should process multiple chunks in sequence', async () => {
			async function* mockStream(): AsyncGenerator<[string, unknown], void, unknown> {
				yield ['updates', { agent: { messages: [{ content: 'Message 1' }] } }];
				yield ['custom', { type: 'tool', toolName: 'test_tool' } as ToolProgressChunk];
				yield ['updates', { delete_messages: { messages: [{ content: 'deleted' }] } }];
			}

			const processor = createStreamProcessor(mockStream());
			const results: StreamOutput[] = [];

			for await (const output of processor) {
				results.push(output);
			}

			expect(results).toHaveLength(3);
			expect((results[0].messages[0] as AgentMessageChunk).text).toBe('Message 1');
			expect((results[1].messages[0] as ToolProgressChunk).toolName).toBe('test_tool');
			expect((results[2].messages[0] as AgentMessageChunk).text).toBe('Deleted, refresh?');
		});

		it('should handle empty stream', async () => {
			async function* mockStream(): AsyncGenerator<[string, unknown], void, unknown> {
				// Empty generator
			}

			const processor = createStreamProcessor(mockStream());
			const results: StreamOutput[] = [];

			for await (const output of processor) {
				results.push(output);
			}

			expect(results).toHaveLength(0);
		});
	});

	describe('formatMessages', () => {
		it('should format HumanMessage correctly', () => {
			const messages = [new HumanMessage('Hello from user')];

			const result = formatMessages(messages);

			expect(result).toHaveLength(1);
			expect(result[0]).toEqual({
				role: 'user',
				type: 'message',
				text: 'Hello from user',
			});
		});

		it('should format AIMessage with text content', () => {
			const messages = [new AIMessage('Response from AI')];

			const result = formatMessages(messages);

			expect(result).toHaveLength(1);
			expect(result[0]).toEqual({
				role: 'assistant',
				type: 'message',
				text: 'Response from AI',
			});
		});

		it('should format AIMessage with tool_calls', () => {
			const aiMessage = new AIMessage('');
			aiMessage.tool_calls = [
				{
					id: 'call-1',
					name: 'add_nodes',
					args: { nodeType: 'n8n-nodes-base.code' },
					type: 'tool_call',
				},
				{
					id: 'call-2',
					name: 'connect_nodes',
					args: { sourceNodeId: 'node1', targetNodeId: 'node2' },
					type: 'tool_call',
				},
			];

			const messages = [aiMessage];

			const result = formatMessages(messages);

			expect(result).toHaveLength(2); // Two tool messages
			expect(result[0]).toEqual({
				id: 'call-1',
				toolCallId: 'call-1',
				role: 'assistant',
				type: 'tool',
				toolName: 'add_nodes',
				status: 'completed',
				updates: [
					{
						type: 'input',
						data: { nodeType: 'n8n-nodes-base.code' },
					},
				],
			});
			expect(result[1]).toEqual({
				id: 'call-2',
				toolCallId: 'call-2',
				role: 'assistant',
				type: 'tool',
				toolName: 'connect_nodes',
				status: 'completed',
				updates: [
					{
						type: 'input',
						data: { sourceNodeId: 'node1', targetNodeId: 'node2' },
					},
				],
			});
		});

		it('should format ToolMessage and match with tool calls', () => {
			const aiMessage = new AIMessage('');
			aiMessage.tool_calls = [
				{
					id: 'call-1',
					name: 'add_nodes',
					args: { nodeType: 'n8n-nodes-base.code' },
					type: 'tool_call',
				},
			];

			const toolMessage = new ToolMessage({
				content: 'Successfully added node',
				tool_call_id: 'call-1',
			});

			const messages = [aiMessage, toolMessage];

			const result = formatMessages(messages);

			expect(result).toHaveLength(1);
			expect(result[0]).toEqual({
				id: 'call-1',
				toolCallId: 'call-1',
				role: 'assistant',
				type: 'tool',
				toolName: 'add_nodes',
				status: 'completed',
				updates: [
					{
						type: 'input',
						data: { nodeType: 'n8n-nodes-base.code' },
					},
					{
						type: 'output',
						data: { result: 'Successfully added node' },
					},
				],
			});
		});

		it('should handle ToolMessage with object content', () => {
			const aiMessage = new AIMessage('');
			aiMessage.tool_calls = [
				{
					id: 'call-1',
					name: 'get_node_details',
					args: { nodeName: 'Code' },
					type: 'tool_call',
				},
			];

			const toolMessage = new ToolMessage({
				// @ts-expect-error Lnagchain types are not propagated
				content: { nodeId: 'node1', nodeType: 'n8n-nodes-base.code' },
				tool_call_id: 'call-1',
			});

			const messages = [aiMessage, toolMessage];

			const result = formatMessages(messages);

			expect(result[0].updates).toHaveLength(2);
			// @ts-expect-error Lnagchain types are not propagated
			expect(result[0].updates?.[1]).toEqual({
				type: 'output',
				data: { nodeId: 'node1', nodeType: 'n8n-nodes-base.code' },
			});
		});

		it('should handle mixed message types in sequence', () => {
			const aiMessage1 = new AIMessage('I will help you');
			const humanMessage = new HumanMessage('Please add a node');
			const aiMessage2 = new AIMessage('');
			aiMessage2.tool_calls = [
				{
					id: 'call-1',
					name: 'add_nodes',
					args: { nodeType: 'n8n-nodes-base.code' },
					type: 'tool_call',
				},
			];
			const toolMessage = new ToolMessage({
				content: 'Node added',
				tool_call_id: 'call-1',
			});

			const messages = [aiMessage1, humanMessage, aiMessage2, toolMessage];

			const result = formatMessages(messages);

			expect(result).toHaveLength(3);
			expect(result[0].type).toBe('message');
			expect(result[0].role).toBe('assistant');
			expect(result[1].type).toBe('message');
			expect(result[1].role).toBe('user');
			expect(result[2].type).toBe('tool');
			expect(result[2].updates).toHaveLength(2); // input and output
		});

		it('should handle AIMessage with both content and tool_calls', () => {
			const aiMessage = new AIMessage('I will add a node for you');
			aiMessage.tool_calls = [
				{
					id: 'call-1',
					name: 'add_nodes',
					args: { nodeType: 'n8n-nodes-base.code' },
					type: 'tool_call',
				},
			];

			const messages = [aiMessage];

			const result = formatMessages(messages);

			expect(result).toHaveLength(2);
			expect(result[0]).toEqual({
				role: 'assistant',
				type: 'message',
				text: 'I will add a node for you',
			});
			expect(result[1].type).toBe('tool');
		});

		it('should handle tool calls without args', () => {
			const aiMessage = new AIMessage('');
			aiMessage.tool_calls = [
				{
					id: 'call-1',
					name: 'clear_workflow',
					args: {},
					type: 'tool_call',
				},
			];

			const messages = [aiMessage];

			const result = formatMessages(messages);

			// @ts-expect-error Lnagchain types are not propagated
			expect(result[0].updates?.[0]).toEqual({
				type: 'input',
				data: {},
			});
		});

		it('should handle AIMessage with array content (multi-part messages)', () => {
			const message = new AIMessage('');
			// Manually set the content to array format since LangChain constructor might not accept arrays directly
			message.content = [
				{ type: 'text', text: 'First part' },
				{ type: 'text', text: 'Second part' },
				{ type: 'image', url: 'http://example.com/image.png' },
			];

			const messages = [message];

			const result = formatMessages(messages);

			expect(result).toHaveLength(2);
			expect(result[0]).toEqual({
				role: 'assistant',
				type: 'message',
				text: 'First part',
			});
			expect(result[1]).toEqual({
				role: 'assistant',
				type: 'message',
				text: 'Second part',
			});
		});

		it('should handle AIMessage with array content containing no text', () => {
			const message = new AIMessage('');
			message.content = [
				{ type: 'image', url: 'http://example.com/image.png' },
				{ type: 'video', url: 'http://example.com/video.mp4' },
			];

			const messages = [message];

			const result = formatMessages(messages);

			expect(result).toHaveLength(0);
		});

		it('should handle AIMessage with empty array content', () => {
			const message = new AIMessage('');
			message.content = [];

			const messages = [message];

			const result = formatMessages(messages);

			expect(result).toHaveLength(0);
		});

		it('should handle AIMessage with empty string content', () => {
			const messages = [new AIMessage('')];

			const result = formatMessages(messages);

			expect(result).toHaveLength(0);
		});

		it('should handle AIMessage with null content', () => {
			const message = new AIMessage('');
			// Test the function's robustness by simulating a corrupted message
			Object.defineProperty(message, 'content', { value: null, writable: true });

			const messages = [message];

			const result = formatMessages(messages);

			expect(result).toHaveLength(0);
		});

		it('should use builder tool display titles', () => {
			const builderTools = [
				{
					tool: { name: 'add_nodes' } as DynamicStructuredTool,
					displayTitle: 'Add Node',
				},
				{
					tool: { name: 'connect_nodes' } as DynamicStructuredTool,
					displayTitle: 'Connect Nodes',
				},
			];

			const aiMessage = new AIMessage('');
			aiMessage.tool_calls = [
				{
					id: 'call-1',
					name: 'add_nodes',
					args: { nodeType: 'n8n-nodes-base.code' },
					type: 'tool_call',
				},
			];

			const messages = [aiMessage];

			const result = formatMessages(messages, builderTools);

			expect(result).toHaveLength(1);
			expect(result[0]).toEqual({
				id: 'call-1',
				toolCallId: 'call-1',
				role: 'assistant',
				type: 'tool',
				toolName: 'add_nodes',
				displayTitle: 'Add Node',
				status: 'completed',
				updates: [
					{
						type: 'input',
						data: { nodeType: 'n8n-nodes-base.code' },
					},
				],
			});
		});

		it('should use custom display titles from builder tools', () => {
			const builderTools = [
				{
					tool: { name: 'add_nodes' } as DynamicStructuredTool,
					displayTitle: 'Add Node',
					getCustomDisplayTitle: (values: Record<string, unknown>) =>
						// eslint-disable-next-line @typescript-eslint/restrict-template-expressions
						`Add ${values.nodeType} Node`,
				},
			];

			const aiMessage = new AIMessage('');
			aiMessage.tool_calls = [
				{
					id: 'call-1',
					name: 'add_nodes',
					args: { nodeType: 'Code' },
					type: 'tool_call',
				},
			];

			const messages = [aiMessage];

			const result = formatMessages(messages, builderTools);

			expect(result).toHaveLength(1);
			expect(result[0]).toEqual({
				id: 'call-1',
				toolCallId: 'call-1',
				role: 'assistant',
				type: 'tool',
				toolName: 'add_nodes',
				displayTitle: 'Add Node',
				customDisplayTitle: 'Add Code Node',
				status: 'completed',
				updates: [
					{
						type: 'input',
						data: { nodeType: 'Code' },
					},
				],
			});
		});

		it('should handle custom display title when args is null/undefined', () => {
			const builderTools = [
				{
					tool: { name: 'clear_workflow' } as DynamicStructuredTool,
					displayTitle: 'Clear Workflow',
					getCustomDisplayTitle: (values: Record<string, unknown>) =>
						`Custom: ${Object.keys(values).length} args`,
				},
			];

			const aiMessage = new AIMessage('');
			const toolCall = {
				id: 'call-1',
				name: 'clear_workflow',
				args: {} as Record<string, unknown>,
				type: 'tool_call' as const,
			};
			// Simulate a corrupted tool call with null args
			Object.defineProperty(toolCall, 'args', { value: null, writable: true });
			aiMessage.tool_calls = [toolCall];

			const messages = [aiMessage];

			const result = formatMessages(messages, builderTools);

			expect(result[0].customDisplayTitle).toBeNull();
		});

		it('should handle tool call with undefined args', () => {
			const aiMessage = new AIMessage('');
			const toolCall = {
				id: 'call-1',
				name: 'clear_workflow',
				args: {} as Record<string, unknown>,
				type: 'tool_call' as const,
			};
			// Simulate a corrupted tool call with undefined args
			Object.defineProperty(toolCall, 'args', { value: undefined, writable: true });
			aiMessage.tool_calls = [toolCall];

			const messages = [aiMessage];

			const result = formatMessages(messages);

			// @ts-expect-error Lnagchain types are not propagated
			expect(result[0].updates?.[0]).toEqual({
				type: 'input',
				data: {},
			});
		});

		it('should handle ToolMessage with no matching tool call', () => {
			const toolMessage = new ToolMessage({
				content: 'Orphaned tool result',
				tool_call_id: 'non-existent-call',
			});

			const messages = [toolMessage];

			const result = formatMessages(messages);

			expect(result).toHaveLength(0);
		});

		it('should handle multiple ToolMessages for the same tool call', () => {
			const aiMessage = new AIMessage('');
			aiMessage.tool_calls = [
				{
					id: 'call-1',
					name: 'add_nodes',
					args: { nodeType: 'n8n-nodes-base.code' },
					type: 'tool_call',
				},
			];

			const toolMessage1 = new ToolMessage({
				content: 'First result',
				tool_call_id: 'call-1',
			});

			const toolMessage2 = new ToolMessage({
				content: 'Second result',
				tool_call_id: 'call-1',
			});

			const messages = [aiMessage, toolMessage1, toolMessage2];

			const result = formatMessages(messages);

			expect(result).toHaveLength(1);
			expect(result[0].updates).toHaveLength(3);
			// @ts-expect-error Lnagchain types are not propagated
			expect(result[0].updates?.[1]).toEqual({
				type: 'output',
				data: { result: 'First result' },
			});
			// @ts-expect-error Lnagchain types are not propagated
			expect(result[0].updates?.[2]).toEqual({
				type: 'output',
				data: { result: 'Second result' },
			});
		});

		it('should handle ToolMessage appearing before corresponding AIMessage tool call', () => {
			const toolMessage = new ToolMessage({
				content: 'Tool result',
				tool_call_id: 'call-1',
			});

			const aiMessage = new AIMessage('');
			aiMessage.tool_calls = [
				{
					id: 'call-1',
					name: 'add_nodes',
					args: { nodeType: 'n8n-nodes-base.code' },
					type: 'tool_call',
				},
			];

			const messages = [toolMessage, aiMessage];

			const result = formatMessages(messages);

			// When ToolMessage comes before AIMessage, the ToolMessage cannot find the tool call to attach to
			// so it gets ignored, and only the tool call from AIMessage is processed
			expect(result).toHaveLength(1);
			expect(result[0].updates).toHaveLength(1); // Only the input, no output since ToolMessage came before
			// @ts-expect-error Lnagchain types are not propagated
			expect(result[0].updates?.[0]).toEqual({
				type: 'input',
				data: { nodeType: 'n8n-nodes-base.code' },
			});
		});

		it('should handle empty messages array', () => {
			const result = formatMessages([]);

			expect(result).toHaveLength(0);
		});

		it('should handle messages with unknown message type', () => {
			// Create an object that doesn't match any of the expected message types
			const unknownMessage = {
				content: 'Unknown message type',
				type: 'unknown',
			};

			const result = formatMessages([
				unknownMessage as unknown as AIMessage | HumanMessage | ToolMessage,
			]);

			expect(result).toHaveLength(0);
		});

		it('should preserve initialization of updates array when undefined', () => {
			const aiMessage = new AIMessage('');
			aiMessage.tool_calls = [
				{
					id: 'call-1',
					name: 'add_nodes',
					args: { nodeType: 'n8n-nodes-base.code' },
					type: 'tool_call',
				},
			];

			const toolMessage = new ToolMessage({
				content: 'Tool result',
				tool_call_id: 'call-1',
			});

			const messages = [aiMessage, toolMessage];

			const result = formatMessages(messages);

			expect(result[0].updates).toBeDefined();
			expect(Array.isArray(result[0].updates)).toBe(true);
			expect(result[0].updates).toHaveLength(2);
		});

		it('should handle complex scenario with multiple message types and builder tools', () => {
			const builderTools = [
				{
					tool: { name: 'add_nodes' } as DynamicStructuredTool,
					displayTitle: 'Add Node',
					// eslint-disable-next-line @typescript-eslint/restrict-template-expressions
					getCustomDisplayTitle: (values: Record<string, unknown>) => `Add ${values.nodeType} Node`,
				},
				{
					tool: { name: 'connect_nodes' } as DynamicStructuredTool,
					displayTitle: 'Connect Nodes',
				},
			];

			const humanMessage = new HumanMessage('Please create a workflow');

			const aiMessage1 = new AIMessage('');
			aiMessage1.content = [
				{ type: 'text', text: 'I will help you create a workflow.' },
				{ type: 'text', text: 'Let me add some nodes.' },
			];

			const aiMessage2 = new AIMessage('');
			aiMessage2.tool_calls = [
				{
					id: 'call-1',
					name: 'add_nodes',
					args: { nodeType: 'Code' },
					type: 'tool_call',
				},
				{
					id: 'call-2',
					name: 'connect_nodes',
					args: { source: 'node1', target: 'node2' },
					type: 'tool_call',
				},
			];
			const toolMessage1 = new ToolMessage({
				content: 'Node added successfully',
				tool_call_id: 'call-1',
			});
			const toolMessage2 = new ToolMessage({
				// @ts-expect-error Lnagchain types are not propagated
				content: { success: true, connectionId: 'conn-1' },
				tool_call_id: 'call-2',
			});

			const messages = [humanMessage, aiMessage1, aiMessage2, toolMessage1, toolMessage2];

			const result = formatMessages(messages, builderTools);

			expect(result).toHaveLength(5); // 1 user + 2 text messages + 2 tool calls

			expect(result[0]).toEqual({
				role: 'user',
				type: 'message',
				text: 'Please create a workflow',
			});

			expect(result[1]).toEqual({
				role: 'assistant',
				type: 'message',
				text: 'I will help you create a workflow.',
			});

			expect(result[2]).toEqual({
				role: 'assistant',
				type: 'message',
				text: 'Let me add some nodes.',
			});

			expect(result[3].toolName).toBe('add_nodes');
			expect(result[3].displayTitle).toBe('Add Node');
			expect(result[3].customDisplayTitle).toBe('Add Code Node');
			expect(result[3].updates).toHaveLength(2);

			expect(result[4].toolName).toBe('connect_nodes');
			expect(result[4].displayTitle).toBe('Connect Nodes');
			expect(result[4].customDisplayTitle).toBeUndefined();
			expect(result[4].updates).toHaveLength(2);
			// @ts-expect-error Lnagchain types are not propagated
			expect(result[4].updates?.[1]).toEqual({
				type: 'output',
				data: { success: true, connectionId: 'conn-1' },
			});
		});
	});
});
