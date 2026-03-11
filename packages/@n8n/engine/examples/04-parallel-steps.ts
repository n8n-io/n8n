/**
 * Parallel Steps Workflow
 *
 * Demonstrates parallel execution branches using `Promise.all`. Two
 * independent steps (API call and database query) run simultaneously,
 * then a merge step combines the results after both complete.
 */
import { defineWorkflow } from '@n8n/engine/sdk';

export default defineWorkflow({
	name: 'Parallel Steps',
	triggers: [], // Manual trigger is implicit — every workflow can be triggered manually
	async run(ctx) {
		const input = await ctx.step(
			{
				name: 'Prepare Search Query',
				icon: 'settings',
				color: '#6b7280',
				description: 'Prepares search input',
			},
			async () => {
				await new Promise((r) => setTimeout(r, 150)); // Simulate preparation
				return { query: 'n8n automation', timestamp: Date.now() };
			},
		);

		// These two steps have no dependency on each other — engine runs them in parallel
		const [apiResult, dbResult] = await Promise.all([
			ctx.step(
				{
					name: 'Call External API',
					icon: 'globe',
					color: '#3b82f6',
					description: 'Queries external API',
				},
				async () => {
					await new Promise((r) => setTimeout(r, 400)); // Simulate API call latency
					return { source: 'api', results: ['result-1', 'result-2'] };
				},
			),
			ctx.step(
				{
					name: 'Query Database',
					icon: 'database',
					color: '#8b5cf6',
					description: 'Queries local database',
				},
				async () => {
					await new Promise((r) => setTimeout(r, 300)); // Simulate database query
					return { source: 'db', results: ['record-a', 'record-b', 'record-c'] };
				},
			),
		]);

		// This step depends on both parallel steps — runs after both complete
		const merged = await ctx.step(
			{
				name: 'Merge All Results',
				icon: 'git-merge',
				color: '#22c55e',
				description: 'Combines all results',
			},
			async () => {
				await new Promise((r) => setTimeout(r, 200)); // Simulate merge processing
				return {
					query: input.query,
					totalResults: apiResult.results.length + dbResult.results.length,
					combined: [...apiResult.results, ...dbResult.results],
				};
			},
		);

		return merged;
	},
});
