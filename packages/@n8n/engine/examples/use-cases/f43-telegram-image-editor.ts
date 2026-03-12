/**
 * F43: Telegram Image Editor
 *
 * Demonstrates a Telegram bot that receives images, processes them,
 * and sends back edited versions. The original v4 fixture was skipped
 * in the source repository due to parser limitations with nested
 * ternary operators. This is a semantic translation of the intent.
 */
import { defineWorkflow, webhook } from '@n8n/engine/sdk';
import { z } from 'zod';

export default defineWorkflow({
	name: 'F43 - Telegram Image Editor (Requires credentials)',
	triggers: [
		webhook('/f43-telegram-image-editor', {
			method: 'POST',
			schema: {
				body: z.object({
					message: z
						.object({
							photo: z
								.array(
									z.object({
										file_id: z.string(),
									}),
								)
								.optional(),
							caption: z.string().optional(),
						})
						.optional(),
				}),
			},
		}),
	],
	async run(ctx) {
		const input = await ctx.step({ name: 'Parse Telegram Update' }, async () => {
			const { body } = ctx.triggerData;
			const photo = body.message?.photo;
			const fileId = photo?.[photo.length - 1]?.file_id;
			return {
				fileId: fileId ?? null,
				caption: body.message?.caption ?? 'No caption',
			};
		});

		if (!input.fileId) {
			return { error: 'No image provided' };
		}

		const downloaded = await ctx.step({ name: 'Download Image' }, async () => {
			const botToken = ctx.getSecret('TELEGRAM_BOT_TOKEN') ?? '';
			const fileRes = await fetch(
				`https://api.telegram.org/bot${botToken}/getFile?file_id=${input.fileId}`,
			);
			const fileData = (await fileRes.json()) as {
				result: { file_path: string };
			};
			return {
				filePath: fileData.result.file_path,
				downloadUrl: `https://api.telegram.org/file/bot${botToken}/${fileData.result.file_path}`,
			};
		});

		const processed = await ctx.step({ name: 'Process Image' }, async () => {
			// Simulate image processing
			return {
				originalUrl: downloaded.downloadUrl,
				processed: true,
				caption: input.caption,
			};
		});

		const sent = await ctx.step({ name: 'Send Processed Image' }, async () => {
			const botToken = ctx.getSecret('TELEGRAM_BOT_TOKEN') ?? '';
			const chatId = ctx.getSecret('TELEGRAM_CHAT_ID') ?? '';
			const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					chat_id: chatId,
					text: `Image processed: ${processed.caption}`,
				}),
			});
			return { sent: res.ok };
		});

		return sent;
	},
});
