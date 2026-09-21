import { OperationalError, UserError } from 'n8n-workflow';

import { deriveWhatsAppVerifyToken } from '../../../integration-helpers';
import { encodeIntegrationMessageContext } from '../../../integration-message-context';
import { createIntegrationContextTool } from '../../../integration-tools';
import type { SuspendComponent } from '../../../component-mapper';
import {
	createWhatsAppIntegration,
	createWhatsAppReplayContext,
	whatsAppThreadId,
} from '../../../__tests__/helpers/whatsapp/replay-test-context';
import {
	whatsAppInboundTextMessage,
	whatsAppReplayFixtures,
	whatsAppWebhook,
} from '../../../__tests__/helpers/whatsapp/synthetic-fixtures';

// The chat SDK + adapters are ESM-only. Production loads them via esm-loader's
// `new Function()` hack to dodge the CJS transform, which can't run under vitest;
// redirect the loaders to native dynamic imports so the real adapters are used.
vi.mock('../../../esm-loader', () => ({
	loadChatSdk: async () => await import('chat'),
	loadMemoryState: async () => await import('@chat-adapter/state-memory'),
	loadWhatsAppAdapter: async () => await import('@chat-adapter/whatsapp'),
	loadChatAdapterShared: async () => await import('@chat-adapter/shared'),
}));

const buttons = (count: number): SuspendComponent[] =>
	Array.from({ length: count }, (_, i) => ({
		type: 'button',
		label: `Option ${i + 1}`,
		value: `opt-${i + 1}`,
	}));

