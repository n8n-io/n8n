import type { Logger } from '@n8n/backend-common';
import type { OutboundHttp } from '@n8n/backend-network';
import type { UrlService } from '@n8n/backend-services';
import type { SentMessage, Thread } from 'chat';
import type { InstanceSettings } from 'n8n-core';
import { mock } from 'vitest-mock-extended';

import type { AgentChatAttachmentService } from '../../agent-chat-attachment.service';
import type { AgentRepository } from '../../repositories/agent.repository';
import { ChatIntegrationRegistry } from '../agent-chat-integration';
import { AgentOutboundFiles } from '../agent-outbound-files.service';
import { DiscordIntegration } from '../platforms/discord/discord-integration';
import { SlackIntegration } from '../platforms/slack/slack-integration';
import { TelegramIntegration } from '../platforms/telegram/telegram-integration';

const scope = { projectId: 'project-1', threadId: 'agent-thread-1' };
const chartFile = {
	id: 'file-1',
	binaryDataId: 'filesystem-v2:agents/a/attachments/file-1',
	fileName: 'chart.png',
	mimeType: 'image/png',
	fileSizeBytes: 3,
};

function createService() {
	const attachmentService = mock<AgentChatAttachmentService>();
	attachmentService.getReadable.mockImplementation(async (fileId) => {
		if (fileId === chartFile.id) return chartFile as never;
		// `img-<n>` is another image, `doc-<n>` a PDF. Other IDs are not readable.
		if (fileId.startsWith('img-'))
			return { ...chartFile, id: fileId, fileName: `${fileId}.png` } as never;
		if (fileId.startsWith('doc-')) {
			return {
				...chartFile,
				id: fileId,
				fileName: `${fileId}.pdf`,
				mimeType: 'application/pdf',
			} as never;
		}
		return null;
	});
	attachmentService.getBuffer.mockResolvedValue(Buffer.from('png'));
	const registry = new ChatIntegrationRegistry();
	registry.register(new SlackIntegration(mock<AgentRepository>()));
	registry.register(
		new DiscordIntegration(
			mock<Logger>(),
			mock<InstanceSettings>(),
			mock<AgentRepository>(),
			mock<OutboundHttp>(),
		),
	);
	registry.register(
		new TelegramIntegration(
			mock<Logger>(),
			mock<UrlService>(),
			mock<AgentRepository>(),
			mock<InstanceSettings>(),
			mock<OutboundHttp>(),
		),
	);
	const thread = mock<Thread<unknown, unknown>>();
	return {
		service: new AgentOutboundFiles(attachmentService, registry),
		attachmentService,
		thread,
	};
}

