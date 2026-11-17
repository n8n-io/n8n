/**
 * Date values (spec section 4.5): `Date.value` gives a Date in a place without the type
 * Date, and each operation reads it as JavaScript reads a Date. `Date.of` gives its Date,
 * or the TypeError of JavaScript for a Date method of another value.
 */
import { webhook, workflow } from '@n8n/workflow-lang';

export default workflow({
	triggers: [webhook<{ times: number[]; texts: string[] }>({ path: 'date-values' })],
	async run(ctx, trigger) {
		const list: any[] = [];
		for (const t of trigger.body.times) list.push(Date.value(new Date(t)));
		for (const s of trigger.body.texts) list.push(Date.value(new Date(s)));
		const pass = (v: any): any => v;
		const holder: any = { first: pass(list[0]), nested: { all: list } };
		const read = () => holder.first;
		const describe = (v: any) => ({
			type: typeof v,
			truth: v ? 1 : 2,
			not: !v,
			nullish: v ?? 'none',
			plus: 'at ' + v,
			plusNumber: v + 1,
			template: `${v}`,
			text: String(v),
			joined: [v, 1].join('|'),
			minus: v - 5,
			times: v * 1,
			unary: +v,
			number: Number(v),
			nan: isNaN(v),
			max: Math.max(v, 5),
			less: v < 1700000000000,
			more: v >= 0,
			same: v === v,
			inList: [v].includes(v),
			json: JSON.stringify({ v, list: [v] }),
			time: Date.of(v, 'getTime', 'v.getTime').getTime(),
			day: Date.of(v, 'getUTCDay', 'v.getUTCDay').getUTCDay(),
			copy: new Date(v).getTime(),
			member: v.length === undefined,
			keys: Object.keys(v).length,
			is: [Date.is(v), Date.is(v.getTime), Date.is(1), Date.is('2020'), Date.is(null), Date.is({})],
		});
		const described = list.map((v) => describe(v));
		const errors: string[] = [];
		for (const v of [trigger.body.texts[0], 5, null, undefined, [1], { getTime: 1 }]) {
			try {
				errors.push(String(Date.of(v, 'getTime', 'v.getTime').getTime()));
			} catch (e) {
				errors.push(e.message);
			}
		}
		let iso = '';
		try {
			iso = Date.of(list[list.length - 1], 'toISOString', 'v.toISOString').toISOString();
		} catch (e) {
			iso = e.message;
		}
		await ctx.http({
			name: 'Store',
			method: 'POST',
			url: 'https://example.test/store',
			body: { first: read(), holder },
		});
		return {
			described,
			errors,
			iso,
			first: read(),
			holder,
			afterWait: describe(holder.nested.all[1]),
			identity: [read() === list[0], list[0] === list[1], holder.nested.all === list],
		};
	},
});
