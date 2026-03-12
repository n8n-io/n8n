/**
 * F52: TikTok Downloader
 *
 * Demonstrates a media download workflow. The original v4 fixture
 * was skipped due to complex multi-level error handling with
 * convergence. This is a semantic translation of the intent:
 * receive a TikTok URL, download the video, and return it.
 */
import { defineWorkflow, webhook } from '@n8n/engine/sdk';
import { z } from 'zod';

export default defineWorkflow({
	name: 'F52 - Tiktok Downloader',
	triggers: [
		webhook('/f52-tiktok-downloader', {
			method: 'POST',
			responseMode: 'respondWithNode',
			schema: {
				body: z.object({
					url: z.string().optional(),
				}),
			},
		}),
	],
	async run(ctx) {
		const input = await ctx.step(
			{ name: 'Parse Request', icon: 'settings', color: '#6b7280' },
			async () => {
				const { body } = ctx.triggerData;
				return { url: body.url ?? '' };
			},
		);

		if (!input.url) {
			await ctx.step({ name: 'Error Response', icon: 'bug', color: '#ef4444' }, async () => {
				await ctx.respondToWebhook({
					statusCode: 400,
					body: { error: 'Missing TikTok URL' },
				});
				return { responded: true };
			});
			return;
		}

		try {
			const videoData = await ctx.step(
				{ name: 'Download TikTok Video', icon: 'download', color: '#3b82f6' },
				async () => {
					const res = await fetch(`https://dummyjson.com/posts/add`, {
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({ url: input.url }),
					});
					if (!res.ok) throw new Error(`Download failed: HTTP ${res.status}`);
					return (await res.json()) as {
						downloadUrl: string;
						title: string;
						author: string;
					};
				},
			);

			await ctx.step({ name: 'Success Response', icon: 'send', color: '#22c55e' }, async () => {
				await ctx.respondToWebhook({
					statusCode: 200,
					body: videoData,
				});
				return { responded: true };
			});
		} catch (error) {
			await ctx.step({ name: 'Error Handler', icon: 'bug', color: '#ef4444' }, async () => {
				await ctx.respondToWebhook({
					statusCode: 500,
					body: {
						error: 'Download failed',
						message: error instanceof Error ? error.message : 'Unknown error',
					},
				});
				return { responded: true };
			});
		}
	},
});
