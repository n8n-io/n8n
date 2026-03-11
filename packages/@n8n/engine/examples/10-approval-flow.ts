/**
 * Approval Flow Workflow
 *
 * Demonstrates human-in-the-loop approval steps that pause execution
 * until a human approves or declines. After the approval decision,
 * the workflow branches to either process a payment or send a
 * rejection notification.
 */
import { defineWorkflow } from '@n8n/engine/sdk';

export default defineWorkflow({
	name: 'Approval Flow',
	triggers: [], // Manual trigger is implicit — every workflow can be triggered manually
	async run(ctx) {
		const request = await ctx.step(
			{
				name: 'Prepare Expense Request',
				icon: 'clipboard',
				color: '#3b82f6',
				description: 'Creates expense request',
			},
			async () => {
				await new Promise((r) => setTimeout(r, 200)); // Simulate request preparation
				return { type: 'expense', amount: 5000, description: 'Conference tickets' };
			},
		);

		const approval = await ctx.step(
			{
				name: 'Await Manager Approval',
				icon: 'user-check',
				color: '#eab308',
				description: 'Waits for approval',
				stepType: 'approval',
			},
			async () => {
				await new Promise((r) => setTimeout(r, 100)); // Simulate setup
				// Engine detects this as an approval step and pauses
				return { requiresApproval: true, message: `Approve expense: $${request.amount}?` };
			},
		);

		if (approval.approved) {
			await ctx.step(
				{
					name: 'Process Payment',
					icon: 'credit-card',
					color: '#22c55e',
					description: 'Processes approved payment',
				},
				async () => {
					await new Promise((r) => setTimeout(r, 400)); // Simulate payment processing
					return { paid: true, reference: `PAY-${Date.now()}` };
				},
			);
		} else {
			await ctx.step(
				{
					name: 'Send Rejection Notice',
					icon: 'mail',
					color: '#ef4444',
					description: 'Notifies of rejection',
				},
				async () => {
					await new Promise((r) => setTimeout(r, 150)); // Simulate notification
					return { rejected: true, reason: 'Manager declined' };
				},
			);
		}
	},
});
