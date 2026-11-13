/** Library nodes: the Slack port and the translated declarative Perplexity node. */
import { webhook, workflow } from '@n8n/workflow-lang';

export default workflow({
	triggers: [webhook<{ question: string; channel: string }>({ path: 'ask' })],
	credentials: { slack: { type: 'slackApi' }, perplexity: { type: 'perplexityApi' } },
	async run(ctx, trigger) {
		const [answer] = await ctx.node<{
			id?: string;
			results?: Array<{ title: string; url: string }>;
		}>({
			name: 'Search',
			type: 'n8n-nodes-base.perplexity',
			typeVersion: 3,
			parameters: {
				resource: 'search',
				operation: 'search',
				query: trigger.body.question,
				simplify: true,
				options: { maxResults: 3, searchDomainFilter: 'n8n.io, docs.n8n.io ,' },
			},
			credential: 'perplexity',
		});
		const links = (answer.results ?? []).map((r) => `• <${r.url}|${r.title}>`).join('\n');
		const [posted] = await ctx.node<{ message_timestamp: string }>({
			name: 'Post answer',
			type: 'n8n-nodes-base.slack',
			parameters: {
				resource: 'message',
				operation: 'post',
				channel: trigger.body.channel,
				text: `*${trigger.body.question}*\n${links}`,
			},
			credential: 'slack',
		});
		let unsupported = '';
		try {
			await ctx.node({
				name: 'Unsupported',
				type: 'n8n-nodes-base.slack',
				// A computed resource skips the compile-time check, so the library node rejects it at run time.
				parameters: { resource: String('channel'), operation: 'create' },
			});
		} catch (e) {
			unsupported = e.message;
		}
		return { searchId: answer.id, ts: posted.message_timestamp, unsupported };
	},
});
