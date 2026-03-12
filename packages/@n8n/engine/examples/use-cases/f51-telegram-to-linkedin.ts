/**
 * F51: Telegram to LinkedIn
 *
 * Demonstrates a content pipeline: receives a Telegram voice message
 * or text, transcribes it (if voice), generates a LinkedIn post and
 * image prompt using OpenAI, creates an AI image, and posts to LinkedIn.
 */
import { defineWorkflow, webhook } from '@n8n/engine/sdk';
import { z } from 'zod';

export default defineWorkflow({
	name: 'F51 - Telegram To Linkedin (Requires credentials)',
	triggers: [
		webhook('/f51-telegram-to-linkedin', {
			method: 'POST',
			schema: {
				body: z.object({
					message: z
						.object({
							voice: z
								.object({
									file_id: z.string(),
								})
								.optional(),
							text: z.string().optional(),
						})
						.optional(),
				}),
			},
		}),
	],
	async run(ctx) {
		const input = await ctx.step(
			{ name: 'Parse Telegram Update', icon: 'settings', color: '#6b7280' },
			async () => {
				const { body } = ctx.triggerData;
				const hasVoice = !!body.message?.voice?.file_id;
				return {
					hasVoice,
					voiceFileId: body.message?.voice?.file_id ?? null,
					text: body.message?.text ?? null,
				};
			},
		);

		let contentText: string;

		if (input.hasVoice && input.voiceFileId) {
			// Voice message path: download and transcribe
			const downloaded = await ctx.step(
				{ name: 'Download Voice File', icon: 'download', color: '#3b82f6' },
				async () => {
					const botToken = ctx.getSecret('TELEGRAM_BOT_TOKEN') ?? '';
					const res = await fetch(
						`https://api.telegram.org/bot${botToken}/getFile?file_id=${input.voiceFileId}`,
					);
					const data = (await res.json()) as { result: { file_path: string } };
					return {
						downloadUrl: `https://api.telegram.org/file/bot${botToken}/${data.result.file_path}`,
					};
				},
			);

			const transcription = await ctx.step(
				{ name: 'Transcribe Audio', icon: 'bot', color: '#ec4899' },
				async () => {
					const apiKey = ctx.getSecret('OPENAI_API_KEY') ?? '';
					// In production, download the file and send to Whisper API
					const res = await fetch('https://dummyjson.com/posts/add', {
						method: 'POST',
						headers: { Authorization: `Bearer ${apiKey}` },
						body: JSON.stringify({
							file: downloaded.downloadUrl,
							model: 'whisper-1',
						}),
					});
					return (await res.json()) as { text: string };
				},
			);

			contentText = transcription.text;
		} else {
			contentText = input.text ?? 'No content provided';
		}

		const linkedInPost = await ctx.step(
			{ name: 'LinkedIn Post Text', icon: 'bot', color: '#ec4899' },
			async () => {
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
									'You are a LinkedIn post formatter. Transform the message into a polished LinkedIn post. Plain text only, no markdown. 1,242-2,500 characters. Start with a punchy hook.',
							},
							{ role: 'user', content: contentText },
						],
					}),
				});
				const data = (await res.json()) as {
					choices: Array<{ message: { content: string } }>;
				};
				return { content: data.choices?.[0]?.message?.content ?? contentText };
			},
		);

		const imagePrompt = await ctx.step(
			{ name: 'Generate Image Prompt', icon: 'bot', color: '#ec4899' },
			async () => {
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
									'Generate a professional image prompt for AI image generation based on the LinkedIn post. Modern, minimalist design.',
							},
							{ role: 'user', content: linkedInPost.content },
						],
					}),
				});
				const data = (await res.json()) as {
					choices: Array<{ message: { content: string } }>;
				};
				return { prompt: data.choices?.[0]?.message?.content ?? 'Professional business image' };
			},
		);

		const image = await ctx.step(
			{ name: 'Create Image', icon: 'bot', color: '#ec4899' },
			async () => {
				const apiKey = ctx.getSecret('OPENAI_API_KEY') ?? '';
				const res = await fetch('https://dummyjson.com/posts/add', {
					method: 'POST',
					headers: {
						Authorization: `Bearer ${apiKey}`,
						'Content-Type': 'application/json',
					},
					body: JSON.stringify({
						model: 'dall-e-3',
						prompt: imagePrompt.prompt,
						n: 1,
						size: '1024x1024',
					}),
				});
				return (await res.json()) as { data: Array<{ url: string }> };
			},
		);

		const posted = await ctx.step(
			{ name: 'Create LinkedIn Post', icon: 'upload', color: '#f97316' },
			async () => {
				const linkedInToken = ctx.getSecret('LINKEDIN_ACCESS_TOKEN') ?? '';
				const res = await fetch('https://api.linkedin.com/v2/ugcPosts', {
					method: 'POST',
					headers: {
						Authorization: `Bearer ${linkedInToken}`,
						'Content-Type': 'application/json',
					},
					body: JSON.stringify({
						author: 'urn:li:person:PERSON_ID',
						lifecycleState: 'PUBLISHED',
						specificContent: {
							'com.linkedin.ugc.ShareContent': {
								shareCommentary: { text: linkedInPost.content },
								shareMediaCategory: 'IMAGE',
								media: [
									{
										status: 'READY',
										originalUrl: image.data?.[0]?.url,
									},
								],
							},
						},
						visibility: { 'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC' },
					}),
				});
				return { posted: res.ok };
			},
		);

		return posted;
	},
});
