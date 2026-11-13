/** Object key order with integer-like keys, spread, delete and in. */
import { webhook, workflow } from '@n8n/workflow-lang';

export default workflow({
	triggers: [webhook<Record<string, number>>({ path: 'keys' })],
	async run(ctx, trigger) {
		const obj: Record<string, unknown> = {
			b: 1,
			2: 'two',
			a: 2,
			1: 'one',
			'-1': 'neg',
			'01': 'lead',
			4294967295: 'max',
			4294967294: 'idx',
			'1.5': 'frac',
		};
		obj.z = 0;
		obj['0'] = 'zero';
		delete obj.b;
		obj.b = 'again';
		const merged = { ...trigger.body, x: 1, ...{ 10: 'ten', y: 2 } };
		const assigned = Object.assign({}, { m: 1 }, { 3: 'c', m: 2 });
		const arr: Record<string, number> = {};
		for (const k of ['c', '5', 'a', '3']) arr[k] = k.length;
		const counts = Object.entries(trigger.body).map(([k, v]) => `${k}:${v}`);
		await ctx.http({ name: 'Save', method: 'POST', url: 'https://api.example.com', body: obj });
		return {
			keys: Object.keys(obj),
			values: Object.values(merged),
			merged,
			assigned,
			arr,
			counts,
			has: ['a' in obj, 'b' in obj, 'q' in obj, 1 in obj],
			json: JSON.stringify(obj),
		};
	},
});
