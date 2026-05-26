import type { InterruptibleToolContext } from '@n8n/agents';
import { mock } from 'jest-mock-extended';

import {
	createIntegrationActionTool,
	createIntegrationContextTool,
	getIntegrationToolConnectionDescriptors,
	type IntegrationActionExecutor,
	type IntegrationContextQueryExecutor,
	type IntegrationMessageContextStore,
} from '../integration-tools';
import type { AgentCredentialIntegrationConfig } from '@n8n/api-types';

const slackA: AgentCredentialIntegrationConfig = {
	type: 'slack',
	credentialId: 'cred-a',
};

const slackB: AgentCredentialIntegrationConfig = {
	type: 'slack',
	credentialId: 'cred-b',
};

const linear: AgentCredentialIntegrationConfig = {
	type: 'linear',
	credentialId: 'cred-c',
};

function makeInterruptibleCtx(
	overrides: Partial<InterruptibleToolContext> = {},
): InterruptibleToolContext {
	return {
		resumeData: undefined,
		suspend: jest.fn().mockResolvedValue(undefined as never),
		runId: 'run-1',
		toolCallId: 'tool-1',
		persistence: { threadId: 'thread-1', resourceId: 'resource-1' },
		...overrides,
	};
}

describe('integration tools', () => {
	it('generates canonical names for first connection and 2-based suffixes for duplicates', () => {
		const descriptors = getIntegrationToolConnectionDescriptors([slackB, linear, slackA]);

		expect(descriptors.map((descriptor) => descriptor.contextToolName)).toEqual([
			'linear_context',
			'slack_context',
			'slack_2_context',
		]);
		expect(descriptors.map((descriptor) => descriptor.actionToolName)).toEqual([
			'linear_action',
			'slack_action',
			'slack_2_action',
		]);
		expect(descriptors.map((descriptor) => descriptor.integration.credentialId)).toEqual([
			'cred-c',
			'cred-a',
			'cred-b',
		]);
	});

	it('context tool returns the latest message context for its integration connection', async () => {
		const messageContextStore = mock<IntegrationMessageContextStore>();
		messageContextStore.getLatest.mockResolvedValue({
			integrationConnectionId: 'slack:cred-a',
			platform: 'slack',
			target: { type: 'thread', threadId: 'slack:C123:123.456' },
			messageId: '123.456',
			updatedAt: '2026-05-18T10:00:00.000Z',
		});
		const queryExecutor = mock<IntegrationContextQueryExecutor>();

		const tool = createIntegrationContextTool({
			descriptor: getIntegrationToolConnectionDescriptors([slackA])[0],
			messageContextStore,
			queryExecutor,
		}).build();

		const result = await tool.handler!(
			{ query: 'get_current_message_context', input: {} },
			{ persistence: { threadId: 'thread-1', resourceId: 'resource-1' } },
		);

		expect(result).toEqual({
			ok: true,
			context: {
				integrationConnectionId: 'slack:cred-a',
				platform: 'slack',
				target: { type: 'thread', threadId: 'slack:C123:123.456' },
				messageId: '123.456',
				updatedAt: '2026-05-18T10:00:00.000Z',
			},
		});
		expect(queryExecutor.execute).not.toHaveBeenCalled();
	});

	it('respond returns a structured error when no latest message context exists', async () => {
		const messageContextStore = mock<IntegrationMessageContextStore>();
		messageContextStore.getLatest.mockResolvedValue(null);
		const actionExecutor = mock<IntegrationActionExecutor>();

		const tool = createIntegrationActionTool({
			descriptor: getIntegrationToolConnectionDescriptors([slackA])[0],
			messageContextStore,
			actionExecutor,
		}).build();

		const result = await tool.handler!(
			{ action: 'respond', input: { message: { text: 'Hello' } } },
			makeInterruptibleCtx(),
		);

		expect(result).toEqual({
			ok: false,
			error: {
				code: 'NO_MESSAGE_CONTEXT',
				message: 'There is no current message context. Use an explicit send action.',
			},
		});
		expect(actionExecutor.execute).not.toHaveBeenCalled();
	});

	it('interactive action sends first, updates message context, then suspends', async () => {
		const messageContextStore = mock<IntegrationMessageContextStore>();
		const actionExecutor = mock<IntegrationActionExecutor>();
		actionExecutor.execute.mockResolvedValue({
			ok: true,
			messageContext: {
				integrationConnectionId: 'slack:cred-a',
				platform: 'slack',
				target: { type: 'channel', channelId: 'slack:C123', threadId: 'slack:C123:123.456' },
				messageId: '123.456',
				updatedAt: '2026-05-18T10:00:00.000Z',
			},
		});
		const ctx = makeInterruptibleCtx();

		const tool = createIntegrationActionTool({
			descriptor: getIntegrationToolConnectionDescriptors([slackA])[0],
			messageContextStore,
			actionExecutor,
		}).build();

		await tool.handler!(
			{
				action: 'send_channel_message',
				input: {
					channelId: 'slack:C123',
					message: {
						text: 'Choose',
						richInteraction: {
							components: [{ type: 'button', label: 'Approve', value: 'approve' }],
						},
					},
				},
			},
			ctx,
		);

		expect(actionExecutor.execute).toHaveBeenCalledWith(
			expect.objectContaining({
				action: 'send_channel_message',
				runId: 'run-1',
				toolCallId: 'tool-1',
				awaitResponse: true,
			}),
		);
		expect(messageContextStore.setLatest).toHaveBeenCalledWith(
			'thread-1',
			'resource-1',
			expect.objectContaining({
				integrationConnectionId: 'slack:cred-a',
				platform: 'slack',
				messageId: '123.456',
			}),
		);
		expect(ctx.suspend).toHaveBeenCalledWith({
			type: 'integration_action',
			action: 'send_channel_message',
			integrationConnectionId: 'slack:cred-a',
			messageContext: expect.objectContaining({
				integrationConnectionId: 'slack:cred-a',
				platform: 'slack',
				messageId: '123.456',
			}),
		});
	});
});
