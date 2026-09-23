import { UserError } from 'n8n-workflow';

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
	whatsAppInboundAudioMessage,
	whatsAppInboundContactsMessage,
	whatsAppInboundDocumentMessage,
	whatsAppInboundImageMessage,
	whatsAppInboundLocationMessage,
	whatsAppInboundStickerMessage,
	whatsAppInboundTextMessage,
	whatsAppInboundVideoMessage,
	whatsAppInboundVoiceMessage,
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

	describe('inbound media', () => {
		it.each([
			['image', whatsAppInboundImageMessage, 'image/jpeg'],
			['document', whatsAppInboundDocumentMessage, 'application/pdf'],
			['audio', whatsAppInboundAudioMessage, 'audio/mpeg'],
			// Sniffed from real Opus/OGG magic bytes (see WHATSAPP_MEDIA_CONTENT) —
			// the codec parameter comes from the sniffer, not the declared type.
			['voice', whatsAppInboundVoiceMessage, 'audio/ogg; codecs=opus'],
			['video', whatsAppInboundVideoMessage, 'video/mp4'],
			['sticker', whatsAppInboundStickerMessage, 'image/webp'],
		] as const)(
			'stores a %s attachment and passes it to the agent executor',
			async (_label, buildMessage, expectedMimeType) => {
				const fixtures = whatsAppReplayFixtures();
				const ctx = await createWhatsAppReplayContext(fixtures);
				try {
					await ctx.sendWebhook(
						whatsAppWebhook({
							phoneNumberId: fixtures.phoneNumberId,
							contact: fixtures.contact,
							message: buildMessage({ from: fixtures.contact.wa_id }),
						}),
					);

					expect(ctx.attachmentService.storeInbound).toHaveBeenCalledExactlyOnceWith(
						expect.objectContaining({
							source: 'whatsapp',
							mimeType: expectedMimeType,
							data: expect.any(Buffer),
						}),
					);
					expect(ctx.agentExecutor.executeForChatPublished).toHaveBeenCalledExactlyOnceWith(
						expect.objectContaining({
							attachments: [expect.objectContaining({ mimeType: expectedMimeType })],
						}),
					);
				} finally {
					await ctx.shutdown();
				}
			},
		);

		it('degrades to a text note instead of storing an attachment over the size cap', async () => {
			// WhatsApp's inbound media messages never carry a declared size (see
			// `WhatsAppInboundMessage`), unlike some other platforms — so this can
			// only ever be caught after downloading, never pre-empted upfront.
			const fixtures = whatsAppReplayFixtures();
			const ctx = await createWhatsAppReplayContext(fixtures);
			try {
				await ctx.sendWebhook(
					whatsAppWebhook({
						phoneNumberId: fixtures.phoneNumberId,
						contact: fixtures.contact,
						message: whatsAppInboundDocumentMessage({
							from: fixtures.contact.wa_id,
							document: {
								id: 'media-oversized-1',
								mime_type: 'application/pdf',
								sha256: 'test-sha256-oversized',
								filename: 'big.pdf',
							},
						}),
					}),
				);

				expect(ctx.attachmentService.storeInbound).not.toHaveBeenCalled();
				expect(ctx.agentExecutor.executeForChatPublished).toHaveBeenCalledExactlyOnceWith(
					expect.objectContaining({ message: expect.stringContaining('MB') }),
				);
			} finally {
				await ctx.shutdown();
			}
		});

		it('falls back to the location text summary instead of a stored attachment', async () => {
			// The adapter represents a location as a URL-only pseudo-file (a Google
			// Maps link, no `fetchData`/bytes), which the bridge's generic
			// attachment pipeline can't download — so it degrades to a text note
			// rather than a stored attachment. Not a WhatsApp integration choice;
			// this documents the adapter's actual behavior at the pinned version.
			const fixtures = whatsAppReplayFixtures();
			const ctx = await createWhatsAppReplayContext(fixtures);
			try {
				await ctx.sendWebhook(
					whatsAppWebhook({
						phoneNumberId: fixtures.phoneNumberId,
						contact: fixtures.contact,
						message: whatsAppInboundLocationMessage({ from: fixtures.contact.wa_id }),
					}),
				);

				expect(ctx.attachmentService.storeInbound).not.toHaveBeenCalled();
				expect(ctx.agentExecutor.executeForChatPublished).toHaveBeenCalledExactlyOnceWith(
					expect.objectContaining({ message: expect.stringContaining('Location') }),
				);
			} finally {
				await ctx.shutdown();
			}
		});

		it('drops a contacts message entirely — the adapter has no handling for it', async () => {
			// Documents a real gap in the pinned adapter version: `type: "contacts"`
			// has no structured field on `WhatsAppInboundMessage` and no text
			// fallback, so the message never reaches n8n at all. Not something this
			// integration can fix without the version bump we already ruled out.
			const fixtures = whatsAppReplayFixtures();
			const ctx = await createWhatsAppReplayContext(fixtures);
			try {
				await ctx.sendWebhook(
					whatsAppWebhook({
						phoneNumberId: fixtures.phoneNumberId,
						contact: fixtures.contact,
						message: whatsAppInboundContactsMessage({ from: fixtures.contact.wa_id }),
					}),
				);

				expect(ctx.agentExecutor.executeForChatPublished).not.toHaveBeenCalled();
			} finally {
				await ctx.shutdown();
			}
		});
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
