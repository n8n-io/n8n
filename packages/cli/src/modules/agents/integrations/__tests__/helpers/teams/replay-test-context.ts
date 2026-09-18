import type { StreamChunk } from '@n8n/agents';
import type { Logger as BackendLogger } from '@n8n/backend-common';
import { generateKeyPairSync, randomUUID } from 'crypto';
import jwt from 'jsonwebtoken';
import nock from 'nock';
import { mock } from 'vitest-mock-extended';

import type { AgentRepository } from '../../../../repositories/agent.repository';
import type { ChatInstance } from '../../../chat-integration.service';
import { ComponentMapper } from '../../../component-mapper';
import type { IntegrationMessageContext } from '../../../integration-tools';
import { TeamsIntegration } from '../../../platforms/teams/teams-integration';
import {
	createReplayContextSetup,
	type ReplayApiCall,
	type ReplayContextSetup,
	type ReplayWebhookHandler,
	sendJsonWebhook,
} from '../replay-test-helpers';
import {
	TEAMS_APP_ID,
	TEAMS_SERVICE_URL,
	TEAMS_CLIENT_SECRET,
	TEAMS_TENANT_ID,
} from './synthetic-fixtures';

/**
 * Bot Framework constants the Teams SDK derives from its `PUBLIC` cloud config.
 * Pinned here so a stub drifting from the SDK fails loudly instead of silently
 * letting an unauthenticated request through.
 */
const JWKS_ORIGIN = 'https://login.botframework.com';
const JWKS_PATH = '/v1/.well-known/keys';
const TOKEN_ISSUER = 'https://api.botframework.com';
const LOGIN_ORIGIN = 'https://login.microsoftonline.com';

export interface TeamsReplayContext extends Omit<ReplayContextSetup, 'chat'> {
	chat: ChatInstance;
	sendWebhook: (payload: unknown) => Promise<Response>;
	/** Same payload, no Authorization header — proves the token check is live. */
	sendUnauthenticatedWebhook: (payload: unknown) => Promise<Response>;
	latestContext: () => IntegrationMessageContext | undefined;
	latestThreadId: () => string | undefined;
	lastPost: () => ReplayApiCall | undefined;
	lastEdit: () => ReplayApiCall | undefined;
	/** Every activity the adapter sent, in order. */
	activities: () => ReplayApiCall[];
	lastPostedMessageId: () => string | undefined;
}

/**
 * Signs real RS256 Bot Framework tokens, because the adapter exposes no
 * verification bypass. The matching JWK is served from the stubbed JWKS, so the
 * adapter's own validation stays under test.
 */
let cachedSigner: ReturnType<typeof buildBotFrameworkSigner> | undefined;

/** Reused across contexts: no test needs distinct key material. */
function createBotFrameworkSigner() {
	return (cachedSigner ??= buildBotFrameworkSigner());
}

function buildBotFrameworkSigner() {
	const keyId = randomUUID();
	const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
	const jwk = publicKey.export({ format: 'jwk' });

	return {
		jwks: { keys: [{ ...jwk, kid: keyId, use: 'sig', alg: 'RS256' }] },
		/**
		 * The Teams SDK decodes the token it gets back from the mint to read its
		 * claims, so an opaque placeholder string fails.
		 */
		accessToken: () =>
			jwt.sign({ aud: TOKEN_ISSUER, iss: TOKEN_ISSUER, appid: TEAMS_APP_ID }, privateKey, {
				algorithm: 'RS256',
				expiresIn: '1h',
				keyid: keyId,
			}),
		sign: () =>
			jwt.sign(
				{
					serviceurl: TEAMS_SERVICE_URL,
					aud: TEAMS_APP_ID,
					iss: TOKEN_ISSUER,
					appid: TEAMS_APP_ID,
					sub: TEAMS_APP_ID,
				},
				privateKey,
				{ algorithm: 'RS256', expiresIn: '1h', keyid: keyId },
			),
	};
}

export interface TeamsStreamingFailure {
	status: number;
	message: string;
	/** Streaming activities to let through before the failure starts. */
	afterChunks?: number;
}

/** True for the `typing` activities that carry a stream, not a plain indicator. */
function isStreamingActivity(body: Record<string, unknown>): boolean {
	const entities = body.entities;
	return (
		Array.isArray(entities) &&
		entities.some((entity) => (entity as { type?: string })?.type === 'streaminfo')
	);
}

