/**
 * Example 23: Agent with Tools
 *
 * Demonstrates an agent step that uses custom tools.
 * The agent can call tools to perform actions (web search, calculation, etc.)
 * as part of its reasoning loop before producing a final answer.
 */
import { defineWorkflow } from '@n8n/engine/sdk';
import { Agent, Tool } from '@n8n/agents';
import { z } from 'zod';

const calculatorTool = new Tool('calculator')
	.description('Evaluate a mathematical expression')
	.input(z.object({ expression: z.string() }))
	.handler(async ({ expression }) => {
		// eslint-disable-next-line @typescript-eslint/no-implied-eval
		const result = new Function(`return (${expression})`)();
		return { result: Number(result) };
	});

const lookupTool = new Tool('product_lookup')
	.description('Look up a product price by name')
	.input(z.object({ name: z.string() }))
	.handler(async ({ name }) => {
		const prices: Record<string, number> = {
			laptop: 999,
			keyboard: 79,
			mouse: 49,
			monitor: 349,
		};
		return { name, price: prices[name.toLowerCase()] ?? 0, currency: 'USD' };
	});

export default defineWorkflow({
	name: 'Agent with Tools',
	async run(ctx) {
		const request = await ctx.step({ name: 'Get Request' }, async () => ({
			query: 'How much would it cost to buy a laptop, keyboard, and mouse? Calculate the total.',
		}));

		const result = await ctx.agent(
			new Agent('shopping-assistant')
				.model('anthropic', 'claude-sonnet-4-5')
				.instructions(
					'You are a shopping assistant. Use the product_lookup tool to find prices, ' +
						'then use the calculator tool to compute totals. Be precise.',
				)
				.tool(calculatorTool)
				.tool(lookupTool),
			request.query,
		);

		return await ctx.step({ name: 'Format Invoice' }, async () => ({
			query: request.query,
			answer: result.output,
			toolsUsed: result.toolCalls?.map((tc) => tc.tool),
			totalTokens: result.usage?.totalTokens,
		}));
	},
});
