/**
 * F50: NixGuard Security Workflow
 *
 * Demonstrates a security analysis workflow. Receives IP analysis
 * requests via webhook, executes a NixGuard security scan via
 * sub-workflow, formats the AI summary, and optionally sends a
 * Slack alert for high-risk events.
 */
import { defineWorkflow, webhook } from '@n8n/engine/sdk';
import { z } from 'zod';

export default defineWorkflow({
	name: 'F50 - Nixguard Security Workflow (Requires credentials)',
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
		const config = await ctx.step(
			{ name: 'Set API Key & Initial Prompt', icon: 'cog', color: '#6b7280' },
			async () => {
				const { body } = ctx.triggerData;
				return {
					apiKey: ctx.getSecret('NIXGUARD_API_KEY') ?? '',
					chatInput: body.chatInput ?? `Scan this ip for me ${body.ip ?? '0.0.0.0'}`,
				};
			},
		);

		const nixguardResult = await ctx.triggerWorkflow({
			workflow: '01 - Hello World',
			input: config,
		});

		const formatted = await ctx.step(
			{ name: 'Format AI Summary', icon: 'bot', color: '#ec4899' },
			async () => {
				const data = nixguardResult as Record<string, unknown>;
				return { ai_summary: data.output ?? nixguardResult };
			},
		);

		const slackAlert = await ctx.step(
			{ name: 'Send Slack Alert', icon: 'send', color: '#f97316' },
			async () => {
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
			},
		);

		return { formatted, slackAlert };
	},
});
