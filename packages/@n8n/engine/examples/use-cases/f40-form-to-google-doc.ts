/**
 * F40: Form to Google Doc
 *
 * Demonstrates receiving form data via webhook, copying a Google Doc
 * template, and replacing placeholders with form values using the
 * Google Docs API.
 */
import { defineWorkflow, webhook } from '@n8n/engine/sdk';
import { z } from 'zod';

export default defineWorkflow({
	name: 'F40 - Form To Google Doc (Requires credentials)',
	triggers: [
		webhook('/f40-form-to-google-doc', {
			method: 'POST',
			schema: {
				body: z.object({
					name: z.string().optional(),
				}),
			},
		}),
	],
	async run(ctx) {
		const formData = await ctx.step({ name: 'Parse Form Data' }, async () => {
			const { body } = ctx.triggerData;
			return { name: body.name ?? 'Unknown', fields: body };
		});

		const copiedDoc = await ctx.step({ name: 'Copy Template File' }, async () => {
			const token = ctx.getSecret('GOOGLE_ACCESS_TOKEN') ?? '';
			const templateId = '1KyR0UMIOpEkjwa6o1gTggNBP2A6EWwppV59Y6NQuDYw';
			const res = await fetch(`https://www.googleapis.com/drive/v3/files/${templateId}/copy`, {
				method: 'POST',
				headers: {
					Authorization: `Bearer ${token}`,
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({ name: formData.name }),
			});
			return (await res.json()) as { id: string; name: string };
		});

		const replacements = await ctx.step({ name: 'Format Replacements' }, async () => {
			const requests = Object.entries(formData.fields)
				.filter(([key]) => key !== 'submittedAt' && key !== 'formMode')
				.map(([key, value]) => ({
					replaceAllText: {
						containsText: { text: `{{${key}}}`, matchCase: true },
						replaceText: String(value),
					},
				}));
			return requests;
		});

		const updated = await ctx.step({ name: 'Replace Data in Google Doc' }, async () => {
			const token = ctx.getSecret('GOOGLE_ACCESS_TOKEN') ?? '';
			const res = await fetch(
				`https://docs.googleapis.com/v1/documents/${copiedDoc.id}:batchUpdate`,
				{
					method: 'POST',
					headers: {
						Authorization: `Bearer ${token}`,
						'Content-Type': 'application/json',
					},
					body: JSON.stringify({ requests: replacements }),
				},
			);
			return (await res.json()) as Record<string, unknown>;
		});

		return { documentId: copiedDoc.id, updated };
	},
});
