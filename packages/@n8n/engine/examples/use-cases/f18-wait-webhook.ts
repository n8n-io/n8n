/**
 * F18: Wait for Webhook
 *
 * Demonstrates a pause-and-resume pattern. The original v4 fixture
 * uses waitOnWebhook() to pause execution until an external callback.
 * In v3, the wait-for-webhook capability is not yet supported.
 */
import { defineWorkflow, webhook } from '@n8n/engine/sdk';

export default defineWorkflow({
	name: 'F18 - Wait Webhook (Not supported yet)',
	triggers: [webhook('/f18-wait-webhook', { method: 'POST' })],
	async run(ctx) {
		const startResult = await ctx.step({ name: 'Start Request' }, async () => {
			const res = await fetch('https://dummyjson.com/posts/add', { method: 'POST' });
			return { started: res.ok };
		});

		// --- UNSUPPORTED: Wait for external webhook callback ---
		// The v3 engine does not yet support pausing execution until an external
		// service calls back via a generated URL. This requires a
		// ctx.waitForWebhook() primitive that:
		// - generates a unique callback URL
		// - pauses the workflow step
		// - resumes with the callback request data when the URL is called
		//
		// await ctx.waitForWebhook({
		//   name: 'Wait for External Callback',
		//   beforeWait: async (resumeUrl) => {
		//     await fetch('https://dummyjson.com/posts/add', {
		//       method: 'POST',
		//       body: JSON.stringify({ callback: resumeUrl }),
		//     });
		//   },
		// });
		//
		// --- END UNSUPPORTED ---

		// Simulating a wait with sleep
		await ctx.sleep(5000);

		const afterResume = await ctx.step({ name: 'After Resume' }, async () => {
			return { resumed: true, startResult };
		});

		return afterResume;
	},
});
