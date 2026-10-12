import type { AgentIntegrationConfig } from '@n8n/api-types';
import type { Logger } from '@n8n/backend-common';
import { mock } from 'vitest-mock-extended';

import type { AgentChatAttachmentService } from '../agent-chat-attachment.service';
import { AgentChannelMediaRetentionTask } from '../agent-channel-media-retention.task';
import type { AgentRepository } from '../repositories/agent.repository';

const DAY_MS = 24 * 60 * 60 * 1000;
const NOW = new Date('2026-06-15T12:00:00.000Z');

const whatsApp = (settings?: Record<string, unknown>) =>
	({ type: 'whatsapp', credentialId: 'cred-1', settings }) as AgentIntegrationConfig;

describe('AgentChannelMediaRetentionTask', () => {
	let agentRepository: ReturnType<typeof mock<AgentRepository>>;
	let attachmentService: ReturnType<typeof mock<AgentChatAttachmentService>>;
	let logger: ReturnType<typeof mock<Logger>>;
	let task: AgentChannelMediaRetentionTask;

	beforeEach(() => {
		vi.useFakeTimers({ now: NOW });
		agentRepository = mock<AgentRepository>();
		attachmentService = mock<AgentChatAttachmentService>();
		attachmentService.deleteFromSourceCreatedBefore.mockResolvedValue(0);
		logger = mock<Logger>();
		task = new AgentChannelMediaRetentionTask(agentRepository, attachmentService, logger);
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('declares an hourly cluster-wide cadence', () => {
		expect(task.name).toBe('agent-channel-media-retention');
		expect(task.schedule).toEqual({ kind: 'interval', intervalSeconds: 3600 });
		expect(task.effects).toBe('idempotent');
		expect(task.placement).toEqual({ scope: 'cluster', durable: true, runOnTakeover: true });
	});

	it('looks up only agents with a WhatsApp channel', async () => {
		agentRepository.findWithIntegrationType.mockResolvedValue([]);

		await task.run();

		expect(agentRepository.findWithIntegrationType).toHaveBeenCalledWith('whatsapp');
		expect(attachmentService.deleteFromSourceCreatedBefore).not.toHaveBeenCalled();
	});

	it("deletes each agent's WhatsApp media older than its retention setting", async () => {
		agentRepository.findWithIntegrationType.mockResolvedValue([
			{ id: 'agent-1', integrations: [whatsApp({ mediaRetentionDays: 7 })] },
			{ id: 'agent-2', integrations: [whatsApp({ mediaRetentionDays: 365 })] },
		]);

		await task.run();

		expect(attachmentService.deleteFromSourceCreatedBefore).toHaveBeenCalledTimes(2);
		expect(attachmentService.deleteFromSourceCreatedBefore).toHaveBeenCalledWith(
			{ agentId: 'agent-1', source: 'whatsapp' },
			new Date(NOW.getTime() - 7 * DAY_MS),
		);
		expect(attachmentService.deleteFromSourceCreatedBefore).toHaveBeenCalledWith(
			{ agentId: 'agent-2', source: 'whatsapp' },
			new Date(NOW.getTime() - 365 * DAY_MS),
		);
	});

	it('keeps media for 30 days when the channel has no retention setting', async () => {
		agentRepository.findWithIntegrationType.mockResolvedValue([
			{ id: 'agent-1', integrations: [whatsApp()] },
		]);

		await task.run();

		expect(attachmentService.deleteFromSourceCreatedBefore).toHaveBeenCalledWith(
			{ agentId: 'agent-1', source: 'whatsapp' },
			new Date(NOW.getTime() - 30 * DAY_MS),
		);
	});

	it('uses the WhatsApp channel when the agent has other channels too', async () => {
		agentRepository.findWithIntegrationType.mockResolvedValue([
			{
				id: 'agent-1',
				integrations: [
					{ type: 'telegram', credentialId: 'cred-2' } as AgentIntegrationConfig,
					whatsApp({ mediaRetentionDays: 3 }),
				],
			},
		]);

		await task.run();

		expect(attachmentService.deleteFromSourceCreatedBefore).toHaveBeenCalledExactlyOnceWith(
			{ agentId: 'agent-1', source: 'whatsapp' },
			new Date(NOW.getTime() - 3 * DAY_MS),
		);
	});

	it('skips an agent that no longer has a WhatsApp channel', async () => {
		agentRepository.findWithIntegrationType.mockResolvedValue([
			{
				id: 'agent-1',
				integrations: [{ type: 'telegram', credentialId: 'cred-2' } as AgentIntegrationConfig],
			},
		]);

		await task.run();

		expect(attachmentService.deleteFromSourceCreatedBefore).not.toHaveBeenCalled();
	});

	it('skips an agent whose integrations are null', async () => {
		agentRepository.findWithIntegrationType.mockResolvedValue([
			{ id: 'agent-1', integrations: null } as never,
		]);

		await task.run();

		expect(attachmentService.deleteFromSourceCreatedBefore).not.toHaveBeenCalled();
	});

	it('logs the count only when it deletes media', async () => {
		agentRepository.findWithIntegrationType.mockResolvedValue([
			{ id: 'agent-1', integrations: [whatsApp()] },
			{ id: 'agent-2', integrations: [whatsApp()] },
		]);
		attachmentService.deleteFromSourceCreatedBefore
			.mockResolvedValueOnce(4)
			.mockResolvedValueOnce(0);

		await task.run();

		expect(logger.debug).toHaveBeenCalledExactlyOnceWith(expect.any(String), {
			agentId: 'agent-1',
			deleted: 4,
		});
	});
});
