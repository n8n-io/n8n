import { AIMessage, HumanMessage, ToolMessage } from '@langchain/core/messages';

import type {
	AgentMessageChunk,
	MessagesCompactedChunk,
	ToolProgressChunk,
	WorkflowUpdateChunk,
	StreamOutput,
} from '../../types/streaming';
import type { BuilderToolBase } from '../stream-processor';
import {
	processStreamChunk,
	createStreamProcessor,
	formatMessages,
	cleanContextTags,
} from '../stream-processor';

describe('stream-processor', () => {
	describe('processStreamChunk', () => {
		describe('updates mode', () => {
			it('should process responder messages with text content', () => {
				const chunk = {
					responder: {
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

			it('should process responder messages with array content (multi-part)', () => {
				const chunk = {
					responder: {
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

			it('should skip delete_messages (responder handles user message)', () => {
				const chunk = {
					delete_messages: {
						messages: [{ content: 'Some deleted message' }],
					},
				};

				const result = processStreamChunk('updates', chunk);

				expect(result).toBeNull();
			});

			it('should emit messages-compacted event for compact_messages', () => {
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
				const message = result?.messages[0] as MessagesCompactedChunk;
				expect(message.type).toBe('messages-compacted');
			});

			it('should handle responder with empty content', () => {
				const chunk = {
					responder: {
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

			it('should handle create_workflow_name with generated name', () => {
				const workflowData = {
					nodes: [] as unknown[],
					connections: {},
					name: 'Email Automation Workflow',
				};
				const chunk = {
					create_workflow_name: {
						workflowJSON: workflowData,
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

			it('should ignore create_workflow_name without a name', () => {
				const chunk = {
					create_workflow_name: {
						workflowJSON: { nodes: [], connections: {} },
					},
				};

				const result = processStreamChunk('updates', chunk);

				expect(result).toBeNull();
			});

			it('should ignore chunks without relevant content', () => {
				const chunk = {
					responder: {
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
					responder: {
						messages: [],
					},
				};

				const result = processStreamChunk('updates', chunk);

				expect(result).toBeNull();
			});

			it('should return null for chunks with invalid structure', () => {
				const chunk = {
					invalid: 'structure',
					random: 'data',
				};

				const result = processStreamChunk('updates', chunk);

				expect(result).toBeNull();
			});

			it('should return null for null chunks', () => {
				const result = processStreamChunk('updates', null);

				expect(result).toBeNull();
			});

			it('should return null for undefined chunks', () => {
				const result = processStreamChunk('updates', undefined);

				expect(result).toBeNull();
			});

			it('should return null for primitive chunks', () => {
				expect(processStreamChunk('updates', 'string')).toBeNull();
				expect(processStreamChunk('updates', 123)).toBeNull();
				expect(processStreamChunk('updates', true)).toBeNull();
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

			it('should process assistant message chunks', () => {
				const messageChunk: AgentMessageChunk = {
					role: 'assistant',
					type: 'message',
					text: 'Here is how to set up credentials...',
				};

				const result = processStreamChunk('custom', messageChunk);

				expect(result).toBeDefined();
				expect(result?.messages).toHaveLength(1);
				const message = result?.messages[0] as AgentMessageChunk;
				expect(message.role).toBe('assistant');
				expect(message.type).toBe('message');
				expect(message.text).toBe('Here is how to set up credentials...');
			});

			it('should ignore non-tool chunks in custom mode', () => {
				const chunk = {
					type: 'something-else',
					data: 'test',
				};

				const result = processStreamChunk('custom', chunk);

				expect(result).toBeNull();
			});

			it('should return null for chunks missing type property', () => {
				const chunk = {
					id: 'tool-1',
					toolName: 'add_nodes',
				};

				const result = processStreamChunk('custom', chunk);

				expect(result).toBeNull();
			});

			it('should return null for null chunks in custom mode', () => {
				const result = processStreamChunk('custom', null);

				expect(result).toBeNull();
			});

			it('should return null for primitive values in custom mode', () => {
				expect(processStreamChunk('custom', 'string')).toBeNull();
				expect(processStreamChunk('custom', 123)).toBeNull();
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
				yield ['updates', { responder: { messages: [{ content: 'Test' }] } }];
				yield ['updates', { responder: { messages: [{ content: '' }] } }]; // Will produce null
				yield ['updates', { responder: { messages: [{ content: 'Test 2' }] } }];
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
				yield ['updates', { responder: { messages: [{ content: 'Message 1' }] } }];
				yield ['custom', { type: 'tool', toolName: 'test_tool' } as ToolProgressChunk];
				yield ['updates', { delete_messages: { messages: [{ content: 'deleted' }] } }];
			}

			const processor = createStreamProcessor(mockStream());
			const results: StreamOutput[] = [];

			for await (const output of processor) {
				results.push(output);
			}

			expect(results).toHaveLength(2);
			expect((results[0].messages[0] as AgentMessageChunk).text).toBe('Message 1');
			expect((results[1].messages[0] as ToolProgressChunk).toolName).toBe('test_tool');
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

		it('should extract versionId from additional_kwargs as revertVersionId', () => {
			const message = new HumanMessage({ content: 'Revert to this version' });
			message.additional_kwargs = { versionId: 'version-123' };

			const result = formatMessages([message]);

			expect(result).toHaveLength(1);
			expect(result[0]).toEqual({
				role: 'user',
				type: 'message',
				text: 'Revert to this version',
				revertVersionId: 'version-123',
			});
		});

		it('should extract messageId from additional_kwargs as id', () => {
			const message = new HumanMessage({ content: 'Hello' });
			message.additional_kwargs = { messageId: 'msg-456' };

			const result = formatMessages([message]);

			expect(result).toHaveLength(1);
			expect(result[0]).toEqual({
				role: 'user',
				type: 'message',
				text: 'Hello',
				id: 'msg-456',
			});
		});

		it('should extract both versionId and messageId from additional_kwargs', () => {
			const message = new HumanMessage({ content: 'Test message' });
			message.additional_kwargs = { versionId: 'version-789', messageId: 'msg-789' };

			const result = formatMessages([message]);

			expect(result).toHaveLength(1);
			expect(result[0]).toEqual({
				role: 'user',
				type: 'message',
				text: 'Test message',
				revertVersionId: 'version-789',
				id: 'msg-789',
			});
		});

		it('should not include revertVersionId when versionId is missing', () => {
			const message = new HumanMessage({ content: 'Normal message' });
			message.additional_kwargs = { messageId: 'msg-001' };

			const result = formatMessages([message]);

			expect(result).toHaveLength(1);
			expect(result[0]).toEqual({
				role: 'user',
				type: 'message',
				text: 'Normal message',
				id: 'msg-001',
			});
			expect(result[0]).not.toHaveProperty('revertVersionId');
		});

		it('should include HumanMessage and extract versionId even without messageId', () => {
			const message = new HumanMessage({ content: 'Another message' });
			message.additional_kwargs = { versionId: 'version-999' };

			const result = formatMessages([message]);

			expect(result).toHaveLength(1);
			expect(result[0]).toEqual({
				role: 'user',
				type: 'message',
				text: 'Another message',
				revertVersionId: 'version-999',
			});
			expect(result[0]).not.toHaveProperty('id');
		});

		it('should preserve existing message properties with versionId and messageId', () => {
			const message = new HumanMessage({ content: 'Complete message' });
			message.additional_kwargs = { versionId: 'version-complete', messageId: 'msg-complete' };

			const result = formatMessages([message]);

			expect(result).toHaveLength(1);
			const formatted = result[0];
			expect(formatted.role).toBe('user');
			expect(formatted.type).toBe('message');
			expect(formatted.text).toBe('Complete message');
			expect(formatted.revertVersionId).toBe('version-complete');
			expect(formatted.id).toBe('msg-complete');
		});

		it('should include HumanMessage with undefined additional_kwargs', () => {
			const message = new HumanMessage({ content: 'Message without kwargs' });
			// Message is created without additional_kwargs, so it's undefined by default

			const result = formatMessages([message]);

			expect(result).toHaveLength(1);
			expect(result[0]).toEqual({
				role: 'user',
				type: 'message',
				text: 'Message without kwargs',
			});
			expect(result[0]).not.toHaveProperty('revertVersionId');
			expect(result[0]).not.toHaveProperty('id');
		});

		it('should include HumanMessage with empty additional_kwargs object', () => {
			const message = new HumanMessage({ content: 'Empty kwargs' });
			message.additional_kwargs = {};

			const result = formatMessages([message]);

			expect(result).toHaveLength(1);
			expect(result[0]).toEqual({
				role: 'user',
				type: 'message',
				text: 'Empty kwargs',
			});
			expect(result[0]).not.toHaveProperty('revertVersionId');
			expect(result[0]).not.toHaveProperty('id');
		});

		it('should only include revertVersionId when versionId is a string', () => {
			const message = new HumanMessage({ content: 'Non-string versionId' });
			message.additional_kwargs = { versionId: 123, messageId: 'msg-123' };

			const result = formatMessages([message]);

			expect(result).toHaveLength(1);
			expect(result[0]).toEqual({
				role: 'user',
				type: 'message',
				text: 'Non-string versionId',
				id: 'msg-123',
			});
			expect(result[0]).not.toHaveProperty('revertVersionId');
		});

		it('should include HumanMessage when messageId is not a string but exclude id from output', () => {
			const message = new HumanMessage({ content: 'Non-string messageId' });
			message.additional_kwargs = { versionId: 'version-456', messageId: 456 };

			const result = formatMessages([message]);

			expect(result).toHaveLength(1);
			expect(result[0]).toEqual({
				role: 'user',
				type: 'message',
				text: 'Non-string messageId',
				revertVersionId: 'version-456',
			});
			expect(result[0]).not.toHaveProperty('id');
		});

		it('should format HumanMessage with array content (multi-part messages)', () => {
			const messages = [
				new HumanMessage({
					content: [
						{ type: 'text', text: 'Part 1' },
						{ type: 'text', text: 'Part 2' },
						{ type: 'image_url', image_url: 'http://example.com/image.png' },
					],
				}),
			];

			const result = formatMessages(messages);

			expect(result).toHaveLength(1);
			expect(result[0]).toEqual({
				role: 'user',
				type: 'message',
				text: 'Part 1\nPart 2',
			});
		});

		it('should strip context tags from HumanMessage content', () => {
			const messageWithContext = `User question here
<current_workflow_json>
{"nodes": [], "connections": {}}
</current_workflow_json>
<current_simplified_execution_data>
{"runData": {}}
</current_simplified_execution_data>
<current_execution_nodes_schemas>
[{"nodeName": "test"}]
</current_execution_nodes_schemas>`;

			const messages = [new HumanMessage(messageWithContext)];

			const result = formatMessages(messages);

			expect(result).toHaveLength(1);
			expect(result[0]).toEqual({
				role: 'user',
				type: 'message',
				text: 'User question here',
			});
		});

		it('should strip context tags from HumanMessage array content', () => {
			const messages = [
				new HumanMessage({
					content: [
						{
							type: 'text',
							text: `Workflow executed successfully.
<current_workflow_json>
{"nodes": []}
</current_workflow_json>
<current_simplified_execution_data>
{"runData": {}}
</current_simplified_execution_data>
<current_execution_nodes_schemas>
[{"nodeName": "Manual Trigger"}]
</current_execution_nodes_schemas>`,
						},
					],
				}),
			];

			const result = formatMessages(messages);

			expect(result).toHaveLength(1);
			expect(result[0]).toEqual({
				role: 'user',
				type: 'message',
				text: 'Workflow executed successfully.',
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

		it('should handle AIMessage with both content and tool_calls - only include tool calls', () => {
			// When an AIMessage has tool_calls, the content is intermediate LLM "thinking" text
			// that should be skipped. Only the tool calls should be formatted.
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

			// Only tool message, content is skipped
			expect(result).toHaveLength(1);
			expect(result[0].type).toBe('tool');
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
			const builderTools: BuilderToolBase[] = [
				{
					toolName: 'add_nodes',
					displayTitle: 'Add Node',
				},
				{
					toolName: 'connect_nodes',
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
			const builderTools: BuilderToolBase[] = [
				{
					toolName: 'add_nodes',
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
			const builderTools: BuilderToolBase[] = [
				{
					toolName: 'clear_workflow',
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
			const builderTools: BuilderToolBase[] = [
				{
					toolName: 'add_nodes',
					displayTitle: 'Add Node',
					// eslint-disable-next-line @typescript-eslint/restrict-template-expressions
					getCustomDisplayTitle: (values: Record<string, unknown>) => `Add ${values.nodeType} Node`,
				},
				{
					toolName: 'connect_nodes',
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

	describe('createStreamProcessor with subgraph events', () => {
		it('should process parent events [streamMode, data]', async () => {
			async function* mockStream(): AsyncGenerator<[string, unknown], void, unknown> {
				yield ['updates', { responder: { messages: [{ content: 'Hello from parent' }] } }];
			}

			const processor = createStreamProcessor(mockStream());
			const results: StreamOutput[] = [];

			for await (const output of processor) {
				results.push(output);
			}

			expect(results).toHaveLength(1);
			expect((results[0].messages[0] as AgentMessageChunk).text).toBe('Hello from parent');
		});

		it('should process subgraph events [namespace[], streamMode, data]', async () => {
			async function* mockStream(): AsyncGenerator<[string[], string, unknown], void, unknown> {
				// Non-skipped subgraph event
				yield [['some_other_graph'], 'updates', { responder: { messages: [{ content: 'Test' }] } }];
			}

			const processor = createStreamProcessor(mockStream());
			const results: StreamOutput[] = [];

			for await (const output of processor) {
				results.push(output);
			}

			expect(results).toHaveLength(1);
		});

		it('should filter out message events from builder_subgraph namespace', async () => {
			async function* mockStream(): AsyncGenerator<[string[], string, unknown], void, unknown> {
				// UUID-appended namespace format used by LangGraph
				yield [
					['builder_subgraph:612f4bc3-b308-53a8-b2e8-01543d375dff'],
					'updates',
					{ responder: { messages: [{ content: 'Internal builder message' }] } },
				];
			}

			const processor = createStreamProcessor(mockStream());
			const results: StreamOutput[] = [];

			for await (const output of processor) {
				results.push(output);
			}

			expect(results).toHaveLength(0);
		});

		it('should filter out message events from discovery_subgraph namespace', async () => {
			async function* mockStream(): AsyncGenerator<[string[], string, unknown], void, unknown> {
				yield [
					['discovery_subgraph:abc-123'],
					'updates',
					{ responder: { messages: [{ content: 'Internal discovery message' }] } },
				];
			}

			const processor = createStreamProcessor(mockStream());
			const results: StreamOutput[] = [];

			for await (const output of processor) {
				results.push(output);
			}

			expect(results).toHaveLength(0);
		});

		it('should allow tool progress events from subgraphs', async () => {
			const toolChunk: ToolProgressChunk = {
				id: 'tool-1',
				toolCallId: 'call-1',
				type: 'tool',
				role: 'assistant',
				toolName: 'add_nodes',
				status: 'running',
				updates: [],
			};

			async function* mockStream(): AsyncGenerator<[string[], string, unknown], void, unknown> {
				yield [['builder_subgraph:uuid'], 'custom', toolChunk];
			}

			const processor = createStreamProcessor(mockStream());
			const results: StreamOutput[] = [];

			for await (const output of processor) {
				results.push(output);
			}

			expect(results).toHaveLength(1);
			expect((results[0].messages[0] as ToolProgressChunk).toolName).toBe('add_nodes');
		});

		it('should allow process_operations events from subgraphs', async () => {
			const workflowData = { nodes: [], connections: {} };

			async function* mockStream(): AsyncGenerator<[string[], string, unknown], void, unknown> {
				yield [
					['builder_subgraph:uuid'],
					'updates',
					{ process_operations: { workflowJSON: workflowData, workflowOperations: null } },
				];
			}

			const processor = createStreamProcessor(mockStream());
			const results: StreamOutput[] = [];

			for await (const output of processor) {
				results.push(output);
			}

			expect(results).toHaveLength(1);
			expect((results[0].messages[0] as WorkflowUpdateChunk).type).toBe('workflow-updated');
		});

		it('should handle mixed parent and subgraph events', async () => {
			async function* mockStream(): AsyncGenerator<
				[string, unknown] | [string[], string, unknown],
				void,
				unknown
			> {
				// Parent event
				yield ['updates', { responder: { messages: [{ content: 'User-facing response' }] } }];
				// Filtered subgraph event
				yield [
					['builder_subgraph:uuid'],
					'updates',
					{ responder: { messages: [{ content: 'Internal' }] } },
				];
				// Another parent event
				yield ['custom', { type: 'tool', toolName: 'test_tool' } as ToolProgressChunk];
			}

			const processor = createStreamProcessor(mockStream());
			const results: StreamOutput[] = [];

			for await (const output of processor) {
				results.push(output);
			}

			expect(results).toHaveLength(2);
			expect((results[0].messages[0] as AgentMessageChunk).text).toBe('User-facing response');
			expect((results[1].messages[0] as ToolProgressChunk).toolName).toBe('test_tool');
		});

		it('should ignore malformed events', async () => {
			async function* mockStream(): AsyncGenerator<unknown, void, unknown> {
				yield ['updates', { responder: { messages: [{ content: 'Valid' }] } }];
				yield null;
				yield undefined;
				yield 'just a string';
				yield 12345;
				yield { not: 'an array' };
				yield ['updates', { responder: { messages: [{ content: 'Also valid' }] } }];
			}

			// Cast to expected type for processor
			const processor = createStreamProcessor(
				mockStream() as AsyncGenerator<[string, unknown], void, unknown>,
			);
			const results: StreamOutput[] = [];

			for await (const output of processor) {
				results.push(output);
			}

			expect(results).toHaveLength(2);
		});

		it('should handle nested namespace arrays', async () => {
			async function* mockStream(): AsyncGenerator<[string[], string, unknown], void, unknown> {
				// Nested namespaces like parent:child:grandchild
				yield [
					['parent_graph', 'builder_subgraph:uuid'],
					'updates',
					{ responder: { messages: [{ content: 'Nested internal' }] } },
				];
			}

			const processor = createStreamProcessor(mockStream());
			const results: StreamOutput[] = [];

			for await (const output of processor) {
				results.push(output);
			}

			// Should be filtered because one of the namespaces matches skipped prefix
			expect(results).toHaveLength(0);
		});

		it('should not filter subgraph events when node is in SKIPPED_NODES list', async () => {
			async function* mockStream(): AsyncGenerator<
				[string[], string, unknown] | [string, unknown],
				void,
				unknown
			> {
				// 'tools' node is in SKIPPED_NODES - subgraph filtering should NOT block this event
				// (subgraph filtering only blocks events with EMITTING nodes like 'responder')
				yield [
					['builder_subgraph:uuid'],
					'updates',
					{ tools: { messages: [{ content: 'Tool execution' }] } },
				];
				// Follow-up parent event to verify stream processing continues normally
				yield ['updates', { responder: { messages: [{ content: 'Parent response' }] } }];
			}

			const processor = createStreamProcessor(
				mockStream() as AsyncGenerator<[string, unknown], void, unknown>,
			);
			const results: StreamOutput[] = [];

			for await (const output of processor) {
				results.push(output);
			}

			// First event: no output because 'tools' doesn't emit (but wasn't filtered)
			// Second event: parent 'agent' produces output, proving stream wasn't blocked
			expect(results).toHaveLength(1);
			expect((results[0].messages[0] as AgentMessageChunk).text).toBe('Parent response');
		});
	});

	describe('cleanContextTags', () => {
		// Import cleanContextTags for direct testing
		it('should remove workflow context tags from text', () => {
			const input = `Question here
<current_workflow_json>
{"nodes": []}
</current_workflow_json>
<current_simplified_execution_data>
{}
</current_simplified_execution_data>
<current_execution_nodes_schemas>
[]
</current_execution_nodes_schemas>`;

			const result = cleanContextTags(input);
			expect(result).toBe('Question here');
		});

		it('should handle text without context tags', () => {
			const input = 'Plain text without any tags';
			const result = cleanContextTags(input);
			expect(result).toBe('Plain text without any tags');
		});

		it('should extract user request from XML tag format', () => {
			const input = `<previous_requests>
test
</previous_requests>
<workflow_file path="/workflow.js">
1: const wf = workflow('id', 'name');
</workflow_file>
<user_request>
add set node
</user_request>`;

			const result = cleanContextTags(input);
			expect(result).toBe('add set node');
		});

		it('should extract multiline user request from XML tag', () => {
			const input = `<workflow_file path="/workflow.js">
code
</workflow_file>
<user_request>
add a set node
and connect it to the trigger
</user_request>`;

			const result = cleanContextTags(input);
			expect(result).toBe('add a set node\nand connect it to the trigger');
		});

		it('should strip code builder tags when no user request marker found', () => {
			const input = `<previous_requests>
old request
</previous_requests>
<workflow_file path="/workflow.js">
code
</workflow_file>`;

			const result = cleanContextTags(input);
			expect(result).toBe('');
		});
	});

	describe('edge cases', () => {
		it('should handle responder node messages (user-facing)', () => {
			const chunk = {
				responder: {
					messages: [{ content: 'Final response to user' }],
				},
			};

			const result = processStreamChunk('updates', chunk);

			expect(result).toBeDefined();
			expect(result?.messages).toHaveLength(1);
			const message = result?.messages[0] as AgentMessageChunk;
			expect(message.text).toBe('Final response to user');
		});

		it('should skip supervisor node messages', () => {
			const chunk = {
				supervisor: {
					messages: [{ content: 'Supervisor internal message' }],
				},
			};

			const result = processStreamChunk('updates', chunk);

			expect(result).toBeNull();
		});

		it('should skip assistant_subgraph state updates (text streamed via custom events)', () => {
			const chunk = {
				assistant_subgraph: {
					messages: [{ content: 'Assistant response text' }],
				},
			};

			const result = processStreamChunk('updates', chunk);

			expect(result).toBeNull();
		});

		it('should skip tools node messages', () => {
			const chunk = {
				tools: {
					messages: [{ content: 'Tool execution result' }],
				},
			};

			const result = processStreamChunk('updates', chunk);

			expect(result).toBeNull();
		});

		it('should filter messages containing workflow context XML', () => {
			const chunk = {
				responder: {
					messages: [{ content: 'Here is <current_workflow_json>{}</current_workflow_json>' }],
				},
			};

			const result = processStreamChunk('updates', chunk);

			expect(result).toBeNull();
		});

		// ============================================================================
		// Plan mode interrupt tests
		// ============================================================================

		it('should process a questions interrupt from updates stream', () => {
			const chunk = {
				__interrupt__: [
					{
						value: {
							type: 'questions',
							introMessage: 'Before I proceed:',
							questions: [
								{
									id: 'q1',
									question: 'Which provider?',
									type: 'single',
									options: ['Gmail', 'Outlook'],
								},
							],
						},
						id: 'int-q1',
					},
				],
			};

			const result = processStreamChunk('updates', chunk);

			expect(result).toBeDefined();
			expect(result?.messages).toHaveLength(1);
			const msg = result!.messages[0] as {
				type: string;
				questions: unknown[];
				introMessage?: string;
			};
			expect(msg.type).toBe('questions');
			expect(msg.questions).toHaveLength(1);
			expect(msg.introMessage).toBe('Before I proceed:');
			expect(result?.interruptId).toBe('int-q1');
		});

		it('should process a plan interrupt from updates stream', () => {
			const plan = {
				summary: 'Weather alerts via Slack',
				trigger: 'Daily at 7 AM',
				steps: [{ description: 'Check forecast' }, { description: 'Send notification' }],
			};
			const chunk = {
				__interrupt__: [
					{
						value: { type: 'plan', plan },
						id: 'int-p1',
					},
				],
			};

			const result = processStreamChunk('updates', chunk);

			expect(result).toBeDefined();
			expect(result?.messages).toHaveLength(1);
			const msg = result!.messages[0] as { type: string; plan: typeof plan };
			expect(msg.type).toBe('plan');
			expect(msg.plan).toEqual(plan);
			expect(result?.interruptId).toBe('int-p1');
		});

		it('should return null for empty __interrupt__ array', () => {
			const chunk = { __interrupt__: [] };
			const result = processStreamChunk('updates', chunk);
			expect(result).toBeNull();
		});

		it('should return null for __interrupt__ with invalid value', () => {
			const chunk = { __interrupt__: [{ value: 'not an object', id: 'x' }] };
			const result = processStreamChunk('updates', chunk);
			expect(result).toBeNull();
		});

		it('should return null for __interrupt__ with unknown type', () => {
			const chunk = {
				__interrupt__: [{ value: { type: 'unknown_type', data: {} }, id: 'x' }],
			};
			const result = processStreamChunk('updates', chunk);
			expect(result).toBeNull();
		});

		it('should handle interrupt without id', () => {
			const chunk = {
				__interrupt__: [
					{
						value: {
							type: 'questions',
							questions: [{ id: 'q1', question: 'Test?', type: 'text' }],
						},
					},
				],
			};

			const result = processStreamChunk('updates', chunk);

			expect(result).toBeDefined();
			expect(result?.interruptId).toBeUndefined();
		});

		it('should handle stream mode with single character (edge case)', () => {
			// Single character stream modes should return null (length <= 1 check)
			const result = processStreamChunk('u', { responder: { messages: [{ content: 'Test' }] } });

			// Actually processStreamChunk handles this at the processParentEvent level
			// but processStreamChunk itself doesn't have this check - it checks mode names
			// 'u' is not 'updates' or 'custom', so it returns null
			expect(result).toBeNull();
		});
	});

	describe('createStreamProcessor - interrupt deduplication', () => {
		async function collectResults(stream: AsyncIterable<StreamOutput>): Promise<StreamOutput[]> {
			const results: StreamOutput[] = [];
			for await (const result of stream) {
				results.push(result);
			}
			return results;
		}

		it('should deduplicate interrupts with the same id', async () => {
			const interruptChunk = {
				__interrupt__: [
					{
						value: {
							type: 'questions',
							questions: [{ id: 'q1', question: 'Service?', type: 'single' }],
						},
						id: 'interrupt-123',
					},
				],
			};

			// Simulate same interrupt emitted twice (parent + subgraph)
			async function* fakeStream() {
				yield ['updates', interruptChunk] as [string, unknown];
				yield ['updates', interruptChunk] as [string, unknown];
			}

			const results = await collectResults(createStreamProcessor(fakeStream()));

			expect(results).toHaveLength(1);
			expect(results[0].interruptId).toBe('interrupt-123');
		});

		it('should allow interrupts with different ids', async () => {
			const makeInterrupt = (id: string) => ({
				__interrupt__: [
					{
						value: {
							type: 'questions',
							questions: [{ id: 'q1', question: 'Test?', type: 'text' }],
						},
						id,
					},
				],
			});

			async function* fakeStream() {
				yield ['updates', makeInterrupt('int-1')] as [string, unknown];
				yield ['updates', makeInterrupt('int-2')] as [string, unknown];
			}

			const results = await collectResults(createStreamProcessor(fakeStream()));

			expect(results).toHaveLength(2);
		});

		it('should pass through non-interrupt events without dedup', async () => {
			const responderChunk = {
				responder: { messages: [{ content: 'Hello' }] },
			};

			async function* fakeStream() {
				yield ['updates', responderChunk] as [string, unknown];
				yield ['updates', responderChunk] as [string, unknown];
			}

			const results = await collectResults(createStreamProcessor(fakeStream()));

			expect(results).toHaveLength(2);
		});
	});
});
