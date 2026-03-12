/**
 * F46: Company Lookalikes
 *
 * Demonstrates a lead enrichment workflow that reads a source list
 * of company domains, finds similar companies via an API, merges the
 * results, and writes them to a spreadsheet.
 */
import { defineWorkflow, webhook } from '@n8n/engine/sdk';

export default defineWorkflow({
	name: 'F46 - Company Lookalikes (Requires credentials)',
	triggers: [webhook('/f46-company-lookalikes', { method: 'POST' })],
	async run(ctx) {
		const sourceList = await ctx.step({ name: 'Read Source List' }, async () => {
			const token = ctx.getSecret('GOOGLE_ACCESS_TOKEN') ?? '';
			const res = await fetch(
				'https://sheets.googleapis.com/v4/spreadsheets/SHEET_ID/values/SourceList',
				{ headers: { Authorization: `Bearer ${token}` } },
			);
			return (await res.json()) as {
				values: Array<{ Domain: string }>;
			};
		});

		const domains = sourceList.values ?? [];

		const similarCompanies = await ctx.step({ name: 'Fetch Similar Companies' }, async () => {
			const apiToken = ctx.getSecret('COMPANY_ENRICH_TOKEN') ?? '';
			const results = [];
			for (const entry of domains) {
				const res = await fetch('https://api.companyenrich.com/companies/similar', {
					method: 'POST',
					headers: {
						Authorization: `Bearer ${apiToken}`,
						'Content-Type': 'application/json',
					},
					body: JSON.stringify({ domain: entry.Domain }),
				});
				const data = (await res.json()) as {
					items: Array<{ name: string; domain: string; id: string }>;
					metadata: { scores: Record<string, number> };
				};
				results.push({
					sourceDomain: entry.Domain,
					items: data.items ?? [],
					scores: data.metadata?.scores ?? {},
				});
			}
			return results;
		});

		const written = await ctx.step({ name: 'Write Results' }, async () => {
			const token = ctx.getSecret('GOOGLE_ACCESS_TOKEN') ?? '';
			const rows = [];
			for (const result of similarCompanies) {
				for (const item of result.items) {
					rows.push([
						result.sourceDomain,
						item.name,
						item.domain,
						result.scores[item.id] ?? 0,
						new Date().toISOString(),
					]);
				}
			}

			await fetch(
				'https://sheets.googleapis.com/v4/spreadsheets/SHEET_ID/values/Results!A1:append?valueInputOption=RAW',
				{
					method: 'POST',
					headers: {
						Authorization: `Bearer ${token}`,
						'Content-Type': 'application/json',
					},
					body: JSON.stringify({ values: rows }),
				},
			);

			return { written: rows.length };
		});

		return written;
	},
});
