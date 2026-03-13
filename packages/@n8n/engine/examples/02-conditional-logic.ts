/**
 * Conditional Logic Workflow
 *
 * Demonstrates if/else branching based on step output. Fetches a random
 * product from DummyJSON and routes to either a high-value alert or a
 * normal log step depending on whether the price exceeds $100.
 */
import { defineWorkflow } from '@n8n/engine/sdk';

interface Product {
	id: number;
	title: string;
	price: number;
	category: string;
}

export default defineWorkflow({
	name: '02 - Conditional Logic',
	triggers: [], // Manual trigger is implicit — every workflow can be triggered manually
	async run(ctx) {
		const data = await ctx.step(
			{
				name: 'Fetch Random Product',
				icon: 'shuffle',
				color: '#3b82f6',
				description: 'Fetches a random product from DummyJSON',
			},
			async () => {
				const id = Math.ceil(Math.random() * 100);
				const res = await fetch(`https://dummyjson.com/products/${id}`);
				const product = (await res.json()) as Product;
				return { product: product.title, amount: product.price, category: product.category };
			},
		);

		if (data.amount > 100) {
			await ctx.step(
				{
					name: 'Send High Value Alert',
					icon: 'alert-triangle',
					color: '#ef4444',
					description: 'Alert for products over $100',
				},
				async () => {
					return {
						alert: true,
						message: `High value product: "${data.product}" at $${data.amount} (${data.category})`,
					};
				},
			);
		} else {
			await ctx.step(
				{
					name: 'Log Normal Product',
					icon: 'file-text',
					color: '#6b7280',
					description: 'Logs products under $100',
				},
				async () => {
					return {
						alert: false,
						message: `Normal product: "${data.product}" at $${data.amount} (${data.category})`,
					};
				},
			);
		}

		return data;
	},
});
