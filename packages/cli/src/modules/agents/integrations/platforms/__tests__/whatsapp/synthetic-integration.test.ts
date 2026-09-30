import { UserError } from 'n8n-workflow';

import { deriveWhatsAppVerifyToken } from '../../../integration-helpers';
import { encodeIntegrationMessageContext } from '../../../integration-message-context';
import { createIntegrationContextTool } from '../../../integration-tools';
import type { NormalizeComponentsContext, SuspendComponent } from '../../../component-mapper';
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

	describe('normalizeComponents', () => {
		// Mirrors wrapValueForSchema's no-schema fallback (component-mapper.ts) —
		// these tests call normalizeComponents directly, not through the full
		// toCard pipeline, so this stands in for the real resume-value wrapper.
		const testNormalizeContext: NormalizeComponentsContext = {
			runId: 'run-1',
			toolCallId: 'tool-1',
			wrapResumeValue: (rawValue) => JSON.stringify({ value: rawValue }),
		};

		it('passes components through unchanged when there are 3 or fewer buttons', () => {
			const integration = createWhatsAppIntegration();
			const components: SuspendComponent[] = [{ type: 'section', text: 'Pick one' }, ...buttons(3)];

			expect(integration.normalizeComponents(components, testNormalizeContext)).toEqual(components);
		});

		it('converts overflow buttons into a WhatsApp list when there are more than 3', () => {
			const integration = createWhatsAppIntegration();
			const section: SuspendComponent = { type: 'section', text: 'Pick one' };
			const components: SuspendComponent[] = [section, ...buttons(4)];

			const normalized = integration.normalizeComponents(components, testNormalizeContext);

			expect(normalized.filter((c) => c.type === 'button')).toHaveLength(0);
			expect(normalized[0]).toEqual(section);
			expect(normalized.at(-1)).toMatchObject({
				type: 'select',
				// A `resume:` id, not the generic `ri-sel:` one — options
				// resume like buttons, matching a real button's own encoding.
				id: 'resume:run-1:tool-1:0',
				options: [
					{ label: 'Option 1', value: JSON.stringify({ value: 'opt-1' }) },
					{ label: 'Option 2', value: JSON.stringify({ value: 'opt-2' }) },
					{ label: 'Option 3', value: JSON.stringify({ value: 'opt-3' }) },
					{ label: 'Option 4', value: JSON.stringify({ value: 'opt-4' }) },
				],
			});
		});

		it('merges overflow buttons into an existing select instead of pushing a second one', () => {
			const integration = createWhatsAppIntegration();
			const existingSelect: SuspendComponent = {
				type: 'select',
				label: 'Pick a size',
				options: [{ label: 'Small', value: 'small' }],
			};
			const components: SuspendComponent[] = [existingSelect, ...buttons(4)];

			const normalized = integration.normalizeComponents(components, testNormalizeContext);

			expect(normalized.filter((c) => c.type === 'select')).toHaveLength(1);
			expect(normalized.filter((c) => c.type === 'button')).toHaveLength(0);
			expect(normalized[0]).toMatchObject({
				type: 'select',
				label: 'Pick a size',
				options: [
					{ label: 'Small', value: 'small' },
					{ label: 'Option 1', value: 'opt-1' },
					{ label: 'Option 2', value: 'opt-2' },
					{ label: 'Option 3', value: 'opt-3' },
					{ label: 'Option 4', value: 'opt-4' },
				],
			});
		});
	});

	describe('interactive list message for more than 3 options', () => {
		const fourButtonSuspendStream = (runId: string, toolCallId: string) => [
			{
				type: 'tool-call-suspended' as const,
				runId,
				toolCallId,
				toolName: 'select',
				suspendPayload: {
					type: 'form' as const,
					toolName: 'pick_starter',
					displayName: 'Choose Your Starter',
					components: [
						{ type: 'button' as const, label: 'Bulbasaur', value: 'bulbasaur' },
						{ type: 'button' as const, label: 'Charmander', value: 'charmander' },
						{ type: 'button' as const, label: 'Squirtle', value: 'squirtle' },
						{ type: 'button' as const, label: 'Pikachu', value: 'pikachu' },
					],
				},
			},
			{ type: 'finish' as const, finishReason: 'stop' as const },
		];

		it('sends a real WhatsApp list message instead of falling back to broken text', async () => {
			const fixtures = whatsAppReplayFixtures();
			const ctx = await createWhatsAppReplayContext(fixtures, {
				stream: fourButtonSuspendStream('run-select-1', 'tool-select-1'),
			});
			try {
				await ctx.sendWebhook(fixtures.mention);

				expect(ctx.lastPost()?.body).toMatchObject({
					type: 'interactive',
					interactive: {
						type: 'list',
						action: {
							sections: [
								{
									rows: [
										{ title: 'Bulbasaur' },
										{ title: 'Charmander' },
										{ title: 'Squirtle' },
										{ title: 'Pikachu' },
									],
								},
							],
						},
					},
				});
			} finally {
				await ctx.shutdown();
			}
		});

		it("drops a list option whose encoded id would exceed WhatsApp's row id limit", async () => {
			const fixtures = whatsAppReplayFixtures();
			const longValue = 'x'.repeat(250);
			const ctx = await createWhatsAppReplayContext(fixtures, {
				stream: [
					{
						type: 'tool-call-suspended',
						runId: 'run-select-3',
						toolCallId: 'tool-select-3',
						toolName: 'select',
						suspendPayload: {
							type: 'form',
							toolName: 'pick_starter',
							displayName: 'Choose Your Starter',
							components: [
								{ type: 'button', label: 'Bulbasaur', value: 'bulbasaur' },
								{ type: 'button', label: 'Charmander', value: 'charmander' },
								{ type: 'button', label: 'Squirtle', value: 'squirtle' },
								{ type: 'button', label: 'Pikachu', value: longValue },
							],
						},
					},
					{ type: 'finish', finishReason: 'stop' },
				],
			});
			try {
				await ctx.sendWebhook(fixtures.mention);

				const body = ctx.lastPost()?.body as {
					interactive: { action: { sections: Array<{ rows: Array<{ title: string }> }> } };
				};
				const titles = body.interactive.action.sections[0].rows.map((r) => r.title);
				expect(titles).toEqual(['Bulbasaur', 'Charmander', 'Squirtle']);
			} finally {
				await ctx.shutdown();
			}
		});

		it('lets a valid option past position ten fill the slot of a dropped oversized one', async () => {
			const fixtures = whatsAppReplayFixtures();
			const longValue = 'x'.repeat(250);
			// 11 options: the first is oversized and dropped, leaving exactly 10
			// valid ones — filtering before slicing must keep all 10, not stop
			// at whichever 10 came first and lose "Option 10" to the drop.
			const components: SuspendComponent[] = [
				{ type: 'button', label: 'Option 0', value: longValue },
				...Array.from({ length: 10 }, (_, i) => ({
					type: 'button' as const,
					label: `Option ${i + 1}`,
					value: `opt-${i + 1}`,
				})),
			];
			const ctx = await createWhatsAppReplayContext(fixtures, {
				stream: [
					{
						type: 'tool-call-suspended',
						runId: 'run-select-4',
						toolCallId: 'tool-select-4',
						toolName: 'select',
						suspendPayload: {
							type: 'form',
							toolName: 'pick_option',
							displayName: 'Choose one',
							components,
						},
					},
					{ type: 'finish', finishReason: 'stop' },
				],
			});
			try {
				await ctx.sendWebhook(fixtures.mention);

				const body = ctx.lastPost()?.body as {
					interactive: { action: { sections: Array<{ rows: Array<{ title: string }> }> } };
				};
				const titles = body.interactive.action.sections[0].rows.map((r) => r.title);
				expect(titles).toHaveLength(10);
				expect(titles).not.toContain('Option 0');
				expect(titles).toContain('Option 10');
			} finally {
				await ctx.shutdown();
			}
		});

		it('resumes the suspended run when the user taps a real list option', async () => {
			const fixtures = whatsAppReplayFixtures();
			const ctx = await createWhatsAppReplayContext(fixtures, {
				stream: fourButtonSuspendStream('run-select-2', 'tool-select-2'),
			});
			try {
				await ctx.sendWebhook(fixtures.mention);

				const body = ctx.lastPost()?.body as {
					interactive: {
						action: { sections: Array<{ rows: Array<{ id: string; title: string }> }> };
					};
				};
				const picked = body.interactive.action.sections[0].rows[1];
				expect(picked.title).toBe('Charmander');

				ctx.nextStream([
					{ type: 'text-delta', id: 'resume-text', delta: 'Great choice' },
					{ type: 'finish', finishReason: 'stop' },
				]);
				await ctx.sendWebhook(
					whatsAppWebhook({
						phoneNumberId: fixtures.phoneNumberId,
						contact: fixtures.contact,
						message: {
							from: fixtures.contact.wa_id,
							id: 'wamid.TEST_RESUME_0001',
							timestamp: String(Math.floor(Date.now() / 1000)),
							type: 'interactive',
							interactive: {
								type: 'list_reply',
								list_reply: { id: picked.id, title: picked.title },
							},
						},
					}),
				);

				expect(ctx.agentExecutor.resumeForChat).toHaveBeenCalledWith(
					expect.objectContaining({
						runId: 'run-select-2',
						toolCallId: 'tool-select-2',
						integrationType: 'whatsapp',
						// The `resume:` encoding (see normalizeComponents) resumes like a
						// real button — `{ value }`, not a select's `{ type, id, value }`.
						resumeData: { value: 'charmander' },
					}),
				);
				expect(ctx.lastPost()?.body).toMatchObject({
					to: fixtures.contact.wa_id,
					type: 'text',
					text: { body: 'Great choice' },
				});
			} finally {
				await ctx.shutdown();
			}
		});

		it("resumes with the tool's own resume-schema shape, not a select's, when the schema is set", async () => {
			const fixtures = whatsAppReplayFixtures();
			const ctx = await createWhatsAppReplayContext(fixtures, {
				stream: [
					{
						type: 'tool-call-suspended',
						runId: 'run-select-5',
						toolCallId: 'tool-select-5',
						toolName: 'select',
						suspendPayload: {
							type: 'form',
							toolName: 'pick_starter',
							displayName: 'Choose Your Starter',
							components: [
								{ type: 'button', label: 'Bulbasaur', value: 'bulbasaur' },
								{ type: 'button', label: 'Charmander', value: 'charmander' },
								{ type: 'button', label: 'Squirtle', value: 'squirtle' },
								{ type: 'button', label: 'Pikachu', value: 'pikachu' },
							],
						},
						// The interactive-card resume schema: matches the branch in
						// wrapValueForSchema that produces { type: 'button', value }.
						resumeSchema: {
							type: 'object',
							properties: { type: { type: 'string' }, value: { type: 'string' } },
						},
					},
					{ type: 'finish', finishReason: 'stop' },
				],
			});
			try {
				await ctx.sendWebhook(fixtures.mention);

				const body = ctx.lastPost()?.body as {
					interactive: {
						action: { sections: Array<{ rows: Array<{ id: string; title: string }> }> };
					};
				};
				const picked = body.interactive.action.sections[0].rows[1];
				expect(picked.title).toBe('Charmander');

				ctx.nextStream([
					{ type: 'text-delta', id: 'resume-text', delta: 'Great choice' },
					{ type: 'finish', finishReason: 'stop' },
				]);
				await ctx.sendWebhook(
					whatsAppWebhook({
						phoneNumberId: fixtures.phoneNumberId,
						contact: fixtures.contact,
						message: {
							from: fixtures.contact.wa_id,
							id: 'wamid.TEST_RESUME_SCHEMA_0001',
							timestamp: String(Math.floor(Date.now() / 1000)),
							type: 'interactive',
							interactive: {
								type: 'list_reply',
								list_reply: { id: picked.id, title: picked.title },
							},
						},
					}),
				);

				// Without the fix, this would be { type: 'select', id, value } —
				// the select decode path's fixed shape, ignoring the schema.
				expect(ctx.agentExecutor.resumeForChat).toHaveBeenCalledWith(
					expect.objectContaining({
						resumeData: { type: 'button', value: 'charmander' },
					}),
				);
			} finally {
				await ctx.shutdown();
			}
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

	describe('handleUnauthenticatedWebhook', () => {
		// createWhatsAppIntegration() wires a fixed 'test-hmac-signature-secret', so
		// the expected token for 'agent-1' is derivable the same way the real
		// verify-token endpoint derives it.
		const expectedToken = deriveWhatsAppVerifyToken('test-hmac-signature-secret', 'agent-1');

		it("answers Meta's handshake with the raw challenge when the token matches", () => {
			const integration = createWhatsAppIntegration();

			const result = integration.handleUnauthenticatedWebhook({
				agentId: 'agent-1',
				method: 'GET',
				query: {
					'hub.mode': 'subscribe',
					'hub.verify_token': expectedToken,
					'hub.challenge': '12345',
				},
				headers: {},
				body: undefined,
			});

			expect(result).toEqual({ status: 200, body: '12345', raw: true });
		});

		it('rejects the handshake when the verify token does not match', () => {
			const integration = createWhatsAppIntegration();

			const result = integration.handleUnauthenticatedWebhook({
				agentId: 'agent-1',
				method: 'GET',
				query: {
					'hub.mode': 'subscribe',
					'hub.verify_token': 'wrong-token',
					'hub.challenge': '12345',
				},
				headers: {},
				body: undefined,
			});

			expect(result).toEqual({ status: 403, body: 'Forbidden', raw: true });
		});

		it('falls through for a non-GET request', () => {
			const integration = createWhatsAppIntegration();

			const result = integration.handleUnauthenticatedWebhook({
				agentId: 'agent-1',
				method: 'POST',
				query: {
					'hub.mode': 'subscribe',
					'hub.verify_token': expectedToken,
					'hub.challenge': '12345',
				},
				headers: {},
				body: {},
			});

			expect(result).toBeUndefined();
		});

		it.each([
			[
				'wrong mode',
				{ 'hub.mode': 'unsubscribe', 'hub.verify_token': expectedToken, 'hub.challenge': '12345' },
			],
			['missing verify_token', { 'hub.mode': 'subscribe', 'hub.challenge': '12345' }],
			['missing challenge', { 'hub.mode': 'subscribe', 'hub.verify_token': expectedToken }],
		])('falls through when the request is not a real handshake (%s)', (_label, query) => {
			const integration = createWhatsAppIntegration();

			const result = integration.handleUnauthenticatedWebhook({
				agentId: 'agent-1',
				method: 'GET',
				query,
				headers: {},
				body: undefined,
			});

			expect(result).toBeUndefined();
		});
	});
});
