/**
 * F44: SSL Expiry Alert
 *
 * Demonstrates a monitoring workflow that checks SSL certificates
 * and sends alerts when they're about to expire. The original v4
 * fixture uses a weekly schedule trigger.
 */
import { defineWorkflow, webhook } from '@n8n/engine/sdk';

export default defineWorkflow({
	name: 'F44 - Ssl Expiry Alert (Requires credentials) (Not supported yet)',
	// --- UNSUPPORTED: Schedule trigger ---
	// The original workflow runs on a weekly schedule (Monday at 8 AM).
	// The v3 engine does not yet support cron/schedule triggers.
	// Using a webhook trigger as a substitute.
	// Requires: a schedule() or cron() trigger primitive.
	// --- END UNSUPPORTED ---
	triggers: [webhook('/f44-ssl-expiry-alert', { method: 'POST' })],
	async run(ctx) {
		const urls = await ctx.step({ name: 'Fetch URLs' }, async () => {
			// In production, this would fetch from a Google Sheet
			return [{ url: 'https://dummyjson.com' }, { url: 'https://n8n.io' }];
		});

		const sslResults = await ctx.step({ name: 'Check SSL' }, async () => {
			const results = [];
			for (const entry of urls) {
				const domain = entry.url.replace(/^https?:\/\//, '').replace(/\/$/, '');
				const res = await fetch(`https://ssl-checker.io/api/v1/check/${domain}`);
				const data = (await res.json()) as {
					result: { host: string; valid_till: string; days_left: number };
				};
				results.push({
					host: data.result.host,
					validTill: data.result.valid_till,
					daysLeft: data.result.days_left,
				});
			}
			return results;
		});

		const alerts = await ctx.step({ name: 'Check Expiring Certs' }, async () => {
			const expiring = sslResults.filter((cert) => cert.daysLeft <= 7);

			for (const cert of expiring) {
				const token = ctx.getSecret('GMAIL_ACCESS_TOKEN') ?? '';
				await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
					method: 'POST',
					headers: {
						Authorization: `Bearer ${token}`,
						'Content-Type': 'application/json',
					},
					body: JSON.stringify({
						raw: btoa(
							`Subject: SSL Expiry - ${cert.daysLeft} Days Left - ${cert.host}\n\nSSL certificate for ${cert.host} expires in ${cert.daysLeft} days (${cert.validTill}).`,
						),
					}),
				});
			}

			return {
				checked: sslResults.length,
				expiring: expiring.length,
				details: expiring,
			};
		});

		return alerts;
	},
});
