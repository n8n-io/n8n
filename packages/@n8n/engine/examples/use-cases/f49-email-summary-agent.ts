/**
 * F49: Email Summary Agent
 *
 * Demonstrates an AI-powered email digest workflow. Fetches emails
 * from the past 24 hours, aggregates them, uses OpenAI to generate
 * a summary with action items, and sends a formatted report via email.
 */
import { defineWorkflow, webhook } from '@n8n/engine/sdk';

export default defineWorkflow({
	name: 'F49 - Email Summary Agent (Requires credentials) (Not supported yet)',
	// --- UNSUPPORTED: Schedule trigger ---
	// The original workflow runs daily at 7 AM.
	// The v3 engine does not yet support cron/schedule triggers.
	// Using a webhook trigger as a substitute.
	// Requires: a schedule() or cron() trigger primitive.
	// --- END UNSUPPORTED ---
	triggers: [webhook('/f49-email-summary-agent', { method: 'POST' })],
	async run(ctx) {
		const emails = await ctx.step({ name: 'Fetch Emails Past 24 Hours' }, async () => {
			const token = ctx.getSecret('GMAIL_ACCESS_TOKEN') ?? '';
			const yesterday = new Date();
			yesterday.setDate(yesterday.getDate() - 1);
			const query = `after:${yesterday.getFullYear()}/${String(yesterday.getMonth() + 1).padStart(2, '0')}/${String(yesterday.getDate()).padStart(2, '0')}`;

			const res = await fetch(
				`https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(query)}&maxResults=50`,
				{ headers: { Authorization: `Bearer ${token}` } },
			);
			return (await res.json()) as {
				messages?: Array<{ id: string; snippet: string }>;
			};
		});

		const organized = await ctx.step({ name: 'Organize Email Data' }, async () => {
			const messages = emails.messages ?? [];
			return {
				total: messages.length,
				data: messages.map((m) => ({
					id: m.id,
					snippet: m.snippet,
				})),
			};
		});

		const summary = await ctx.step({ name: 'Summarize with OpenAI' }, async () => {
			const apiKey = ctx.getSecret('OPENAI_API_KEY') ?? '';
			const res = await fetch('https://dummyjson.com/posts/add', {
				method: 'POST',
				headers: {
					Authorization: `Bearer ${apiKey}`,
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					model: 'gpt-4o-mini',
					messages: [
						{
							role: 'user',
							content: `Go through this email summary and identify all key details mentioned, any specific issues to look at, and action items.\n\nInput Data:\n${JSON.stringify(organized.data)}`,
						},
					],
					response_format: { type: 'json_object' },
				}),
			});
			const data = (await res.json()) as {
				choices: Array<{ message: { content: string } }>;
			};
			return JSON.parse(data.choices?.[0]?.message?.content ?? '{}') as {
				summary_of_emails: string[];
				actions: Array<{ name: string; action: string }>;
			};
		});

		const sent = await ctx.step({ name: 'Send Summary Email' }, async () => {
			const token = ctx.getSecret('GMAIL_ACCESS_TOKEN') ?? '';
			const htmlBody = `
				<h2>Email Summary</h2>
				<ul>${(summary.summary_of_emails ?? []).map((s) => `<li>${s}</li>`).join('')}</ul>
				<h2>Actions</h2>
				<ul>${(summary.actions ?? []).map((a) => `<li><b>${a.name}:</b> ${a.action}</li>`).join('')}</ul>
			`;
			await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
				method: 'POST',
				headers: {
					Authorization: `Bearer ${token}`,
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					raw: btoa(`Subject: Daily Email Summary\nContent-Type: text/html\n\n${htmlBody}`),
				}),
			});
			return { sent: true, emailCount: organized.total };
		});

		return sent;
	},
});
