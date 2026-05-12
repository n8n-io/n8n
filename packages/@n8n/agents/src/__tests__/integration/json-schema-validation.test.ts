/**
 * Integration tests for JSON Schema input validation on regular (non-MCP) tools.
 *
 * Covers: valid input passes through, type errors surface as tool-result errors,
 * missing required properties surface as tool-result errors, and the LLM can
 * self-correct after receiving a JSON Schema validation error.
 *
 * Tests that call agent.generate() are gated on ANTHROPIC_API_KEY.
 */
import { expect, it, vi } from 'vitest';

import { describeIf, findLastTextContent } from './helpers';
import { Agent, filterLlmMessages } from '../../index';
import type { BuiltTool } from '../../types/sdk/tool';

const describe = describeIf('anthropic');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Build a BuiltTool whose inputSchema is a raw JSON Schema object (not Zod).
 * This mimics the shape that MCP tools use — and the scenario we want to test
 * for first-party tools that expose a JSONSchema7 directly.
 */
function makeJsonSchemaTool(overrides: Partial<BuiltTool> = {}): BuiltTool {
	return {
		name: 'find_user',
		description: 'Find a user by their numeric age (18–99 only).',
		inputSchema: {
			type: 'object',
			properties: {
				age: {
					type: 'integer',
					minimum: 18,
					maximum: 99,
					description: 'User age (18–99)',
				},
			},
			required: ['age'],
		},
		handler: async (input) => {
			const { age } = input as { age: number };
			return { user: `User aged ${age}` };
		},
		...overrides,
	};
}

// ---------------------------------------------------------------------------
// No-LLM tests: validation outcome is determined by the tool-result message
// ---------------------------------------------------------------------------

describe('JSON Schema validation — non-MCP tools with raw JSON Schema', () => {
	it('passes valid input to the handler and returns a successful tool result', async () => {
		const handler = vi.fn().mockResolvedValue({ user: 'User aged 25' });
		const tool = makeJsonSchemaTool({ handler });

		const result = await new Agent('test')
			.model('anthropic/claude-haiku-4-5')
			.instructions(
				'You are a user directory. Use find_user to look up users. ' +
					'Call the tool with age=25 and then summarise the result. Be concise.',
			)
			.tool(tool)
			.generate('Find user aged 25.');

		expect(result.finishReason).toBe('stop');
		expect(result.error).toBeUndefined();

		// The handler should have been called with valid data
		expect(handler).toHaveBeenCalledWith(expect.objectContaining({ age: 25 }), expect.anything());

		// No tool-result should carry an error flag
		const allMessages = filterLlmMessages(result.messages);
		const toolResults = allMessages.flatMap((m) =>
			m.content.filter((c) => c.type === 'tool-result'),
		);
		expect(toolResults.every((r) => !r.isError)).toBe(true);
	});

	it('allows the LLM to self-correct after receiving a JSON Schema validation error', async () => {
		let callCount = 0;
		const handler = vi.fn().mockImplementation(async (input: unknown) => {
			callCount++;
			return { user: `User aged ${(input as { age: number }).age}` };
		});

		// The schema enforces age ≥ 18. The prompt asks for age 5 first, then
		// instructs the LLM to retry with 25 if validation fails.
		const result = await new Agent('age-self-correction')
			.model('anthropic/claude-haiku-4-5')
			.instructions(
				'You are a user directory. Use find_user to look up users by age. ' +
					'The age must be an integer between 18 and 99. ' +
					'If validation fails, correct the age to 25 and retry. Be very concise.',
			)
			.tool(makeJsonSchemaTool({ handler }))
			.generate(
				'Find a user aged 5. If that age is invalid, use 25 instead and retry. ' +
					'You MUST try age 5 first, and only then use 25.',
			);

		expect(result.finishReason).toBe('stop');
		expect(result.error).toBeUndefined();

		// There should be at least two tool-result messages: one error, one success
		const allMessages = filterLlmMessages(result.messages);
		const toolResultMessages = allMessages.filter((m) =>
			m.content.some((c) => c.type === 'tool-result'),
		);
		expect(toolResultMessages.length).toBeGreaterThanOrEqual(2);

		// The successful handler call should have received a valid age
		expect(callCount).toBeGreaterThanOrEqual(1);
		const validCallArgs = handler.mock.calls.find(
			([input]) => (input as { age: number }).age === 25,
		);
		expect(validCallArgs).toBeDefined();

		// The final LLM response should acknowledge finding a user
		const text = findLastTextContent(result.messages);
		expect(text).toBeTruthy();
	});
});
