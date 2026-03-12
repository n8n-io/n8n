/**
 * F42: Email New Leads
 *
 * Demonstrates a lead processing workflow. Reads leads from a
 * Google Sheet, filters uncontacted ones, updates their status,
 * and sends outreach emails.
 */
import { defineWorkflow, webhook } from '@n8n/engine/sdk';

export default defineWorkflow({
	name: 'F42 - Email New Leads (Requires credentials) (Not supported yet)',
	// --- UNSUPPORTED: Schedule trigger ---
	// The original workflow runs on a schedule (daily at 9 AM).
	// The v3 engine does not yet support cron/schedule triggers.
	// Using a webhook trigger as a substitute.
	// Requires: a schedule() or cron() trigger primitive.
	// --- END UNSUPPORTED ---
	triggers: [webhook('/f42-email-new-leads', { method: 'POST' })],
	async run(ctx) {
		const leads = await ctx.step(
			{ name: 'Get Leads from Sheet', icon: 'database', color: '#3b82f6' },
			async () => {
				const token = ctx.getSecret('GOOGLE_ACCESS_TOKEN') ?? '';
				const res = await fetch(
					'https://sheets.googleapis.com/v4/spreadsheets/SHEET_ID/values/Sheet1',
					{
						headers: { Authorization: `Bearer ${token}` },
					},
				);
				return (await res.json()) as {
					values: Array<{ Email: string; Contacted: string }>;
				};
			},
		);

		const uncontacted = await ctx.step(
			{ name: 'Filter Uncontacted', icon: 'filter', color: '#8b5cf6' },
			async () => {
				const allLeads = leads.values ?? [];
				return allLeads.filter((lead: { Contacted: string }) => !lead.Contacted);
			},
		);

		const updated = await ctx.step(
			{ name: 'Update Sheet', icon: 'upload', color: '#f97316' },
			async () => {
				const token = ctx.getSecret('GOOGLE_ACCESS_TOKEN') ?? '';
				const results = [];
				for (const lead of uncontacted) {
					await fetch(
						'https://sheets.googleapis.com/v4/spreadsheets/SHEET_ID/values/Sheet1!B:B:append?valueInputOption=RAW',
						{
							method: 'POST',
							headers: {
								Authorization: `Bearer ${token}`,
								'Content-Type': 'application/json',
							},
							body: JSON.stringify({ values: [[lead.Email, 'Yes']] }),
						},
					);
					results.push({ email: lead.Email, updated: true });
				}
				return results;
			},
		);

		const emailed = await ctx.step(
			{ name: 'Send Outreach Emails', icon: 'mail', color: '#f97316' },
			async () => {
				const results = [];
				for (const lead of uncontacted) {
					await fetch('https://dummyjson.com/posts/add', {
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({
							to: lead.Email,
							subject: 'Build AI Agents & Automations with n8n',
							body: 'Hi There,\n\nI help people learn how to build AI agents and create powerful AI automations using n8n.',
						}),
					});
					results.push({ email: lead.Email, sent: true });
				}
				return results;
			},
		);

		return { updated, emailed };
	},
});
