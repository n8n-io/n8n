/** The compiled httpRequest library node: array and object bodies, retry, caught failure. */
import { webhook, workflow } from '@n8n/workflow-lang';

export default workflow({
	triggers: [webhook<{ repo: string }>({ path: 'lib-http' })],
	credentials: { github: { type: 'githubApi' } },
	async run(ctx, trigger) {
		const issues = await ctx.node<{ number: number; title: string }>({
			name: 'List issues',
			type: 'n8n-nodes-base.httpRequest',
			typeVersion: 4,
			parameters: {
				method: 'GET',
				url: `https://api.github.com/repos/${trigger.body.repo}/issues`,
				qs: { state: 'open' },
			},
			credential: 'github',
		});
		const created = await ctx.node<{ id: number }>({
			name: 'Create comment',
			type: 'n8n-nodes-base.httpRequest',
			parameters: {
				method: 'POST',
				url: `https://api.github.com/repos/${trigger.body.repo}/issues/${issues[0].number}/comments`,
				headers: { accept: 'application/json' },
				body: { body: `Seen ${issues.length} issues` },
				sendBody: true,
			},
			credential: 'github',
			retry: { max: 1, delayMs: 100 },
		});
		let failure = '';
		try {
			await ctx.node({
				name: 'Ping',
				type: 'n8n-nodes-base.httpRequest',
				parameters: { url: 'https://status.example.com' },
			});
		} catch (e) {
			failure = `${e.name} at ${e.step}: ${e.message}`;
		}
		return { titles: issues.map((i) => i.title), commentId: created[0].id, failure };
	},
});