function installTeamsApiStub(
	jwks: object,
	accessToken: string,
	failStreamingWith?: TeamsStreamingFailure,
) {
	const apiCalls: ReplayApiCall[] = [];
	const serviceUrl = new URL(TEAMS_SERVICE_URL);

	nock(JWKS_ORIGIN).persist().get(JWKS_PATH).reply(200, jwks);

	nock(LOGIN_ORIGIN)
		.persist()
		.post(/\/[^/]+\/oauth2\/v2\.0\/token/)
		.reply(200, {
			token_type: 'Bearer',
			expires_in: 3599,
			ext_expires_in: 3599,
			access_token: accessToken,
		});

	// Recorded as `sendActivity` so `lastPost()` reads like the other platforms'.
	let nextMessageId = 1000;
	let streamingActivitiesAllowed = failStreamingWith?.afterChunks ?? 0;
	const postedMessageIds: string[] = [];
	nock(serviceUrl.origin)
		.persist()
		.post(/\/v3\/conversations\/.+\/activities.*/)
		.reply(function (_uri, body) {
			const activity = (typeof body === 'object' && body !== null ? body : {}) as Record<
				string,
				unknown
			>;
			apiCalls.push({ method: 'sendActivity', body: activity });
			if (failStreamingWith && isStreamingActivity(activity)) {
				if (streamingActivitiesAllowed > 0) {
					streamingActivitiesAllowed -= 1;
				} else {
					return [failStreamingWith.status, { error: { message: failStreamingWith.message } }];
				}
			}
			const id = `message-${nextMessageId++}`;
			postedMessageIds.push(id);
			return [200, { id }];
		});

	nock(serviceUrl.origin)
		.persist()
		.put(/\/v3\/conversations\/.+\/activities\/.+/)
		.reply(function (_uri, body) {
			apiCalls.push({
				method: 'updateActivity',
				body: (typeof body === 'object' && body !== null ? body : {}) as Record<string, unknown>,
			});
			return [200, { id: 'message-edited' }];
		});

	return { apiCalls, postedMessageIds, restore: () => nock.cleanAll() };
}

export async function createTeamsReplayContext(
	options: {
		stream?: StreamChunk[];
		/** Reject streaming activities, as a tenant without streaming does. */
		failStreamingWith?: TeamsStreamingFailure;
		/** Shorten the stalled-stream deadline so a test does not wait for it. */
		streamingPostTimeoutMs?: number;
	} = {},
): Promise<TeamsReplayContext> {
	const signer = createBotFrameworkSigner();
	const stub = installTeamsApiStub(signer.jwks, signer.accessToken(), options.failStreamingWith);

	// Dynamic imports — the chat packages are ESM-only. Production routes through
	// esm-loader to dodge the CJS transform; vitest loads ESM natively.
	const { createTeamsAdapter } = await import('@chat-adapter/teams');
	const { Chat } = await import('chat');
	const { createMemoryState } = await import('@chat-adapter/state-memory');

	const adapter = createTeamsAdapter({
		appId: TEAMS_APP_ID,
		appPassword: TEAMS_CLIENT_SECRET,
		appTenantId: TEAMS_TENANT_ID,
		appType: 'SingleTenant',
	});
	const chat = new Chat({
		userName: 'n8n-agent-agent-1',
		adapters: { teams: adapter } as unknown as Record<string, never>,
		state: createMemoryState(),
	});

	const integrationImpl = new TeamsIntegration(mock<BackendLogger>(), mock<AgentRepository>());
	if (options.streamingPostTimeoutMs !== undefined) {
		Object.assign(integrationImpl, { streamingPostTimeoutMs: options.streamingPostTimeoutMs });
	}

	const setup = createReplayContextSetup({
		chat: chat as never,
		integrationImpl,
		integration: { type: 'teams', credentialId: 'cred-teams', settings: undefined },
		componentMapper: new ComponentMapper(),
		stream: options.stream,
	});

	await chat.initialize();

	const webhooks = chat.webhooks as unknown as Record<string, ReplayWebhookHandler>;
	const post = async (payload: unknown, headers: Headers) =>
		await sendJsonWebhook(
			async (request, requestOptions) => await webhooks.teams(request, requestOptions),
			'https://n8n.example.com/rest/projects/project-1/agents/v2/agent-1/webhooks/teams',
			payload,
			headers,
		);

	const sendWebhook = async (payload: unknown) => {
		const headers = new Headers();
		headers.set('authorization', `Bearer ${signer.sign()}`);
		return await post(payload, headers);
	};

	const lastCall = (method: string) =>
		stub.apiCalls.filter((call) => call.method === method).at(-1);

	return {
		...setup,
		chat: chat as unknown as ChatInstance,
		sendWebhook,
		sendUnauthenticatedWebhook: async (payload: unknown) => await post(payload, new Headers()),
		latestContext: setup.latestContext,
		latestThreadId: setup.latestThreadId,
		lastPost: () => lastCall('sendActivity'),
		lastEdit: () => lastCall('updateActivity'),
		activities: () => stub.apiCalls.filter((call) => call.method === 'sendActivity'),
		lastPostedMessageId: () => stub.postedMessageIds.at(-1),
		shutdown: async () => {
			stub.restore();
			await setup.shutdown();
		},
	};
}
