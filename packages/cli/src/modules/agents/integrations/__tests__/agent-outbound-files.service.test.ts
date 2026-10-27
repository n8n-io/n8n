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
	attachmentService.getReadable.mockImplementation(async (fileId) =>
		fileId === chartFile.id ? (chartFile as never) : null,
	);
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
});
