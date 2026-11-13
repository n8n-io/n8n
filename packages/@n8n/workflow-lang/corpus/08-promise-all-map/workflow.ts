/**
 * Promise.all over arr.map(async (x) => ...): branches interleave in run
 * queue order, the lowest failing index wins, and a try inside a branch
 * catches the failure of that branch.
 */
import { webhook, workflow } from '@n8n/workflow-lang';

interface Job {
	id: string;
	retries: number;
}

export default workflow({
	triggers: [webhook<{ jobs: Job[] }>({ path: 'map' })],
	async run(ctx, trigger) {
		const results = await Promise.all(
			trigger.body.jobs.map(async (job) => {
				const started = await ctx.http<{ token: string }>({
					name: 'Start',
					method: 'POST',
					url: 'https://jobs.example.com',
					body: { id: job.id },
				});
				let status = 'unknown';
				try {
					const done = await ctx.http<{ state: string }>({
						name: 'Finish',
						method: 'POST',
						url: `https://jobs.example.com/${started.body.token}`,
					});
					status = done.body.state;
				} catch (e) {
					status = `failed: ${e.message}`;
				}
				return `${job.id}=${status}`;
			}),
		);
		let firstError = '';
		try {
			await Promise.all(
				['x', 'y', 'z'].map(async (k) => {
					await ctx.http({ name: 'Check', method: 'GET', url: `https://check.example.com/${k}` });
					if (k !== 'x') throw new Error(`bad ${k}`);
					return k;
				}),
			);
		} catch (e) {
			firstError = e.message;
		}
		const empty = await Promise.all([].map(async (n: number) => n));
		return { results, firstError, empty };
	},
});