describe('WhatsApp Cloud API integration scenarios', () => {
	// NOTE: WhatsApp is intentionally not in the shared channel-integration
	// contract (see channel-integration-contract.test.ts). Its mention/DM,
	// subscribe+follow-up, and context-persistence behavior fits the contract's
	// model, but the "ignores messages authored by the connected bot" case does
	// not: the real adapter's inbound path (`buildMessage`, used for every
	// webhook-delivered message) hardcodes `author.isMe: false` unconditionally,
	// and the Cloud API never delivers a business's own outbound sends back
	// through the inbound webhook. There is no real payload that produces a
	// self-authored inbound message, so the equivalent behaviors are covered
	// directly here instead.

	it('routes an inbound WhatsApp message to a new agent conversation and posts the reply', async () => {
		const fixtures = whatsAppReplayFixtures();
		const ctx = await createWhatsAppReplayContext(fixtures);
		try {
			await ctx.sendWebhook(fixtures.mention);

			expect(ctx.agentExecutor.executeForChatPublished).toHaveBeenCalledTimes(1);
			expect(ctx.agentExecutor.executeForChatPublished).toHaveBeenCalledWith(
				expect.objectContaining({
					message: 'hello agent',
					author: { id: fixtures.contact.wa_id, name: fixtures.contact.profile.name },
					integrationType: 'whatsapp',
				}),
			);
			expect(ctx.lastPost()?.body).toMatchObject({
				to: fixtures.contact.wa_id,
				type: 'text',
				text: { body: 'Got it' },
			});
		} finally {
			await ctx.shutdown();
		}
	});

	it('routes a follow-up message in the same WhatsApp conversation', async () => {
		const fixtures = whatsAppReplayFixtures();
		const ctx = await createWhatsAppReplayContext(fixtures);
		try {
			await ctx.sendWebhook(fixtures.mention);
			await ctx.sendWebhook(fixtures.followUp);

			expect(ctx.agentExecutor.executeForChatPublished).toHaveBeenCalledTimes(2);
			expect(ctx.agentExecutor.executeForChatPublished).toHaveBeenLastCalledWith(
				expect.objectContaining({ message: 'follow up' }),
			);
		} finally {
			await ctx.shutdown();
		}
	});

	it('persists current message context for the integration context tool', async () => {
		const fixtures = whatsAppReplayFixtures();
		const ctx = await createWhatsAppReplayContext(fixtures);
		try {
			await ctx.sendWebhook(fixtures.mention);
			const context = ctx.latestContext();
			const platformThreadId = whatsAppThreadId(fixtures);
			expect(context).toMatchObject({
				integrationConnectionId: 'whatsapp:cred-whatsapp',
				platform: 'whatsapp',
				messageId: 'wamid.TEST_INBOUND_0001',
				interactingUserId: fixtures.contact.wa_id,
				target: { threadId: platformThreadId, channelId: platformThreadId },
			});

			const threadId = ctx.latestThreadId();
			if (!threadId) throw new Error('Expected a latest thread ID');
			const contextTool = createIntegrationContextTool({
				descriptor: ctx.descriptor,
				queryExecutor: { execute: vi.fn() },
			}).build();

			const result = await contextTool.handler!(
				{ query: 'get_current_message_context', input: {} },
				{
					persistence: {
						threadId,
						resourceId: fixtures.contact.wa_id,
						hostMetadata: encodeIntegrationMessageContext(context ?? null),
					},
				},
			);
			expect(result).toEqual({ ok: true, context });
		} finally {
			await ctx.shutdown();
		}
	});

	it('responds in the latest WhatsApp conversation through the integration action executor', async () => {
		const fixtures = whatsAppReplayFixtures();
		const ctx = await createWhatsAppReplayContext(fixtures);
		try {
			await ctx.sendWebhook(fixtures.mention);
			const context = ctx.latestContext();

			// The inbound message already marked this turn with a reply
			// expectation, so a plain-text respond is rejected — the reply was
			// already delivered by the bridge's auto-reply.
			const rejected = await ctx.actionExecutor.execute({
				descriptor: ctx.descriptor,
				action: 'respond',
				input: { message: { text: 'Action response' } },
				awaitResponse: false,
				currentMessageContext: context,
			});
			expect(rejected).toMatchObject({ ok: false, error: { code: 'ACTION_FAILED' } });

			const result = await ctx.actionExecutor.execute({
				descriptor: ctx.descriptor,
				action: 'respond',
				input: { message: { text: 'Action response' } },
				awaitResponse: false,
				currentMessageContext: { ...context!, replyExpectation: undefined },
			});

			const threadId = whatsAppThreadId(fixtures);
			expect(result).toMatchObject({
				ok: true,
				messageContext: { platform: 'whatsapp', target: { threadId } },
			});
			expect(ctx.lastPost()?.body).toMatchObject({
				to: fixtures.contact.wa_id,
				type: 'text',
				text: { body: 'Action response' },
			});
		} finally {
			await ctx.shutdown();
		}
	});

	describe('24-hour customer service window', () => {
		it('sends a reply while the customer service window is open', async () => {
			const fixtures = whatsAppReplayFixtures();
			const ctx = await createWhatsAppReplayContext(fixtures);
			try {
				await ctx.sendWebhook(fixtures.mention);

				const threadId = whatsAppThreadId(fixtures);
				await expect(
					ctx.adapter.postMessage(threadId, { markdown: 'Still there?' }),
				).resolves.toBeDefined();
				expect(ctx.lastPost()?.body).toMatchObject({
					to: fixtures.contact.wa_id,
					text: { body: 'Still there?' },
				});
			} finally {
				await ctx.shutdown();
			}
		});

		it('rejects a reply after the customer service window has closed', async () => {
			const fixtures = whatsAppReplayFixtures();
			const ctx = await createWhatsAppReplayContext(fixtures);
			try {
				const expiredTimestamp = Math.floor(Date.now() / 1000) - 25 * 60 * 60;
				await ctx.sendWebhook(
					whatsAppWebhook({
						phoneNumberId: fixtures.phoneNumberId,
						contact: fixtures.contact,
						message: whatsAppInboundTextMessage({
							id: 'wamid.TEST_INBOUND_OLD',
							timestamp: String(expiredTimestamp),
						}),
					}),
				);
				// The bridge's own auto-reply to the message above is already
				// blocked by the guard (its "last inbound" is the message it is
				// replying to), so no send has succeeded yet.
				expect(ctx.apiCalls).toHaveLength(0);

				const threadId = whatsAppThreadId(fixtures);
				await expect(
					ctx.adapter.postMessage(threadId, { markdown: 'Still there?' }),
				).rejects.toThrow(UserError);
				expect(ctx.apiCalls).toHaveLength(0);
			} finally {
				await ctx.shutdown();
			}
		});

		it('rejects a streamed reply after the customer service window has closed', async () => {
			const fixtures = whatsAppReplayFixtures();
			const ctx = await createWhatsAppReplayContext(fixtures);
			try {
				const expiredTimestamp = Math.floor(Date.now() / 1000) - 25 * 60 * 60;
				await ctx.sendWebhook(
					whatsAppWebhook({
						phoneNumberId: fixtures.phoneNumberId,
						contact: fixtures.contact,
						message: whatsAppInboundTextMessage({
							id: 'wamid.TEST_INBOUND_OLD',
							timestamp: String(expiredTimestamp),
						}),
					}),
				);

				const threadId = whatsAppThreadId(fixtures);
				const textStream = (async function* () {
					yield 'Still there?';
				})();
				await expect(ctx.adapter.stream(threadId, textStream)).rejects.toThrow(UserError);
				expect(ctx.apiCalls).toHaveLength(0);
			} finally {
				await ctx.shutdown();
			}
		});
	});

	describe('rate limit backoff', () => {
		afterEach(() => {
			vi.useRealTimers();
		});

		it('retries a send after transient rate-limit errors and eventually succeeds', async () => {
			vi.useFakeTimers();
			const fixtures = whatsAppReplayFixtures();
			const ctx = await createWhatsAppReplayContext(fixtures, {
				failureSequence: { count: 2, code: 130429 },
			});
			try {
				const threadId = whatsAppThreadId(fixtures);
				const promise = ctx.adapter.postMessage(threadId, { markdown: 'Still there?' });
				await vi.runAllTimersAsync();

				await expect(promise).resolves.toBeDefined();
				// 2 rate-limited attempts, then a 3rd that succeeds.
				expect(ctx.apiCalls).toHaveLength(3);
			} finally {
				await ctx.shutdown();
			}
		});

		it('exhausts retries and throws an OperationalError the shared rate-limit guard can detect', async () => {
			vi.useFakeTimers();
			const fixtures = whatsAppReplayFixtures();
			const ctx = await createWhatsAppReplayContext(fixtures, {
				failureSequence: { count: Infinity, code: 130429 },
			});
			try {
				const threadId = whatsAppThreadId(fixtures);
				const promise = ctx.adapter.postMessage(threadId, { markdown: 'Still there?' });

				let caught: unknown;
				const assertion = promise.catch((error: unknown) => {
					caught = error;
				});
				await vi.runAllTimersAsync();
				await assertion;

				expect(caught).toBeInstanceOf(OperationalError);
				// Shaped so `httpStatusFromError` (and the shared ChannelRateLimitGuard
				// that reads it via `caughtIntegrationError`) recognises this as a 429.
				expect((caught as { response?: { status?: number } }).response?.status).toBe(429);
				// Every attempt is rate-limited, so all WHATSAPP_RATE_LIMIT_MAX_ATTEMPTS
				// are used up before giving up.
				expect(ctx.apiCalls).toHaveLength(4);
			} finally {
				await ctx.shutdown();
			}
		});

		it('lets the shared rate-limit guard block a WhatsApp connection after retries exhaust', async () => {
			vi.useFakeTimers();
			const fixtures = whatsAppReplayFixtures();
			const ctx = await createWhatsAppReplayContext(fixtures, {
				failureSequence: { count: Infinity, code: 130429 },
			});
			try {
				const threadId = whatsAppThreadId(fixtures);
				// Built directly rather than through a webhook: `respond` only needs
				// `target.threadId`, and no `replyExpectation` means the "already
				// replied this turn" precondition never triggers.
				const currentMessageContext = {
					integrationConnectionId: 'whatsapp:cred-whatsapp',
					platform: 'whatsapp',
					target: { type: 'thread' as const, threadId, channelId: threadId },
					messageId: 'wamid.SYNTHETIC',
					updatedAt: new Date().toISOString(),
				};
				const execute = async () =>
					await ctx.actionExecutor.execute({
						descriptor: ctx.descriptor,
						action: 'respond',
						input: { message: { text: 'Still there?' } },
						awaitResponse: false,
						currentMessageContext,
					});

				// First call: retries exhaust, the shared guard records the block.
				const firstResultPromise = execute();
				await vi.runAllTimersAsync();
				const firstResult = await firstResultPromise;

				expect(firstResult).toEqual({
					ok: false,
					error: { code: 'RATE_LIMIT_EXCEEDED', message: expect.stringContaining('WhatsApp') },
				});
				const callsAfterFirst = ctx.apiCalls.length;

				// Second call on the same connection: blocked before any API call —
				// no new backoff attempts, no new send.
				const secondResult = await execute();

				expect(secondResult).toEqual({
					ok: false,
					error: { code: 'RATE_LIMIT_EXCEEDED', message: expect.stringContaining('WhatsApp') },
				});
				expect(ctx.apiCalls).toHaveLength(callsAfterFirst);
			} finally {
				await ctx.shutdown();
			}
		});

		it('does not retry a non-rate-limit failure', async () => {
			const fixtures = whatsAppReplayFixtures();
			const ctx = await createWhatsAppReplayContext(fixtures, {
				// A template rejected for negative feedback (131051) is a real
				// content problem, not a transient rate limit.
				failureSequence: { count: Infinity, code: 131051 },
			});
			try {
				const threadId = whatsAppThreadId(fixtures);
				await expect(
					ctx.adapter.postMessage(threadId, { markdown: 'Still there?' }),
				).rejects.toThrow();
				expect(ctx.apiCalls).toHaveLength(1);
			} finally {
				await ctx.shutdown();
			}
		});
	});

	describe('normalizeComponents', () => {
		it('passes components through unchanged when there are 3 or fewer buttons', () => {
			const integration = createWhatsAppIntegration();
			const components: SuspendComponent[] = [{ type: 'section', text: 'Pick one' }, ...buttons(3)];

			expect(integration.normalizeComponents(components)).toEqual(components);
		});

		it('converts overflow buttons into a WhatsApp list when there are more than 3', () => {
			const integration = createWhatsAppIntegration();
			const section: SuspendComponent = { type: 'section', text: 'Pick one' };
			const components: SuspendComponent[] = [section, ...buttons(4)];

			const normalized = integration.normalizeComponents(components);

			expect(normalized.filter((c) => c.type === 'button')).toHaveLength(0);
			expect(normalized[0]).toEqual(section);
			expect(normalized.at(-1)).toMatchObject({
				type: 'select',
				options: [
					{ label: 'Option 1', value: 'opt-1' },
					{ label: 'Option 2', value: 'opt-2' },
					{ label: 'Option 3', value: 'opt-3' },
					{ label: 'Option 4', value: 'opt-4' },
				],
			});
		});
	});

	describe('deriveWhatsAppVerifyToken', () => {
		it('derives the same verify token for repeated calls with the same agent ID', () => {
			const first = deriveWhatsAppVerifyToken('encryption-key', 'agent-1');
			const second = deriveWhatsAppVerifyToken('encryption-key', 'agent-1');

			expect(first).toBe(second);
		});

		it('derives a different verify token for a different agent ID', () => {
			const first = deriveWhatsAppVerifyToken('encryption-key', 'agent-1');
			const second = deriveWhatsAppVerifyToken('encryption-key', 'agent-2');

			expect(first).not.toBe(second);
		});
	});
});
