/** ctx.execution() and ctx.vars(): n8n's $execution and $vars. */
import { webhook, workflow } from '@n8n/workflow-lang';

export default workflow({
	triggers: [webhook({ path: 'exec' })],
	async run(ctx) {
		const ex = ctx.execution();
		const vars = ctx.vars();
		// Each call gives a fresh object.
		vars.region = 'changed';
		const again = ctx.vars();
		await ctx.http({
			name: 'Notify',
			method: 'POST',
			url: `${again.apiHost}/notify`,
			body: { id: ex.id, approve: ex.resumeUrl, form: ex.resumeFormUrl },
		});
		const answer = await ctx.approval({
			name: 'Approve',
			message: `Approve ${ex.id}?`,
			node: { type: 'n8n-nodes-base.slack', typeVersion: 2, parameters: { text: ex.resumeUrl } },
		});
		return {
			ex,
			region: again.region,
			keys: Object.keys(again),
			missing: again.nope ?? null,
			approved: answer.approved,
		};
	},
});
