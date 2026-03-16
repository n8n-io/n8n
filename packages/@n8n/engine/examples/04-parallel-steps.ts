/**
 * Parallel Steps Workflow
 *
 * Demonstrates parallel execution branches using `Promise.all`. Two
 * independent API calls (products and users) run simultaneously,
 * then a merge step combines the results after both complete.
 */
import { defineWorkflow } from '@n8n/engine/sdk';

export default defineWorkflow({
	name: '04 - Parallel Steps',
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
				return { query: 'phone', timestamp: Date.now() };
			},
		);

		// These two steps have no dependency on each other — engine runs them in parallel
		const [productsResult, usersResult] = await Promise.all([
			ctx.step(
				{
					name: 'Search Products',
					icon: 'globe',
					color: '#3b82f6',
					description: 'Searches products via DummyJSON',
				},
				async () => {
					const res = await fetch(`https://dummyjson.com/products/search?q=${input.query}&limit=3`);
					const data = (await res.json()) as {
						products: Array<{ title: string; price: number }>;
					};
					return {
						source: 'products' as const,
						results: data.products.map((p) => `${p.title} ($${p.price})`),
					};
				},
			),
			ctx.step(
				{
					name: 'Search Users',
					icon: 'database',
					color: '#8b5cf6',
					description: 'Searches users via DummyJSON',
				},
				async () => {
					const res = await fetch(`https://dummyjson.com/users/search?q=${input.query}&limit=3`);
					const data = (await res.json()) as {
						users: Array<{ firstName: string; lastName: string }>;
					};
					return {
						source: 'users' as const,
						results: data.users.map((u) => `${u.firstName} ${u.lastName}`),
					};
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
				return {
					query: input.query,
					totalResults: productsResult.results.length + usersResult.results.length,
					products: productsResult.results,
					users: usersResult.results,
				};
			},
		);

		return merged;
	},
});
