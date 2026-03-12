/**
 * F19: Sub-Workflow
 *
 * Demonstrates executing a child workflow. The original v4 fixture
 * calls executeWorkflow() to generate a report. In v3,
 * ctx.triggerWorkflow() is not yet supported.
 */
import { defineWorkflow, webhook } from '@n8n/engine/sdk';

export default defineWorkflow({
	name: 'F19 - Sub Workflow (Not supported yet)',
	triggers: [webhook('/f19-sub-workflow', { method: 'POST' })],
	async run(ctx) {
		// --- UNSUPPORTED: ctx.triggerWorkflow() ---
		// The source workflow uses executeWorkflow() to run a child workflow
		// and get back report data. The v3 engine does not yet support
		// ctx.triggerWorkflow().
		// Requires: ctx.triggerWorkflow({ workflowId, input }) primitive.
		//
		// const reportData = await ctx.triggerWorkflow({
		//   workflowId: 'abc123',
		//   input: { type: 'monthly' },
		// });
		//
		// --- END UNSUPPORTED ---

		// Simulating sub-workflow execution with a step
		const reportData = await ctx.step({ name: 'Generate Report' }, async () => {
			return { reportData: 'Monthly Summary' };
		});

		const sent = await ctx.step({ name: 'Send Report' }, async () => {
			const res = await fetch('https://dummyjson.com/posts/add', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(reportData),
			});
			return { sent: res.ok };
		});

		return sent;
	},
});
