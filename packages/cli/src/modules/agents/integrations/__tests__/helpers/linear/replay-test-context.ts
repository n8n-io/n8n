import type { StreamChunk } from '@n8n/agents';
import type { AgentIntegrationConfig } from '@n8n/api-types';
import type { Logger as BackendLogger } from '@n8n/backend-common';
import type { OutboundHttp } from '@n8n/backend-network';
import { createHmac } from 'crypto';
import type { Mock } from 'vitest';
import { mock } from 'vitest-mock-extended';

import type { ChatInstance } from '../../../chat-integration.service';
import { ComponentMapper } from '../../../component-mapper';
import type {
	getIntegrationToolConnectionDescriptors,
	IntegrationMessageContext,
} from '../../../integration-tools';
import { LinearIntegration } from '../../../platforms/linear-integration';
import {
	createReplayContextSetup,
	installFetchStub,
	type MemoryMessageContextStore,
	type ReplayApiCall,
	type ReplayContextSetup,
	type ReplayWebhookHandler,
	sendJsonWebhook,
} from '../replay-test-helpers';

export interface LinearUserFixture {
	id: string;
	name: string;
	displayName: string;
	email?: string;
	url?: string;
	app?: boolean;
}

export interface LinearIssueFixture {
	id: string;
	identifier: string;
	title: string;
	description?: string;
	url?: string;
	team?: { id: string; key: string; name: string };
}

export interface LinearAgentSessionFixture {
	id: string;
	creatorId: string;
	appUserId: string;
	commentId: string;
	issueId: string;
	url?: string;
	creator: LinearUserFixture;
	comment: {
		id: string;
		body: string;
		userId: string;
		issueId: string;
	};
	issue: LinearIssueFixture;
}

export interface LinearCommentFixture {
	id: string;
	body: string;
	user: LinearUserFixture;
	issue: LinearIssueFixture;
	createdAt: string;
	updatedAt?: string;
	url?: string;
}

export interface LinearAgentSessionEventFixture {
	type: 'AgentSessionEvent';
	action: 'created';
	createdAt: string;
	organizationId: string;
	appUserId: string;
	agentSession: LinearAgentSessionFixture;
}

export interface LinearCommentEventFixture {
	type: 'Comment';
	action: 'create';
	organizationId: string;
	webhookId: string;
	webhookTimestamp: number;
	data: LinearCommentFixture;
}

export interface LinearReplayFixtures {
	botUser: LinearUserFixture;
	mention: LinearAgentSessionEventFixture | LinearCommentEventFixture;
	followUp?: LinearCommentEventFixture;
	selfMessage?: LinearCommentEventFixture;
}

export type LinearApiCall = ReplayApiCall;

export interface LinearReplayContext extends Omit<ReplayContextSetup, 'nextStream' | 'chat'> {
	chat: ChatInstance;
	agentExecutor: {
		executeForChatPublished: Mock;
		resumeForChat: Mock;
	};
	apiCalls: LinearApiCall[];
	descriptor: ReturnType<typeof getIntegrationToolConnectionDescriptors>[number];
	integration: AgentIntegrationConfig;
	messageContextStore: MemoryMessageContextStore;
	sendWebhook: (payload: unknown) => Promise<Response>;
	latestContext: () => IntegrationMessageContext | undefined;
	latestThreadId: () => string | undefined;
	lastPost: () => LinearApiCall | undefined;
}

const LINEAR_ACCESS_TOKEN = 'lin_test-access-token';
const LINEAR_WEBHOOK_SECRET = 'test-webhook-secret';
const POST_METHODS = new Set(['agentActivityCreate', 'createComment']);

/**
 * Builds the canned `@linear/sdk` entities the adapter re-reads after posting.
 * After `agentActivityCreate` the adapter resolves `agentActivity.sourceComment`
 * and that comment's `user`, throwing if any are missing — so responses must be
 * fully shaped (and dates must be ISO strings, which the SDK wraps as `Date`).
 */
function buildLinearStubData(fixtures: LinearReplayFixtures, botUser: LinearUserFixture) {
	const session =
		fixtures.mention.type === 'AgentSessionEvent' ? fixtures.mention.agentSession : undefined;
	const createdAt = '2026-01-01T00:00:00.000Z';

	const user = session
		? {
				id: session.creator.id,
				displayName: session.creator.displayName,
				name: session.creator.name,
				email: session.creator.email ?? null,
				avatarUrl: null,
			}
		: { id: botUser.id, displayName: botUser.displayName, name: botUser.name, email: null };

	const sourceComment = session
		? {
				id: session.comment.id,
				body: session.comment.body,
				userId: session.comment.userId,
				user,
				createdAt,
				updatedAt: createdAt,
				parentId: null,
				url: null,
				// `@linear/sdk`'s Comment constructor maps over `reactions` unguarded.
				reactions: [],
			}
		: undefined;

	// `agentSessionId`/`sourceComment` are getters over nested id refs, and the
	// SDK fetches the comment by id — so reference them by id, not inline.
	const agentActivity = {
		id: 'AGENT_ACTIVITY_1',
		agentSession: { id: session?.id ?? 'AGENT_SESSION_1' },
		sourceComment: { id: session?.comment.id ?? 'COMMENT_SOURCE' },
	};

	return { user, sourceComment, agentActivity };
}

