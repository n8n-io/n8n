import type { StreamChunk } from '@n8n/agents';
import { MAX_AGENT_CHAT_ATTACHMENT_SIZE_BYTES, type AgentIntegrationConfig } from '@n8n/api-types';
import type { Logger as BackendLogger } from '@n8n/backend-common';
import type { WhatsAppAdapter } from '@chat-adapter/whatsapp';
import { createHmac } from 'crypto';
import type { InstanceSettings } from 'n8n-core';
import type { Mock } from 'vitest';
import { mock } from 'vitest-mock-extended';

import type { AgentChatIntegrationContext } from '../../../agent-chat-integration';
import type { ChatInstance } from '../../../chat-integration.service';
import { ComponentMapper } from '../../../component-mapper';
import type { ChatIntegrationActionExecutor } from '../../../integration-action-executor';
import type {
	getIntegrationToolConnectionDescriptors,
	IntegrationMessageContext,
} from '../../../integration-tools';
import type { AgentRepository } from '../../../../repositories/agent.repository';
import { WhatsAppIntegration } from '../../../platforms/whatsapp-integration';
import {
	createReplayContextSetup,
	installFetchStub,
	type MemoryMessageContextStore,
	type ReplayApiCall,
	type ReplayContextSetup,
	type ReplayWebhookHandler,
	sendJsonWebhook,
} from '../replay-test-helpers';

export interface WhatsAppContactFixture {
	profile: { name: string };
	wa_id: string;
}

export interface WhatsAppInboundMessageFixture {
	from: string;
	id: string;
	timestamp: string;
	type:
		| 'text'
		| 'interactive'
		| 'button'
		| 'reaction'
		| 'image'
		| 'document'
		| 'audio'
		| 'voice'
		| 'video'
		| 'sticker'
		| 'location'
		| 'contacts';
	text?: { body: string };
	interactive?: {
		type: 'button_reply' | 'list_reply';
		button_reply?: { id: string; title: string };
		list_reply?: { id: string; title: string; description?: string };
	};
	button?: { payload: string; text: string };
	reaction?: { emoji: string; message_id: string };
	image?: { id: string; mime_type: string; sha256: string; caption?: string };
	document?: {
		id: string;
		mime_type: string;
		sha256: string;
		filename?: string;
		caption?: string;
	};
	audio?: { id: string; mime_type: string; sha256: string; voice?: boolean };
	voice?: { id: string; mime_type: string; sha256: string };
	video?: { id: string; mime_type: string; sha256: string; caption?: string };
	sticker?: { id: string; mime_type: string; sha256: string; animated: boolean };
	location?: { latitude: number; longitude: number; name?: string; address?: string; url?: string };
	// `contacts` has no payload fixture field: the real adapter never surfaces
	// structured content for it (see synthetic-fixtures.ts) — it's included
	// here only so a webhook can carry `type: 'contacts'` to exercise that drop.
}

export interface WhatsAppWebhookFixture {
	object: 'whatsapp_business_account';
	entry: Array<{
		id: string;
		changes: Array<{
			field: 'messages';
			value: {
				messaging_product: 'whatsapp';
				metadata: { display_phone_number: string; phone_number_id: string };
				contacts?: WhatsAppContactFixture[];
				messages?: WhatsAppInboundMessageFixture[];
			};
		}>;
	}>;
}

export type WhatsAppApiCall = ReplayApiCall;

export interface WhatsAppReplayFixtures {
	phoneNumberId: string;
	contact: WhatsAppContactFixture;
	mention: WhatsAppWebhookFixture;
	followUp: WhatsAppWebhookFixture;
}

export interface WhatsAppReplayContext extends Omit<ReplayContextSetup, 'nextStream' | 'chat'> {
	chat: ChatInstance;
	agentExecutor: {
		executeForChatPublished: Mock;
		resumeForChat: Mock;
	};
	actionExecutor: ChatIntegrationActionExecutor;
	/** The guarded adapter instance actually wired into `chat` (see `WhatsAppIntegration.createAdapter`). */
	adapter: WhatsAppAdapter;
	apiCalls: WhatsAppApiCall[];
	descriptor: ReturnType<typeof getIntegrationToolConnectionDescriptors>[number];
	integration: AgentIntegrationConfig;
	messageContextStore: MemoryMessageContextStore;
	sendWebhook: (payload: unknown) => Promise<Response>;
	latestContext: () => IntegrationMessageContext | undefined;
	latestThreadId: () => string | undefined;
	lastApiCall: () => WhatsAppApiCall | undefined;
	lastPost: () => WhatsAppApiCall | undefined;
	nextStream: (chunks: StreamChunk[]) => void;
}

