/**
 * Think Tool
 *
 * A no-op tool that gives the LLM a structured place to reason between tool calls.
 * When extended thinking is enabled, the model's native thinking block handles
 * pre-response reasoning. But mid-response reasoning (between tool calls) needs
 * a dedicated tool to prevent thinking from leaking into visible output tokens.
 *
 * See: https://www.anthropic.com/engineering/claude-think-tool
 */

import { tool } from '@langchain/core/tools';
import { z } from 'zod';

/**
 * Create a think tool for structured mid-response reasoning.
 *
 * The tool is a no-op — it simply acknowledges the thought. Its purpose is to
 * give the model a structured place to reason about tool results and plan next
 * steps without that reasoning appearing in the visible output.
 */
export function createThinkTool() {
	return tool(
		async (_input: { thought: string }) => {
			return 'Thought recorded.';
		},
		{
			name: 'think',
			description:
				'Use this tool to reason about tool results, plan your next step, or analyze information. Your thought will not be shown to the user.',
			schema: z.object({
				thought: z.string().describe('Your internal reasoning or analysis'),
			}),
		},
	);
}
