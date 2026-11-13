/** Approval, wait by duration and until, respond, ctx.now and ctx.random. */
import { webhook, workflow } from '@n8n/workflow-lang';

export default workflow({
	triggers: [
		webhook<{ amount: number; requester: string }>({ path: 'expense', respond: 'respondNode' }),
	],
	durability: 'steps',
	async run(ctx, trigger) {
		const started = ctx.now();
		const ticket = `EXP-${Math.floor(ctx.random() * 1e6)}`;
		await ctx.respond({
			name: 'Ack',
			status: 202,
			body: { ticket },
			headers: { 'x-ticket': ticket },
		});
		let approved = trigger.body.amount < 100;
		let approver = 'auto';
		if (!approved) {
			const decision = await ctx.approval({
				name: 'Manager approval',
				message: `${trigger.body.requester} asks for ${trigger.body.amount.toFixed(2)} EUR`,
				timeout: 86400000,
			});
			approved = decision.approved;
			approver = decision.by ?? 'unknown';
			if (decision.data?.comment) approver += ` (${String(decision.data.comment)})`;
		}
		await ctx.wait({ name: 'Cool down', duration: 60000 });
		const afterWait = ctx.now();
		await ctx.wait({ name: 'Until payday', until: started + 3600000 });
		await ctx.wait({ name: 'Past date', until: 5 });
		const rolls = [ctx.random(), ctx.random(), ctx.random()].map((r) => Math.floor(r * 100));
		return {
			ticket,
			approved,
			approver,
			waited: afterWait - started,
			end: ctx.now() - started,
			rolls,
		};
	},
});
