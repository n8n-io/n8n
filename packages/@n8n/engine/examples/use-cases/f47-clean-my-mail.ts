/**
 * F47: Clean My Mail
 *
 * Demonstrates an email cleanup workflow that fetches spam, social,
 * and promotional emails from Gmail in parallel, combines them,
 * and deletes them all.
 */
import { defineWorkflow, webhook } from '@n8n/engine/sdk';

export default defineWorkflow({
	name: 'F47 - Clean My Mail (Requires credentials) (Not supported yet)',
	// --- UNSUPPORTED: Schedule trigger ---
	// The original workflow runs every 3 days on a schedule.
	// The v3 engine does not yet support cron/schedule triggers.
	// Using a webhook trigger as a substitute.
	// Requires: a schedule() or cron() trigger primitive.
	// --- END UNSUPPORTED ---
	triggers: [webhook('/f47-clean-my-mail', { method: 'POST' })],
	async run(ctx) {
		// Fetch all three email categories in parallel
		const [spam, social, promotions] = await Promise.all([
			ctx.step({ name: 'Fetch SPAM Emails', icon: 'mail', color: '#3b82f6' }, async () => {
				const token = ctx.getSecret('GMAIL_ACCESS_TOKEN') ?? '';
				const res = await fetch(
					'https://gmail.googleapis.com/gmail/v1/users/me/messages?labelIds=SPAM&maxResults=100',
					{ headers: { Authorization: `Bearer ${token}` } },
				);
				const data = (await res.json()) as {
					messages?: Array<{ id: string }>;
				};
				return data.messages ?? [];
			}),
			ctx.step({ name: 'Fetch Social Emails', icon: 'mail', color: '#3b82f6' }, async () => {
				const token = ctx.getSecret('GMAIL_ACCESS_TOKEN') ?? '';
				const res = await fetch(
					'https://gmail.googleapis.com/gmail/v1/users/me/messages?labelIds=CATEGORY_SOCIAL&maxResults=100',
					{ headers: { Authorization: `Bearer ${token}` } },
				);
				const data = (await res.json()) as {
					messages?: Array<{ id: string }>;
				};
				return data.messages ?? [];
			}),
			ctx.step({ name: 'Fetch Promotion Emails', icon: 'mail', color: '#3b82f6' }, async () => {
				const token = ctx.getSecret('GMAIL_ACCESS_TOKEN') ?? '';
				const res = await fetch(
					'https://gmail.googleapis.com/gmail/v1/users/me/messages?labelIds=CATEGORY_PROMOTIONS&maxResults=100',
					{ headers: { Authorization: `Bearer ${token}` } },
				);
				const data = (await res.json()) as {
					messages?: Array<{ id: string }>;
				};
				return data.messages ?? [];
			}),
		]);

		// Combine all email IDs
		const allEmails = await ctx.step(
			{ name: 'Combine All Emails', icon: 'layers', color: '#8b5cf6' },
			async () => {
				return [...spam, ...social, ...promotions];
			},
		);

		// Delete all emails
		const deleted = await ctx.step(
			{ name: 'Delete All Emails', icon: 'cog', color: '#ef4444' },
			async () => {
				const token = ctx.getSecret('GMAIL_ACCESS_TOKEN') ?? '';
				let deletedCount = 0;
				for (const email of allEmails) {
					await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${email.id}`, {
						method: 'DELETE',
						headers: { Authorization: `Bearer ${token}` },
					});
					deletedCount++;
				}
				return {
					deleted: deletedCount,
					spam: spam.length,
					social: social.length,
					promotions: promotions.length,
				};
			},
		);

		return deleted;
	},
});