describe('AgentOutboundFiles.postReplyFiles', () => {
	it('posts Telegram reply files as typed attachments with the reply text as caption', async () => {
		const { service, attachmentService, thread } = createService();

		await service.postReplyFiles(thread, 'telegram', {
			fileIds: ['file-1'],
			caption: 'Here is your chart.',
			scope,
		});

		expect(attachmentService.getReadable).toHaveBeenCalledWith('file-1', scope);
		expect(thread.post).toHaveBeenCalledWith({
			markdown: 'Here is your chart.',
			attachments: [
				{ type: 'image', data: Buffer.from('png'), name: 'chart.png', mimeType: 'image/png' },
			],
		});
	});

	it('posts Slack reply files as uploads without a caption', async () => {
		const { service, thread } = createService();

		await service.postReplyFiles(thread, 'slack', { fileIds: ['file-1'], caption: '', scope });

		expect(thread.post).toHaveBeenCalledWith({
			markdown: '',
			files: [{ data: Buffer.from('png'), filename: 'chart.png', mimeType: 'image/png' }],
		});
	});

	it('throws when the thread can no longer read a file', async () => {
		const { service, thread } = createService();

		await expect(
			service.postReplyFiles(thread, 'slack', { fileIds: ['gone'], caption: '', scope }),
		).rejects.toThrow('File "gone" not found in this conversation.');
		expect(thread.post).not.toHaveBeenCalled();
	});

	it('posts Telegram images and documents as separate messages with the caption on the first', async () => {
		const { service, thread } = createService();

		// The IDs that two responds queued, merged by the stream consumer.
		await service.postReplyFiles(thread, 'telegram', {
			fileIds: ['file-1', 'doc-1'],
			caption: 'Here is the image and its description.',
			scope,
		});

		expect(thread.post).toHaveBeenCalledTimes(2);
		expect(thread.post).toHaveBeenNthCalledWith(1, {
			markdown: 'Here is the image and its description.',
			attachments: [expect.objectContaining({ type: 'image', name: 'chart.png' })],
		});
		expect(thread.post).toHaveBeenNthCalledWith(2, {
			raw: '',
			attachments: [expect.objectContaining({ type: 'file', name: 'doc-1.pdf' })],
		});
	});

	it('splits Telegram files into groups of at most 10', async () => {
		const { service, thread } = createService();
		const fileIds = Array.from({ length: 12 }, (_, index) => `img-${index}`);

		await service.postReplyFiles(thread, 'telegram', { fileIds, caption: 'Images', scope });

		expect(thread.post).toHaveBeenCalledTimes(2);
		const [first, second] = thread.post.mock.calls.map(([message]) => message);
		expect(first).toEqual(
			expect.objectContaining({ markdown: 'Images', attachments: expect.any(Array) }),
		);
		expect(first).toHaveProperty('attachments.length', 10);
		expect(second).toEqual(expect.objectContaining({ raw: '', attachments: expect.any(Array) }));
		expect(second).toHaveProperty('attachments.length', 2);
	});

	it('posts Telegram reply text over the caption limit as its own message before the files', async () => {
		const { service, thread } = createService();
		const caption = 'a'.repeat(1025);

		await service.postReplyFiles(thread, 'telegram', { fileIds: ['file-1'], caption, scope });

		expect(thread.post).toHaveBeenCalledTimes(2);
		expect(thread.post).toHaveBeenNthCalledWith(1, { markdown: caption });
		expect(thread.post).toHaveBeenNthCalledWith(2, {
			raw: '',
			attachments: [expect.objectContaining({ type: 'image', name: 'chart.png' })],
		});
	});

	it('splits Telegram reply text over the message limit before the files', async () => {
		const { service, thread } = createService();
		// 32,000 characters in lines, more than the Telegram message limit of 30,000.
		const caption = 'line of reply text\n'.repeat(1600);

		await service.postReplyFiles(thread, 'telegram', { fileIds: ['file-1'], caption, scope });

		const posts = thread.post.mock.calls.map(([message]) => message);
		expect(posts).toHaveLength(3);
		expect(
			posts
				.slice(0, 2)
				.map((post) => (post as { markdown: string }).markdown)
				.join(''),
		).toBe(caption);
		expect(posts[2]).toEqual({
			raw: '',
			attachments: [expect.objectContaining({ type: 'image' })],
		});
	});

	it('posts Telegram reply text at the caption limit as the caption', async () => {
		const { service, thread } = createService();
		const caption = 'a'.repeat(1024);

		await service.postReplyFiles(thread, 'telegram', { fileIds: ['file-1'], caption, scope });

		expect(thread.post).toHaveBeenCalledTimes(1);
		expect(thread.post).toHaveBeenCalledWith({
			markdown: caption,
			attachments: [expect.objectContaining({ type: 'image', name: 'chart.png' })],
		});
	});

	it('posts Discord reply files as raw uploads with the reply text', async () => {
		const { service, thread } = createService();

		await service.postReplyFiles(thread, 'discord', {
			fileIds: ['file-1', 'doc-1'],
			caption: 'Here are your files.',
			scope,
		});

		expect(thread.post).toHaveBeenCalledTimes(1);
		expect(thread.post).toHaveBeenCalledWith({
			markdown: 'Here are your files.',
			files: [
				{ data: Buffer.from('png'), filename: 'chart.png', mimeType: 'image/png' },
				{ data: Buffer.from('png'), filename: 'doc-1.pdf', mimeType: 'application/pdf' },
			],
		});
	});

	it('posts Discord reply text over the message limit as its own messages before the files', async () => {
		const { service, thread } = createService();
		// 2,500 characters in lines, more than the Discord message limit of 1,900.
		const caption = 'line of reply text\n'.repeat(132).slice(0, 2500);

		await service.postReplyFiles(thread, 'discord', { fileIds: ['file-1'], caption, scope });

		const posts = thread.post.mock.calls.map(([message]) => message);
		expect(posts).toHaveLength(3);
		expect(
			posts
				.slice(0, 2)
				.map((post) => (post as { markdown: string }).markdown)
				.join(''),
		).toBe(caption);
		expect(posts[2]).toEqual({
			raw: '',
			files: [{ data: Buffer.from('png'), filename: 'chart.png', mimeType: 'image/png' }],
		});
	});

	it('posts mixed Slack files in one message', async () => {
		const { service, thread } = createService();

		await service.postReplyFiles(thread, 'slack', {
			fileIds: ['file-1', 'doc-1'],
			caption: '',
			scope,
		});

		expect(thread.post).toHaveBeenCalledTimes(1);
		expect(thread.post).toHaveBeenCalledWith({
			markdown: '',
			files: [
				expect.objectContaining({ filename: 'chart.png' }),
				expect.objectContaining({ filename: 'doc-1.pdf' }),
			],
		});
	});

	it('loads the files of a group only when the group is posted', async () => {
		const { service, attachmentService, thread } = createService();
		const events: string[] = [];
		attachmentService.getBuffer.mockImplementation(async (attachment) => {
			events.push(`load ${attachment.fileName}`);
			return Buffer.from('png');
		});
		thread.post.mockImplementation(async () => {
			events.push('post');
			return mock<SentMessage>();
		});

		await service.postReplyFiles(thread, 'telegram', {
			fileIds: ['file-1', 'doc-1'],
			caption: 'Here are your files.',
			scope,
		});

		expect(events).toEqual(['load chart.png', 'post', 'load doc-1.pdf', 'post']);
	});
});

