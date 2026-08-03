import type { StreamChunk } from '@n8n/agents';
import type { AgentIntegrationConfig } from '@n8n/api-types';
import nock from 'nock';
import type { Mock } from 'vitest';

import type { ChatInstance } from '../../../chat-integration.service';
import { ComponentMapper } from '../../../component-mapper';
import type {
	getIntegrationToolConnectionDescriptors,
	IntegrationMessageContext,
} from '../../../integration-tools';
import { SlackIntegration } from '../../../platforms/slack-integration';
import {
	createReplayContextSetup,
	type MemoryMessageContextStore,
	type ReplayApiCall,
	type ReplayContextSetup,
	type ReplayWebhookHandler,
	sendJsonWebhook,
} from '../replay-test-helpers';

export interface SlackUserFixture {
	id: string;
	name: string;
	real_name: string;
}

export interface SlackChannelFixture {
	id: string;
	name: string;
}

export interface SlackEventFixture {
	token?: string;
	type: 'event_callback';
	team_id: string;
	authorizations?: Array<{
		team_id: string;
		user_id: string;
		is_bot: boolean;
	}>;
	event: {
		type: string;
		subtype?: string;
		user: string;
		text: string;
		ts: string;
		thread_ts?: string;
		channel: string;
		channel_type: string;
		team?: string;
		bot_id?: string;
	};
}

export interface SlackReplayFixtures {
	botUserId: string;
	user: SlackUserFixture;
	channel: SlackChannelFixture;
	mention: SlackEventFixture;
	followUp: SlackEventFixture;
	selfMessage: SlackEventFixture;
}

export type SlackApiCall = ReplayApiCall;

export interface SlackReplayContext
	extends Omit<ReplayContextSetup, 'agentExecutor' | 'nextStream' | 'chat'> {
	chat: ChatInstance;
	agentExecutor: {
		executeForChatPublished: Mock;
	};
	apiCalls: SlackApiCall[];
	descriptor: ReturnType<typeof getIntegrationToolConnectionDescriptors>[number];
	integration: AgentIntegrationConfig;
	messageContextStore: MemoryMessageContextStore;
	sendWebhook: (payload: unknown) => Promise<Response>;
	latestContext: () => IntegrationMessageContext | undefined;
	latestThreadId: () => string | undefined;
	lastPost: () => SlackApiCall | undefined;
}

const SLACK_BOT_TOKEN = 'xoxb-test-token';
const SLACK_API_URL = 'https://slack.com/api/';