const WHATSAPP_ACCESS_TOKEN = 'test-access-token';
const WHATSAPP_APP_SECRET = 'test-app-secret';
const WHATSAPP_BUSINESS_ACCOUNT_ID = 'waba-test-1';

/** Encodes the same `whatsapp:{phoneNumberId}:{userWaId}` format the real adapter uses. */
export function whatsAppThreadId(
	fixtures: Pick<WhatsAppReplayFixtures, 'phoneNumberId' | 'contact'>,
): string {
	return `whatsapp:${fixtures.phoneNumberId}:${fixtures.contact.wa_id}`;
}

export function createWhatsAppIntegration(): WhatsAppIntegration {
	return new WhatsAppIntegration(
		mock<BackendLogger>(),
		mock<AgentRepository>(),
		mock<InstanceSettings>({ encryptionKey: 'test-encryption-key' }),
	);
}

/**
 * Real, minimal-but-valid file content per media kind — genuine magic bytes,
 * not arbitrary filler — so `resolveInboundMimeType`'s magic-byte sniffing
 * (see `agent-chat-bridge.ts`) resolves them the same way it would for a real
 * download, rather than falling back to `application/octet-stream`. Keyed by
 * the same string each fixture's fake media `id` embeds (e.g. `media-image-1`
 * contains `"image"`), so the stub below can serve the right bytes for
 * whichever media a test's fixture declares.
 */
const WHATSAPP_MEDIA_CONTENT: Record<string, Buffer> = {
	image: Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46]),
	document: Buffer.from('%PDF-1.4\nsynthetic test content padding padding padding'),
	audio: Buffer.from([0xff, 0xfb, 0x90, 0x64, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]),
	// A minimal real OGG page (see https://www.rfc-editor.org/rfc/rfc3533)
	// wrapping an Opus stream header, so it sniffs as audio/ogg like a real
	// WhatsApp voice note would, not a generic/undetected container.
	voice: Buffer.concat([
		Buffer.from('OggS'),
		Buffer.from([0x00]), // version
		Buffer.from([0x02]), // header_type: beginning of stream
		Buffer.alloc(8), // granule position
		Buffer.from([0x01, 0x02, 0x03, 0x04]), // serial number
		Buffer.alloc(4), // page sequence number
		Buffer.alloc(4), // CRC checksum
		Buffer.from([0x13]), // page_segments = 1 entry
		Buffer.from([19]), // segment_table: one lacing value of 19 bytes
		Buffer.from('OpusHead\x01\x02\x00\x00\x00\x00\x00\x00\x00'),
	]),
	video: Buffer.from([0, 0, 0, 0x18, 0x66, 0x74, 0x79, 0x70, 0x6d, 0x70, 0x34, 0x32]),
	sticker: Buffer.concat([Buffer.from('RIFF'), Buffer.from([0, 0, 0, 0]), Buffer.from('WEBPVP8 ')]),
	// One byte over the shared cap: WhatsApp attachments never carry a
	// declared `size` (see `WhatsAppInboundMessage`), so the bridge's size
	// check only ever fires after this downloads — there's nothing to
	// pre-empt it on, unlike a platform that reports size upfront.
	oversized: Buffer.alloc(MAX_AGENT_CHAT_ATTACHMENT_SIZE_BYTES + 1, 0x41),
};

/**
 * Answer the Meta Graph API for the real `@chat-adapter/whatsapp` adapter.
 * Every outbound send (text, interactive, reaction, template) POSTs to the
 * same `/{phoneNumberId}/messages` endpoint, so the response only needs a
 * message ID — the adapter doesn't branch on the response shape otherwise.
 */
function installWhatsAppApiStub(failedTypes: string[] = []) {
	let nextMessageId = 1000;
	return installFetchStub({
		match: /graph\.facebook\.com/,
		onRequest: ({ httpMethod, url, body }) => {
			const path = url.split('?')[0];

			// `downloadMedia(mediaId)` (used for every inbound attachment) makes two
			// plain GETs with no JSON body — a metadata lookup, then the CDN url it
			// returns — so they need to be branched on method+path before the
			// send-message logic below, which assumes a POST with a JSON body.
			if (httpMethod === 'GET') {
				if (path.includes('/media-download/')) {
					const mediaId = path.slice(path.lastIndexOf('/') + 1);
					// Fixtures' media ids embed their kind (e.g. `media-image-1`), so
					// real magic-byte content can be matched to whichever media the
					// test's fixture actually declared.
					const kind = Object.keys(WHATSAPP_MEDIA_CONTENT).find((key) => mediaId.includes(key));
					return {
						apiCall: { method: 'media-download', body: {} },
						rawResponseBody: kind ? WHATSAPP_MEDIA_CONTENT[kind] : Buffer.from('unknown-media'),
					};
				}
				const mediaId = path.slice(path.lastIndexOf('/') + 1);
				return {
					apiCall: { method: 'media-metadata', body: {} },
					responseBody: { url: `https://graph.facebook.com/media-download/${mediaId}` },
				};
			}

			const method = path.slice(path.lastIndexOf('/') + 1);
			const type = typeof body.type === 'string' ? body.type : undefined;
			if (type && failedTypes.includes(type)) {
				return {
					apiCall: { method, body },
					responseBody: { error: { message: 'Test failure', code: 131047 } },
					status: 400,
				};
			}
			const to = typeof body.to === 'string' ? body.to : '';
			const messageId = `wamid.TEST${nextMessageId++}`;
			return {
				apiCall: { method, body },
				responseBody: {
					messaging_product: 'whatsapp',
					contacts: [{ input: to, wa_id: to }],
					messages: [{ id: messageId }],
				},
			};
		},
	});
}

