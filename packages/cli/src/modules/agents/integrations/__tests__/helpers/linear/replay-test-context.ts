import type { StreamChunk } from '@n8n/agents';
import type { AgentIntegrationConfig } from '@n8n/api-types';
import type { Logger as BackendLogger } from '@n8n/backend-common';
import type { OutboundHttp } from '@n8n/backend-network';
import { mock } from 'jest-mock-extended';

import type {
	getIntegrationToolConnectionDescriptors,
	IntegrationMessageContext,
} from '../../../integration-tools';
import { LinearIntegration } from '../../../platforms/linear-integration';
import {
	createReplayContextSetup,
	type MemoryMessageContextStore,
	postableToText,
	type ReplayApiCall,
	type ReplayAuthor,
	ReplayChat,
	type ReplayContextSetup,
	type ReplayMessage,
	type ReplayPlatformAdapter,
	type ReplayPostable,
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

type LinearMessageSubject = {
	type: string;
	id: string;
	title?: string;
	description?: string;
	url?: string;
	author?: { id: string; name: string };
};

type LinearMessage = ReplayMessage<
	LinearAgentSessionFixture | LinearCommentFixture,
	LinearMessageSubject
>;

export interface LinearReplayContext extends Omit<ReplayContextSetup, 'nextStream' | 'chat'> {
	chat: ReplayChat<ReplayPostable, LinearMessage>;
	agentExecutor: {
		executeForChatPublished: jest.Mock;
		resumeForChat: jest.Mock;
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

// TODO: Remove this fake adapter after the jest -> vitest migration. It mirrors
// the small Chat SDK surface the bridge needs without importing the ESM adapter.
class TestLinearAdapter implements ReplayPlatformAdapter<ReplayPostable, LinearMessage> {
	readonly name = 'linear';

	readonly client: Record<string, unknown> = {};

	private readonly sessions = new Map<
		string,
		| { type: 'agent-session'; agentSessionId: string; issueId: string }
		| { type: 'comment'; issueId: string }
	>();

	constructor(
		readonly botUser: LinearUserFixture,
		private readonly apiCalls: LinearApiCall[],
	) {}

	async handleWebhook(
		request: Request,
		chat: ReplayChat<ReplayPostable, LinearMessage>,
		options?: { waitUntil?: (task: Promise<unknown>) => void },
	): Promise<Response> {
		const payload = (await request.json()) as
			| LinearAgentSessionEventFixture
			| LinearCommentEventFixture;
		if (payload.type === 'AgentSessionEvent' && payload.action === 'created') {
			const session = payload.agentSession;
			const threadId = `linear:${session.id}`;
			this.sessions.set(threadId, {
				type: 'agent-session',
				agentSessionId: session.id,
				issueId: session.issueId,
			});
			chat.processMessage(threadId, this.parseAgentSessionMessage(session, threadId), options);
			return new Response('OK', { status: 200 });
		}

		const commentPayload = payload;
		if (commentPayload.type === 'Comment' && commentPayload.action === 'create') {
			const comment = commentPayload.data;
			const threadId = `linear:${comment.issue.id}`;
			this.sessions.set(threadId, { type: 'comment', issueId: comment.issue.id });
			chat.processMessage(threadId, this.parseCommentMessage(comment, threadId), options);
		}
		return new Response('OK', { status: 200 });
	}

	async postMessage(
		threadId: string,
		message: ReplayPostable,
	): Promise<{ id: string; threadId: string }> {
		const session = this.sessions.get(threadId);
		const text = await postableToText(message);
		const body =
			session?.type === 'agent-session'
				? {
						agentSessionId: session.agentSessionId,
						content: { type: 'response', body: text },
					}
				: {
						issueId: session?.issueId ?? this.sessionIdFromThreadId(threadId),
						body: text,
					};
		this.apiCalls.push({
			method: session?.type === 'agent-session' ? 'agentActivityCreate' : 'createComment',
			body,
		});
		await Promise.resolve();
		return { id: 'agent-activity-response', threadId };
	}

	channelIdFromThreadId(threadId: string): string {
		return this.sessions.get(threadId)?.issueId ?? this.sessionIdFromThreadId(threadId);
	}

	async getUser(userId: string): Promise<ReplayAuthor> {
		return await Promise.resolve({
			userId,
			userName: userId,
			fullName: userId,
			isBot: userId === this.botUser.id,
			isMe: userId === this.botUser.id,
		});
	}

	shouldDispatchAsMention(_threadId: string, message: LinearMessage): boolean {
		return message.isMention;
	}

	private parseAgentSessionMessage(
		session: LinearAgentSessionFixture,
		threadId: string,
	): LinearMessage {
		return {
			id: session.comment.id,
			threadId,
			text: session.comment.body,
			raw: session,
			author: this.toAuthor(session.creator),
			isMention: session.comment.body.includes(`@${this.botUser.displayName}`),
			subject: Promise.resolve(this.agentSessionSubject(session)),
		};
	}

	private parseCommentMessage(comment: LinearCommentFixture, threadId: string): LinearMessage {
		return {
			id: comment.id,
			threadId,
			text: comment.body,
			raw: comment,
			author: this.toAuthor(comment.user),
			isMention: comment.body.includes(`@${this.botUser.displayName}`),
			subject: Promise.resolve(this.commentSubject(comment)),
		};
	}

	private toAuthor(user: LinearUserFixture): ReplayAuthor {
		const isMe = user.id === this.botUser.id || user.app === true;
		return {
			userId: user.id,
			userName: user.name,
			fullName: user.displayName,
			isBot: isMe,
			isMe,
		};
	}

	private agentSessionSubject(session: LinearAgentSessionFixture): LinearMessageSubject {
		return {
			type: 'issue',
			id: session.issue.identifier,
			title: session.issue.title,
			...(session.issue.description ? { description: session.issue.description } : {}),
			...(session.issue.url ? { url: session.issue.url } : {}),
			author: { id: session.creator.id, name: session.creator.displayName },
		};
	}

	private commentSubject(comment: LinearCommentFixture): LinearMessageSubject {
		return {
			type: 'issue',
			id: comment.issue.identifier,
			title: comment.issue.title,
			...(comment.issue.description ? { description: comment.issue.description } : {}),
			...(comment.issue.url ? { url: comment.issue.url } : {}),
			author: { id: comment.user.id, name: comment.user.displayName },
		};
	}

	private sessionIdFromThreadId(threadId: string): string {
		return threadId.startsWith('linear:') ? (threadId.split(':')[1] ?? threadId) : threadId;
	}
}

export async function createLinearReplayContext(
	fixtures: LinearReplayFixtures,
	options: { stream?: StreamChunk[] } = {},
): Promise<LinearReplayContext> {
	await Promise.resolve();
	const apiCalls: LinearApiCall[] = [];
	const adapter = new TestLinearAdapter(fixtures.botUser, apiCalls);
	const chat = new ReplayChat(adapter);
	const setup = createReplayContextSetup({
		chat: chat as never,
		integrationImpl: new LinearIntegration(mock<BackendLogger>(), mock<OutboundHttp>()),
		integration: { type: 'linear', credentialId: 'cred-linear' },
		stream: options.stream,
	});

	const sendWebhook = async (payload: unknown) =>
		await sendJsonWebhook(
			chat.webhooks.linear,
			'https://n8n.example.com/rest/projects/project-1/agents/v2/agent-1/webhooks/linear',
			payload,
		);

	return {
		...setup,
		chat,
		apiCalls,
		sendWebhook,
		latestContext: () => setup.messageContextStore.latest(),
		latestThreadId: () => setup.messageContextStore.latestThreadId(),
		lastPost: () => apiCalls.at(-1),
	};
}
