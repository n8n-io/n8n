import type { StreamChunk } from '@n8n/agents';
import { Service } from '@n8n/di';
import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
import { InstanceSettings } from 'n8n-core';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';

import { stripCitationMarkers } from './citation-markers';
import {
	hashAgentSandboxPrincipal,
	type AgentSandboxPrincipalHash,
} from '../../agent-sandbox-principal';
import type { Agent } from '../../entities/agent.entity';
import { AgentExecutionOrchestratorService } from '../../agent-execution-orchestrator.service';
import { AgentRepository } from '../../repositories/agent.repository';

export interface NonStreamingResult {
	content: string;
	finishReason: string;
}

export interface OpenAiChatMessage {
	role: string;
	content: unknown;
	tool_calls?: unknown;
}

export interface AuthenticatedOpenAiChannel {
	agent: Agent;
	/** The channel connection id (see setup service); doubles as the sandbox principal. */
	connectionId: string;
	type: string;
}

const OPEN_AI_COMPATIBLE_TYPES = ['openwebui', 'librechat'];

/**
 * Auth, message-shape validation, and transcript-flattening for the
 * OpenAI-compatible chat channels. Deliberately independent of
 * ChatIntegrationService/AgentChatBridge (see agent-connection-channels.md
 * 5.1): there is no bot, no webhook, no persistent connection to manage,
 * just a Bearer-authenticated request/response, so this calls
 * AgentExecutionOrchestratorService.executeForChatPublished directly, the
 * same entrypoint the push channels reach through AgentChatBridge.
 *
 * The channel stores no secret. The bearer token is derived, the same way
 * Telegram derives its webhook `secret_token` (see telegram-integration.ts):
 * `HMAC-SHA256(instanceKey, "openai-compat:{agentId}:{connectionId}")`. Verify
 * recomputes it and compares in constant time — no credential, no decrypt.
 */
@Service()
export class OpenAiCompatibleChatService {
	constructor(
		private readonly agentRepository: AgentRepository,
		private readonly instanceSettings: InstanceSettings,
		private readonly orchestrator: AgentExecutionOrchestratorService,
	) {}

	/**
	 * The channel bearer token: `n8n_agent_` + HMAC-SHA256 over
	 * `(agentId, connectionId)` keyed by the instance encryption key. Unstored
	 * and deterministic, so any main can verify with zero coordination and no
	 * decrypt. Shared by setup (to display) and verify (to compare).
	 */
	deriveToken(agentId: string, connectionId: string): string {
		const digest = createHmac('sha256', this.instanceSettings.encryptionKey)
			.update(`openai-compat:${agentId}:${connectionId}`)
			.digest('hex');
		return `n8n_agent_${digest}`;
	}

	/**
	 * Matches the bearer token against any `openwebui`/`librechat` channel
	 * connected to this agent (either can be connected at once, see
	 * agent-connection-channels.md 5.4), recomputing the derived token per
	 * connection. No secret is stored and nothing is decrypted.
	 *
	 * Security guards, in order: the agent must belong to `projectId` (the
	 * URL's project cannot be used to reach another project's agent), and it
	 * must be published — this endpoint is externally exposed, so an unpublished
	 * or draft agent is never reachable. Both failures return the same generic
	 * 404 as a token mismatch, so the endpoint leaks nothing about which of the
	 * three conditions failed.
	 */
	async authenticate(
		agentId: string,
		projectId: string,
		bearerToken: string,
	): Promise<AuthenticatedOpenAiChannel> {
		const notFound = new NotFoundError('No matching channel for this agent');

		const agent = await this.agentRepository.findByIdAndProjectId(agentId, projectId);
		if (!agent || !agent.activeVersionId) throw notFound;

		const candidates = (agent.integrations ?? []).filter((entry) =>
			OPEN_AI_COMPATIBLE_TYPES.includes(entry.type),
		);

		for (const candidate of candidates) {
			const expected = this.deriveToken(agentId, candidate.credentialId);
			if (this.matches(expected, bearerToken)) {
				return { agent, connectionId: candidate.credentialId, type: candidate.type };
			}
		}

		throw notFound;
	}

