/**
 * Example 22: Agent Step
 *
 * Demonstrates using an AI agent as a workflow step.
 * The agent receives input from a preceding step and its output
 * flows to successor steps — just like any other step.
 */
import { defineWorkflow } from '@n8n/engine/sdk';
import { Agent } from '@n8n/agents';

export default defineWorkflow({
	name: 'Agent Step',
	async run(ctx) {
		const prep = await ctx.step({ name: 'Prepare Question' }, async () => ({
			question: 'What are the key benefits of TypeScript?',
		}));

		const answer = await ctx.agent(
			new Agent('programming-assistant')
				.model('anthropic', 'claude-sonnet-4-5')
				.instructions('You are a helpful programming assistant. Be concise.'),
			prep.question,
		);

		return await ctx.step({ name: 'Format Response' }, async () => ({
			question: prep.question,
			answer: answer.output,
			tokensUsed: answer.usage?.totalTokens,
		}));
	},
});
