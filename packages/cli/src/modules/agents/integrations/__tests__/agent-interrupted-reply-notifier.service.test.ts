import { N8N_CHAT_INTEGRATION_TYPE } from '@n8n/api-types';
import type { Logger } from '@n8n/backend-common';
import { Container } from '@n8n/di';
import { mock } from 'vitest-mock-extended';

import type { AgentExecutionService, InterruptedExecution } from '../../agent-execution.service';
import type { AgentChatBridge } from '../agent-chat-bridge';
import { AgentInterruptedReplyNotifier } from '../agent-interrupted-reply-notifier.service';
import { ChatIntegrationService } from '../chat-integration.service';
import type { IntegrationMessageContextService } from '../integration-message-context.service';
import type { IntegrationMessageContext } from '../integration-tool-types';

describe('AgentInterruptedReplyNotifier', () => {
	const logger = mock<Logger>();
	const messageContextService = mock<IntegrationMessageContextService>();
	const executionService = mock<AgentExecutionService>();
	const chatIntegrationService = mock<ChatIntegrationService>();
	const bridge = mock<AgentChatBridge>();

	const execution: InterruptedExecution = {
		executionId: 'exec-1',
		agentId: 'agent-1',
		threadId: 'thread-1',
		source: 'slack',
		local: false,
	};

	const slackContext = {
		integrationConnectionId: 'slack:cred-1',
		platform: 'slack',
		target: { threadId: 'slack:C1:111.222' },
		updatedAt: '2026-11-13T00:00:00.000Z',
	} as IntegrationMessageContext;

	let notifier: AgentInterruptedReplyNotifier;

	beforeEach(() => {
		vi.clearAllMocks();
		Container.set(ChatIntegrationService, chatIntegrationService);
		chatIntegrationService.getBridge.mockReturnValue(bridge);
		messageContextService.getLatest.mockResolvedValue(slackContext);
		notifier = new AgentInterruptedReplyNotifier(logger, messageContextService, executionService);
	});

	it('registers itself with the execution service', () => {
		expect(executionService.onExecutionInterrupted).toHaveBeenCalledWith(expect.any(Function));
	});

	it('posts the notice to the platform thread of the turn', async () => {
		await notifier.notify(execution);

		expect(chatIntegrationService.getBridge).toHaveBeenCalledWith('agent-1', 'slack', 'cred-1');
		expect(bridge.deliverInterruptedNotice).toHaveBeenCalledWith('slack:C1:111.222');
	});

	it('prefers the reply target over the last target', async () => {
		messageContextService.getLatest.mockResolvedValue({
			...slackContext,
			replyTarget: { threadId: 'slack:C1:333.444' },
		} as IntegrationMessageContext);

		await notifier.notify(execution);

		expect(bridge.deliverInterruptedNotice).toHaveBeenCalledWith('slack:C1:333.444');
	});

	it.each([
		['the turn ran in this process', { local: true }],
		['the turn has no source', { source: null }],
		['the turn came from n8n chat', { source: N8N_CHAT_INTEGRATION_TYPE }],
	])('skips when %s', async (_, override) => {
		await notifier.notify({ ...execution, ...override });

		expect(messageContextService.getLatest).not.toHaveBeenCalled();
		expect(bridge.deliverInterruptedNotice).not.toHaveBeenCalled();
	});

	it('skips when the last message came from another platform', async () => {
		messageContextService.getLatest.mockResolvedValue({
			...slackContext,
			integrationConnectionId: 'telegram:cred-2',
			platform: 'telegram',
		} as IntegrationMessageContext);

		await notifier.notify(execution);

		expect(bridge.deliverInterruptedNotice).not.toHaveBeenCalled();
	});

	it('skips when this process has no connection to the platform', async () => {
		chatIntegrationService.getBridge.mockReturnValue(undefined);

		await notifier.notify(execution);

		expect(bridge.deliverInterruptedNotice).not.toHaveBeenCalled();
	});

	it('logs and does not throw when the post fails', async () => {
		bridge.deliverInterruptedNotice.mockRejectedValue(new Error('Slack is down'));

		await expect(notifier.notify(execution)).resolves.toBeUndefined();
		expect(logger.warn).toHaveBeenCalledWith(
			'Failed to tell the chat platform that an agent turn was interrupted',
			expect.objectContaining({ executionId: 'exec-1', error: 'Slack is down' }),
		);
	});
});
