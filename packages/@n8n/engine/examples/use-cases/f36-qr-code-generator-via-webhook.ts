/**
 * F36: QR Code Generator via Webhook
 *
 * Demonstrates a webhook that receives data, generates a QR code
 * via an external API, and responds with the result. Uses
 * respondToWebhook for synchronous response.
 */
import { defineWorkflow, webhook } from '@n8n/engine/sdk';
import { z } from 'zod';

export default defineWorkflow({
	name: 'F36 - Qr Code Generator Via Webhook',
	triggers: [
		webhook('/f36-qr-code-generator', {
			method: 'POST',
			responseMode: 'respondWithNode',
			schema: {
				body: z.object({
					data: z.string().optional(),
				}),
			},
		}),
	],
	async run(ctx) {
		const input = await ctx.step(
			{ name: 'Parse Request', icon: 'settings', color: '#6b7280' },
			async () => {
				const { body } = ctx.triggerData;
				return { data: body.data ?? 'https://n8n.io' };
			},
		);

		const qrCode = await ctx.step(
			{ name: 'Generate QR Code', icon: 'globe', color: '#3b82f6' },
			async () => {
				const url = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(input.data)}`;
				const res = await fetch(url);
				return { url, generated: res.ok, contentType: res.headers.get('content-type') };
			},
		);

		await ctx.step({ name: 'Respond with QR Code', icon: 'send', color: '#22c55e' }, async () => {
			await ctx.respondToWebhook({
				statusCode: 200,
				headers: { 'Content-Type': 'application/json' },
				body: { qrCodeUrl: qrCode.url, data: input.data },
			});
			return { responded: true };
		});
	},
});
