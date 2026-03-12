/**
 * F08: API Fundamentals Tutorial
 *
 * Demonstrates various HTTP request patterns: GET, POST, query params,
 * headers, authentication, and timeouts. The original v4 fixture had
 * 5 webhook triggers simulating a restaurant API tutorial. In v3,
 * this is consolidated into a single webhook that demonstrates the
 * key API patterns sequentially.
 */
import { defineWorkflow, webhook } from '@n8n/engine/sdk';

export default defineWorkflow({
	name: 'F08 - Api Fundamentals (Requires credentials)',
	triggers: [webhook('/f08-api-fundamentals', { method: 'POST' })],
	async run(ctx) {
		const config = await ctx.step({ name: 'Configuration' }, async () => {
			return {
				baseUrl: 'https://dummyjson.com',
				apiKey: 'super-secret-key',
			};
		});

		// 1. Simple GET request
		const menuData = await ctx.step({ name: 'GET Menu Item' }, async () => {
			const res = await fetch(`${config.baseUrl}/products/1`);
			return (await res.json()) as Record<string, unknown>;
		});

		// 2. GET with query parameters
		const orderData = await ctx.step({ name: 'GET with Query Params' }, async () => {
			const url = new URL(`${config.baseUrl}/products/search`);
			url.searchParams.set('q', 'pizza');
			const res = await fetch(url.toString());
			return (await res.json()) as Record<string, unknown>;
		});

		// 3. POST with body
		const reviewResult = await ctx.step({ name: 'POST with Body' }, async () => {
			const res = await fetch(`${config.baseUrl}/posts/add`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ comment: 'The pizza was amazing!', rating: 5 }),
			});
			return (await res.json()) as Record<string, unknown>;
		});

		// 4. GET with headers/auth
		const secretDish = await ctx.step({ name: 'GET with Headers/Auth' }, async () => {
			const res = await fetch(`${config.baseUrl}/recipes?limit=1`, {
				headers: { 'x-api-key': config.apiKey },
			});
			return (await res.json()) as Record<string, unknown>;
		});

		// 5. Request with timeout
		const slowResponse = await ctx.step({ name: 'Request with Timeout' }, async () => {
			const controller = new AbortController();
			const timeout = setTimeout(() => controller.abort(), 2000);
			try {
				const res = await fetch(`${config.baseUrl}/quotes/random`, {
					signal: controller.signal,
				});
				return (await res.json()) as Record<string, unknown>;
			} finally {
				clearTimeout(timeout);
			}
		});

		return { menuData, orderData, reviewResult, secretDish, slowResponse };
	},
});
