/**
 * F35: Wait Form with ResumeUrl Callback
 *
 * Demonstrates pausing execution to wait for a form submission.
 * The original v4 fixture uses waitOnForm() to render a form and
 * pause until submission. In v3, we approximate with an approval
 * step since form rendering is not yet supported.
 */
import { defineWorkflow, webhook } from '@n8n/engine/sdk';

export default defineWorkflow({
	name: 'F35 - Wait Form Callback (Not supported yet)',
	triggers: [webhook('/f35-wait-form-callback', { method: 'POST' })],
	async run(ctx) {
		// --- UNSUPPORTED: Form rendering ---
		// The v3 engine does not yet support rendering forms to collect user input.
		// The source workflow uses waitOnForm({ formTitle, formDescription }) to
		// render a form and pause until submission.
		// This is approximated with an approval step, but the form UI
		// (title, description, fields) is not available.
		// Requires: a ctx.waitForForm() primitive or form support in approval steps.
		//
		// const formData = await ctx.waitForForm({
		//   formTitle: 'Approval Required',
		//   formDescription: 'Please approve this request',
		//   fields: [{ name: 'approved', type: 'boolean' }],
		// });
		//
		// --- END UNSUPPORTED ---

		const notifyResult = await ctx.step(
			{ name: 'Notify Approver', icon: 'send', color: '#f97316' },
			async () => {
				const res = await fetch('https://dummyjson.com/posts/add', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ formLink: 'placeholder-form-url' }),
				});
				return { notified: res.ok };
			},
		);

		// Approval step to simulate form waiting
		const approval = await ctx.approval(
			{ name: 'Wait for Approval', icon: 'clock', color: '#eab308' },
			async () => {
				return { context: 'Please approve this request' };
			},
		);

		const result = await ctx.step(
			{ name: 'Handle Response', icon: 'zap', color: '#22c55e' },
			async () => {
				return { handled: true, notifyResult, approval };
			},
		);

		return result;
	},
});
