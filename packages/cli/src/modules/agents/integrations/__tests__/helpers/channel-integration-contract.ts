import type { Mock } from 'vitest';

import type { ChatIntegrationActionExecutor } from '../../integration-action-executor';
import { createIntegrationContextTool } from '../../integration-tools';
import type {
	IntegrationMessageContext,
	IntegrationMessageContextStore,
	IntegrationToolConnectionDescriptor,
} from '../../integration-tools';

export interface ChannelIntegrationReplayScenario {
	name: string;
	fixtures: {
		mention: unknown;
		followUp: unknown;
		selfMessage: unknown;
	};
	expected: {
		message: string;
		followUpMessage: string;
		integrationType: string;
		context: Partial<IntegrationMessageContext>;
		resourceId: string;
		firstPost: Record<string, unknown>;
		respondPost: Record<string, unknown>;
		respondTarget: Record<string, unknown>;
	};
	createContext: () => Promise<ChannelIntegrationReplayContext>;
}

export interface ChannelIntegrationReplayContext {
	agentExecutor: {
		executeForChatPublished: Mock;
	};
	actionExecutor: ChatIntegrationActionExecutor;
	descriptor: IntegrationToolConnectionDescriptor;
	messageContextStore: IntegrationMessageContextStore;
	sendWebhook: (payload: unknown) => Promise<Response>;
	latestContext: () => IntegrationMessageContext | undefined;
	latestThreadId: () => string | undefined;
	lastPost: () => { body: Record<string, unknown> } | undefined;
	shutdown: () => Promise<void>;
}

export function runSharedChannelIntegrationContract(scenario: ChannelIntegrationReplayScenario) {
	describe(`${scenario.name} shared channel integration contract`, () => {
		let ctx: ChannelIntegrationReplayContext;

		afterEach(async () => {
			await ctx?.shutdown();
		});

		it('handles mention, subscribes the thread, and routes follow-up messages', async () => {
			ctx = await scenario.createContext();

			await expect(ctx.sendWebhook(scenario.fixtures.mention)).resolves.toMatchObject({
				status: 200,
			});
			expect(ctx.agentExecutor.executeForChatPublished).toHaveBeenCalledTimes(1);
			expect(ctx.agentExecutor.executeForChatPublished).toHaveBeenCalledWith(
				expect.objectContaining({
					agentId: 'agent-1',
					projectId: 'project-1',
					message: scenario.expected.message,
					integrationType: scenario.expected.integrationType,
				}),
			);
			expect(ctx.lastPost()?.body).toMatchObject(scenario.expected.firstPost);

			await ctx.sendWebhook(scenario.fixtures.followUp);
			expect(ctx.agentExecutor.executeForChatPublished).toHaveBeenCalledTimes(2);
			expect(ctx.agentExecutor.executeForChatPublished).toHaveBeenLastCalledWith(
				expect.objectContaining({ message: scenario.expected.followUpMessage }),
			);
		});

		it('persists current message context for the integration context tool', async () => {
			ctx = await scenario.createContext();

			await ctx.sendWebhook(scenario.fixtures.mention);
			const context = ctx.latestContext();
			expect(context).toMatchObject(scenario.expected.context);

			const threadId = ctx.latestThreadId();
			if (!threadId) throw new Error('Expected a latest thread ID');
			const contextTool = createIntegrationContextTool({
				descriptor: ctx.descriptor,
				queryExecutor: {
					execute: vi.fn(),
				},
				messageContextStore: ctx.messageContextStore,
			}).build();

			const result = await contextTool.handler!(
				{ query: 'get_current_message_context', input: {} },
				{ persistence: { threadId, resourceId: scenario.expected.resourceId } },
			);

			expect(result).toEqual({ ok: true, context });
		});

		it('responds in the latest thread through the integration action executor', async () => {
			ctx = await scenario.createContext();

			await ctx.sendWebhook(scenario.fixtures.mention);
			const context = ctx.latestContext();
			expect(context).toMatchObject(scenario.expected.context);

			const result = await ctx.actionExecutor.execute({
				descriptor: ctx.descriptor,
				action: 'respond',
				input: { message: { text: 'Action response' } },
				awaitResponse: false,
				currentMessageContext: context,
			});

			expect(result).toMatchObject({
				ok: true,
				messageContext: {
					platform: scenario.expected.integrationType,
					target: scenario.expected.respondTarget,
				},
			});
			expect(ctx.lastPost()?.body).toMatchObject(scenario.expected.respondPost);
		});

		it('ignores messages authored by the connected bot', async () => {
			ctx = await scenario.createContext();

			await ctx.sendWebhook(scenario.fixtures.selfMessage);

			expect(ctx.agentExecutor.executeForChatPublished).not.toHaveBeenCalled();
		});
	});
}
