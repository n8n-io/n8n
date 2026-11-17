import type { InterruptibleToolContext } from '@n8n/agents';
import type { RichCardComponentType } from '@n8n/api-types';
import { mock } from 'vitest-mock-extended';
import type { z } from 'zod';

import { AgentChatIntegration, ChatIntegrationRegistry } from '../agent-chat-integration';
import { ChatIntegrationActionExecutor } from '../integration-action-executor';
import { ChannelRateLimitGuard } from '../channel-rate-limit.guard';
import { createConversationTools } from '../conversation-tools';
import {
	encodeIntegrationMessageContext,
	readIntegrationMessageContext,
} from '../integration-message-context';
import { resolveIntegrationActionDefinitions } from '../integration-tool-definitions';
import {
	createIntegrationActionTool,
	getIntegrationToolConnectionDescriptors,
} from '../integration-tool-factory';
import type {
	IntegrationAction,
	IntegrationActionExecutor,
	IntegrationMessageContextStore,
} from '../integration-tool-types';

class TestChannel extends AgentChatIntegration {
	readonly type = 'test';
	readonly credentialTypes = [];
	readonly displayLabel = 'Test';
	readonly displayIcon = 'chat';
	readonly actionToolDefinitions;
	constructor(
		readonly supportedComponents: readonly RichCardComponentType[],
		actions: IntegrationAction[],
	) {
		super();
		this.actionToolDefinitions = resolveIntegrationActionDefinitions(actions);
	}
	async createAdapter() {
		return {};
	}
	buildOriginDraft() {
		return undefined;
	}
	resolveEpisodicScope() {
		return null;
	}
}

const card = { components: [{ type: 'button', label: 'Continue', value: 'continue' }] };
const uiInput = { message: { text: 'Choose an option', card } };

function setup(connectionId: string | null = 'slack:cred-b') {
	const channel = new TestChannel(
		['button'],
		['respond', 'do_not_respond', 'send_dm', 'send_channel_message'],
	);
	const descriptors = getIntegrationToolConnectionDescriptors(
		[
			{ type: 'slack', credentialId: 'cred-a' },
			{ type: 'slack', credentialId: 'cred-b' },
			{ type: 'linear', credentialId: 'cred-linear' },
		],
		'agent-1',
		(integration) =>
			integration.type === 'slack'
				? {
						conversationTools: channel.conversationTools,
						actionToolDefinitions: channel.actionToolDefinitions,
					}
				: { conversationTools: [], actions: ['respond'] },
	);
	const actionExecutor = mock<IntegrationActionExecutor>();
	actionExecutor.execute.mockResolvedValue({ ok: true });
	const messageContextStore = mock<IntegrationMessageContextStore>();
	const params = { descriptors, actionExecutor, messageContextStore, projectId: 'project-1' };
	const tools = createConversationTools(params).map((tool) => tool.build());
	const context = connectionId
		? {
				integrationConnectionId: connectionId,
				platform: connectionId.split(':')[0],
				target: { type: 'thread' as const, threadId: 'platform-thread' },
				replyExpectation: 'optional' as const,
				updatedAt: '2026-11-16T10:00:00.000Z',
			}
		: null;
	const ctx: InterruptibleToolContext = {
		resumeData: undefined,
		suspend: vi.fn().mockResolvedValue(undefined as never),
		runId: 'run-1',
		toolCallId: 'call-1',
		persistence: {
			threadId: 'thread-1',
			resourceId: 'resource-1',
			hostMetadata: encodeIntegrationMessageContext(context),
		},
	};
	function tool(name: string) {
		const result = tools.find((candidate) => candidate.name === name);
		if (!result) throw new Error(`Missing tool ${name}`);
		return result;
	}
	return { ...params, tools, ctx, tool };
}

