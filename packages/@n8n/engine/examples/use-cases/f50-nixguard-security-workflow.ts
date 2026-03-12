/**
 * F50: NixGuard Security Workflow
 *
 * Demonstrates a security analysis workflow. Receives IP analysis
 * requests via webhook, executes a NixGuard security scan (simulated
 * as a sub-workflow), formats the AI summary, and optionally sends
 * a Slack alert for high-risk events.
 */
import { defineWorkflow, webhook } from '@n8n/engine/sdk';
import { z } from 'zod';

export default defineWorkflow({
	name: 'F50 - Nixguard Security Workflow (Requires credentials) (Not supported yet)',
	triggers: [
		webhook('/f50-nixguard-security', {
			method: 'POST',
			schema: {
				body: z.object({
					ip: z.string().optional(),
					chatInput: z.string().optional(),
				}),
			},
		}),
	],
	async run(ctx) {
		const config = await ctx.step({ name: 'Set API Key & Initial Prompt' }, async () => {
			const { body } = ctx.triggerData;
			return {
				apiKey: ctx.getSecret('NIXGUARD_API_KEY') ?? '',
				chatInput: body.chatInput ?? `Scan this ip for me ${body.ip ?? '0.0.0.0'}`,
			};
		});

		// --- UNSUPPORTED: ctx.triggerWorkflow() ---
		// The source workflow uses executeWorkflow() to run a NixGuard & Wazuh
		// sub-workflow. The v3 engine does not yet support ctx.triggerWorkflow().
		// Simulating the sub-workflow as a direct API call.
		//
		// const nixguardResult = await ctx.triggerWorkflow({
		//   workflowId: 'nixguard-wazuh-workflow',
		//   input: config,
		// });
		//
		// --- END UNSUPPORTED ---

		const nixguardResult = await ctx.step({ name: 'Execute NixGuard Analysis' }, async () => {
			const res = await fetch('https://dummyjson.com/posts/add', {
				method: 'POST',
				headers: {
					Authorization: `Bearer ${config.apiKey}`,
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({ prompt: config.chatInput }),
			});
			return (await res.json()) as { output: string };
		});

		const formatted = await ctx.step({ name: 'Format AI Summary' }, async () => {
			return { ai_summary: nixguardResult.output };
		});

		const slackAlert = await ctx.step({ name: 'Send Slack Alert' }, async () => {
			const slackToken = ctx.getSecret('SLACK_TOKEN') ?? '';
			const res = await fetch('https://slack.com/api/chat.postMessage', {
				method: 'POST',
				headers: {
					Authorization: `Bearer ${slackToken}`,
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					channel: '#security-alerts',
					text: `NixGuard IP Analysis\n\nAI Summary:\n${formatted.ai_summary}`,
				}),
			});
			return { sent: res.ok };
		});

		return { formatted, slackAlert };
	},
});
