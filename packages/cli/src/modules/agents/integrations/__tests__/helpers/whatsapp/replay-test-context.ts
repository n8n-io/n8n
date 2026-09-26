import type { StreamChunk } from '@n8n/agents';
import type { AgentIntegrationConfig } from '@n8n/api-types';
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
} from '../replay-test-helpers';

export interface WhatsAppContactFixture {
	profile: { name: string };
	wa_id: string;
}

export interface WhatsAppInboundMessageFixture {
	from: string;
	id: string;
	timestamp: string;
	type: 'text' | 'interactive' | 'button' | 'reaction';
	text?: { body: string };
	interactive?: {
		type: 'button_reply' | 'list_reply';
		button_reply?: { id: string; title: string };
		list_reply?: { id: string; title: string; description?: string };
	};
	button?: { payload: string; text: string };
	reaction?: { emoji: string; message_id: string };
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
		isResumable: Mock;
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
 * A fixed number of leading sends fail with the given Meta error before the
 * stub starts succeeding — for exercising `withWhatsAppRateLimitBackoff`'s
 * retry loop. `count: Infinity` fails every send, for the exhausted-retries
 * case.
 */
export interface WhatsAppFailureSequence {
	count: number;
	status?: number;
	code?: number;
}

/**
 * Answer the Meta Graph API for the real `@chat-adapter/whatsapp` adapter.
 * Every outbound send (text, interactive, reaction, template) POSTs to the
 * same `/{phoneNumberId}/messages` endpoint, so the response only needs a
 * message ID — the adapter doesn't branch on the response shape otherwise.
 */
function installWhatsAppApiStub(
	failedTypes: string[] = [],
	failureSequence?: WhatsAppFailureSequence,
) {
	let nextMessageId = 1000;
	let failuresLeft = failureSequence?.count ?? 0;
	return installFetchStub({
		match: /graph\.facebook\.com/,
		onRequest: ({ url, body }) => {
			const path = url.split('?')[0];
			const method = path.slice(path.lastIndexOf('/') + 1);
			const type = typeof body.type === 'string' ? body.type : undefined;
			if (type && failedTypes.includes(type)) {
				return {
					apiCall: { method, body },
					responseBody: { error: { message: 'Test failure', code: 131047 } },
					status: 400,
				};
			}
			if (failuresLeft > 0) {
				failuresLeft--;
				return {
					apiCall: { method, body },
					responseBody: {
						error: { message: 'Test rate limit', code: failureSequence?.code ?? 130429 },
					},
					status: failureSequence?.status ?? 400,
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
		failureSequence?: WhatsAppFailureSequence;
	} = {},
): Promise<WhatsAppReplayContext> {
	const stub = installWhatsAppApiStub(options.failedApiTypes, options.failureSequence);

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
		return await setup.sendJsonWebhook(
			async (request: Request, requestOptions?: { waitUntil?: (task: Promise<unknown>) => void }) =>
				await webhooks.whatsapp(request, requestOptions),
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
