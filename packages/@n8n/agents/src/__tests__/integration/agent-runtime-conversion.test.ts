/**
 * Round-trip conversion tests: toAiMessages ↔ fromAiMessages
 *
 * These tests exercise the message split/merge logic without making real LLM
 * calls. They lock down the structural invariants that the agent runtime relies
 * on, including the key interim-message ordering guarantee described in the
 * plan:
 *
 *   input:  [assistant{tool-call resolved}, user{x}, assistant{y}]
 *   output: [assistant{tool-call}, tool{tool-result}, user{x}, assistant{y}]
 *
 * The tool-result is inserted right after its tool-call, regardless of what
 * messages follow it in the n8n list.
 */
import { describe, it, expect } from 'vitest';

import { toAiMessages, fromAiMessages } from '../../runtime/messages';
import type { Message } from '../../types/sdk/message';

describe('toAiMessages + fromAiMessages — round-trip', () => {
	it('splits a resolved tool-call into assistant + tool ModelMessages', () => {
		const input: Message[] = [
			{
				role: 'assistant',
				content: [
					{
						type: 'tool-call',
						toolCallId: 'tc-1',
						toolName: 'add',
						input: { a: 1, b: 2 },
						state: 'resolved',
						output: { result: 3 },
					},
				],
			},
		];

		const aiMessages = toAiMessages(input);

		expect(aiMessages).toHaveLength(2);
		expect(aiMessages[0].role).toBe('assistant');
		expect(aiMessages[1].role).toBe('tool');

		const toolCallPart = (
			aiMessages[0] as { role: string; content: Array<{ type: string; toolCallId: string }> }
		).content[0];
		expect(toolCallPart.type).toBe('tool-call');
		expect(toolCallPart.toolCallId).toBe('tc-1');

		const toolResultPart = (
			aiMessages[1] as {
				role: string;
				content: Array<{
					type: string;
					toolCallId: string;
					output: { type: string; value: unknown };
				}>;
			}
		).content[0];
		expect(toolResultPart.type).toBe('tool-result');
		expect(toolResultPart.toolCallId).toBe('tc-1');
		expect(toolResultPart.output.type).toBe('json');
		expect(toolResultPart.output.value).toEqual({ result: 3 });
	});

	it('encodes rejected tool-call as error-text in the tool ModelMessage', () => {
		const input: Message[] = [
			{
				role: 'assistant',
				content: [
					{
						type: 'tool-call',
						toolCallId: 'tc-1',
						toolName: 'do_it',
						input: {},
						state: 'rejected',
						error: 'Error: something went wrong',
					},
				],
			},
		];

		const aiMessages = toAiMessages(input);
		expect(aiMessages).toHaveLength(2);

		const toolResultPart = (
			aiMessages[1] as { role: string; content: Array<{ output: { type: string; value: string } }> }
		).content[0];
		expect(toolResultPart.output.type).toBe('error-text');
		expect(toolResultPart.output.value).toBe('Error: something went wrong');
	});

	it('drops pending tool-call blocks from both assistant and tool ModelMessages', () => {
		const input: Message[] = [
			{
				role: 'assistant',
				content: [
					{ type: 'text', text: 'Thinking...' },
					{
						type: 'tool-call',
						toolCallId: 'tc-1',
						toolName: 'do_it',
						input: {},
						state: 'pending',
					},
				],
			},
		];

		const aiMessages = toAiMessages(input);

		// Only the assistant text part remains; no tool-result emitted for pending
		expect(aiMessages).toHaveLength(1);
		expect(aiMessages[0].role).toBe('assistant');
		const content = (aiMessages[0] as { role: string; content: Array<{ type: string }> }).content;
		expect(content).toHaveLength(1);
		expect(content[0].type).toBe('text');
	});

	it('emits nothing for an assistant message whose only blocks are all pending', () => {
		const input: Message[] = [
			{
				role: 'assistant',
				content: [
					{
						type: 'tool-call',
						toolCallId: 'tc-1',
						toolName: 'do_it',
						input: {},
						state: 'pending',
					},
					{
						type: 'tool-call',
						toolCallId: 'tc-2',
						toolName: 'do_more',
						input: {},
						state: 'pending',
					},
				],
			},
		];

		const aiMessages = toAiMessages(input);

		// No empty-content assistant message — the whole message is suppressed
		expect(aiMessages).toHaveLength(0);
	});

	it('skips legacy tool-call blocks that have no state field and emits nothing when they are the only content', () => {
		const input: Message[] = [
			{
				role: 'assistant',
				content: [
					// Simulate a DB row written before the state field was introduced
					{
						type: 'tool-call',
						toolCallId: 'tc-legacy',
						toolName: 'old_tool',
						input: {},
					} as unknown as Message['content'][number],
				],
			},
		];

		const aiMessages = toAiMessages(input);

		// No empty-content assistant message and no spurious error-json tool message
		expect(aiMessages).toHaveLength(0);
	});

	it('emits one tool ModelMessage per settled block in the same assistant turn', () => {
		const input: Message[] = [
			{
				role: 'assistant',
				content: [
					{
						type: 'tool-call',
						toolCallId: 'tc-1',
						toolName: 'add',
						input: { a: 1, b: 2 },
						state: 'resolved',
						output: { result: 3 },
					},
					{
						type: 'tool-call',
						toolCallId: 'tc-2',
						toolName: 'mul',
						input: { a: 4, b: 5 },
						state: 'resolved',
						output: { result: 20 },
					},
				],
			},
		];

		const aiMessages = toAiMessages(input);

		// assistant{tc-1, tc-2} + tool{tc-1} + tool{tc-2}
		expect(aiMessages).toHaveLength(3);
		expect(aiMessages[0].role).toBe('assistant');
		const assistantContent = (
			aiMessages[0] as { content: Array<{ type: string; toolCallId: string }> }
		).content;
		expect(assistantContent).toHaveLength(2);
		expect(assistantContent[0].toolCallId).toBe('tc-1');
		expect(assistantContent[1].toolCallId).toBe('tc-2');

		expect(aiMessages[1].role).toBe('tool');
		expect(aiMessages[2].role).toBe('tool');
	});

	it('merges role:tool ModelMessages into the preceding assistant tool-call block', () => {
		// Simulate AI SDK output: [assistant{tool-call}, tool{tool-result}]
		const aiMessages = [
			{
				role: 'assistant' as const,
				content: [
					{
						type: 'tool-call' as const,
						toolCallId: 'tc-1',
						toolName: 'add',
						input: { a: 1, b: 2 },
						providerExecuted: undefined,
					},
				],
			},
			{
				role: 'tool' as const,
				content: [
					{
						type: 'tool-result' as const,
						toolCallId: 'tc-1',
						toolName: 'add',
						output: { type: 'json' as const, value: { result: 3 } },
					},
				],
			},
		];

		const n8nMessages = fromAiMessages(aiMessages);

		// Should produce a single assistant message with the resolved block
		expect(n8nMessages).toHaveLength(1);
		expect((n8nMessages[0] as Message).role).toBe('assistant');
		const block = (n8nMessages[0] as Message).content[0];
		expect(block.type).toBe('tool-call');
		expect((block as { state: string }).state).toBe('resolved');
		expect((block as { output: unknown }).output).toEqual({ result: 3 });
	});

	it('round-trip is structurally equivalent for a resolved tool-call', () => {
		const original: Message[] = [
			{
				role: 'assistant',
				content: [
					{
						type: 'tool-call',
						toolCallId: 'tc-1',
						toolName: 'echo',
						input: { text: 'hello' },
						state: 'resolved',
						output: { echoed: 'hello' },
					},
				],
			},
		];

		const aiMessages = toAiMessages(original);
		const roundTripped = fromAiMessages(aiMessages);

		expect(roundTripped).toHaveLength(1);
		expect((roundTripped[0] as Message).role).toBe('assistant');
		const block = (roundTripped[0] as Message).content[0];
		expect(block.type).toBe('tool-call');
		expect((block as { state: string }).state).toBe('resolved');
		expect((block as { output: unknown }).output).toEqual({ echoed: 'hello' });
		expect((block as { toolCallId: string }).toolCallId).toBe('tc-1');
	});

	it('interim-message ordering: tool-result is inserted right after its tool-call', () => {
		// This is the key regression test for the interim-message scenario.
		// Input n8n list: [assistant{tool-call resolved}, user{x}, assistant{y}]
		// Expected AI SDK output: [assistant{tc}, tool{tr}, user{x}, assistant{y}]
		const input: Message[] = [
			{
				role: 'assistant',
				content: [
					{
						type: 'tool-call',
						toolCallId: 'tc-1',
						toolName: 'delete_file',
						input: { path: 'foo.txt' },
						state: 'resolved',
						output: { deleted: true },
					},
				],
			},
			{
				role: 'user',
				content: [{ type: 'text', text: 'Actually, what is 2+2?' }],
			},
			{
				role: 'assistant',
				content: [{ type: 'text', text: 'It is 4.' }],
			},
		];

		const aiMessages = toAiMessages(input);

		// 4 messages: assistant{tool-call}, tool{tool-result}, user, assistant
		expect(aiMessages).toHaveLength(4);
		expect(aiMessages[0].role).toBe('assistant');
		expect(aiMessages[1].role).toBe('tool');
		expect(aiMessages[2].role).toBe('user');
		expect(aiMessages[3].role).toBe('assistant');

		// tool-result is immediately after the assistant tool-call message
		const toolResultContent = (aiMessages[1] as { content: Array<{ toolCallId: string }> })
			.content[0];
		expect(toolResultContent.toolCallId).toBe('tc-1');

		// user interim message is after the tool-result
		const userContent = (aiMessages[2] as { content: Array<{ type: string; text: string }> })
			.content[0];
		expect(userContent.text).toBe('Actually, what is 2+2?');
	});
});