describe('conversation tools', () => {
	it.each([
		{ components: [], actions: ['respond'], expected: [] },
		{ components: ['button'], actions: ['respond'], expected: [] },
		{ components: [], actions: ['respond', 'do_not_respond'], expected: ['do_not_respond'] },
		{
			components: ['button'],
			actions: ['respond', 'do_not_respond'],
			expected: ['do_not_respond'],
		},
	] satisfies Array<{
		components: RichCardComponentType[];
		actions: IntegrationAction[];
		expected: string[];
	}>)('uses channel capabilities: $expected', ({ components, actions, expected }) => {
		expect(new TestChannel(components, actions).conversationTools).toEqual(expected);
	});

	it('attaches each generic tool once and keeps its definition eager', () => {
		const { tools } = setup();
		expect(tools.map(({ name }) => name)).toEqual(['do_not_respond']);
		for (const tool of tools) {
			expect(tool.providerOptions).toEqual({
				anthropic: { deferLoading: false },
				openai: { deferLoading: false },
			});
		}
	});

	it('attaches no tools without a supporting channel', () => {
		const params = setup();
		expect(createConversationTools({ ...params, descriptors: [] })).toEqual([]);
		expect(
			createConversationTools({
				...params,
				descriptors: params.descriptors.filter((d) => d.integration.type === 'linear'),
			}),
		).toEqual([]);
	});

	it.each([null, 'linear:cred-linear', 'slack:removed'])(
		'refuses an absent or unsupported current channel: %s',
		async (connectionId) => {
			const { tools, actionExecutor, ctx } = setup(connectionId);
			for (const tool of tools) {
				expect(await tool.handler!({}, ctx)).toMatchObject({
					ok: false,
				});
			}
			expect(actionExecutor.execute).not.toHaveBeenCalled();
		},
	);

	it('ends the turn only after successful silence', async () => {
		const { tool, actionExecutor, ctx } = setup();
		actionExecutor.execute.mockResolvedValue({ ok: true, silent: true });
		const silence = tool('do_not_respond');
		const output = await silence.handler!({ reason: 'Nothing to add' }, ctx);
		expect(actionExecutor.execute).toHaveBeenCalledWith(
			expect.objectContaining({
				action: 'do_not_respond',
				input: { reason: 'Nothing to add' },
				awaitResponse: false,
			}),
		);
		expect(silence.endsTurn?.(output)).toBe(true);
		expect(silence.endsTurn?.({ ok: false })).toBe(false);
	});

	it('keeps the required-reply policy for a direct mention through the real executor', async () => {
		const params = setup();
		const context = readIntegrationMessageContext(params.ctx.persistence);
		if (!context || !params.ctx.persistence) throw new Error('Missing test context');
		params.ctx.persistence.hostMetadata = encodeIntegrationMessageContext({
			...context,
			replyExpectation: 'required',
		});
		const executor = new ChatIntegrationActionExecutor(
			mock(),
			new ChatIntegrationRegistry(),
			new ChannelRateLimitGuard(),
			mock(),
		);
		const silence = createConversationTools({ ...params, actionExecutor: executor })
			.map((tool) => tool.build())
			.find((tool) => tool.name === 'do_not_respond');
		if (!silence) throw new Error('Missing silence tool');
		const output = await silence.handler!({ reason: 'The user asked for no reply' }, params.ctx);
		expect(output).toMatchObject({ ok: false, error: { code: 'REPLY_REQUIRED' } });
		expect(silence.endsTurn?.(output)).toBe(false);
		expect(silence.description).toContain('Direct messages and direct mentions require a reply.');
	});

	it('keeps cards in channel actions and moves silence to the generic tool', () => {
		const params = setup();
		const descriptor = params.descriptors.find((d) => d.integration.type === 'slack')!;
		const grouped = createIntegrationActionTool({ ...params, descriptor }).build();
		expect((grouped.inputSchema as z.ZodType).safeParse({ action: 'do_not_respond' }).success).toBe(
			false,
		);
		expect(
			(grouped.inputSchema as z.ZodType).safeParse({ action: 'respond', input: uiInput }).success,
		).toBe(true);
		expect(
			(grouped.inputSchema as z.ZodType).safeParse({
				action: 'respond',
				input: { message: { text: 'Files' }, fileIds: ['file-1'] },
			}).success,
		).toBe(true);
	});

	it.each([
		{ action: 'respond', input: uiInput },
		{ action: 'send_channel_message', input: { channelId: 'COTHER', ...uiInput } },
	])('sends an interactive card through $action', async (operation) => {
		const params = setup();
		const descriptor = params.descriptors.find(
			(d) => d.integrationConnectionId === 'slack:cred-b',
		)!;
		const grouped = createIntegrationActionTool({ ...params, descriptor }).build();
		expect((grouped.inputSchema as z.ZodType).safeParse(operation).success).toBe(true);
		await grouped.handler!(operation, params.ctx);
		expect(params.actionExecutor.execute).toHaveBeenCalledExactlyOnceWith(
			expect.objectContaining({
				descriptor,
				action: operation.action,
				input: operation.input,
				awaitResponse: true,
			}),
		);
		expect(params.ctx.suspend).toHaveBeenCalledWith(
			expect.objectContaining({
				type: 'integration_action',
				integrationConnectionId: 'slack:cred-b',
			}),
			expect.anything(),
		);
	});
});
