/**
 * Effect failures caught as NodeError: in the same function, in a caller
 * frame, and with retries.
 */
import { webhook, workflow, type Ctx } from '@n8n/workflow-lang';

async function fetchRate(ctx: Ctx, currency: string): Promise<number> {
	const res = await ctx.http<{ rate: number }>({
		name: 'Fetch rate',
		method: 'GET',
		url: `https://fx.example.com/${currency}`,
	});
	return res.body.rate;
}

export default workflow({
	triggers: [webhook<{ currencies: string[] }>({ path: 'fx' })],
	async run(ctx, trigger) {
		const rates: Record<string, number | string> = {};
		for (const c of trigger.body.currencies) {
			try {
				rates[c] = await fetchRate(ctx, c);
			} catch (err) {
				rates[c] = `${err.name}@${err.step}: ${err.message}`;
			}
		}
		let fallback = 'none';
		try {
			const items = await ctx.node<{ value: number }>({
				name: 'Legacy node',
				type: 'n8n-nodes-community.legacy',
				parameters: { mode: 'x' },
				retry: { max: 2, delayMs: 10 },
			});
			fallback = `ok ${items.length}`;
		} catch (e) {
			fallback = e.message;
		}
		const error = new Error();
		const typed = new TypeError('bad type');
		return { rates, fallback, error, typed };
	},
});
