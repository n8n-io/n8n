import type { StreamChunk } from '@n8n/agents';
import type { AgentIntegrationConfig } from '@n8n/api-types';
import type { Logger as BackendLogger } from '@n8n/backend-common';
import { generateKeyPairSync, randomUUID } from 'crypto';
import jwt from 'jsonwebtoken';
import nock from 'nock';
import { mock } from 'vitest-mock-extended';

import type { AgentRepository } from '../../../../repositories/agent.repository';
import type { ChatInstance } from '../../../chat-integration.service';
import { ComponentMapper } from '../../../component-mapper';
import { TeamsIntegration } from '../../../platforms/teams-integration';
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
	TEAMS_TENANT_ID,
	type TeamsActivityFixture,
} from './synthetic-fixtures';

const TEAMS_CLIENT_SECRET = 'test-client-secret';

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
	apiCalls: ReplayApiCall[];
	sendWebhook: (payload: unknown) => Promise<Response>;
	/** Same payload, no Authorization header — proves the token check is live. */
	sendUnauthenticatedWebhook: (payload: unknown) => Promise<Response>;
	latestContext: () => ReturnType<ReplayContextSetup['messageContextStore']['latest']>;
	latestThreadId: () => string | undefined;
	lastPost: () => ReplayApiCall | undefined;
	lastEdit: () => ReplayApiCall | undefined;
}

/**
 * The Teams adapter exposes no signature-verification escape hatch the way the
 * Slack helper's `webhookVerifier` does, and `TeamsAdapterConfig` cannot pass
 * the Teams SDK's `skipAuth` through. So inbound activities must carry a real
 * RS256 Bot Framework token.
 *
 * The token is signed with a keypair generated per test run and the matching
 * public JWK is served from the stubbed JWKS endpoint, which keeps the
 * adapter's own validation running for real — only the network is answered here.
 */
function createBotFrameworkSigner() {
	const keyId = randomUUID();
	const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
	const jwk = publicKey.export({ format: 'jwk' });

	return {
		jwks: { keys: [{ ...jwk, kid: keyId, use: 'sig', alg: 'RS256' }] },
		/**
		 * Outbound access token. The Teams SDK decodes the token it gets back from
		 * the mint to read its claims, so an opaque placeholder string fails.
		 */
		accessToken: () =>
			jwt.sign({ aud: TOKEN_ISSUER, iss: TOKEN_ISSUER, appid: TEAMS_APP_ID }, privateKey, {
				algorithm: 'RS256',
				expiresIn: '1h',
				keyid: keyId,
			}),
		/** Sign a token the adapter will accept for an activity on `serviceUrl`. */
		sign: (serviceUrl: string) =>
			jwt.sign(
				{
					serviceurl: serviceUrl,
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

/**
 * Answer every Microsoft host the real adapter reaches: the JWKS the inbound
 * token is validated against, the client-credentials token mint, and the Bot
 * Connector endpoint that outbound replies post to. Outbound activity posts are
 * recorded so tests can assert what the adapter actually sent.
 */
function installTeamsApiStub(jwks: object, accessToken: string) {
	const apiCalls: ReplayApiCall[] = [];
	const serviceUrl = new URL(TEAMS_SERVICE_URL);

	nock(JWKS_ORIGIN).persist().get(JWKS_PATH).reply(200, jwks);

	nock(JWKS_ORIGIN)
		.persist()
		.get('/v1/.well-known/openidconfiguration')
		.reply(200, { issuer: TOKEN_ISSUER, jwks_uri: `${JWKS_ORIGIN}${JWKS_PATH}` });

	// Client-credentials mint for outbound calls, plus the OIDC discovery MSAL
	// performs before it.
	nock(LOGIN_ORIGIN)
		.persist()
		.get(/\/[^/]+\/v2\.0\/\.well-known\/openid-configuration/)
		.reply(200, {
			issuer: `${LOGIN_ORIGIN}/botframework.com/v2.0`,
			token_endpoint: `${LOGIN_ORIGIN}/botframework.com/oauth2/v2.0/token`,
			authorization_endpoint: `${LOGIN_ORIGIN}/botframework.com/oauth2/v2.0/authorize`,
			jwks_uri: `${LOGIN_ORIGIN}/botframework.com/discovery/v2.0/keys`,
			response_modes_supported: ['query', 'fragment', 'form_post'],
			response_types_supported: ['code', 'id_token', 'token'],
			subject_types_supported: ['pairwise'],
			id_token_signing_alg_values_supported: ['RS256'],
			tenant_region_scope: 'WW',
			cloud_instance_name: 'microsoftonline.com',
			cloud_graph_host_name: 'graph.windows.net',
			msgraph_host: 'graph.microsoft.com',
		});

	nock(LOGIN_ORIGIN)
		.persist()
		.post(/\/[^/]+\/oauth2\/v2\.0\/token/)
		.reply(200, {
			token_type: 'Bearer',
			expires_in: 3599,
			ext_expires_in: 3599,
			access_token: accessToken,
		});

	nock('https://graph.microsoft.com')
		.persist()
		.get(/.*/)
		.reply(404, { error: { code: 'NotFound', message: 'Not stubbed' } });

	// Outbound replies. Recorded as `sendActivity` so assertions read the same
	// way as the other platforms' `lastPost()`.
	let nextMessageId = 1000;
	nock(serviceUrl.origin)
		.persist()
		.post(/\/v3\/conversations\/.+\/activities.*/)
		.reply(function (_uri, body) {
			apiCalls.push({
				method: 'sendActivity',
				body: (typeof body === 'object' && body !== null ? body : {}) as Record<string, unknown>,
			});
			return [200, { id: `message-${nextMessageId++}` }];
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

	return { apiCalls, restore: () => nock.cleanAll() };
}

function createIntegration() {
	return new TeamsIntegration(mock<BackendLogger>(), mock<AgentRepository>());
}

export async function createTeamsReplayContext(
	options: {
		stream?: StreamChunk[];
		integration?: AgentIntegrationConfig;
	} = {},
): Promise<TeamsReplayContext> {
	const signer = createBotFrameworkSigner();
	const stub = installTeamsApiStub(signer.jwks, signer.accessToken());

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

	const integration = options.integration ?? {
		type: 'teams',
		credentialId: 'cred-teams',
		settings: undefined,
	};
	const setup = createReplayContextSetup({
		chat: chat as never,
		integrationImpl: createIntegration(),
		integration,
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
		const activity = payload as TeamsActivityFixture;
		const headers = new Headers();
		headers.set('authorization', `Bearer ${signer.sign(activity.serviceUrl)}`);
		return await post(payload, headers);
	};

	return {
		...setup,
		chat: chat as unknown as ChatInstance,
		apiCalls: stub.apiCalls,
		sendWebhook,
		sendUnauthenticatedWebhook: async (payload: unknown) => await post(payload, new Headers()),
		latestContext: () => setup.messageContextStore.latest(),
		latestThreadId: () => setup.messageContextStore.latestThreadId(),
		lastPost: () => [...stub.apiCalls].reverse().find((call) => call.method === 'sendActivity'),
		lastEdit: () => [...stub.apiCalls].reverse().find((call) => call.method === 'updateActivity'),
		shutdown: async () => {
			stub.restore();
			await setup.shutdown();
		},
	};
}