/** Extract the Web API method (`chat.postMessage`, `auth.test`, …) from a URL. */
function slackMethodFromUri(uri: string): string {
	return uri.split('?')[0].replace(/^.*\/api\//, '');
}

/** `@slack/web-api` posts form-encoded bodies; normalize them to a record. */
function parseSlackBody(requestBody: unknown): Record<string, unknown> {
	if (requestBody && typeof requestBody === 'object') return requestBody as Record<string, unknown>;
	if (typeof requestBody !== 'string') return {};
	const params = new URLSearchParams(requestBody);
	const body: Record<string, unknown> = {};
	for (const [key, value] of params) body[key] = value;
	return body;
}

/** Concatenate `markdown_text` from a Slack streaming `chunks` form field. */
function collectStreamChunkText(body: Record<string, unknown>): string {
	const raw = body.chunks;
	if (typeof raw !== 'string') return '';
	try {
		const chunks = JSON.parse(raw) as Array<{ type?: string; text?: string }>;
		return chunks
			.filter((chunk) => chunk.type === 'markdown_text' && typeof chunk.text === 'string')
			.map((chunk) => chunk.text)
			.join('');
	} catch {
		return '';
	}
}

/**
 * The Slack adapter calls the Web API through `@slack/web-api` (axios), so a
 * `fetch` stub can't see it — intercept at the HTTP layer with nock instead.
 *
 * Agent replies are sent through Slack's assistant streaming API
 * (`chat.startStream` → `appendStream` → `stopStream`), not `chat.postMessage`.
 * We reconstruct the streamed text and record it as a synthetic `chat.postMessage`
 * so assertions can treat the agent reply as a single outbound post.
 */
function installSlackApiNock(botUserId: string) {
	const apiCalls: SlackApiCall[] = [];
	let streamSeq = 0;
	let activeStream: { channel: string; threadTs: string; ts: string; text: string } | undefined;

	nock('https://slack.com')
		.persist()
		.post(/\/api\/.+/)
		.reply(200, (uri, requestBody) => {
			const method = slackMethodFromUri(uri);
			const body = parseSlackBody(requestBody);

			if (method === 'chat.startStream') {
				const ts = `1719000999.0000${++streamSeq}`;
				activeStream = {
					channel: String(body.channel ?? ''),
					threadTs: String(body.thread_ts ?? ''),
					ts,
					text: collectStreamChunkText(body),
				};
				return { ok: true, ts };
			}
			if (method === 'chat.appendStream') {
				if (activeStream) activeStream.text += collectStreamChunkText(body);
				return { ok: true, ts: activeStream?.ts };
			}
			if (method === 'chat.stopStream') {
				if (activeStream) {
					activeStream.text += collectStreamChunkText(body);
					// Surface the streamed reply as a single post for assertions.
					apiCalls.push({
						method: 'chat.postMessage',
						body: {
							channel: activeStream.channel,
							thread_ts: activeStream.threadTs,
							// Streamed agent replies carry text as markdown, matching the
							// real adapter's non-streaming `chat.postMessage` for DMs.
							markdown_text: activeStream.text,
						},
					});
				}
				const ts = activeStream?.ts ?? '1719000999.000999';
				activeStream = undefined;
				return { ok: true, ts, message: { ts } };
			}

			apiCalls.push({ method, body });
			if (method === 'auth.test') {
				return { ok: true, user_id: botUserId, user: 'n8n_agent', team_id: 'T_TEAM' };
			}
			if (method === 'chat.postMessage') {
				return {
					ok: true,
					channel: body.channel,
					ts: '1719000999.000999',
					message: { ts: '1719000999.000999' },
				};
			}
			if (method === 'conversations.open') {
				return { ok: true, channel: { id: 'D_OPENED' } };
			}
			return { ok: true };
		});
	return { apiCalls, restore: () => nock.cleanAll() };
}

export async function createSlackReplayContext(
	fixtures: SlackReplayFixtures,
	options: { stream?: StreamChunk[] } = {},
): Promise<SlackReplayContext> {
	const stub = installSlackApiNock(fixtures.botUserId);

	const { createSlackAdapter } = await import('@chat-adapter/slack');
	const { Chat } = await import('chat');
	const { createMemoryState } = await import('@chat-adapter/state-memory');

	const adapter = createSlackAdapter({
		botToken: SLACK_BOT_TOKEN,
		// Provided so the adapter skips the `auth.test` identity lookup on connect.
		botUserId: fixtures.botUserId,
		// Replay fixtures carry sanitized signatures, so bypass signature checks.
		webhookVerifier: () => true,
		mode: 'webhook',
		apiUrl: SLACK_API_URL,
	});
	const chat = new Chat({
		userName: 'n8n-agent-agent-1',
		adapters: { slack: adapter } as unknown as Record<string, never>,
		state: createMemoryState(),
	});

	const integration: AgentIntegrationConfig = { type: 'slack', credentialId: 'cred-slack' };
	const setup = createReplayContextSetup({
		chat: chat as never,
		integrationImpl: new SlackIntegration(),
		integration,
		componentMapper: new ComponentMapper(),
		stream: options.stream,
	});

	await chat.initialize();

	const webhooks = chat.webhooks as Record<string, ReplayWebhookHandler>;
	const sendWebhook = async (payload: unknown) =>
		await sendJsonWebhook(
			async (request, requestOptions) => await webhooks.slack(request, requestOptions),
			'https://n8n.example.com/rest/projects/project-1/agents/v2/agent-1/webhooks/slack',
			payload,
		);

	return {
		...setup,
		chat: chat as unknown as ChatInstance,
		apiCalls: stub.apiCalls,
		sendWebhook,
		latestContext: () => setup.messageContextStore.latest(),
		latestThreadId: () => setup.messageContextStore.latestThreadId(),
		lastPost: () => stub.apiCalls.filter((call) => call.method === 'chat.postMessage').at(-1),
		shutdown: async () => {
			try {
				await setup.shutdown();
			} finally {
				stub.restore();
			}
		},
	};
}
