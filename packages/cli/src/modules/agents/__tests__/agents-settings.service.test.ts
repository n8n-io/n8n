import type { Logger } from '@n8n/backend-common';
import type { SettingsRepository, TransactionRunner } from '@n8n/db';
import { ForbiddenError } from '@n8n/errors';
import { mock } from 'vitest-mock-extended';

import type { AgentChatAttachmentService } from '../agent-chat-attachment.service';
import type { AgentExecutionUpdateBroadcaster } from '../agent-execution-update-broadcaster';
import { AgentsSettingsService } from '../agents-settings.service';
import type { AgentExecutionThreadRepository } from '../repositories/agent-execution-thread.repository';
import type { AgentMessageQueueRepository } from '../repositories/agent-message-queue.repository';
import type { AgentMessageRepository } from '../repositories/agent-message.repository';
import { SystemAgentRegistry } from '../system-agents/system-agent-registry';
import type { SystemAgentProvider } from '../system-agents/system-agent.types';

describe('AgentsSettingsService', () => {
	const settingsRepository = mock<SettingsRepository>();
	let systemAgents: SystemAgentRegistry;
	let service: AgentsSettingsService;

	beforeEach(() => {
		vi.clearAllMocks();
		systemAgents = new SystemAgentRegistry();
		systemAgents.register(mock<SystemAgentProvider>({ agentId: 'system-agent' }));
		service = new AgentsSettingsService(
			settingsRepository,
			mock<TransactionRunner>(),
			mock<AgentMessageQueueRepository>(),
			mock<AgentExecutionThreadRepository>(),
			mock<AgentMessageRepository>(),
			mock<AgentChatAttachmentService>(),
			mock<AgentExecutionUpdateBroadcaster>(),
			mock<Logger>(),
			systemAgents,
		);
	});

	function setEnabled(enabled: boolean) {
		settingsRepository.findByKeyInContext.mockResolvedValue({
			key: 'agents.enabled',
			value: String(enabled),
			loadOnStartup: true,
		});
	}

	describe('appliesTo', () => {
		it('applies to a project agent', () => {
			expect(service.appliesTo('project-agent')).toBe(true);
		});

		it('does not apply to a registered system agent', () => {
			expect(service.appliesTo('system-agent')).toBe(false);
		});
	});

	describe('assertEnabledFor', () => {
		it('refuses a project agent while Agents are turned off', async () => {
			setEnabled(false);

			await expect(service.assertEnabledFor('project-agent')).rejects.toThrow(ForbiddenError);
		});

		it('lets a project agent run while Agents are turned on', async () => {
			setEnabled(true);

			await expect(service.assertEnabledFor('project-agent')).resolves.toBeUndefined();
		});

		it('lets a system agent run while Agents are turned off, without reading the setting', async () => {
			setEnabled(false);

			await expect(service.assertEnabledFor('system-agent')).resolves.toBeUndefined();
			expect(settingsRepository.findByKeyInContext).not.toHaveBeenCalled();
		});
	});
});
