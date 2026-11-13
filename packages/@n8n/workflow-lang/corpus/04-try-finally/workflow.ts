/** try/catch/finally around steps, with return, break and continue through finally. */
import { webhook, workflow } from '@n8n/workflow-lang';

export default workflow({
	triggers: [webhook<{ ids: number[] }>({ path: 'tf' })],
	async run(ctx, trigger) {
		const log: string[] = [];
		for (const id of trigger.body.ids) {
			try {
				if (id === 2) continue;
				const r = await ctx.http<{ ok: boolean }>({
					name: 'Process',
					method: 'POST',
					url: 'https://api.example.com/p',
					body: { id },
				});
				if (!r.body.ok) throw new Error(`not ok ${id}`);
				if (id === 4) break;
				log.push(`done ${id}`);
			} catch (e) {
				log.push(`caught ${e.name}: ${e.message}`);
			} finally {
				log.push(`finally ${id}`);
				await ctx.http({
					name: 'Audit',
					method: 'POST',
					url: 'https://audit.example.com',
					body: { id },
				});
			}
		}
		const nested = await lookup(log);
		return { log, nested };

		async function lookup(entries: string[]): Promise<string> {
			try {
				try {
					await ctx.http({ name: 'Lookup', method: 'GET', url: 'https://api.example.com/lookup' });
					return 'inner';
				} finally {
					entries.push('inner finally');
				}
			} finally {
				entries.push('outer finally');
			}
		}
	},
});
