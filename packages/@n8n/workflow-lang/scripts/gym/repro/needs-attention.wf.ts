/** Repro: a step that fails outside a try block. `wfrt` must send a `failed` step event with the error. */
import { webhook, workflow } from '@n8n/workflow-lang';

export default workflow({
	triggers: [webhook({ path: 'repro', method: 'POST' })],
	async run(ctx) {
		await ctx.http({ name: 'Call', method: 'GET', url: 'http://127.0.0.1:9/' });
		return { done: true };
	},
});
