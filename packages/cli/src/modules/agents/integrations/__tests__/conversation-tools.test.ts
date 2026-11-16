import type { InterruptibleToolContext } from '@n8n/agents';
import type { RichCardComponentType } from '@n8n/api-types';
import { mock } from 'vitest-mock-extended';
import type { z } from 'zod';

import { AgentChatIntegration } from '../agent-chat-integration';
import { createConversationTools } from '../conversation-tools';
import { encodeIntegrationMessageContext } from '../integration-message-context';
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
	const channel = new TestChannel(['button'], ['respond', 'do_not_respond', 'send_dm']);
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
		{ components: ['button'], actions: ['respond'], expected: ['render_ui'] },
		{ components: [], actions: ['respond', 'do_not_respond'], expected: ['do_not_respond'] },
		{
			components: ['button'],
			actions: ['respond', 'do_not_respond'],
			expected: ['render_ui', 'do_not_respond'],
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
		expect(tools.map(({ name }) => name)).toEqual(['render_ui', 'do_not_respond']);
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

	it('routes UI to the current connection and preserves interactive suspension', async () => {
		const { tool, actionExecutor, ctx } = setup();
		await tool('render_ui').handler!(uiInput, ctx);
		expect(actionExecutor.execute).toHaveBeenCalledExactlyOnceWith(
			expect.objectContaining({
				descriptor: expect.objectContaining({ integrationConnectionId: 'slack:cred-b' }),
				action: 'respond',
				input: uiInput,
				awaitResponse: true,
				fileScope: { projectId: 'project-1', threadId: 'thread-1' },
			}),
		);
		expect(ctx.suspend).toHaveBeenCalledWith(
			expect.objectContaining({
				type: 'integration_action',
				integrationConnectionId: 'slack:cred-b',
			}),
			expect.anything(),
		);
	});

	it('does not suspend for a display-only card', async () => {
		const { tool, actionExecutor, ctx } = setup();
		await tool('render_ui').handler!(
			{ message: { card: { components: [{ type: 'section', text: 'Result' }] } } },
			ctx,
		);
		expect(actionExecutor.execute).toHaveBeenCalledWith(
			expect.objectContaining({ awaitResponse: false }),
		);
		expect(ctx.suspend).not.toHaveBeenCalled();
	});

	it('requires a card for render_ui', () => {
		const { tool } = setup();
		expect(
			(tool('render_ui').inputSchema as z.ZodType).safeParse({ message: { text: 'Hello' } })
				.success,
		).toBe(false);
	});

	it.each([null, 'linear:cred-linear', 'slack:removed'])(
		'refuses an absent or unsupported current channel: %s',
		async (connectionId) => {
			const { tools, actionExecutor, ctx } = setup(connectionId);
			for (const tool of tools) {
				expect(await tool.handler!(tool.name === 'render_ui' ? uiInput : {}, ctx)).toMatchObject({
					ok: false,
				});
			}
			expect(actionExecutor.execute).not.toHaveBeenCalled();
		},
	);

	it('preserves channel approval for render_ui', async () => {
		const params = setup();
		params.descriptors.forEach((descriptor) => {
			descriptor.approval = { mode: 'global' };
		});
		const ui = params.tool('render_ui');
		await ui.handler!(uiInput, params.ctx);
		expect(params.actionExecutor.execute).not.toHaveBeenCalled();
		expect(params.ctx.suspend).toHaveBeenCalledWith(
			expect.objectContaining({ type: 'approval', toolName: 'respond' }),
			expect.anything(),
		);
	});

	it('returns an interactive answer without posting the card again', async () => {
		const { tool, actionExecutor, ctx } = setup();
		ctx.resumeData = { choice: 'continue' };
		expect(await tool('render_ui').handler!(uiInput, ctx)).toEqual({ choice: 'continue' });
		expect(actionExecutor.execute).not.toHaveBeenCalled();
	});

	it.each([true, false])('resumes a UI approval with approved=%s', async (approved) => {
		const { tool, ctx, actionExecutor } = setup();
		ctx.suspendPayload = { type: 'approval', toolName: 'respond' };
		ctx.resumeData = { approved };
		const result = await tool('render_ui').handler!(uiInput, ctx);
		if (approved) {
			expect(actionExecutor.execute).toHaveBeenCalledOnce();
		} else {
			expect(actionExecutor.execute).not.toHaveBeenCalled();
			expect(result).toMatchObject({ ok: false, error: { code: 'ACTION_DECLINED' } });
		}
	});

	it('preserves files on a UI request', async () => {
		const { tool, actionExecutor, ctx } = setup();
		await tool('render_ui').handler!({ ...uiInput, fileIds: ['file-1'] }, ctx);
		expect(actionExecutor.execute).toHaveBeenCalledWith(
			expect.objectContaining({ input: { ...uiInput, fileIds: ['file-1'] } }),
		);
	});

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

	it('moves UI and silence out of the grouped action schema', () => {
		const params = setup();
		const descriptor = params.descriptors.find((d) => d.integration.type === 'slack')!;
		const grouped = createIntegrationActionTool({ ...params, descriptor }).build();
		expect((grouped.inputSchema as z.ZodType).safeParse({ action: 'do_not_respond' }).success).toBe(
			false,
		);
		expect(
			(grouped.inputSchema as z.ZodType).safeParse({ action: 'respond', input: uiInput }).success,
		).toBe(false);
		expect(
			(grouped.inputSchema as z.ZodType).safeParse({
				action: 'respond',
				input: { message: { text: 'Files' }, fileIds: ['file-1'] },
			}).success,
		).toBe(true);
	});
});
