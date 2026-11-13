/** An effect failure outside any try region moves the execution to needs_attention. */
import { webhook, workflow } from '@n8n/workflow-lang';

export default workflow({
	triggers: [webhook<{ user: string }>({ path: 'uncaught' })],
	async run(ctx, trigger) {
		const profile = await ctx.http<{ name: string }>({
			name: 'Load profile',
			method: 'GET',
			url: `https://api.example.com/users/${trigger.body.user}`,
		});
		try {
			await ctx.http({ name: 'Optional enrich', method: 'GET', url: 'https://enrich.example.com' });
		} catch {
			// The enrich step is optional.
		}
		await ctx.http({
			name: 'Sync CRM',
			method: 'POST',
			url: 'https://crm.example.com',
			body: { name: profile.body.name },
		});
		return 'unreachable';
	},
});
