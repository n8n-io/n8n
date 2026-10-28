import type { Logger } from '@n8n/backend-common';
import type { OutboundHttp } from '@n8n/backend-network';
import type { UrlService } from '@n8n/backend-services';
import type { Thread } from 'chat';
import type { InstanceSettings } from 'n8n-core';
import { mock } from 'vitest-mock-extended';

import type { AgentChatAttachmentService } from '../../agent-chat-attachment.service';
import type { AgentRepository } from '../../repositories/agent.repository';
import { ChatIntegrationRegistry } from '../agent-chat-integration';
import { AgentOutboundFiles } from '../agent-outbound-files.service';
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
});