	/**
	 * Sandbox principal, same `integration-user` convention Slack/Telegram/
	 * Discord use (agent-chat-bridge.ts). `platformUserId` is the request's
	 * optional OpenAI `user` field when the client sends one, otherwise a
	 * fresh random value; there is no other stable per-end-user identity
	 * available over this protocol.
	 */
	buildSandboxPrincipalHash(channel: AuthenticatedOpenAiChannel, requestUser: string | undefined) {
		return hashAgentSandboxPrincipal({
			type: 'integration-user',
			connectionId: channel.connectionId,
			platform: channel.type,
			// Prefer the OpenAI `user` field when the client sends one; otherwise
			// key on the connection. OpenWebUI omits `user` on standard external
			// connections, so a random value here would rebuild the runtime every
			// call (the principal is part of the runtime cache key). The connection
			// id is stable, keeps callers on one project-scoped sandbox, and lets
			// the runtime cache actually hit.
			platformUserId: requestUser ?? channel.connectionId,
		});
	}

	/**
	 * Validates the accepted message shape (`system`/`user`/`assistant` text
	 * only; see 5.6) and flattens the array into the single transcript string
	 * `executeForChatPublished` takes as `message`. Continuity comes from the
	 * client resending this array in full on every call, not from anything
	 * n8n persists (fresh threadId/resourceId per call, built by the caller).
	 */
	buildTranscript(messages: OpenAiChatMessage[]): string {
		if (messages.length === 0) {
			throw new BadRequestError('"messages" must contain at least one entry');
		}

		const lines: string[] = [];
		for (const message of messages) {
			if (message.tool_calls !== undefined) {
				throw new BadRequestError('"tool_calls" is not supported on this channel');
			}
			if (message.role !== 'system' && message.role !== 'user' && message.role !== 'assistant') {
				throw new BadRequestError(
					`Unsupported message role "${message.role}"; only "system", "user", and "assistant" are accepted`,
				);
			}
			if (typeof message.content !== 'string') {
				throw new BadRequestError('Each message "content" must be a string');
			}
			lines.push(`${message.role}: ${message.content}`);
		}

		return lines.join('\n');
	}

	/**
	 * Runs the agent statelessly (`disableMemory`, see 5.6): the client (OpenWebUI,
	 * LibreChat) resends the full transcript on every call and the OpenAI
	 * Chat Completions protocol carries no thread or session id, so there is no
	 * stable key to persist under. `disableMemory` builds the runtime with no
	 * store, no observation log, and no mid-run observer, matching how a plain
	 * `api.openai.com` connection behaves — otherwise each call would write orphan
	 * memory rows under a throwaway thread that nothing ever reads or cleans up.
	 *
	 * The `threadId`/`resourceId` are still fresh per call; with memory off they
	 * only scope this call's execution record. Shared by both the streaming and
	 * non-streaming response paths.
	 */
	execute(
		channel: AuthenticatedOpenAiChannel,
		message: string,
		sandboxPrincipalHash: AgentSandboxPrincipalHash,
	): AsyncGenerator<StreamChunk> {
		return this.orchestrator.executeForChatPublished({
			agentId: channel.agent.id,
			projectId: channel.agent.projectId,
			message,
			memory: { threadId: randomUUID(), resourceId: randomUUID() },
			integrationType: channel.type,
			sandboxPrincipalHash,
			disableMemory: true,
		});
	}

	/** Drains `execute()` fully before returning, for the non-streaming response. */
	async runNonStreaming(
		channel: AuthenticatedOpenAiChannel,
		message: string,
		sandboxPrincipalHash: AgentSandboxPrincipalHash,
	): Promise<NonStreamingResult> {
		let content = '';
		let finishReason = 'stop';
		for await (const chunk of this.execute(channel, message, sandboxPrincipalHash)) {
			if (chunk.type === 'text-delta') {
				content += chunk.delta;
			} else if (chunk.type === 'finish') {
				finishReason = chunk.finishReason;
			} else if (chunk.type === 'error') {
				throw chunk.error instanceof Error ? chunk.error : new Error(String(chunk.error));
			}
		}

		return { content: stripCitationMarkers(content), finishReason };
	}

	/** Constant-time token compare; length guard avoids `timingSafeEqual` throwing. */
	private matches(expected: string, provided: string): boolean {
		const a = Buffer.from(expected);
		const b = Buffer.from(provided);
		if (a.length !== b.length) return false;
		return timingSafeEqual(a, b);
	}
}
