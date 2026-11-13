/** ctx.trace: glue nodes report their output items when tracing is on. */
import { webhook, workflow } from '@n8n/workflow-lang';

interface Order {
	id: number;
	total: number;
	note?: string;
}

export default workflow({
	triggers: [webhook<{ orders: Order[] }>({ path: 'orders' })],
	async run(ctx, trigger) {
		const items = trigger.body.orders.map((o) => ({ json: o }));
		ctx.trace('Webhook', items);
		const big = items.filter((i) => i.json.total >= 100);
		const small = items.filter((i) => i.json.total < 100);
		ctx.trace('IF', [big, small]);
		const priced = await ctx.http({
			name: 'Price',
			method: 'POST',
			url: 'https://prices.example.com/quote',
			body: { ids: big.map((i) => i.json.id) },
		});
		const merged = big.map((i, n) => ({ json: { ...i.json, quote: priced.body, n } }));
		ctx.trace('Set', merged);
		// Values that JSON cannot hold: undefined, a function, NaN and a nested undefined.
		ctx.trace('Edge', undefined);
		ctx.trace('Edge', [undefined, () => 1, 0 / 0, { a: undefined, b: 'ü' }]);
		ctx.trace(`Loop ${merged.length}`, { count: merged.length });
		return { big: merged.length, small: small.length };
	},
});
