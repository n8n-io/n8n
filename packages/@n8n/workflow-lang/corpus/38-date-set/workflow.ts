/**
 * A setter of a Date value (spec section 4.5): `Date.set` stores the new time in the Date
 * value, and each reference to the value reads it, also after a wait.
 */
import { webhook, workflow } from '@n8n/workflow-lang';

export default workflow({
	triggers: [webhook<{ times: number[] }>({ path: 'date-set' })],
	async run(ctx, trigger) {
		const list: any[] = trigger.body.times.map((t) => Date.value(new Date(t)));
		const first: any = list[0];
		const holder: any = { first, all: list };
		const before = JSON.stringify(holder);
		const setHours = (v: any, hours: number): number => {
			let d = new Date(Date.of(v, 'setUTCHours', 'v.setUTCHours'));
			d.setUTCHours(hours);
			return Date.set(v, d.getTime());
		};
		const results = [
			setHours(first, 5),
			Date.set(list[1], 86400000),
			Date.set(list[2], Number('no number')),
			Date.set(list[3], 8640000000000001),
			Date.set(list[4], 1.9),
		];
		const errors: string[] = [];
		for (const v of [5, 'text', null, undefined, {}, [1]]) {
			try {
				errors.push(String(Date.set(v, 1)));
			} catch (e) {
				errors.push(e.message);
			}
		}
		await ctx.http({
			name: 'Store',
			method: 'POST',
			url: 'https://example.test/store',
			body: { holder },
		});
		return {
			before,
			results,
			holder,
			same: [holder.first === list[0], first === list[0], list[0] === list[1]],
			text: `${first}`,
			time: +first,
			afterWait: list.map((v) => Date.of(v, 'getTime', 'v.getTime').getTime()),
			errors,
		};
	},
});
