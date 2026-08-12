import { AIMessage, HumanMessage, ToolMessage } from '@langchain/core/messages';
import type { Command } from '@langchain/langgraph';

import { createIntrospectTool, extractIntrospectionEventsFromMessages } from '../introspect.tool';

/**
 * Helper to extract content from tool response (Command object with messages)
 */
function getResponseContent(result: unknown): string {
	const command = result as Command;
	const update = command?.update as { messages?: unknown[] } | undefined;
	const messages = update?.messages;
	if (messages?.[0]) {
		const msg = messages[0];
		if (msg instanceof ToolMessage) {
			return msg.content as string;
		}
		// Handle serialized format from test
		const serialized = msg as { kwargs?: { content?: string } };
		return serialized.kwargs?.content ?? '';
	}
	return typeof result === 'string' ? result : '';
}

describe('introspect.tool', () => {
	describe('createIntrospectTool', () => {
		it('should return success response for valid input', async () => {
			const { tool } = createIntrospectTool();

			const result = await tool.invoke({
				issue: 'Instructions were unclear about handling errors',
				category: 'missing_guidance',
				source: 'Error handling section',
			});

			const content = getResponseContent(result);
			expect(content).toContain('Diagnostic report received');
			expect(content).toContain('Category: missing_guidance');
		});

		it('should accept all valid categories', async () => {
			const { tool } = createIntrospectTool();
			const categories = [
				'conflicting_instructions',
				'missing_guidance',
				'unclear_node_description',
				'incomplete_example',
				'other',
			] as const;

			for (const category of categories) {
				const result = await tool.invoke({
					issue: 'Test issue',
					category,
				});

				const content = getResponseContent(result);
				expect(content).toContain(`Category: ${category}`);
			}
		});

		it('should work without optional source parameter', async () => {
			const { tool } = createIntrospectTool();

			const result = await tool.invoke({
				issue: 'Some issue without source',
				category: 'other',
			});

			const content = getResponseContent(result);
			expect(content).toContain('Diagnostic report received');
		});

		it('should throw error for empty issue', async () => {
			const { tool } = createIntrospectTool();

			await expect(
				tool.invoke({
					issue: '',
					category: 'other',
				}),
			).rejects.toThrow();
		});

		it('should throw error for invalid category', async () => {
			const { tool } = createIntrospectTool();

			await expect(
				tool.invoke({
					issue: 'Some issue',
					// @ts-expect-error Testing invalid category
					category: 'invalid_category',
				}),
			).rejects.toThrow();
		});

		it('should throw error for missing required fields', async () => {
			const { tool } = createIntrospectTool();

			// @ts-expect-error Testing missing required fields
			await expect(tool.invoke({})).rejects.toThrow();
		});
	});

	describe('extractIntrospectionEventsFromMessages', () => {
		it('should return empty array for empty messages', () => {
			const events = extractIntrospectionEventsFromMessages([]);

			expect(events).toEqual([]);
		});

		it('should return empty array for non-AI messages', () => {
			const messages = [new HumanMessage('Hello')];
			const events = extractIntrospectionEventsFromMessages(messages);

			expect(events).toEqual([]);
		});

		it('should return empty array for AI messages without tool calls', () => {
			const messages = [new AIMessage('Response without tools')];
			const events = extractIntrospectionEventsFromMessages(messages);

			expect(events).toEqual([]);
		});

		it('should extract introspect tool calls from AI messages', () => {
			const messages = [
				new AIMessage({
					content: '',
					tool_calls: [
						{
							id: 'call_1',
							name: 'introspect',
							args: {
								issue: 'Test issue',
								category: 'missing_guidance',
								source: 'Test source',
							},
						},
					],
				}),
			];

			const events = extractIntrospectionEventsFromMessages(messages);

			expect(events).toHaveLength(1);
			expect(events[0].issue).toBe('Test issue');
			expect(events[0].category).toBe('missing_guidance');
			expect(events[0].source).toBe('Test source');
			expect(events[0].timestamp).toBeDefined();
		});

		it('should ignore non-introspect tool calls', () => {
			const messages = [
				new AIMessage({
					content: '',
					tool_calls: [
						{
							id: 'call_1',
							name: 'add_nodes',
							args: { nodeType: 'test' },
						},
						{
							id: 'call_2',
							name: 'introspect',
							args: {
								issue: 'Real issue',
								category: 'other',
							},
						},
					],
				}),
			];

			const events = extractIntrospectionEventsFromMessages(messages);

			expect(events).toHaveLength(1);
			expect(events[0].issue).toBe('Real issue');
		});

		it('should extract multiple introspect events from multiple messages', () => {
			const messages = [
				new AIMessage({
					content: '',
					tool_calls: [
						{
							id: 'call_1',
							name: 'introspect',
							args: { issue: 'Issue 1', category: 'other' },
						},
					],
				}),
				new AIMessage({
					content: '',
					tool_calls: [
						{
							id: 'call_2',
							name: 'introspect',
							args: { issue: 'Issue 2', category: 'missing_guidance' },
						},
					],
				}),
			];

			const events = extractIntrospectionEventsFromMessages(messages);

			expect(events).toHaveLength(2);
			expect(events[0].issue).toBe('Issue 1');
			expect(events[1].issue).toBe('Issue 2');
		});

		it('should handle missing source gracefully', () => {
			const messages = [
				new AIMessage({
					content: '',
					tool_calls: [
						{
							id: 'call_1',
							name: 'introspect',
							args: { issue: 'No source', category: 'other' },
						},
					],
				}),
			];

			const events = extractIntrospectionEventsFromMessages(messages);

			expect(events).toHaveLength(1);
			expect(events[0].source).toBeUndefined();
		});

		it('should handle null/undefined args values gracefully', () => {
			const messages = [
				new AIMessage({
					content: '',
					tool_calls: [
						{
							id: 'call_1',
							name: 'introspect',
							args: { issue: null, category: undefined },
						},
					],
				}),
			];

			const events = extractIntrospectionEventsFromMessages(messages);

			expect(events).toHaveLength(1);
			expect(events[0].issue).toBe('');
			expect(events[0].category).toBe('other');
		});

		it('should handle object values by stringifying them', () => {
			const messages = [
				new AIMessage({
					content: '',
					tool_calls: [
						{
							id: 'call_1',
							name: 'introspect',
							args: {
								issue: { nested: 'object' },
								category: 'other',
							},
						},
					],
				}),
			];

			const events = extractIntrospectionEventsFromMessages(messages);

			expect(events).toHaveLength(1);
			expect(events[0].issue).toBe('{"nested":"object"}');
		});
	});
});
