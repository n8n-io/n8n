/**
 * F48: Gmail AI Summary to Telegram
 *
 * Demonstrates an email summarization pipeline: receives a new email
 * notification via webhook, prepares fields for AI summarization,
 * calls OpenAI to generate a summary, and sends it to Telegram.
 */
import { defineWorkflow, webhook } from '@n8n/engine/sdk';
import { z } from 'zod';

export default defineWorkflow({
	name: 'F48 - Gmail Ai Summary To Telegram (Requires credentials)',
	triggers: [
		webhook('/f48-gmail-ai-summary-to-telegram', {
			method: 'POST',
			schema: {
				body: z.object({
					from: z.string().optional(),
					subject: z.string().optional(),
					html: z.string().optional(),
					text: z.string().optional(),
				}),
			},
		}),
	],
	async run(ctx) {
		const emailData = await ctx.step({ name: 'Parse Email Data' }, async () => {
			const { body } = ctx.triggerData;
			return {
				summaryLanguage: 'english',
				from: body.from ?? 'Unknown sender',
				subject: body.subject ?? 'No subject',
				message: body.html ?? body.text ?? 'No message content available',
			};
		});

		const summary = await ctx.step({ name: 'AI Summary' }, async () => {
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
							role: 'system',
							content:
								"You summarize emails in a short, natural, and informal way. Use a casual tone, like you're talking to a friend. Include who sent the email, what it's about, and the most relevant details.",
						},
						{
							role: 'user',
							content: `Summarize the following email in ${emailData.summaryLanguage}:\n\nFrom: ${emailData.from}\nSubject: ${emailData.subject}\n\n${emailData.message}`,
						},
					],
				}),
			});
			const data = (await res.json()) as {
				choices: Array<{ message: { content: string } }>;
			};
			return { output: data.choices?.[0]?.message?.content ?? 'No summary generated' };
		});

		const sent = await ctx.step({ name: 'Send Summary to Telegram' }, async () => {
			const botToken = ctx.getSecret('TELEGRAM_BOT_TOKEN') ?? '';
			const chatId = ctx.getSecret('TELEGRAM_CHAT_ID') ?? '';
			const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					chat_id: chatId,
					text: summary.output,
					parse_mode: 'Markdown',
				}),
			});
			return { sent: res.ok };
		});

		return sent;
	},
});
