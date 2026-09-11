import type {
	AgentWebChatPageConfig,
	AgentWebChatSseEvent,
	AgentWebIntegrationSettings,
} from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import type { User } from '@n8n/db';
import { Service } from '@n8n/di';
import { createHash, timingSafeEqual } from 'node:crypto';

import { CredentialsService } from '@/credentials/credentials.service';
import { ForbiddenError } from '@/errors/response-errors/forbidden.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import { UnauthenticatedError } from '@/errors/response-errors/unauthenticated.error';
import { userHasScopes } from '@/permissions.ee/check-access';
import { JwtService } from '@/services/jwt.service';

import { AgentExecutionOrchestratorService } from './agent-execution-orchestrator.service';
import { hashAgentSandboxPrincipal } from './agent-sandbox-principal';
import type { Agent } from './entities/agent.entity';
import { AgentRepository } from './repositories/agent.repository';
import { createAgentCredentialProvider } from './utils/agent-credential-provider';

/**
 * How long a visitor session stays valid.
 *
 * It bounds a conversation rather than a page view: the token is the only thing
 * tying follow-up turns to the same memory thread, so a short expiry would cut
 * a visitor off mid-conversation.
 */
const SESSION_TTL_SECONDS = 12 * 60 * 60;

const SESSION_TOKEN_KIND = 'agent-web-session';

/** The channel a public request resolved to, with the agent that owns it. */
export interface ResolvedWebChannel {
	agent: Agent;
	settings: AgentWebIntegrationSettings;
	integrationId: string;
}

/** What a verified session token proves about its holder. */
export interface WebChatSession {
	integrationId: string;
	sessionId: string;
	/** Set only for `n8nUserAuth`, where the visitor is a known n8n user. */
	userId?: string;
}

interface SessionTokenPayload {
	kind: typeof SESSION_TOKEN_KIND;
	integrationId: string;
	sessionId: string;
	userId?: string;
}

/**
 * Serves the web channel: resolving a public `integrationId` to the published
 * agent behind it, gating the request by the channel's access mode, and
 * streaming a turn as a deliberately narrow set of events.
 */
@Service()
export class AgentWebChatService {
	constructor(
		private readonly agentRepository: AgentRepository,
		private readonly orchestrator: AgentExecutionOrchestratorService,
		private readonly credentialsService: CredentialsService,
		private readonly jwtService: JwtService,
		private readonly logger: Logger,
	) {}

	/**
	 * Resolve the channel a visitor addressed.
	 *
	 * An id that names nothing, names a non-web entry, or belongs to an agent
	 * that is not published all produce the same `NotFoundError` — a visitor is
	 * not entitled to learn which of those it was.
	 */
	async resolveChannel(integrationId: string): Promise<ResolvedWebChannel> {
		const agent = await this.agentRepository.findPublishedByWebIntegrationId(integrationId);
		const integration = (agent?.integrations ?? []).find(
			(i) => i.type === 'web' && 'integrationId' in i && i.integrationId === integrationId,
		);

		if (!agent || !integration || integration.type !== 'web') {
			throw new NotFoundError('Chat not found');
		}

		return { agent, settings: integration.settings, integrationId };
	}

	/** The non-sensitive part of the channel, safe to hand an unauthenticated page. */
	pageConfig(channel: ResolvedWebChannel): AgentWebChatPageConfig {
		return {
			title: channel.settings.title?.trim() || channel.agent.name,
			...(channel.settings.subtitle ? { subtitle: channel.settings.subtitle } : {}),
			accessMode: channel.settings.accessMode,
		};
	}

	/**
	 * Check a visitor against the channel's access mode, before any session exists.
	 *
	 * Returns the n8n user id to bind into the session when the mode identifies
	 * one, so a later turn does not have to re-resolve it.
	 */
	async authorize(
		channel: ResolvedWebChannel,
		credentials: { basicAuthHeader?: string; n8nUser?: User },
	): Promise<{ userId?: string }> {
		switch (channel.settings.accessMode) {
			case 'public':
				return {};

			case 'n8nUserAuth': {
				const { n8nUser } = credentials;
				if (!n8nUser) throw new UnauthenticatedError('Sign in to use this chat');
				const allowed = await userHasScopes(n8nUser, ['agent:execute'], false, {
					projectId: channel.agent.projectId,
				});
				if (!allowed) throw new ForbiddenError('You do not have access to this chat');
				return { userId: n8nUser.id };
			}

			case 'basicAuth': {
				await this.assertBasicAuth(channel, credentials.basicAuthHeader);
				return {};
			}
		}
	}

	/**
	 * Mint a session token.
	 *
	 * The session id is generated here rather than accepted from the client: it
	 * is the visitor's memory thread, so a client-chosen one would let anyone
	 * read another visitor's conversation by guessing it.
	 */
	issueSession(channel: ResolvedWebChannel, sessionId: string, userId?: string): string {
		const payload: SessionTokenPayload = {
			kind: SESSION_TOKEN_KIND,
			integrationId: channel.integrationId,
			sessionId,
			...(userId ? { userId } : {}),
		};
		return this.jwtService.sign(payload, { expiresIn: SESSION_TTL_SECONDS });
	}

	/**
	 * Verify a session token against the channel it is being used on.
	 *
	 * The `integrationId` is checked because one instance can host many channels
	 * with different access modes — without it, a token minted on a public
	 * channel would open a Basic Auth one.
	 */
	verifySession(token: string | undefined, integrationId: string): WebChatSession {
		if (!token) throw new UnauthenticatedError('Missing session');

		let payload: SessionTokenPayload;
		try {
			payload = this.jwtService.verify<SessionTokenPayload>(token);
		} catch {
			throw new UnauthenticatedError('Session expired');
		}

		if (payload.kind !== SESSION_TOKEN_KIND || payload.integrationId !== integrationId) {
			throw new UnauthenticatedError('Invalid session');
		}

		return {
			integrationId: payload.integrationId,
			sessionId: payload.sessionId,
			...(payload.userId ? { userId: payload.userId } : {}),
		};
	}