describe('AgentOutboundFiles.groups', () => {
	it('sends a Telegram image over 10 MB as a document with the other documents', async () => {
		const { service } = createService();
		const bigImage = {
			...chartFile,
			id: 'big',
			fileName: 'big.png',
			fileSizeBytes: 11 * 1024 * 1024,
		};
		const pdf = { ...chartFile, id: 'doc', fileName: 'doc.pdf', mimeType: 'application/pdf' };

		const groups = await Promise.all(
			service
				.groups('telegram', [chartFile, bigImage, pdf] as never)
				.map(async (load) => await load()),
		);

		expect(groups).toEqual([
			{ attachments: [expect.objectContaining({ type: 'image', name: 'chart.png' })] },
			{
				attachments: [
					expect.objectContaining({ type: 'file', name: 'big.png' }),
					expect.objectContaining({ type: 'file', name: 'doc.pdf' }),
				],
			},
		]);
	});
});

describe('AgentOutboundFiles.check', () => {
	it('returns a limit error for a Discord file over 10 MiB', async () => {
		const { service, attachmentService } = createService();
		attachmentService.getReadable.mockResolvedValue({
			...chartFile,
			fileSizeBytes: 10 * 1024 * 1024 + 1,
		} as never);

		await expect(service.check('discord', ['file-1'], scope)).resolves.toEqual({
			ok: false,
			error: {
				code: 'FILE_UPLOAD_LIMIT_EXCEEDED',
				message: 'File "chart.png" is 10 MB. The discord integration sends files up to 10 MB.',
			},
		});
	});

	it('accepts a Discord file of exactly 10 MiB', async () => {
		const { service, attachmentService } = createService();
		attachmentService.getReadable.mockResolvedValue({
			...chartFile,
			fileSizeBytes: 10 * 1024 * 1024,
		} as never);

		await expect(service.check('discord', ['file-1'], scope)).resolves.toEqual([
			expect.objectContaining({ id: 'file-1' }),
		]);
	});

	it('returns a limit error when the platform needs too many messages for the files', async () => {
		const { service, attachmentService } = createService();
		// 21 images need 3 Telegram media groups, and the PDF needs a 4th message.
		const fileIds = [...Array.from({ length: 21 }, (_, index) => `img-${index}`), 'doc-1'];

		const result = await service.check('telegram', fileIds, scope);

		expect(result).toEqual({
			ok: false,
			error: expect.objectContaining({
				code: 'FILE_UPLOAD_LIMIT_EXCEEDED',
				message: expect.stringContaining('needs 4 messages'),
			}),
		});
		expect(attachmentService.getBuffer).not.toHaveBeenCalled();
	});
});
