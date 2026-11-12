import { createReadHistoryTool, excerpt, indexOfIgnoreCase } from '../memory/history-recall-tool';
import { messageToText } from '../memory/message-text';
import type { BuiltMemory } from '../../types';
import type { AgentDbMessage } from '../../types/sdk/message';

describe('read_history excerpt', () => {
	const long = 'a'.repeat(10_000) + 'NEEDLE-123' + 'b'.repeat(10_000);

	it('returns short text whole', () => {
		expect(excerpt('short', 'short')).toEqual({ text: 'short', offset: 0, truncated: false });
	});

	it('centres a long message on the search match', () => {
		const result = excerpt(long, 'needle-123');
		expect(result.text).toContain('NEEDLE-123');
		expect(result.text).toHaveLength(4_000);
		expect(result.offset).toBe(8_000);
		expect(result.truncated).toBe(true);
	});

	it('keeps the excerpt inside the message when the match is near the end', () => {
		const text = 'a'.repeat(10_000) + 'END';
		const result = excerpt(text, 'end');
		expect(result.text.endsWith('END')).toBe(true);
		expect(result.text).toHaveLength(4_000);
	});

	it('starts at the beginning without a search', () => {
		expect(excerpt(long).offset).toBe(0);
	});

	// 'İ' lowercases to two code units, so folded indexes drift from the original.
	it('finds the match in the original text when lowercasing changes the length', () => {
		const text = 'İ'.repeat(5_000) + 'x'.repeat(3_000) + 'NEEDLE' + 'y'.repeat(5_000);
		const result = excerpt(text, 'needle');
		expect(result.text).toContain('NEEDLE');
		expect(result.offset).toBe(8_000 - 2_000);
	});

	it('maps folded matches back to the original index', () => {
		expect(indexOfIgnoreCase('İİabcNEEDLE', 'needle')).toBe(5);
		expect(indexOfIgnoreCase('İİabc', 'needle')).toBe(-1);
	});

	// Whole-string lowercasing turns a final 'Σ' into 'ς', not 'σ'.
	it('keeps contextual casing when lowercasing changes the length', () => {
		const text = 'İabc ΟΣ';
		const needle = 'ΟΣ'.toLowerCase();
		expect(text.toLowerCase().includes(needle)).toBe(true);
		expect(indexOfIgnoreCase(text, needle)).toBe(5);
	});
});

describe('read_history tool', () => {
	function message(id: string, text: string, minute: number): AgentDbMessage {
		return {
			id,
			createdAt: new Date(Date.UTC(2026, 10, 10, 12, minute)),
			role: 'user',
			content: [{ type: 'text', text }],
		} as AgentDbMessage;
	}

	function buildTool(messages: AgentDbMessage[]) {
		const getMessages = vi.fn(async () => messages);
		const tool = createReadHistoryTool({
			memory: { getMessages } as unknown as BuiltMemory,
			persistence: { threadId: 't-1', resourceId: 'r-1' },
		});
		const run = async (input: Record<string, unknown>) =>
			await (tool.handler as (input: unknown, ctx: unknown) => Promise<unknown>)(input, {});
		return { getMessages, run };
	}

	it('rejects an invalid before timestamp', async () => {
		const { run, getMessages } = buildTool([]);
		await expect(run({ before: 'not-a-date' })).rejects.toThrow('not a valid ISO timestamp');
		expect(getMessages).not.toHaveBeenCalled();
	});

	it('loads only the latest messages when there is no query', async () => {
		const { run, getMessages } = buildTool([message('m1', 'hello', 1)]);
		await run({ limit: 3 });
		expect(getMessages).toHaveBeenCalledWith('t-1', { resourceId: 'r-1', limit: 3 });
	});

	it('keeps older messages that share the cursor timestamp', async () => {
		const { run, getMessages } = buildTool([
			message('m1', 'one', 1),
			message('m2', 'two', 2),
			message('m3', 'three', 2),
			message('m4', 'four', 2),
		]);
		const before = new Date(Date.UTC(2026, 10, 10, 12, 2));
		const result = (await run({ before: before.toISOString(), beforeId: 'm3' })) as {
			messages: Array<{ id: string }>;
		};
		expect(getMessages).toHaveBeenCalledTimes(1);
		expect(getMessages).toHaveBeenCalledWith('t-1', {
			resourceId: 'r-1',
			before: new Date(before.getTime() + 1),
			limit: 30,
		});
		expect(result.messages.map((m) => m.id)).toEqual(['m1', 'm2']);
	});

	it('loads the whole prefix when the cursor is not in a full window', async () => {
		const many = Array.from({ length: 30 }, (_, i) => message(`n${i}`, 'same', 2));
		const { run, getMessages } = buildTool(many);
		const before = new Date(Date.UTC(2026, 10, 10, 12, 2));
		await run({ before: before.toISOString(), beforeId: 'missing' });
		expect(getMessages).toHaveBeenCalledTimes(2);
		expect(getMessages).toHaveBeenLastCalledWith('t-1', {
			resourceId: 'r-1',
			before: new Date(before.getTime() + 1),
		});
	});

	it('rejects beforeId without before', async () => {
		const { run, getMessages } = buildTool([]);
		await expect(run({ beforeId: 'm1' })).rejects.toThrow('needs "before"');
		expect(getMessages).not.toHaveBeenCalled();
	});

	it('loads the full thread when it searches', async () => {
		const { run, getMessages } = buildTool([message('m1', 'hello', 1)]);
		await run({ query: 'hello' });
		expect(getMessages).toHaveBeenCalledWith('t-1', { resourceId: 'r-1' });
	});
});

describe('messageToText', () => {
	it('leaves inline file bytes in tool outputs out of the text', () => {
		const text = messageToText({
			id: 'm1',
			createdAt: new Date(),
			role: 'assistant',
			content: [
				{
					type: 'tool-call',
					toolCallId: 'c1',
					toolName: 'screenshot',
					input: {},
					state: 'resolved',
					output: {
						type: 'content',
						value: [
							{ type: 'text', text: 'captured' },
							{ type: 'file', mediaType: 'image/png', data: 'QkFTRTY0'.repeat(1_000) },
						],
					},
				},
			],
		} as unknown as AgentDbMessage);
		expect(text).toContain('captured');
		expect(text).toContain('image/png');
		expect(text).not.toContain('QkFTRTY0');
	});
});