	/**
	 * Run one visitor turn and yield only what a public page may see.
	 *
	 * The internal chat stream carries reasoning, tool inputs and outputs, and
	 * execution ids. None of that is translated here: this generator emits the
	 * assistant's text and nothing else, so a new internal chunk type cannot
	 * become a public leak by default.
	 */
	async *streamTurn(params: {
		channel: ResolvedWebChannel;
		session: WebChatSession;
		message: string;
		abortSignal: AbortSignal;
	}): AsyncGenerator<AgentWebChatSseEvent> {
		const { channel, session, message, abortSignal } = params;
		const { agent } = channel;

		// Each visitor session is its own sandbox principal, so one visitor's
		// workspace and episodic memory can never be reached by another.
		const sandboxPrincipalHash = hashAgentSandboxPrincipal({
			type: 'project-session',
			projectId: agent.projectId,
			sessionId: `web:${channel.integrationId}:${session.sessionId}`,
		});

		const stream = this.orchestrator.executeForChatPublished({
			agentId: agent.id,
			projectId: agent.projectId,
			message,
			memory: {
				threadId: `web:${channel.integrationId}:${session.sessionId}`,
				resourceId: session.userId ?? `web-visitor:${session.sessionId}`,
			},
			integrationType: 'web',
			sandboxPrincipalHash,
		});

		try {
			for await (const chunk of stream) {
				if (abortSignal.aborted) return;

				switch (chunk.type) {
					case 'text-start':
						yield { type: 'text-start', id: chunk.id };
						break;
					case 'text-delta':
						yield { type: 'text-delta', id: chunk.id, delta: chunk.delta };
						break;
					case 'text-end':
						yield { type: 'text-end', id: chunk.id };
						break;
					case 'error':
						// The internal message can name a credential, a tool, or an
						// upstream API. A visitor gets a fixed string; the detail is logged.
						this.logger.warn('[AgentWebChatService] Web chat turn failed', {
							agentId: agent.id,
							integrationId: channel.integrationId,
							error: chunk.error,
						});
						yield { type: 'error', message: 'Something went wrong. Please try again.' };
						return;
					default:
						break;
				}
			}
			yield { type: 'done' };
		} catch (error) {
			if (abortSignal.aborted) return;
			this.logger.error('[AgentWebChatService] Web chat turn threw', {
				agentId: agent.id,
				integrationId: channel.integrationId,
				error,
			});
			yield { type: 'error', message: 'Something went wrong. Please try again.' };
		}
	}

	/**
	 * Validate an `Authorization: Basic` header against the channel's credential.
	 *
	 * The credential is decrypted per session request rather than cached: a
	 * rotated password must lock out the next visitor, not the next restart.
	 */
	private async assertBasicAuth(
		channel: ResolvedWebChannel,
		header: string | undefined,
	): Promise<void> {
		const credentialId = channel.settings.basicAuthCredentialId;
		// The schema rejects this combination, so reaching it means the row was
		// written by something else. Refuse rather than fall open.
		if (!credentialId) throw new ForbiddenError('This chat is not available');

		const expected = await this.readBasicAuthCredential(channel, credentialId);
		const provided = parseBasicAuthHeader(header);

		if (!expected || !provided || !credentialsMatch(expected, provided)) {
			throw new UnauthenticatedError('Invalid credentials');
		}
	}

	/**
	 * Read the credential through the agent's own project-scoped provider — the
	 * same path a run takes, so an expression or external-secret field resolves
	 * here too, and a credential outside the project cannot be named.
	 */
	private async readBasicAuthCredential(
		channel: ResolvedWebChannel,
		credentialId: string,
	): Promise<{ user: string; password: string } | undefined> {
		try {
			const provider = createAgentCredentialProvider(
				this.credentialsService,
				channel.agent.projectId,
			);
			const { user, password } = await provider.resolve(credentialId);
			if (typeof user !== 'string' || typeof password !== 'string') return undefined;
			return { user, password };
		} catch (error) {
			this.logger.warn('[AgentWebChatService] Could not read the Basic Auth credential', {
				credentialId,
				error,
			});
			return undefined;
		}
	}
}

/** Decode `Authorization: Basic <base64(user:password)>`. */
function parseBasicAuthHeader(
	header: string | undefined,
): { user: string; password: string } | undefined {
	if (!header?.toLowerCase().startsWith('basic ')) return undefined;

	const decoded = Buffer.from(header.slice(6).trim(), 'base64').toString('utf8');
	const separator = decoded.indexOf(':');
	if (separator === -1) return undefined;

	return { user: decoded.slice(0, separator), password: decoded.slice(separator + 1) };
}

/** Compare both fields in constant time, so a wrong guess leaks no timing signal. */
function credentialsMatch(
	expected: { user: string; password: string },
	provided: { user: string; password: string },
): boolean {
	return (
		constantTimeEquals(expected.user, provided.user) &&
		constantTimeEquals(expected.password, provided.password)
	);
}

/**
 * Compare digests rather than the values themselves: `timingSafeEqual` throws on
 * a length mismatch, and that throw would leak the length of the stored secret.
 */
function constantTimeEquals(a: string, b: string): boolean {
	return timingSafeEqual(sha256(a), sha256(b));
}

function sha256(value: string): Buffer {
	return createHash('sha256').update(value, 'utf8').digest();
}
