/** Promise.all over a list of ctx calls and async function calls. */
import { webhook, workflow } from '@n8n/workflow-lang';

export default workflow({
	triggers: [webhook<{ userId: string }>({ path: 'all' })],
	async run(ctx, trigger) {
		const id = trigger.body.userId;
		const loadOrders = async (limit: number) => {
			const first = await ctx.http<{ orders: string[] }>({
				name: 'Orders',
				method: 'GET',
				url: `https://shop.example.com/${id}/orders`,
				qs: { limit },
			});
			const more = await ctx.http<{ orders: string[] }>({
				name: 'More orders',
				method: 'GET',
				url: `https://shop.example.com/${id}/orders`,
				qs: { offset: limit },
			});
			return [...first.body.orders, ...more.body.orders];
		};
		const [profile, orders, , score] = await Promise.all([
			ctx.http<{ name: string }>({
				name: 'Profile',
				method: 'GET',
				url: `https://api.example.com/users/${id}`,
			}),
			loadOrders(2),
			ctx.wait({ name: 'Settle', duration: 50 }),
			ctx.code<{ score: number }>({ name: 'Score', code: 'return [{score: 1}]' }),
		]);
		let failed = 'no';
		try {
			await Promise.all([
				ctx.http({ name: 'Ping A', method: 'GET', url: 'https://a.example.com' }),
				ctx.http({ name: 'Ping B', method: 'GET', url: 'https://b.example.com' }),
				ctx.http({ name: 'Ping C', method: 'GET', url: 'https://c.example.com' }),
			]);
		} catch (e) {
			failed = e.message;
		}
		return { name: profile.body.name, orders, score: score[0].score, now: ctx.now(), failed };
	},
});
