/** A schedule trigger: the slot time drives a report request and the result. */
import { schedule, workflow } from '@n8n/workflow-lang';

export default workflow({
	triggers: [
		schedule({ every: { unit: 'hours', value: 1, atMinute: 15 }, timezone: 'Europe/Berlin' }),
	],
	async run(ctx, trigger) {
		const hourMs = 60 * 60 * 1000;
		const slot = Math.floor(trigger.scheduledAt / hourMs);
		const from = trigger.scheduledAt - hourMs;
		const report = await ctx.http<{ count: number }>({
			name: 'Fetch report',
			method: 'GET',
			url: `https://reports.example.com/hourly?from=${from}&to=${trigger.scheduledAt}`,
		});
		const lagMs = ctx.now() - trigger.scheduledAt;
		return { slot, label: `slot-${slot % 24}`, count: report.body.count, lagMs };
	},
});
