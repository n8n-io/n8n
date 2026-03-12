/**
 * F34: Wait Webhook with ResumeUrl Callback
 *
 * Demonstrates pausing execution until an external service calls
 * back via a generated URL. The pre-wait step notifies an external
 * service with the resume URL, and the workflow pauses until that
 * URL is called.
 */
import { defineWorkflow, webhook } from '@n8n/engine/sdk';

export default defineWorkflow({
	name: 'F34 - Wait Webhook Callback (Not supported yet)',
	triggers: [webhook('/f34-wait-webhook-callback', { method: 'POST' })],
	async run(ctx) {
		// --- UNSUPPORTED: Wait for external webhook callback ---
		// The v3 engine does not yet support pausing execution until an external
		// service calls back via a generated URL. This requires a
		// ctx.waitForWebhook() primitive that:
		// - generates a unique callback URL (resumeUrl)
		// - pauses the workflow step
		// - resumes with the callback request data when the URL is called
		//
		// await ctx.waitForWebhook({
		//   name: 'Wait for External Callback',
		//   beforeWait: async (resumeUrl) => {
		//     await fetch('https://dummyjson.com/posts/add', {
		//       method: 'POST',
		//       headers: { 'Content-Type': 'application/json' },
		//       body: JSON.stringify({ callback: resumeUrl }),
		//     });
		//   },
		// });
		//
		// --- END UNSUPPORTED ---

		const notifyResult = await ctx.step({ name: 'Notify Service' }, async () => {
			const res = await fetch('https://dummyjson.com/posts/add', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ callback: 'placeholder-resume-url' }),
			});
			return { notified: res.ok };
		});

		// Simulating wait with sleep
		await ctx.sleep(5000);

		const result = await ctx.step({ name: 'Process Result' }, async () => {
			return { processed: true, notifyResult };
		});

		return result;
	},
});
