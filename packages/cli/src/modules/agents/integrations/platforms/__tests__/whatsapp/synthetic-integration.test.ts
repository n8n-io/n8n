import type { Logger as BackendLogger } from '@n8n/backend-common';
import type { CacheService } from '@n8n/backend-services';
import type { AgentsConfig } from '@n8n/config';
import type { User } from '@n8n/db';
import { Container } from '@n8n/di';
import type { AgentIntegrationConfig } from '@n8n/api-types';
import type { Thread } from 'chat';
import { OperationalError, UserError, type Logger } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import type { ChatIntegrationService } from '../../../chat-integration.service';
import { ChatIntegrationRegistry } from '../../../agent-chat-integration';
import { ChatIntegrationContextQueryExecutor } from '../../../integration-context-query-executor';
import { deriveWhatsAppVerifyToken } from '../../../integration-helpers';
import { encodeIntegrationMessageContext } from '../../../integration-message-context';
import { createIntegrationContextTool } from '../../../integration-tools';
import type { NormalizeComponentsContext, SuspendComponent } from '../../../component-mapper';
import {
	draftChatMemoryResourceId,
	productionChatMemoryResourceId,
} from '../../../../utils/agent-memory-scope';
import {
	createWhatsAppIntegration,
	createWhatsAppReplayContext,
	whatsAppThreadId,
	type WhatsAppInboundMessageFixture,
} from '../../../__tests__/helpers/whatsapp/replay-test-context';
import {
	whatsAppContact,
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
import { WhatsAppOptionPagesStore } from '../../whatsapp/whatsapp-option-pages.store';
import { WhatsAppCredentialCheckService } from '../../whatsapp/whatsapp-credential-check.service';
import type { WhatsAppSetupTelemetryService } from '../../whatsapp/whatsapp-setup-telemetry.service';
import type { WhatsAppWebhookVerificationStore } from '../../whatsapp/whatsapp-webhook-verification.store';

// The chat SDK + adapters are ESM-only. Production loads them via esm-loader's
// `new Function()` hack to dodge the CJS transform, which can't run under vitest;
// redirect the loaders to native dynamic imports so the real adapters are used.
vi.mock('../../../esm-loader', () => ({
	loadChatSdk: async () => await import('chat'),
	loadMemoryState: async () => await import('@chat-adapter/state-memory'),
	loadWhatsAppAdapter: async () => await import('@chat-adapter/whatsapp'),
}));

const orderUpdateTemplate = {
	name: 'order_update',
	language: 'en_US',
	status: 'APPROVED',
	category: 'UTILITY',
	parameter_format: 'POSITIONAL',
	components: [
		{ type: 'HEADER', format: 'TEXT', text: 'Order update' },
		// Out of order on purpose: values are matched by number, not position.
		{ type: 'BODY', text: 'Your order {{2}} has shipped, {{1}}.' },
		{ type: 'FOOTER', text: 'Reply STOP to opt out' },
		{ type: 'BUTTONS', buttons: [{ type: 'QUICK_REPLY', text: 'Thanks' }] },
	],
};

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

	describe('failed free-form sends', () => {
		const failedStatusWebhook = (
			fixtures: ReturnType<typeof whatsAppReplayFixtures>,
			{
				code = 131047,
				id = 'wamid.FAILED_SEND',
				ageSeconds = 0,
			}: { code?: number; id?: string; ageSeconds?: number } = {},
		) => ({
			object: 'whatsapp_business_account',
			entry: [
				{
					id: 'waba-test-1',
					changes: [
						{
							field: 'messages',
							value: {
								messaging_product: 'whatsapp',
								metadata: { phone_number_id: fixtures.phoneNumberId },
								statuses: [
									{
										id,
										status: 'failed',
										timestamp: String(Math.floor(Date.now() / 1000) - ageSeconds),
										recipient_id: fixtures.contact.wa_id,
										errors: [{ code, title: 'Re-engagement message' }],
									},
								],
							},
						},
					],
				},
			],
		});

		it('starts an agent turn that tells the agent to send a template', async () => {
			const fixtures = whatsAppReplayFixtures();
			const ctx = await createWhatsAppReplayContext(fixtures);
			try {
				await ctx.sendWebhook(failedStatusWebhook(fixtures));

				expect(ctx.agentExecutor.executeForChatPublished).toHaveBeenCalledExactlyOnceWith(
					expect.objectContaining({
						message: expect.stringContaining('send_template'),
						messageContext: expect.objectContaining({
							target: expect.objectContaining({ threadId: whatsAppThreadId(fixtures) }),
							replyExpectation: 'optional',
						}),
					}),
				);
			} finally {
				await ctx.shutdown();
			}
		});

		it('starts one turn when Meta reports the same failure twice', async () => {
			const fixtures = whatsAppReplayFixtures();
			const ctx = await createWhatsAppReplayContext(fixtures);
			try {
				await ctx.sendWebhook(failedStatusWebhook(fixtures));
				await ctx.sendWebhook(failedStatusWebhook(fixtures));

				expect(ctx.agentExecutor.executeForChatPublished).toHaveBeenCalledTimes(1);
			} finally {
				await ctx.shutdown();
			}
		});

		it('starts a turn for each failed send up to the limit for the thread', async () => {
			const fixtures = whatsAppReplayFixtures();
			const ctx = await createWhatsAppReplayContext(fixtures);
			try {
				for (const id of ['wamid.A', 'wamid.B', 'wamid.C', 'wamid.D']) {
					await ctx.sendWebhook(failedStatusWebhook(fixtures, { id }));
				}

				expect(ctx.agentExecutor.executeForChatPublished).toHaveBeenCalledTimes(3);
			} finally {
				await ctx.shutdown();
			}
		});

		it('sends the report to the session that sent the failed message', async () => {
			const fixtures = whatsAppReplayFixtures();
			const ctx = await createWhatsAppReplayContext(fixtures);
			try {
				const customerThread = `agent-1:${whatsAppThreadId(fixtures)}`;
				await ctx.messageContextStore.bindSession(customerThread, {
					threadId: 'task-first',
					resourceId: 'task:first',
				});
				await ctx.messageContextStore.recordSentMessage(customerThread, 'wamid.SENT', {
					threadId: 'task-second',
					resourceId: 'task:second',
				});

				await ctx.sendWebhook(failedStatusWebhook(fixtures, { id: 'wamid.SENT' }));

				expect(ctx.agentExecutor.executeForChatPublished).toHaveBeenCalledExactlyOnceWith(
					expect.objectContaining({
						memory: expect.objectContaining({ resourceId: 'task:second' }),
					}),
				);
			} finally {
				await ctx.shutdown();
			}
		});

		it('sends the report to the bound session when the sender is not recorded', async () => {
			const fixtures = whatsAppReplayFixtures();
			const ctx = await createWhatsAppReplayContext(fixtures);
			try {
				await ctx.messageContextStore.bindSession(`agent-1:${whatsAppThreadId(fixtures)}`, {
					threadId: 'task-first',
					resourceId: 'task:first',
				});

				await ctx.sendWebhook(failedStatusWebhook(fixtures, { id: 'wamid.UNKNOWN' }));

				expect(ctx.agentExecutor.executeForChatPublished).toHaveBeenCalledExactlyOnceWith(
					expect.objectContaining({
						memory: expect.objectContaining({ resourceId: 'task:first' }),
					}),
				);
			} finally {
				await ctx.shutdown();
			}
		});

		it('queues the report in the chat that sent the failed message', async () => {
			const fixtures = whatsAppReplayFixtures();
			const ctx = await createWhatsAppReplayContext(fixtures);
			try {
				const customerThread = `agent-1:${whatsAppThreadId(fixtures)}`;
				await ctx.messageContextStore.bindSession(customerThread, {
					threadId: 'task-first',
					resourceId: 'task:first',
				});
				await ctx.messageContextStore.recordSentMessage(customerThread, 'wamid.CHAT', {
					threadId: 'chat-thread',
					resourceId: draftChatMemoryResourceId('user-1'),
				});

				await ctx.sendWebhook(failedStatusWebhook(fixtures, { id: 'wamid.CHAT' }));

				expect(ctx.agentExecutor.executeForChatPublished).not.toHaveBeenCalled();
				expect(ctx.chatQueued).toEqual([
					expect.objectContaining({
						kind: 'preview',
						userId: 'user-1',
						resourceId: draftChatMemoryResourceId('user-1'),
						messageId: 'delivery-failed:wamid.CHAT',
						message: expect.stringContaining('Tell the user'),
					}),
				]);
			} finally {
				await ctx.shutdown();
			}
		});

		it('queues the report for a production chat as an n8n chat message', async () => {
			const fixtures = whatsAppReplayFixtures();
			const ctx = await createWhatsAppReplayContext(fixtures);
			try {
				await ctx.messageContextStore.recordSentMessage(
					`agent-1:${whatsAppThreadId(fixtures)}`,
					'wamid.PROD',
					{ threadId: 'chat-thread', resourceId: productionChatMemoryResourceId('user-2') },
				);

				await ctx.sendWebhook(failedStatusWebhook(fixtures, { id: 'wamid.PROD' }));

				expect(ctx.chatQueued).toEqual([
					expect.objectContaining({ kind: 'n8n_chat', userId: 'user-2' }),
				]);
			} finally {
				await ctx.shutdown();
			}
		});

		it('does not start a turn for a failure that Meta reports long after it happened', async () => {
			const fixtures = whatsAppReplayFixtures();
			const ctx = await createWhatsAppReplayContext(fixtures);
			try {
				await ctx.sendWebhook(failedStatusWebhook(fixtures, { ageSeconds: 3 * 60 * 60 }));

				expect(ctx.agentExecutor.executeForChatPublished).not.toHaveBeenCalled();
			} finally {
				await ctx.shutdown();
			}
		});

		it('does not start a turn for a failure with another error code', async () => {
			const fixtures = whatsAppReplayFixtures();
			const ctx = await createWhatsAppReplayContext(fixtures);
			try {
				await ctx.sendWebhook(failedStatusWebhook(fixtures, { code: 131026 }));

				expect(ctx.agentExecutor.executeForChatPublished).not.toHaveBeenCalled();
			} finally {
				await ctx.shutdown();
			}
		});
	});

	describe('inbound media', () => {
		it.each([
			['image', whatsAppInboundImageMessage, 'image/jpeg'],
			['document', whatsAppInboundDocumentMessage, 'application/pdf'],
			['audio', whatsAppInboundAudioMessage, 'audio/mpeg'],
			// Real voice-note shape: `type: "audio"` with `audio.voice: true`. The
			// MIME type is sniffed from the Opus/OGG bytes in WHATSAPP_MEDIA_CONTENT.
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

		it('passes a location to the agent as a text summary only', async () => {
			// The adapter also adds the location as a URL-only pseudo-file (a Google
			// Maps link with no bytes). The bridge cannot download it, so the
			// integration drops it. Otherwise the agent gets a misleading
			// "could not be downloaded" note next to the summary.
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
					expect.objectContaining({ message: '[Location: London]' }),
				);
			} finally {
				await ctx.shutdown();
			}
		});

		it('passes a shared contact to the agent as a text summary', async () => {
			// The adapter has no handling for `contacts` and drops the message, so
			// the integration's adapter subclass summarizes it as text instead.
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

				expect(ctx.attachmentService.storeInbound).not.toHaveBeenCalled();
				expect(ctx.agentExecutor.executeForChatPublished).toHaveBeenCalledExactlyOnceWith(
					expect.objectContaining({ message: '[Contact: Jane Doe - +44 7700 900123]' }),
				);
			} finally {
				await ctx.shutdown();
			}
		});

		it.each([
			[
				'a contact with no name',
				[{ phones: [{ phone: '+44 7700 900123' }] }],
				'[Contact: +44 7700 900123]',
			],
			[
				'a contact with no phone numbers',
				[{ name: { formatted_name: 'Jane Doe' } }],
				'[Contact: Jane Doe]',
			],
			[
				'a contact with several phone numbers',
				[
					{
						name: { formatted_name: 'Jane Doe' },
						phones: [{ phone: '+44 7700 900123' }, { phone: '+44 20 7946 0000' }],
					},
				],
				'[Contact: Jane Doe - +44 7700 900123 - +44 20 7946 0000]',
			],
			[
				'several contacts',
				[
					{ name: { formatted_name: 'Jane Doe' }, phones: [{ phone: '+44 7700 900123' }] },
					{ name: { formatted_name: 'John Smith' } },
				],
				'[Contact: Jane Doe - +44 7700 900123]\n[Contact: John Smith]',
			],
			['a contact with no name or phone numbers', [{}], '[Contact]'],
			['an empty contacts list', [], '[Contact]'],
			['no contacts field', undefined, '[Contact]'],
		] as const)('summarizes %s', async (_label, contacts, expectedMessage) => {
			const fixtures = whatsAppReplayFixtures();
			const ctx = await createWhatsAppReplayContext(fixtures);
			try {
				await ctx.sendWebhook(
					whatsAppWebhook({
						phoneNumberId: fixtures.phoneNumberId,
						contact: fixtures.contact,
						message: whatsAppInboundContactsMessage({
							from: fixtures.contact.wa_id,
							contacts: contacts as WhatsAppInboundMessageFixture['contacts'],
						}),
					}),
				);

				expect(ctx.agentExecutor.executeForChatPublished).toHaveBeenCalledExactlyOnceWith(
					expect.objectContaining({ message: expectedMessage }),
				);
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
		// The typing indicator goes out as a read receipt, which Meta allows
		// outside the window, so only count the calls that send a message.
		const sentMessages = (ctx: { apiCalls: Array<{ body: Record<string, unknown> }> }) =>
			ctx.apiCalls.filter((call) => call.body.status !== 'read');

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

		it('sends a direct message to a customer phone number', async () => {
			const fixtures = whatsAppReplayFixtures();
			const ctx = await createWhatsAppReplayContext(fixtures);
			try {
				await ctx.sendWebhook(fixtures.mention);

				const result = await ctx.actionExecutor.execute({
					descriptor: ctx.descriptor,
					action: 'send_dm',
					input: { userId: fixtures.contact.wa_id, message: { text: 'Your order shipped' } },
					awaitResponse: false,
				});

				expect(result).toMatchObject({
					ok: true,
					messageContext: {
						target: { type: 'dm', userId: fixtures.contact.wa_id },
					},
				});
				expect(ctx.lastPost()?.body).toMatchObject({
					to: fixtures.contact.wa_id,
					text: { body: 'Your order shipped' },
				});
			} finally {
				await ctx.shutdown();
			}
		});

		it('sends a direct message to a phone number written with a leading plus', async () => {
			const fixtures = whatsAppReplayFixtures();
			const ctx = await createWhatsAppReplayContext(fixtures);
			try {
				await ctx.sendWebhook(fixtures.mention);

				const result = await ctx.actionExecutor.execute({
					descriptor: ctx.descriptor,
					action: 'send_dm',
					input: { userId: `+${fixtures.contact.wa_id}`, message: { text: 'Your order shipped' } },
					awaitResponse: false,
				});

				expect(result).toMatchObject({ ok: true });
				expect(ctx.lastPost()?.body).toMatchObject({ to: fixtures.contact.wa_id });
			} finally {
				await ctx.shutdown();
			}
		});

		it('rejects a direct message to a user ID without digits', async () => {
			const fixtures = whatsAppReplayFixtures();
			const ctx = await createWhatsAppReplayContext(fixtures);
			try {
				await ctx.sendWebhook(fixtures.mention);
				const postsBefore = ctx.lastPost();

				const result = await ctx.actionExecutor.execute({
					descriptor: ctx.descriptor,
					action: 'send_dm',
					input: { userId: 'not-a-number', message: { text: 'Hello' } },
					awaitResponse: false,
				});

				expect(result).toMatchObject({ ok: false });
				expect(ctx.lastPost()).toBe(postsBefore);
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
				// replying to), so no message has been sent yet.
				expect(sentMessages(ctx)).toHaveLength(0);

				const threadId = whatsAppThreadId(fixtures);
				await expect(
					ctx.adapter.postMessage(threadId, { markdown: 'Still there?' }),
				).rejects.toThrow(UserError);
				expect(sentMessages(ctx)).toHaveLength(0);
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
				expect(sentMessages(ctx)).toHaveLength(0);
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

				// The first attempt fails immediately; the retry must wait for the
				// base backoff (1s) before trying again — advancing by less than
				// that must not have produced a second attempt yet, proving the
				// wrapper actually waits instead of panic-retrying.
				await vi.advanceTimersByTimeAsync(500);
				expect(ctx.apiCalls).toHaveLength(1);

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

		it("lets the action executor's own guard block a second `respond` call after retries exhaust", async () => {
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

				// Blocked by the action executor's own pre-existing guard, not the
				// adapter-level one exercised below.
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

		it('blocks a second automatic reply on the same connection once the first exhausts retries, bypassing the action executor entirely', async () => {
			vi.useFakeTimers();
			const fixtures = whatsAppReplayFixtures();
			const ctx = await createWhatsAppReplayContext(fixtures, {
				failureSequence: { count: Infinity, code: 130429 },
			});
			try {
				const threadId = whatsAppThreadId(fixtures);

				// Automatic replies post through the adapter directly, never the
				// action executor tested above.
				const firstPromise = ctx.adapter.postMessage(threadId, { markdown: 'Still there?' });
				let firstError: unknown;
				const firstAssertion = firstPromise.catch((error: unknown) => {
					firstError = error;
				});
				await vi.runAllTimersAsync();
				await firstAssertion;

				expect(firstError).toBeInstanceOf(OperationalError);
				expect((firstError as { response?: { status?: number } }).response?.status).toBe(429);
				const callsAfterFirst = ctx.apiCalls.length;

				// The adapter-level guard blocks this immediately — no new API calls.
				await expect(
					ctx.adapter.postMessage(threadId, { markdown: 'Still there?' }),
				).rejects.toMatchObject({ response: { status: 429 } });
				expect(ctx.apiCalls).toHaveLength(callsAfterFirst);
			} finally {
				await ctx.shutdown();
			}
		});

		it("scopes a pair rate-limit's cooldown to the affected recipient, not the whole connection", async () => {
			vi.useFakeTimers();
			const fixtures = whatsAppReplayFixtures();
			// Exactly enough failures to exhaust A's retries; B's first attempt
			// afterward hits a clean stub.
			const ctx = await createWhatsAppReplayContext(fixtures, {
				failureSequence: { count: 4, code: 131056 },
			});
			try {
				const threadA = whatsAppThreadId(fixtures);
				const contactB = whatsAppContact({ wa_id: 'other-recipient-wa-id' });
				const threadB = whatsAppThreadId({
					phoneNumberId: fixtures.phoneNumberId,
					contact: contactB,
				});

				const firstPromise = ctx.adapter.postMessage(threadA, { markdown: 'Hi A' });
				let firstError: unknown;
				const firstAssertion = firstPromise.catch((error: unknown) => {
					firstError = error;
				});
				await vi.runAllTimersAsync();
				await firstAssertion;
				expect(firstError).toBeInstanceOf(OperationalError);
				const callsAfterA = ctx.apiCalls.length;

				// A different recipient is unaffected by A's cooldown.
				await expect(ctx.adapter.postMessage(threadB, { markdown: 'Hi B' })).resolves.toBeDefined();
				expect(ctx.apiCalls).toHaveLength(callsAfterA + 1);

				// A itself is still blocked — the cooldown is real, just scoped right.
				await expect(
					ctx.adapter.postMessage(threadA, { markdown: 'Hi again A' }),
				).rejects.toMatchObject({ response: { status: 429 } });
				expect(ctx.apiCalls).toHaveLength(callsAfterA + 1);
			} finally {
				await ctx.shutdown();
			}
		});

		it('keeps a pair rate-limit scoped to the recipient when it comes through the action executor', async () => {
			vi.useFakeTimers();
			const fixtures = whatsAppReplayFixtures();
			const ctx = await createWhatsAppReplayContext(fixtures, {
				failureSequence: { count: 4, code: 131056 },
			});
			try {
				const threadA = whatsAppThreadId(fixtures);
				const threadB = whatsAppThreadId({
					phoneNumberId: fixtures.phoneNumberId,
					contact: whatsAppContact({ wa_id: 'other-recipient-wa-id' }),
				});
				const respondIn = async (threadId: string) =>
					await ctx.actionExecutor.execute({
						descriptor: ctx.descriptor,
						action: 'respond',
						input: { message: { text: 'Hi' } },
						awaitResponse: false,
						currentMessageContext: {
							integrationConnectionId: 'whatsapp:cred-whatsapp',
							platform: 'whatsapp',
							target: { type: 'thread' as const, threadId, channelId: threadId },
							messageId: 'wamid.SYNTHETIC',
							updatedAt: new Date().toISOString(),
						},
					});

				const firstResultPromise = respondIn(threadA);
				await vi.runAllTimersAsync();
				expect(await firstResultPromise).toEqual({
					ok: false,
					error: { code: 'RATE_LIMIT_EXCEEDED', message: expect.stringContaining('recipient') },
				});
				expect(ctx.channelRateLimitGuard.isBlocked(ctx.descriptor.integrationConnectionId)).toBe(
					false,
				);
				const callsAfterA = ctx.apiCalls.length;

				// A different recipient still reaches the API.
				expect(await respondIn(threadB)).toMatchObject({ ok: true });
				expect(ctx.apiCalls).toHaveLength(callsAfterA + 1);

				// A stays blocked, and that fast fail doesn't block the connection.
				expect(await respondIn(threadA)).toMatchObject({
					ok: false,
					error: { code: 'RATE_LIMIT_EXCEEDED' },
				});
				expect(ctx.apiCalls).toHaveLength(callsAfterA + 1);
				expect(ctx.channelRateLimitGuard.isBlocked(ctx.descriptor.integrationConnectionId)).toBe(
					false,
				);
			} finally {
				await ctx.shutdown();
			}
		});

		it('retries a reaction send too, since addReaction shares graphApiRequest with postMessage', async () => {
			vi.useFakeTimers();
			const fixtures = whatsAppReplayFixtures();
			const ctx = await createWhatsAppReplayContext(fixtures, {
				failureSequence: { count: 1, code: 130429 },
			});
			try {
				const threadId = whatsAppThreadId(fixtures);
				const promise = ctx.adapter.addReaction(threadId, 'wamid.TEST_REACTION_TARGET', '👍');
				await vi.runAllTimersAsync();
				await expect(promise).resolves.toBeUndefined();
				expect(ctx.apiCalls).toHaveLength(2);
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

	describe('template messages', () => {
		const expiredInbound = (fixtures: ReturnType<typeof whatsAppReplayFixtures>) =>
			whatsAppWebhook({
				phoneNumberId: fixtures.phoneNumberId,
				contact: fixtures.contact,
				message: whatsAppInboundTextMessage({
					id: 'wamid.TEST_INBOUND_OLD',
					timestamp: String(Math.floor(Date.now() / 1000) - 25 * 60 * 60),
				}),
			});

		const listTemplates = async (
			ctx: Awaited<ReturnType<typeof createWhatsAppReplayContext>>,
			input: Record<string, unknown> = {},
		) => {
			const chatIntegrationService = mock<ChatIntegrationService>();
			chatIntegrationService.getChatInstanceForTools.mockResolvedValue(ctx.chat);
			const executor = new ChatIntegrationContextQueryExecutor(
				chatIntegrationService,
				Container.get(ChatIntegrationRegistry),
				ctx.channelRateLimitGuard,
			);
			return await executor.execute({ descriptor: ctx.descriptor, query: 'list_templates', input });
		};

		const sendTemplate = async (
			ctx: Awaited<ReturnType<typeof createWhatsAppReplayContext>>,
			input: Record<string, unknown>,
		) =>
			await ctx.actionExecutor.execute({
				descriptor: ctx.descriptor,
				action: 'send_template',
				input,
				awaitResponse: false,
			});

		const templatePosts = (ctx: Awaited<ReturnType<typeof createWhatsAppReplayContext>>) =>
			ctx.apiCalls.filter((call) => call.body.type === 'template');

		it('lists only the approved utility templates the agent can fill', async () => {
			const fixtures = whatsAppReplayFixtures();
			const ctx = await createWhatsAppReplayContext(fixtures, {
				templates: [
					orderUpdateTemplate,
					{
						...orderUpdateTemplate,
						name: 'with_image',
						components: [
							{ type: 'HEADER', format: 'IMAGE' },
							{ type: 'BODY', text: 'Hi' },
						],
					},
					{
						...orderUpdateTemplate,
						name: 'with_link_value',
						components: [
							{ type: 'BODY', text: 'Track it' },
							{
								type: 'BUTTONS',
								buttons: [{ type: 'URL', text: 'Track', url: 'https://example.com/{{1}}' }],
							},
						],
					},
					{ ...orderUpdateTemplate, name: 'promo', category: 'MARKETING' },
				],
			});
			try {
				const result = await listTemplates(ctx);

				expect(result).toEqual({
					ok: true,
					templates: [
						{
							name: 'order_update',
							language: 'en_US',
							category: 'UTILITY',
							header: 'Order update',
							body: 'Your order {{2}} has shipped, {{1}}.',
							footer: 'Reply STOP to opt out',
							parameters: ['1', '2'],
						},
					],
				});
				expect(ctx.templateRequests).toHaveBeenCalledWith(
					expect.objectContaining({
						method: 'GET',
						url: 'https://graph.facebook.com/v25.0/waba-test-1/message_templates',
						qs: expect.objectContaining({
							status: 'APPROVED',
							category: 'UTILITY',
							appsecret_proof: expect.any(String),
						}),
					}),
				);
			} finally {
				await ctx.shutdown();
			}
		});

		it('returns a cursor for the next page of templates', async () => {
			const fixtures = whatsAppReplayFixtures();
			const ctx = await createWhatsAppReplayContext(fixtures, {
				templateResponse: {
					statusCode: 200,
					body: {
						data: [orderUpdateTemplate],
						paging: { cursors: { after: 'cursor-2' }, next: 'https://graph.facebook.com/next' },
					},
				},
			});
			try {
				await expect(listTemplates(ctx)).resolves.toMatchObject({ nextCursor: 'cursor-2' });

				await listTemplates(ctx, { cursor: 'cursor-2' });
				expect(ctx.templateRequests).toHaveBeenLastCalledWith(
					expect.objectContaining({ qs: expect.objectContaining({ after: 'cursor-2' }) }),
				);
			} finally {
				await ctx.shutdown();
			}
		});

		it('names the missing permission when the token cannot read templates', async () => {
			const fixtures = whatsAppReplayFixtures();
			const ctx = await createWhatsAppReplayContext(fixtures, {
				templateResponse: { statusCode: 400, body: { error: { code: 200 } } },
			});
			try {
				await expect(listTemplates(ctx)).resolves.toMatchObject({
					ok: false,
					error: {
						code: 'CONTEXT_QUERY_FAILED',
						message: expect.stringContaining('whatsapp_business_management'),
					},
				});
			} finally {
				await ctx.shutdown();
			}
		});

		it('sends a template after the customer service window has closed', async () => {
			const fixtures = whatsAppReplayFixtures();
			const ctx = await createWhatsAppReplayContext(fixtures, {
				templates: [orderUpdateTemplate],
			});
			try {
				await ctx.sendWebhook(expiredInbound(fixtures));

				const result = await sendTemplate(ctx, {
					userId: fixtures.contact.wa_id,
					templateName: 'order_update',
					language: 'en_US',
					parameters: { '2': 'A-1001', '1': 'Ana' },
				});

				expect(result).toMatchObject({
					ok: true,
					messageContext: {
						platform: 'whatsapp',
						target: { type: 'dm', userId: fixtures.contact.wa_id },
					},
				});
				expect(ctx.lastPost()?.body).toMatchObject({
					to: fixtures.contact.wa_id,
					type: 'template',
					template: {
						name: 'order_update',
						language: { code: 'en_US' },
						components: [
							{
								type: 'body',
								parameters: [
									{ type: 'text', text: 'Ana' },
									{ type: 'text', text: 'A-1001' },
								],
							},
						],
					},
				});
			} finally {
				await ctx.shutdown();
			}
		});

		it('accepts an empty parameters list for a template with no placeholders', async () => {
			const fixtures = whatsAppReplayFixtures();
			const ctx = await createWhatsAppReplayContext(fixtures, {
				templates: [
					{
						...orderUpdateTemplate,
						name: 'hello_world',
						components: [{ type: 'BODY', text: 'Hello World' }],
					},
				],
			});
			try {
				const result = await sendTemplate(ctx, {
					userId: fixtures.contact.wa_id,
					templateName: 'hello_world',
					language: 'en_US',
					parameters: [],
				});

				expect(result).toMatchObject({ ok: true });
				expect(ctx.lastPost()?.body).toMatchObject({
					type: 'template',
					template: { name: 'hello_world', language: { code: 'en_US' } },
				});
				expect(ctx.lastPost()?.body.template).not.toHaveProperty('components');
			} finally {
				await ctx.shutdown();
			}
		});

		it('names each value of a template with named placeholders', async () => {
			const fixtures = whatsAppReplayFixtures();
			const ctx = await createWhatsAppReplayContext(fixtures, {
				templates: [
					{
						...orderUpdateTemplate,
						parameter_format: 'NAMED',
						components: [{ type: 'BODY', text: 'Hi {{first_name}}, your booking is confirmed.' }],
					},
				],
			});
			try {
				await sendTemplate(ctx, {
					userId: fixtures.contact.wa_id,
					templateName: 'order_update',
					language: 'en_US',
					parameters: { first_name: 'Ana' },
				});

				expect(ctx.lastPost()?.body).toMatchObject({
					template: {
						components: [
							{
								type: 'body',
								parameters: [{ type: 'text', text: 'Ana', parameter_name: 'first_name' }],
							},
						],
					},
				});
			} finally {
				await ctx.shutdown();
			}
		});

		it.each([
			{
				scenario: 'a template the agent cannot send',
				input: { templateName: 'promo', parameters: { '1': 'Ana', '2': 'A-1001' } },
				message: 'Call list_templates',
			},
			{
				scenario: 'a missing placeholder value',
				input: { templateName: 'order_update', parameters: { '1': 'Ana' } },
				message: 'needs a value for these placeholders: 2',
			},
			{
				scenario: 'an unknown placeholder',
				input: { templateName: 'order_update', parameters: { '1': 'Ana', '2': 'A', '3': 'B' } },
				message: 'has no placeholders named: 3',
			},
			{
				scenario: 'a value with a new line',
				input: { templateName: 'order_update', parameters: { '1': 'Ana', '2': 'A\nB' } },
				message: 'Change the value for: 2',
			},
		])('refuses $scenario without sending', async ({ input, message }) => {
			const fixtures = whatsAppReplayFixtures();
			const ctx = await createWhatsAppReplayContext(fixtures, {
				templates: [orderUpdateTemplate],
			});
			try {
				const result = await sendTemplate(ctx, {
					userId: fixtures.contact.wa_id,
					language: 'en_US',
					...input,
				});

				expect(result).toMatchObject({
					ok: false,
					error: { code: 'ACTION_FAILED', message: expect.stringContaining(message) },
				});
				expect(templatePosts(ctx)).toHaveLength(0);
			} finally {
				await ctx.shutdown();
			}
		});

		it('points the agent to templates when the window has closed', async () => {
			const fixtures = whatsAppReplayFixtures();
			const ctx = await createWhatsAppReplayContext(fixtures);
			try {
				await ctx.sendWebhook(expiredInbound(fixtures));

				await expect(
					ctx.adapter.postMessage(whatsAppThreadId(fixtures), { markdown: 'Still there?' }),
				).rejects.toThrow(/list_templates.*send_template/);
			} finally {
				await ctx.shutdown();
			}
		});

		it('points the agent to templates when Meta refuses a send outside the window', async () => {
			const fixtures = whatsAppReplayFixtures();
			// No cached inbound message, so only Meta knows the window has closed.
			const ctx = await createWhatsAppReplayContext(fixtures, { failedApiTypes: ['text'] });
			try {
				const promise = ctx.adapter.postMessage(whatsAppThreadId(fixtures), {
					markdown: 'Still there?',
				});

				await expect(promise).rejects.toThrow(UserError);
				await expect(promise).rejects.toThrow(/send_template/);
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

		it('passes components through unchanged when there are 3 or fewer buttons', async () => {
			const integration = createWhatsAppIntegration();
			const components: SuspendComponent[] = [{ type: 'section', text: 'Pick one' }, ...buttons(3)];

			expect(await integration.normalizeComponents(components, testNormalizeContext)).toEqual(
				components,
			);
		});

		it('converts overflow buttons into a WhatsApp list when there are more than 3', async () => {
			const integration = createWhatsAppIntegration();
			const section: SuspendComponent = { type: 'section', text: 'Pick one' };
			const components: SuspendComponent[] = [section, ...buttons(4)];

			const normalized = await integration.normalizeComponents(components, testNormalizeContext);

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

		it('does not page a list of exactly 10 options', async () => {
			const integration = createWhatsAppIntegration();

			const normalized = await integration.normalizeComponents(buttons(10), testNormalizeContext);

			const select = normalized.find((c) => c.type === 'select');
			expect(select?.options).toHaveLength(10);
			expect(select?.options?.some((o) => o.label === 'More…')).toBe(false);
		});

		it('keeps 9 options and adds a More row when there are more than 10', async () => {
			const integration = createWhatsAppIntegration();

			const normalized = await integration.normalizeComponents(buttons(14), {
				runId: 'run-1',
				toolCallId: 'tool-1',
				wrapResumeValue: (rawValue) => JSON.stringify({ value: rawValue }),
			});

			const options = normalized.find((c) => c.type === 'select')?.options ?? [];
			expect(options).toHaveLength(10);
			expect(options[8].label).toBe('Option 9');
			expect(options[9]).toMatchObject({
				label: 'More…',
				value: expect.stringMatching(/^n8n:page:[0-9a-f]+:1$/),
				description: 'Options 10–14 of 14',
			});
		});

		it('drops options past 50 and logs it', async () => {
			const logger = mock<BackendLogger>();
			const integration = createWhatsAppIntegration(undefined, undefined, logger);

			const normalized = await integration.normalizeComponents(buttons(60), testNormalizeContext);

			const options = normalized.find((c) => c.type === 'select')?.options ?? [];
			expect(options[9].description).toBe('Options 10–18 of 50');
			expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('Dropping 10 list options'));
		});

		it('merges overflow buttons into an existing select instead of pushing a second one', async () => {
			const integration = createWhatsAppIntegration();
			const existingSelect: SuspendComponent = {
				type: 'select',
				label: 'Pick a size',
				options: [{ label: 'Small', value: 'small' }],
			};
			const components: SuspendComponent[] = [existingSelect, ...buttons(4)];

			const normalized = await integration.normalizeComponents(components, testNormalizeContext);

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

		const listRows = (body: unknown) =>
			(
				body as {
					interactive: {
						action: { sections: Array<{ rows: Array<{ id: string; title: string }> }> };
					};
				}
			).interactive.action.sections[0].rows;

		let tapCount = 0;
		const tapListRow = async (
			ctx: Awaited<ReturnType<typeof createWhatsAppReplayContext>>,
			fixtures: ReturnType<typeof whatsAppReplayFixtures>,
			row: { id: string; title: string },
		) =>
			await ctx.sendWebhook(
				whatsAppWebhook({
					phoneNumberId: fixtures.phoneNumberId,
					contact: fixtures.contact,
					message: {
						from: fixtures.contact.wa_id,
						id: `wamid.TEST_TAP_${++tapCount}`,
						timestamp: String(Math.floor(Date.now() / 1000)),
						type: 'interactive',
						interactive: { type: 'list_reply', list_reply: { id: row.id, title: row.title } },
					},
				}),
			);

		const manyButtonsStream = (runId: string, toolCallId: string, count: number) => [
			{
				type: 'tool-call-suspended' as const,
				runId,
				toolCallId,
				toolName: 'select',
				suspendPayload: {
					type: 'form' as const,
					toolName: 'pick_option',
					displayName: 'Choose one',
					components: buttons(count),
				},
			},
			{ type: 'finish' as const, finishReason: 'stop' as const },
		];

		it('shows 9 options and a More row on the first page of a list with 14 options', async () => {
			const fixtures = whatsAppReplayFixtures();
			const ctx = await createWhatsAppReplayContext(fixtures, {
				stream: manyButtonsStream('run-page-1', 'tool-page-1', 14),
			});
			try {
				await ctx.sendWebhook(fixtures.mention);

				const rows = listRows(ctx.lastPost()?.body);
				expect(rows).toHaveLength(10);
				expect(rows.slice(0, 9).map((r) => r.title)).toEqual(
					Array.from({ length: 9 }, (_, i) => `Option ${i + 1}`),
				);
				expect(rows[9].title).toBe('More…');
			} finally {
				await ctx.shutdown();
			}
		});

		it('sends the next page as a new list when the user taps More', async () => {
			const fixtures = whatsAppReplayFixtures();
			const ctx = await createWhatsAppReplayContext(fixtures, {
				stream: manyButtonsStream('run-page-2', 'tool-page-2', 14),
			});
			try {
				await ctx.sendWebhook(fixtures.mention);
				await tapListRow(ctx, fixtures, listRows(ctx.lastPost()?.body)[9]);

				const rows = listRows(ctx.lastPost()?.body);
				// The last page has the 5 options that are left and no More row.
				expect(rows.map((r) => r.title)).toEqual([
					'Option 10',
					'Option 11',
					'Option 12',
					'Option 13',
					'Option 14',
				]);
				expect(ctx.agentExecutor.resumeForChat).not.toHaveBeenCalled();
			} finally {
				await ctx.shutdown();
			}
		});

		it('repeats the title and prompt of the question on the next page', async () => {
			const fixtures = whatsAppReplayFixtures();
			const ctx = await createWhatsAppReplayContext(fixtures, {
				stream: [
					{
						type: 'tool-call-suspended',
						runId: 'run-page-5',
						toolCallId: 'tool-page-5',
						toolName: 'select',
						suspendPayload: {
							type: 'form',
							toolName: 'pick_option',
							title: 'Pick a city',
							components: [{ type: 'section', text: 'Where should we ship?' }, ...buttons(14)],
						},
					},
					{ type: 'finish', finishReason: 'stop' },
				],
			});
			try {
				await ctx.sendWebhook(fixtures.mention);
				await tapListRow(ctx, fixtures, listRows(ctx.lastPost()?.body)[9]);

				const body = JSON.stringify(ctx.lastPost()?.body);
				expect(body).toContain('Pick a city');
				expect(body).toContain('Where should we ship?');
				expect(body).toContain('Options 10–14 of 14');
			} finally {
				await ctx.shutdown();
			}
		});

		it('resumes the run with the option picked on a later page', async () => {
			const fixtures = whatsAppReplayFixtures();
			const ctx = await createWhatsAppReplayContext(fixtures, {
				stream: manyButtonsStream('run-page-3', 'tool-page-3', 20),
			});
			try {
				await ctx.sendWebhook(fixtures.mention);
				const firstPage = listRows(ctx.lastPost()?.body);
				expect(firstPage[9].title).toBe('More…');

				await tapListRow(ctx, fixtures, firstPage[9]);
				const secondPage = listRows(ctx.lastPost()?.body);
				// Page 2 has 9 options and its own More row, because 2 options are left.
				expect(secondPage.map((r) => r.title)).toEqual([
					...Array.from({ length: 9 }, (_, i) => `Option ${i + 10}`),
					'More…',
				]);

				await tapListRow(ctx, fixtures, secondPage[9]);
				const thirdPage = listRows(ctx.lastPost()?.body);
				expect(thirdPage.map((r) => r.title)).toEqual(['Option 19', 'Option 20']);

				ctx.nextStream([
					{ type: 'text-delta', id: 'resume-text', delta: 'Picked' },
					{ type: 'finish', finishReason: 'stop' },
				]);
				await tapListRow(ctx, fixtures, thirdPage[1]);

				expect(ctx.agentExecutor.resumeForChat).toHaveBeenCalledWith(
					expect.objectContaining({
						runId: 'run-page-3',
						toolCallId: 'tool-page-3',
						resumeData: { value: 'opt-20' },
					}),
				);
			} finally {
				await ctx.shutdown();
			}
		});

		it('shows the first 10 options without a More row when the option store fails to save', async () => {
			const cache = mock<CacheService>();
			cache.set.mockRejectedValue(new Error('redis down'));
			const logger = mock<BackendLogger>();
			const store = new WhatsAppOptionPagesStore(
				cache,
				logger,
				mock<AgentsConfig>({ checkpointTtlSeconds: 3600 }),
			);
			const integration = createWhatsAppIntegration(undefined, undefined, logger, store);

			const normalized = await integration.normalizeComponents(buttons(14), {
				runId: 'run-1',
				toolCallId: 'tool-1',
				wrapResumeValue: (rawValue) => JSON.stringify({ value: rawValue }),
			});

			const options = normalized.find((c) => c.type === 'select')?.options ?? [];
			expect(options.map((o) => o.label)).toEqual(
				Array.from({ length: 10 }, (_, i) => `Option ${i + 1}`),
			);
			expect(logger.warn).toHaveBeenCalled();
		});

		it('drops an oversized option from its page and keeps every other option reachable', async () => {
			const fixtures = whatsAppReplayFixtures();
			const longValue = 'x'.repeat(250);
			// The first option is oversized, so its row id is too long for WhatsApp.
			const components: SuspendComponent[] = [
				{ type: 'button', label: 'Option 1', value: longValue },
				...Array.from({ length: 13 }, (_, i) => ({
					type: 'button' as const,
					label: `Option ${i + 2}`,
					value: `opt-${i + 2}`,
				})),
			];
			const ctx = await createWhatsAppReplayContext(fixtures, {
				stream: [
					{
						type: 'tool-call-suspended',
						runId: 'run-page-4',
						toolCallId: 'tool-page-4',
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
				const firstPage = listRows(ctx.lastPost()?.body);
				// The oversized option leaves a gap on page 1. No option moves to another page.
				expect(firstPage.map((r) => r.title)).toEqual([
					...Array.from({ length: 8 }, (_, i) => `Option ${i + 2}`),
					'More…',
				]);

				await tapListRow(ctx, fixtures, firstPage[8]);
				expect(listRows(ctx.lastPost()?.body).map((r) => r.title)).toEqual([
					'Option 10',
					'Option 11',
					'Option 12',
					'Option 13',
					'Option 14',
				]);
			} finally {
				await ctx.shutdown();
			}
		});

		it('tells the user when the options of a tapped More row have expired', async () => {
			const fixtures = whatsAppReplayFixtures();
			const ctx = await createWhatsAppReplayContext(fixtures);
			try {
				await tapListRow(ctx, fixtures, {
					id: `chat:${JSON.stringify({ a: 'resume:run-gone:tool-gone:0', v: 'n8n:page:0123456789abcdef:1' })}`,
					title: 'More…',
				});

				expect(ctx.lastPost()?.body).toMatchObject({
					type: 'text',
					text: { body: expect.stringContaining('no longer available') },
				});
				expect(ctx.agentExecutor.resumeForChat).not.toHaveBeenCalled();
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

	describe('onRemove', () => {
		const removal = {
			agentId: 'agent-1',
			projectId: 'project-1',
			credentialId: 'cred-whatsapp',
			user: mock<User>(),
		};

		afterEach(() => {
			Container.reset();
		});

		it('clears the recorded handshake for the agent', async () => {
			const webhookVerification = mock<WhatsAppWebhookVerificationStore>();
			const integration = createWhatsAppIntegration(undefined, webhookVerification);

			await integration.onRemove(removal);

			expect(webhookVerification.clear).toHaveBeenCalledExactlyOnceWith('agent-1');
		});

		it('warns that the number is still connected and links to the Meta app dashboard', async () => {
			const check = mock<WhatsAppCredentialCheckService>();
			check.getMetaStatus.mockResolvedValue({
				state: 'connected',
				displayPhoneNumber: '+1 555-184-1090',
			});
			Container.set(WhatsAppCredentialCheckService, check);
			const integration = createWhatsAppIntegration();

			const warning = await integration.onRemove(removal);

			expect(check.getMetaStatus).toHaveBeenCalledWith(removal.user, 'project-1', 'cred-whatsapp');
			expect(warning).toEqual({
				integrationType: 'whatsapp',
				code: 'number_still_connected',
				action: { type: 'open_url', url: 'https://developers.facebook.com/apps' },
				details: { displayPhoneNumber: '+1 555-184-1090' },
			});
		});

		it('still warns, without the number, when Meta cannot be read', async () => {
			const check = mock<WhatsAppCredentialCheckService>();
			check.getMetaStatus.mockRejectedValue(new Error('credential not found'));
			Container.set(WhatsAppCredentialCheckService, check);
			const integration = createWhatsAppIntegration();

			const warning = await integration.onRemove(removal);

			expect(warning).toEqual({
				integrationType: 'whatsapp',
				code: 'number_still_connected',
				action: { type: 'open_url', url: 'https://developers.facebook.com/apps' },
			});
		});

		it('does not warn for a draft entry that has no credential', async () => {
			const check = mock<WhatsAppCredentialCheckService>();
			Container.set(WhatsAppCredentialCheckService, check);
			const webhookVerification = mock<WhatsAppWebhookVerificationStore>();
			const integration = createWhatsAppIntegration(undefined, webhookVerification);

			const warning = await integration.onRemove({ ...removal, credentialId: '' });

			expect(warning).toBeUndefined();
			expect(check.getMetaStatus).not.toHaveBeenCalled();
			expect(webhookVerification.clear).toHaveBeenCalledExactlyOnceWith('agent-1');
		});

		it('does not wait long on a slow Meta', async () => {
			vi.useFakeTimers();
			try {
				const check = mock<WhatsAppCredentialCheckService>();
				check.getMetaStatus.mockReturnValue(new Promise(() => {}));
				Container.set(WhatsAppCredentialCheckService, check);
				const integration = createWhatsAppIntegration();

				const pending = integration.onRemove(removal);
				await vi.advanceTimersByTimeAsync(3_000);

				expect(check.getMetaStatus).toHaveBeenCalledWith(
					removal.user,
					'project-1',
					'cred-whatsapp',
				);
				expect(await pending).toEqual(expect.not.objectContaining({ details: expect.anything() }));
			} finally {
				vi.useRealTimers();
			}
		});
	});

	describe('handshake answered by a connected channel', () => {
		const expectedToken = deriveWhatsAppVerifyToken('test-hmac-signature-secret', 'agent-1');
		const handshake = (token: string) =>
			new Request(
				`https://n8n.example.com/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=${token}&hub.challenge=12345`,
			);

		it('records the handshake when the token matches', async () => {
			const webhookVerification = mock<WhatsAppWebhookVerificationStore>();
			const setupTelemetry = mock<WhatsAppSetupTelemetryService>();
			const ctx = await createWhatsAppReplayContext(whatsAppReplayFixtures(), {
				webhookVerification,
				setupTelemetry,
			});

			try {
				const response = await ctx.adapter.handleWebhook(handshake(expectedToken));

				expect(response.status).toBe(200);
				expect(await response.text()).toBe('12345');
				expect(webhookVerification.markVerified).toHaveBeenCalledExactlyOnceWith('agent-1');
				expect(setupTelemetry.webhookVerified).toHaveBeenCalledExactlyOnceWith(
					'agent-1',
					'connected',
				);
			} finally {
				await ctx.shutdown();
			}
		});

		it('does not record a rejected handshake', async () => {
			const webhookVerification = mock<WhatsAppWebhookVerificationStore>();
			const setupTelemetry = mock<WhatsAppSetupTelemetryService>();
			const ctx = await createWhatsAppReplayContext(whatsAppReplayFixtures(), {
				webhookVerification,
				setupTelemetry,
			});

			try {
				const response = await ctx.adapter.handleWebhook(handshake('wrong-token'));

				expect(response.status).toBe(403);
				expect(webhookVerification.markVerified).not.toHaveBeenCalled();
				expect(setupTelemetry.webhookVerified).not.toHaveBeenCalled();
			} finally {
				await ctx.shutdown();
			}
		});
	});

	describe('handleUnauthenticatedWebhook', () => {
		// createWhatsAppIntegration() wires a fixed 'test-hmac-signature-secret', so
		// the expected token for 'agent-1' is derivable the same way the real
		// verify-token endpoint derives it.
		const expectedToken = deriveWhatsAppVerifyToken('test-hmac-signature-secret', 'agent-1');

		it("answers Meta's handshake with the raw challenge when the token matches", () => {
			const webhookVerification = mock<WhatsAppWebhookVerificationStore>();
			const setupTelemetry = mock<WhatsAppSetupTelemetryService>();
			const integration = createWhatsAppIntegration(
				undefined,
				webhookVerification,
				undefined,
				undefined,
				setupTelemetry,
			);

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
			expect(webhookVerification.markVerified).toHaveBeenCalledExactlyOnceWith('agent-1');
			expect(setupTelemetry.webhookVerified).toHaveBeenCalledExactlyOnceWith('agent-1', 'setup');
		});

		it('rejects the handshake when the verify token does not match', () => {
			const webhookVerification = mock<WhatsAppWebhookVerificationStore>();
			const setupTelemetry = mock<WhatsAppSetupTelemetryService>();
			const integration = createWhatsAppIntegration(
				undefined,
				webhookVerification,
				undefined,
				undefined,
				setupTelemetry,
			);

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
			expect(webhookVerification.markVerified).not.toHaveBeenCalled();
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

	describe('channel settings', () => {
		const whatsAppChannel = (settings?: Record<string, unknown>) =>
			({ type: 'whatsapp', credentialId: 'cred-1', settings }) as AgentIntegrationConfig;

		const resumeParams = (integration?: AgentIntegrationConfig) => {
			const thread = mock<Thread<unknown, unknown>>({ id: 'whatsapp:phone-1:user-1' });
			thread.startTyping.mockResolvedValue(undefined);
			return { thread, logger: mock<Logger>(), agentId: 'agent-1', integration };
		};

		it.each([
			['no channel is given', undefined],
			['the setting is unset', whatsAppChannel()],
			['the setting is on', whatsAppChannel({ typingIndicator: true })],
		])('shows the typing indicator when %s', async (_label, channel) => {
			const integration = createWhatsAppIntegration();
			const params = resumeParams(channel);

			const context = await integration.createResumeExecutionContext(params);

			expect(context.statusHandle).toBeDefined();
			expect(params.thread.startTyping).toHaveBeenCalledTimes(1);
			await context.statusHandle?.clearBeforeResponse();
		});

		it('does not show the typing indicator when the setting is off', async () => {
			const integration = createWhatsAppIntegration();
			const params = resumeParams(whatsAppChannel({ typingIndicator: false }));

			const context = await integration.createResumeExecutionContext(params);

			expect(context).toEqual({});
			expect(params.thread.startTyping).not.toHaveBeenCalled();
		});

		it.each([
			['the setting is unset', whatsAppChannel(), true],
			['the setting is on', whatsAppChannel({ downloadMedia: true }), true],
			['the setting is off', whatsAppChannel({ downloadMedia: false }), false],
		])('downloads attachments only when allowed (%s)', (_label, channel, expected) => {
			const integration = createWhatsAppIntegration();

			expect(integration.shouldDownloadAttachments(channel)).toBe(expected);
		});
	});
});
