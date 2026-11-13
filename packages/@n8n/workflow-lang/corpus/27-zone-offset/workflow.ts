/**
 * `Date.zoneOffset` (spec section 4.5): offsets of IANA time zones from the
 * TZif data that the runtime loads for META `zones`, across DST changes.
 */
import { webhook, workflow } from '@n8n/workflow-lang';

export default workflow({
	triggers: [webhook<{ times: number[] }>({ path: 'zone-offset' })],
	zones: [
		'America/New_York',
		'Europe/Berlin',
		'Australia/Sydney',
		'Asia/Kolkata',
		'America/Sao_Paulo',
	],
	async run(ctx, trigger) {
		const zones = [
			'America/New_York',
			'Europe/Berlin',
			'Australia/Sydney',
			'Asia/Kolkata',
			'America/Sao_Paulo',
			'UTC',
		];
		const out: Record<string, number[]> = {};
		for (const z of zones) out[z] = trigger.body.times.map((t) => Date.zoneOffset(z, t));
		let error = '';
		try {
			Date.zoneOffset('Mars/Olympus', 0);
		} catch (e) {
			error = e.message;
		}
		await ctx.http({ name: 'Store', method: 'POST', url: 'https://example.test/store', body: out });
		return { out, error };
	},
});
