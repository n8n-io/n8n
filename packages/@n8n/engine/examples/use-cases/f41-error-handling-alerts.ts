/**
 * F41: Error Handling Alerts
 *
 * Demonstrates an error-triggered workflow that logs errors to
 * Google Sheets, sends a Telegram notification, and emails an alert.
 * The original v4 fixture uses an errorTrigger. In v3, we use a
 * webhook that receives error data.
 */
import { defineWorkflow, webhook } from '@n8n/engine/sdk';
import { z } from 'zod';

export default defineWorkflow({
	name: 'F41 - Error Handling Alerts (Requires credentials)',
	triggers: [
		webhook('/f41-error-handling-alerts', {
			method: 'POST',
			schema: {
				body: z.object({
					workflow: z
						.object({
							name: z.string(),
						})
						.optional(),
					execution: z
						.object({
							url: z.string(),
							error: z.object({
								node: z.object({
									name: z.string(),
								}),
								message: z.string(),
							}),
						})
						.optional(),
				}),
			},
		}),
	],
	async run(ctx) {
		const errorData = await ctx.step({ name: 'Parse Error Data' }, async () => {
			const { body } = ctx.triggerData;
			return {
				workflowName: body.workflow?.name ?? 'Unknown',
				executionUrl: body.execution?.url ?? '',
				nodeName: body.execution?.error?.node?.name ?? 'Unknown',
				errorMessage: body.execution?.error?.message ?? 'Unknown error',
				timestamp: new Date().toLocaleString(),
			};
		});

		// Log to Google Sheets
		const logged = await ctx.step({ name: 'Log Error' }, async () => {
			const token = ctx.getSecret('GOOGLE_ACCESS_TOKEN') ?? '';
			const res = await fetch(
				'https://sheets.googleapis.com/v4/spreadsheets/SHEET_ID/values/Sheet1!A1:append?valueInputOption=RAW',
				{
					method: 'POST',
					headers: {
						Authorization: `Bearer ${token}`,
						'Content-Type': 'application/json',
					},
					body: JSON.stringify({
						values: [
							[
								errorData.timestamp,
								errorData.workflowName,
								errorData.executionUrl,
								errorData.nodeName,
								errorData.errorMessage,
								'NEW',
							],
						],
					}),
				},
			);
			return { logged: res.ok };
		});

		// Send Telegram notification
		const notified = await ctx.step({ name: 'Notify in Channel' }, async () => {
			const botToken = ctx.getSecret('TELEGRAM_BOT_TOKEN') ?? '';
			const chatId = ctx.getSecret('TELEGRAM_CHAT_ID') ?? '';
			const message = `New bug in n8n\n\nWorkflow: ${errorData.workflowName}\nExecution URL: ${errorData.executionUrl}\nNode: ${errorData.nodeName}\nError: ${errorData.errorMessage}`;

			const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ chat_id: chatId, text: message }),
			});
			return (await res.json()) as Record<string, unknown>;
		});

		// Send email alert
		const emailed = await ctx.step({ name: 'Send Email' }, async () => {
			const token = ctx.getSecret('GMAIL_ACCESS_TOKEN') ?? '';
			const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
				method: 'POST',
				headers: {
					Authorization: `Bearer ${token}`,
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					raw: btoa(
						`Subject: New n8n bug in "${errorData.workflowName}"\n\n${errorData.errorMessage}`,
					),
				}),
			});
			return { emailed: res.ok };
		});

		return { logged, notified, emailed };
	},
});
