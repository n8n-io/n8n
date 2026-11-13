/** JSON.stringify with nested, undefined and special values; JSON.parse. */
import { webhook, workflow } from '@n8n/workflow-lang';

export default workflow({
	triggers: [webhook<{ raw: string }>({ path: 'json' })],
	async run(ctx, trigger) {
		const fn = () => 1;
		const value = {
			a: 1,
			b: undefined,
			c: [1, undefined, fn, null, Number('x'), 1 / 0],
			d: { e: { f: [{ g: 'h' }] } },
			s: 'quote " backslash \\ newline \n tab \t bell \u0007 unicode é 😀 \u2028',
			fn,
			neg: -0,
		};
		const parsed = JSON.parse(trigger.body.raw);
		const out = {
			compact: JSON.stringify(value),
			indented: JSON.stringify({ x: [1, { y: 2 }], z: {}, w: [] }, null, 2),
			tabbed: JSON.stringify([1, [2]], null, '\t'),
			top: [
				JSON.stringify(undefined) === undefined,
				JSON.stringify(null),
				JSON.stringify('s'),
				JSON.stringify(1e21),
			],
			parsed,
			roundTrip: JSON.stringify(JSON.parse(JSON.stringify(value))),
		};
		await ctx.http({ name: 'Send', method: 'POST', url: 'https://api.example.com', body: value });
		return out;
	},
});
