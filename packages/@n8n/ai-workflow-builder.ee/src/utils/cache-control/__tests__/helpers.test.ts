import { HumanMessage, ToolMessage, AIMessage } from '@langchain/core/messages';
import type { BaseMessage } from '@langchain/core/messages';

import {
	findUserToolMessageIndices,
	cleanStaleWorkflowContext,
	applyCacheControlMarkers,
	applySubgraphCacheMarkers,
	stripAllCacheControlMarkers,
} from '../helpers';

describe('Cache Control Helpers', () => {
	describe('findUserToolMessageIndices', () => {
		it('should return empty array for empty messages', () => {
			const messages: BaseMessage[] = [];
			const result = findUserToolMessageIndices(messages);

			expect(result).toEqual([]);
		});

		it('should find single HumanMessage index', () => {
			const messages = [new AIMessage('system'), new HumanMessage('user message')];

			const result = findUserToolMessageIndices(messages);

			expect(result).toEqual([1]);
		});

		it('should find multiple HumanMessage and ToolMessage indices', () => {
			const messages = [
				new AIMessage('system'),
				new HumanMessage('user 1'),
				new AIMessage('assistant 1'),
				new ToolMessage({ content: 'tool result', tool_call_id: '1' }),
				new AIMessage('assistant 2'),
				new HumanMessage('user 2'),
			];

			const result = findUserToolMessageIndices(messages);

			expect(result).toEqual([1, 3, 5]);
		});

		it('should handle only AIMessages (no user/tool messages)', () => {
			const messages = [
				new AIMessage('assistant 1'),
				new AIMessage('assistant 2'),
				new AIMessage('assistant 3'),
			];

			const result = findUserToolMessageIndices(messages);

			expect(result).toEqual([]);
		});

		it('should find consecutive ToolMessages', () => {
			const messages = [
				new HumanMessage('user'),
				new ToolMessage({ content: 'tool 1', tool_call_id: '1' }),
				new ToolMessage({ content: 'tool 2', tool_call_id: '2' }),
				new ToolMessage({ content: 'tool 3', tool_call_id: '3' }),
			];

			const result = findUserToolMessageIndices(messages);

			expect(result).toEqual([0, 1, 2, 3]);
		});
	});

	describe('cleanStaleWorkflowContext', () => {
		const createWorkflowContext = () => `
<current_workflow_json>
{"nodes": []}
</current_workflow_json>
<current_simplified_execution_data>
{"data": "test"}
</current_simplified_execution_data>
<current_execution_nodes_schemas>
[{"type": "test"}]
</current_execution_nodes_schemas>`;

		it('should do nothing for empty indices', () => {
			const messages = [new HumanMessage('test')];
			const originalContent = messages[0].content;

			cleanStaleWorkflowContext(messages, []);

			expect(messages[0].content).toBe(originalContent);
		});

		it('should do nothing when only one user/tool message exists', () => {
			const messages = [new AIMessage('system'), new HumanMessage('user message')];
			const originalContent = messages[1].content;

			cleanStaleWorkflowContext(messages, [1]);

			expect(messages[1].content).toBe(originalContent);
		});

		it('should remove workflow context from string content in old messages', () => {
			const workflowContext = createWorkflowContext();
			const messages = [
				new HumanMessage(`First message${workflowContext}`),
				new HumanMessage('Second message'),
			];

			cleanStaleWorkflowContext(messages, [0, 1]);

			expect(messages[0].content).toBe('First message');
			expect(messages[1].content).toBe('Second message');
		});

		it('should not remove workflow context from the last message', () => {
			const workflowContext = createWorkflowContext();
			const messages = [
				new HumanMessage(`First message${workflowContext}`),
				new HumanMessage(`Last message${workflowContext}`),
			];

			cleanStaleWorkflowContext(messages, [0, 1]);

			expect(messages[0].content).toBe('First message');
			expect(messages[1].content).toBe(`Last message${workflowContext}`);
		});

		it('should remove cache_control markers from array content blocks', () => {
			const message0 = new HumanMessage('message 1');
			// Manually set array content as it would be after applyCacheControlMarkers
			message0.content = [
				{
					type: 'text' as const,
					text: 'message 1',
					cache_control: { type: 'ephemeral' as const },
				},
			];
			const messages = [message0, new HumanMessage('message 2')];

			cleanStaleWorkflowContext(messages, [0, 1]);

			const content = messages[0].content as Array<{
				type: string;
				text: string;
				cache_control?: unknown;
			}>;
			expect(content[0].cache_control).toBeUndefined();
		});

		it('should handle mixed string and array content', () => {
			const workflowContext = createWorkflowContext();
			const message1 = new HumanMessage('Array message');
			message1.content = [
				{
					type: 'text' as const,
					text: 'Array message',
					cache_control: { type: 'ephemeral' as const },
				},
			];

			const messages = [
				new HumanMessage(`String message${workflowContext}`),
				message1,
				new HumanMessage('Last message'),
			];

			cleanStaleWorkflowContext(messages, [0, 1, 2]);

			expect(messages[0].content).toBe('String message');
			const content1 = messages[1].content as Array<{
				cache_control?: unknown;
			}>;
			expect(content1[0].cache_control).toBeUndefined();
		});

		it('should handle multiple old messages with workflow context', () => {
			const workflowContext = createWorkflowContext();
			const messages = [
				new HumanMessage(`Message 1${workflowContext}`),
				new ToolMessage({ content: `Tool 1${workflowContext}`, tool_call_id: '1' }),
				new HumanMessage(`Message 2${workflowContext}`),
				new HumanMessage('Last message'),
			];

			cleanStaleWorkflowContext(messages, [0, 1, 2, 3]);

			expect(messages[0].content).toBe('Message 1');
			expect(messages[1].content).toBe('Tool 1');
			expect(messages[2].content).toBe('Message 2');
			expect(messages[3].content).toBe('Last message');
		});
	});

	describe('applyCacheControlMarkers', () => {
		it('should do nothing for empty indices', () => {
			const messages = [new HumanMessage('test')];
			const originalContent = messages[0].content;

			applyCacheControlMarkers(messages, [], 'workflow context');

			expect(messages[0].content).toBe(originalContent);
		});

		it('should add workflow context to last message when content is string', () => {
			const messages = [new HumanMessage('user message')];
			const workflowContext = '\n<workflow>test</workflow>';

			applyCacheControlMarkers(messages, [0], workflowContext);

			// applyCacheControlMarkers converts string content to array format
			const content = messages[0].content as Array<{
				type: string;
				text: string;
				cache_control?: { type: string };
			}>;
			expect(content[0].text).toBe(`user message${workflowContext}`);
			expect(content[0].cache_control).toEqual({ type: 'ephemeral' });
		});

		it('should apply cache marker to last message when only one user/tool message', () => {
			const messages = [new HumanMessage('user message')];

			applyCacheControlMarkers(messages, [0], '\n<workflow/>');

			const content = messages[0].content as Array<{
				type: string;
				text: string;
				cache_control?: { type: string };
			}>;
			expect(content).toHaveLength(1);
			expect(content[0].type).toBe('text');
			expect(content[0].cache_control).toEqual({ type: 'ephemeral' });
		});

		it('should apply cache markers to last two messages', () => {
			const messages = [new HumanMessage('first message'), new HumanMessage('second message')];

			applyCacheControlMarkers(messages, [0, 1], '\n<workflow/>');

			// Check first message (second-to-last) has cache marker
			const content0 = messages[0].content as Array<{
				cache_control?: { type: string };
			}>;
			expect(content0[0].cache_control).toEqual({ type: 'ephemeral' });

			// Check last message has cache marker
			const content1 = messages[1].content as Array<{
				cache_control?: { type: string };
			}>;
			expect(content1[0].cache_control).toEqual({ type: 'ephemeral' });
		});

		it('should handle array content in second-to-last message', () => {
			const message0 = new HumanMessage('first message');
			message0.content = [
				{
					type: 'text' as const,
					text: 'first message',
				},
			];
			const messages = [message0, new HumanMessage('second message')];

			applyCacheControlMarkers(messages, [0, 1], '\n<workflow/>');

			const content0 = messages[0].content as Array<{
				type: string;
				text: string;
				cache_control?: { type: string };
			}>;
			expect(content0[0].cache_control).toEqual({ type: 'ephemeral' });
		});

		it('should handle array content in last message', () => {
			const message1 = new HumanMessage('second message');
			message1.content = [
				{
					type: 'text' as const,
					text: 'second message',
				},
			];
			const messages = [new HumanMessage('first message'), message1];

			applyCacheControlMarkers(messages, [0, 1], '\n<workflow/>');

			const content1 = messages[1].content as Array<{
				cache_control?: { type: string };
			}>;
			expect(content1[0].cache_control).toEqual({ type: 'ephemeral' });
		});

		it('should apply markers to correct messages in long conversation', () => {
			const messages = [
				new HumanMessage('msg 1'),
				new HumanMessage('msg 2'),
				new HumanMessage('msg 3'),
				new HumanMessage('msg 4'),
				new HumanMessage('msg 5'),
			];

			applyCacheControlMarkers(messages, [0, 1, 2, 3, 4], '\n<workflow/>');

			// Messages 0-2 should not have cache markers
			expect(typeof messages[0].content).toBe('string');
			expect(typeof messages[1].content).toBe('string');
			expect(typeof messages[2].content).toBe('string');

			// Message 3 (second-to-last) should have cache marker
			const content3 = messages[3].content as Array<{
				cache_control?: { type: string };
			}>;
			expect(content3[0].cache_control).toEqual({ type: 'ephemeral' });

			// Message 4 (last) should have cache marker
			const content4 = messages[4].content as Array<{
				cache_control?: { type: string };
			}>;
			expect(content4[0].cache_control).toEqual({ type: 'ephemeral' });
		});

		it('should not modify workflow context when message has array content', () => {
			const message0 = new HumanMessage('existing content');
			message0.content = [
				{
					type: 'text' as const,
					text: 'existing content',
				},
			];
			const messages = [message0];
			const workflowContext = '\n<workflow>new</workflow>';

			applyCacheControlMarkers(messages, [0], workflowContext);

			// Workflow context is only added to string content, not array content
			const content = messages[0].content as Array<{ text: string }>;
			expect(content[0].text).toBe('existing content');
		});

		it('should handle ToolMessages correctly', () => {
			const messages = [
				new ToolMessage({ content: 'tool result 1', tool_call_id: '1' }),
				new ToolMessage({ content: 'tool result 2', tool_call_id: '2' }),
			];

			applyCacheControlMarkers(messages, [0, 1], '\n<workflow/>');

			// Both should have cache markers applied
			const content0 = messages[0].content as unknown as Array<{
				cache_control?: { type: string };
			}>;
			const content1 = messages[1].content as unknown as Array<{
				cache_control?: { type: string };
			}>;

			expect(content0[0].cache_control).toEqual({ type: 'ephemeral' });
			expect(content1[0].cache_control).toEqual({ type: 'ephemeral' });
		});
	});

	describe('Integration: Full cache control flow', () => {
		it('should correctly implement sliding window pattern', () => {
			const workflowContext = '\n<workflow>current state</workflow>';

			// Iteration 1: First request
			const messages1 = [new HumanMessage('Create a workflow')];

			applyCacheControlMarkers(messages1, [0], workflowContext);

			expect((messages1[0].content as Array<{ cache_control?: unknown }>)[0].cache_control).toEqual(
				{ type: 'ephemeral' },
			);

			// Iteration 2: Add assistant response and new user message
			// Simulate what would happen: first message was converted to array by applyCacheControlMarkers
			const message2_0 = new HumanMessage('Create a workflow');
			message2_0.content = [
				{
					type: 'text' as const,
					text: 'Create a workflow' + workflowContext,
					cache_control: { type: 'ephemeral' as const },
				},
			];
			const messages2 = [message2_0, new AIMessage('Done'), new HumanMessage('Add email node')];

			const indices2 = findUserToolMessageIndices(messages2);
			cleanStaleWorkflowContext(messages2, indices2);
			applyCacheControlMarkers(messages2, indices2, workflowContext);

			// First message: workflow stays in array content (only string content gets cleaned)
			// AND it gets a cache marker again because it's now the second-to-last message!
			const content0 = messages2[0].content as Array<{ text: string; cache_control?: unknown }>;
			expect(content0[0].text).toContain('Create a workflow');
			expect(content0[0].text).toContain('current state'); // Workflow stays
			expect(content0[0].cache_control).toEqual({ type: 'ephemeral' }); // Gets marker as second-to-last

			// Last message should have new workflow and cache marker
			expect(typeof messages2[2].content).not.toBe('string');
			const content2 = messages2[2].content as Array<{ text: string; cache_control?: unknown }>;
			expect(content2[0].text).toContain('workflow>current state</workflow>');
			expect(content2[0].cache_control).toEqual({ type: 'ephemeral' });
		});

		it('should handle complete conversation lifecycle', () => {
			const workflowV1 = '\n<workflow>version 1</workflow>';
			const workflowV2 = '\n<workflow>version 2</workflow>';
			const workflowV3 = '\n<workflow>version 3</workflow>';

			// Start conversation
			const messages = [new HumanMessage('msg 1'), new AIMessage('response 1')];

			let indices = findUserToolMessageIndices(messages);
			applyCacheControlMarkers(messages, indices, workflowV1);

			// First message is now array format after applyCacheControlMarkers
			const content0Initial = messages[0].content as Array<{ text: string }>;
			expect(content0Initial[0].text).toContain('msg 1');
			expect(content0Initial[0].text).toContain('version 1');

			// Add second turn - simulate realistic state where message[0] is now array
			messages.push(new HumanMessage('msg 2'));
			indices = findUserToolMessageIndices(messages);
			cleanStaleWorkflowContext(messages, indices);
			applyCacheControlMarkers(messages, indices, workflowV2);

			// Verify first message: workflow stays in array content (only string content gets cleaned)
			// AND it gets a cache marker again because with 2 user messages, it's the second-to-last!
			const content0WithMarker = messages[0].content as Array<{
				text: string;
				cache_control?: { type: string };
			}>;
			expect(content0WithMarker[0].text).toContain('msg 1');
			expect(content0WithMarker[0].text).toContain('version 1'); // Workflow stays in array content
			expect(content0WithMarker[0].cache_control).toEqual({ type: 'ephemeral' }); // Gets marker as second-to-last

			// Add third turn
			messages.push(new AIMessage('response 2'));
			messages.push(new HumanMessage('msg 3'));
			indices = findUserToolMessageIndices(messages);
			cleanStaleWorkflowContext(messages, indices);
			applyCacheControlMarkers(messages, indices, workflowV3);

			// Verify old messages: workflow stays in array content, but cache markers move
			const content0NoMarker = messages[0].content as Array<{
				text: string;
				cache_control?: { type: string };
			}>;
			expect(content0NoMarker[0].text).toContain('msg 1');
			expect(content0NoMarker[0].cache_control).toBeUndefined(); // Old marker removed

			const content2 = messages[2].content as Array<{
				text: string;
				cache_control?: { type: string };
			}>;
			expect(content2[0].text).toContain('msg 2');
			expect(content2[0].cache_control).toEqual({ type: 'ephemeral' }); // Second-to-last gets marker

			// Verify last message has cache marker
			const lastContent = messages[4].content as Array<{ cache_control?: unknown }>;
			expect(lastContent[0].cache_control).toEqual({ type: 'ephemeral' });
		});
	});

	describe('applySubgraphCacheMarkers', () => {
		it('should do nothing for empty messages', () => {
			const messages: BaseMessage[] = [];
			applySubgraphCacheMarkers(messages);
			expect(messages).toHaveLength(0);
		});

		it('should do nothing when no user/tool messages exist', () => {
			const messages = [new AIMessage('response')];
			applySubgraphCacheMarkers(messages);
			expect(messages[0].content).toBe('response');
		});

		it('should apply cache marker to single user message', () => {
			const messages = [new HumanMessage('user request')];
			applySubgraphCacheMarkers(messages);

			const content = messages[0].content as Array<{
				type: string;
				text: string;
				cache_control?: { type: string };
			}>;
			expect(content[0].text).toBe('user request');
			expect(content[0].cache_control).toEqual({ type: 'ephemeral' });
		});

		it('should apply cache marker only to last user/tool message', () => {
			const messages = [
				new HumanMessage('first message'),
				new AIMessage('response'),
				new ToolMessage({ content: 'tool result', tool_call_id: '1' }),
			];

			applySubgraphCacheMarkers(messages);

			// First message should NOT have cache marker (stays string)
			expect(typeof messages[0].content).toBe('string');

			// Tool message (last user/tool) should have cache marker
			const toolContent = messages[2].content as Array<{
				cache_control?: { type: string };
			}>;
			expect(toolContent[0].cache_control).toEqual({ type: 'ephemeral' });
		});

		it('should remove existing cache markers from old messages', () => {
			// Set up message with existing cache marker
			const message0 = new HumanMessage('first');
			message0.content = [
				{
					type: 'text' as const,
					text: 'first',
					cache_control: { type: 'ephemeral' as const },
				},
			];

			const messages = [
				message0,
				new AIMessage('response'),
				new ToolMessage({ content: 'tool result', tool_call_id: '1' }),
			];

			applySubgraphCacheMarkers(messages);

			// First message's cache marker should be removed
			const content0 = messages[0].content as Array<{ cache_control?: unknown }>;
			expect(content0[0].cache_control).toBeUndefined();

			// Last message should have the cache marker
			const toolContent = messages[2].content as Array<{
				cache_control?: { type: string };
			}>;
			expect(toolContent[0].cache_control).toEqual({ type: 'ephemeral' });
		});

		it('should handle array content in last message', () => {
			const toolMessage = new ToolMessage({ content: 'result', tool_call_id: '1' });
			toolMessage.content = [{ type: 'text' as const, text: 'result' }];

			const messages = [toolMessage];
			applySubgraphCacheMarkers(messages);

			const content = messages[0].content as Array<{
				text: string;
				cache_control?: { type: string };
			}>;
			expect(content[0].cache_control).toEqual({ type: 'ephemeral' });
		});

		it('should handle multiple tool messages in sequence', () => {
			const messages = [
				new ToolMessage({ content: 'tool 1', tool_call_id: '1' }),
				new ToolMessage({ content: 'tool 2', tool_call_id: '2' }),
				new ToolMessage({ content: 'tool 3', tool_call_id: '3' }),
			];

			applySubgraphCacheMarkers(messages);

			// Only the last tool message should have the marker
			expect(typeof messages[0].content).toBe('string');
			expect(typeof messages[1].content).toBe('string');

			const lastContent = messages[2].content as Array<{
				cache_control?: { type: string };
			}>;
			expect(lastContent[0].cache_control).toEqual({ type: 'ephemeral' });
		});

		it('should not add cache_control to ToolMessage with empty string content', () => {
			const messages = [new ToolMessage({ content: '', tool_call_id: '1' })];

			applySubgraphCacheMarkers(messages);

			// Empty string content should remain unchanged — no cache_control added
			expect(messages[0].content).toBe('');
		});

		it('should not add cache_control to empty content when non-empty messages precede it', () => {
			const messages = [
				new HumanMessage('user request'),
				new AIMessage('response'),
				new ToolMessage({ content: '', tool_call_id: '1' }),
			];

			applySubgraphCacheMarkers(messages);

			// First message should stay as string (not the last user/tool)
			expect(typeof messages[0].content).toBe('string');
			// Empty tool message should remain unchanged
			expect(messages[2].content).toBe('');
		});
	});

	describe('applyCacheControlMarkers - empty content handling', () => {
		it('should not add cache_control to last message with empty string content', () => {
			const messages = [new ToolMessage({ content: '', tool_call_id: '1' })];

			applyCacheControlMarkers(messages, [0], '');

			// Empty content should remain unchanged
			expect(messages[0].content).toBe('');
		});

		it('should not add cache_control to second-to-last message with empty string content', () => {
			const messages = [
				new ToolMessage({ content: '', tool_call_id: '1' }),
				new HumanMessage('user message'),
			];

			applyCacheControlMarkers(messages, [0, 1], '\n<workflow/>');

			// Empty tool message should stay as empty string
			expect(messages[0].content).toBe('');

			// Non-empty last message should still get the marker
			const content1 = messages[1].content as Array<{
				cache_control?: { type: string };
			}>;
			expect(content1[0].cache_control).toEqual({ type: 'ephemeral' });
		});

		it('should not add cache_control to array content block with empty text', () => {
			const toolMessage = new ToolMessage({ content: '', tool_call_id: '1' });
			toolMessage.content = [{ type: 'text' as const, text: '' }];

			const messages = [toolMessage];

			applyCacheControlMarkers(messages, [0], '');

			// Empty text block should NOT get cache_control
			const content = messages[0].content as Array<{
				text: string;
				cache_control?: { type: string };
			}>;
			expect(content[0].cache_control).toBeUndefined();
		});
	});

	describe('stripAllCacheControlMarkers', () => {
		it('should do nothing for empty messages array', () => {
			const messages: BaseMessage[] = [];
			stripAllCacheControlMarkers(messages);
			expect(messages).toHaveLength(0);
		});

		it('should do nothing for messages with string content', () => {
			const messages = [new HumanMessage('hello'), new AIMessage('response')];
			stripAllCacheControlMarkers(messages);

			expect(messages[0].content).toBe('hello');
			expect(messages[1].content).toBe('response');
		});

		it('should remove cache_control from single message with array content', () => {
			const message = new HumanMessage('test');
			message.content = [
				{
					type: 'text' as const,
					text: 'test',
					cache_control: { type: 'ephemeral' as const },
				},
			];
			const messages = [message];

			stripAllCacheControlMarkers(messages);

			const content = messages[0].content as Array<{ cache_control?: unknown }>;
			expect(content[0].cache_control).toBeUndefined();
		});

		it('should remove cache_control from multiple messages', () => {
			const msg1 = new HumanMessage('first');
			msg1.content = [
				{
					type: 'text' as const,
					text: 'first',
					cache_control: { type: 'ephemeral' as const },
				},
			];

			const msg2 = new ToolMessage({ content: 'tool result', tool_call_id: '1' });
			msg2.content = [
				{
					type: 'text' as const,
					text: 'tool result',
					cache_control: { type: 'ephemeral' as const },
				},
			];

			const msg3 = new HumanMessage('third');
			msg3.content = [
				{
					type: 'text' as const,
					text: 'third',
					cache_control: { type: 'ephemeral' as const },
				},
			];

			const messages = [msg1, new AIMessage('response'), msg2, msg3];

			stripAllCacheControlMarkers(messages);

			// All cache_control markers should be removed
			const content1 = messages[0].content as Array<{ cache_control?: unknown }>;
			expect(content1[0].cache_control).toBeUndefined();

			const content2 = messages[2].content as Array<{ cache_control?: unknown }>;
			expect(content2[0].cache_control).toBeUndefined();

			const content3 = messages[3].content as Array<{ cache_control?: unknown }>;
			expect(content3[0].cache_control).toBeUndefined();
		});

		it('should handle mixed string and array content', () => {
			const msg1 = new HumanMessage('string content');

			const msg2 = new HumanMessage('array content');
			msg2.content = [
				{
					type: 'text' as const,
					text: 'array content',
					cache_control: { type: 'ephemeral' as const },
				},
			];

			const messages = [msg1, msg2];

			stripAllCacheControlMarkers(messages);

			// String content should be unchanged
			expect(messages[0].content).toBe('string content');

			// Array content should have cache_control removed
			const content2 = messages[1].content as Array<{ cache_control?: unknown }>;
			expect(content2[0].cache_control).toBeUndefined();
		});

		it('should handle multiple content blocks in a single message', () => {
			const message = new HumanMessage('test');
			message.content = [
				{
					type: 'text' as const,
					text: 'block 1',
					cache_control: { type: 'ephemeral' as const },
				},
				{
					type: 'text' as const,
					text: 'block 2',
					cache_control: { type: 'ephemeral' as const },
				},
				{
					type: 'text' as const,
					text: 'block 3',
					// No cache_control on this one
				},
			];

			const messages = [message];
			stripAllCacheControlMarkers(messages);

			const content = messages[0].content as Array<{ text: string; cache_control?: unknown }>;
			expect(content[0].cache_control).toBeUndefined();
			expect(content[1].cache_control).toBeUndefined();
			expect(content[2].cache_control).toBeUndefined();
			// Text should be preserved
			expect(content[0].text).toBe('block 1');
			expect(content[1].text).toBe('block 2');
			expect(content[2].text).toBe('block 3');
		});

		it('should be idempotent - running twice produces same result', () => {
			const message = new HumanMessage('test');
			message.content = [
				{
					type: 'text' as const,
					text: 'test',
					cache_control: { type: 'ephemeral' as const },
				},
			];
			const messages = [message];

			stripAllCacheControlMarkers(messages);
			stripAllCacheControlMarkers(messages);

			const content = messages[0].content as Array<{ text: string; cache_control?: unknown }>;
			expect(content[0].cache_control).toBeUndefined();
			expect(content[0].text).toBe('test');
		});
	});
});