/**
 * Map a Linear GraphQL operation to a method name + canned response. Query
 * responses must be non-empty entities — `@linear/sdk` wraps them in typed
 * objects and reads fields like `archivedAt`/`sourceComment`, which throw on
 * `undefined`.
 */
function resolveLinearOperation(
	query: string,
	variables: { id?: unknown },
	stub: ReturnType<typeof buildLinearStubData>,
	botUser: LinearUserFixture,
	organizationId: string,
): { method: string; data: Record<string, unknown> } {
	if (query.includes('agentActivityCreate')) {
		return {
			method: 'agentActivityCreate',
			data: {
				agentActivityCreate: { agentActivity: stub.agentActivity, lastSyncId: 1, success: true },
			},
		};
	}
	if (/commentCreate/i.test(query)) {
		return {
			method: 'createComment',
			data: {
				commentCreate: {
					comment: stub.sourceComment ?? { id: 'COMMENT_NEW' },
					lastSyncId: 1,
					success: true,
				},
			},
		};
	}
	if (/\bagentActivity\(/.test(query)) {
		return { method: 'agentActivity', data: { agentActivity: stub.agentActivity } };
	}
	if (/\bcomment\(/.test(query)) {
		return { method: 'comment', data: { comment: stub.sourceComment } };
	}
	if (/\buser\(/.test(query)) {
		return { method: 'user', data: { user: stub.user } };
	}
	if (/\bissue\(/.test(query)) {
		return { method: 'issue', data: { issue: { id: String(variables.id ?? 'ISSUE') } } };
	}
	if (/viewer/i.test(query)) {
		return {
			method: 'viewer',
			data: {
				viewer: {
					id: botUser.id,
					displayName: botUser.displayName,
					organization: { id: organizationId },
				},
			},
		};
	}
	return { method: 'graphql', data: {} };
}

export async function createLinearReplayContext(
	fixtures: LinearReplayFixtures,
	options: { stream?: StreamChunk[] } = {},
): Promise<LinearReplayContext> {
	const organizationId = fixtures.mention.organizationId;
	const mode = fixtures.mention.type === 'AgentSessionEvent' ? 'agent-sessions' : 'comments';
	const stubData = buildLinearStubData(fixtures, fixtures.botUser);

	const stub = installFetchStub({
		match: /api\.linear\.app/,
		onRequest: ({ body }) => {
			const query = typeof body.query === 'string' ? body.query : '';
			const variables = (body.variables ?? {}) as { id?: unknown; input?: Record<string, unknown> };
			const { method, data } = resolveLinearOperation(
				query,
				variables,
				stubData,
				fixtures.botUser,
				organizationId,
			);
			return {
				apiCall: { method, body: variables.input ?? (variables as Record<string, unknown>) },
				responseBody: { data },
			};
		},
	});

	const { createLinearAdapter } = await import('@chat-adapter/linear');
	const { Chat } = await import('chat');
	const { createMemoryState } = await import('@chat-adapter/state-memory');

	const adapter = createLinearAdapter({
		accessToken: LINEAR_ACCESS_TOKEN,
		webhookSecret: LINEAR_WEBHOOK_SECRET,
		userName: fixtures.botUser.displayName,
		mode,
	} as Parameters<typeof createLinearAdapter>[0]);
	const chat = new Chat({
		userName: 'n8n-agent-agent-1',
		adapters: { linear: adapter } as unknown as Record<string, never>,
		state: createMemoryState(),
	});

	const integration: AgentIntegrationConfig = { type: 'linear', credentialId: 'cred-linear' };
	const setup = createReplayContextSetup({
		chat: chat as never,
		integrationImpl: new LinearIntegration(mock<BackendLogger>(), mock<OutboundHttp>()),
		integration,
		componentMapper: new ComponentMapper(),
		stream: options.stream,
	});

	await chat.initialize();

	const webhooks = chat.webhooks as Record<string, ReplayWebhookHandler>;
	const sendWebhook = async (payload: unknown) => {
		// Linear's webhook client verifies an HMAC `linear-signature` and rejects
		// stale `webhookTimestamp`s, so refresh the timestamp and sign the body.
		const signed = { ...(payload as Record<string, unknown>), webhookTimestamp: Date.now() };
		const rawBody = JSON.stringify(signed);
		const headers = new Headers();
		headers.set(
			'linear-signature',
			createHmac('sha256', LINEAR_WEBHOOK_SECRET).update(rawBody).digest('hex'),
		);
		return await sendJsonWebhook(
			async (request, requestOptions) => await webhooks.linear(request, requestOptions),
			'https://n8n.example.com/rest/projects/project-1/agents/v2/agent-1/webhooks/linear',
			signed,
			headers,
		);
	};

	return {
		...setup,
		chat: chat as unknown as ChatInstance,
		apiCalls: stub.apiCalls,
		sendWebhook,
		latestContext: () => setup.messageContextStore.latest(),
		latestThreadId: () => setup.messageContextStore.latestThreadId(),
		lastPost: () => stub.apiCalls.filter((call) => POST_METHODS.has(call.method)).at(-1),
		shutdown: async () => {
			try {
				await setup.shutdown();
			} finally {
				stub.restore();
			}
		},
	};
}
