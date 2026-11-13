/** Branches: if/else chains and switch with fallthrough and default. */
import { webhook, workflow } from '@n8n/workflow-lang';

interface Ticket {
	id: number;
	priority: string;
	tags: string[];
}

export default workflow({
	triggers: [webhook<{ tickets: Ticket[] }>({ path: 'tickets' })],
	async run(ctx, trigger) {
		const routed: string[] = [];
		for (const t of trigger.body.tickets) {
			let queue: string;
			switch (t.priority) {
				case 'p0':
				case 'p1':
					queue = 'urgent';
					await ctx.http({
						name: 'Page on-call',
						method: 'POST',
						url: 'https://pager.example.com',
						body: { id: t.id },
					});
					break;
				case 'p2':
					queue = 'normal';
					break;
				default:
					queue = 'backlog';
			}
			if (t.tags.includes('billing')) {
				queue = `${queue}-billing`;
			} else if (t.tags.length === 0) {
				queue += '-untagged';
			} else {
				await ctx.code({
					name: 'Classify',
					code: 'return items',
					items: [{ id: t.id, tags: t.tags }],
				});
			}
			routed.push(`${t.id}:${queue}`);
		}
		return routed;
	},
});