export async function createWhatsAppReplayContext(
	fixtures: WhatsAppReplayFixtures,
	options: {
		stream?: StreamChunk[];
		integration?: AgentIntegrationConfig;
		failedApiTypes?: string[];
	} = {},
): Promise<WhatsAppReplayContext> {
	const stub = installWhatsAppApiStub(options.failedApiTypes);

	const integrationImpl = createWhatsAppIntegration();
	const integration: AgentIntegrationConfig = options.integration ?? {
		type: 'whatsapp',
		credentialId: 'cred-whatsapp',
	};
	const ctx: AgentChatIntegrationContext = {
		agentId: 'agent-1',
		projectId: 'project-1',
		credentialId: 'cred-whatsapp',
		integration,
		credential: {
			accessToken: WHATSAPP_ACCESS_TOKEN,
			appSecret: WHATSAPP_APP_SECRET,
			phoneNumberId: fixtures.phoneNumberId,
			businessAccountId: WHATSAPP_BUSINESS_ACCOUNT_ID,
		},
		ingressEnabled: true,
		webhookUrlFor: (platform) =>
			`https://n8n.example.com/rest/projects/project-1/agents/v2/agent-1/webhooks/${platform}`,
	};

	// Builds the real adapter through the production code path (not a raw
	// `createWhatsAppAdapter()` call) so the 24h customer-service-window guard
	// that `WhatsAppIntegration.createAdapter` wraps around it is exercised for
	// real — that guard is implemented as part of `createAdapter`, not the
	// adapter itself.
	const adapter = (await integrationImpl.createAdapter(ctx)) as WhatsAppAdapter;

	// Dynamic imports — the chat packages are ESM-only. Vitest loads ESM
	// natively, so the tests use the real Chat/state directly, same as the
	// other platform replay contexts.
	const { Chat } = await import('chat');
	const { createMemoryState } = await import('@chat-adapter/state-memory');

	const chat = new Chat({
		userName: 'n8n-agent-agent-1',
		adapters: { whatsapp: adapter } as unknown as Record<string, never>,
		state: createMemoryState(),
	});

	const setup = createReplayContextSetup({
		chat: chat as never,
		integrationImpl,
		integration,
		componentMapper: new ComponentMapper(),
		stream: options.stream,
	});

	// No identity bootstrap call here — WhatsApp derives its bot user ID from
	// the configured phone number ID instead of an API round trip like
	// Telegram's `getMe`.
	await chat.initialize();

	const webhooks = chat.webhooks as Record<string, ReplayWebhookHandler>;
	const sendWebhook = async (payload: unknown) => {
		// Meta signs webhooks with an HMAC-SHA256 over the raw body (`X-Hub-Signature-256`),
		// not a static shared-secret header, so a synthetic payload needs a real
		// signature computed the same way the adapter verifies it.
		const rawBody = JSON.stringify(payload);
		const signature = `sha256=${createHmac('sha256', WHATSAPP_APP_SECRET).update(rawBody).digest('hex')}`;
		const headers = new Headers();
		headers.set('x-hub-signature-256', signature);
		return await sendJsonWebhook(
			async (request, requestOptions) => await webhooks.whatsapp(request, requestOptions),
			ctx.webhookUrlFor('whatsapp'),
			payload,
			headers,
		);
	};

	return {
		...setup,
		chat: chat as unknown as ChatInstance,
		adapter,
		apiCalls: stub.apiCalls,
		sendWebhook,
		lastApiCall: () => stub.apiCalls.at(-1),
		lastPost: () => stub.apiCalls.filter((call) => call.method === 'messages').at(-1),
		shutdown: async () => {
			try {
				await setup.shutdown();
			} finally {
				stub.restore();
			}
		},
	};
}
