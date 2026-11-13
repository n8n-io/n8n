/** Loops with effects: for, while, do...while, break and continue. */
import { webhook, workflow } from '@n8n/workflow-lang';

export default workflow({
	triggers: [webhook<{ pages: number; skip: number[] }>({ path: 'loops' })],
	async run(ctx, trigger) {
		const seen: string[] = [];
		for (let page = 1; page <= trigger.body.pages; page++) {
			if (trigger.body.skip.includes(page)) continue;
			const res = await ctx.http<{ ids: string[]; last: boolean }>({
				name: 'Fetch page',
				method: 'GET',
				url: 'https://api.example.com/items',
				qs: { page },
			});
			for (const id of res.body.ids) seen.push(id);
			if (res.body.last) break;
		}
		let attempts = 0;
		let ready = false;
		while (!ready) {
			attempts++;
			const status = await ctx.http<{ state: string }>({
				name: 'Poll job',
				method: 'GET',
				url: 'https://api.example.com/job',
			});
			ready = status.body.state === 'done';
			if (!ready) await ctx.wait({ name: 'Back off', duration: 1000 * attempts });
		}
		let n = 0;
		do {
			n += 2;
		} while (n < 7);
		return { seen, attempts, n };
	},
});
