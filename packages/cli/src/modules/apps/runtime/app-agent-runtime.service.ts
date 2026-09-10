import type { StreamChunk } from '@n8n/agents';
import {
	appAgentChatRequestSchema,
	appAgentResumeRequestSchema,
	type AgentChatMessagesResponse,
	type AgentPermission,
	type AppBinding,
} from '@n8n/api-types';
import { Service } from '@n8n/di';
import { z } from 'zod';

import { AgentExecutionOrchestratorService } from '@/modules/agents/agent-execution-orchestrator.service';
import { AgentExecutionService } from '@/modules/agents/agent-execution.service';
import { hashAgentSandboxPrincipal } from '@/modules/agents/agent-sandbox-principal';
import { AgentsService } from '@/modules/agents/agents.service';
import { IntegrationMessageContextService } from '@/modules/agents/integrations/integration-message-context.service';
import { N8NCheckpointStorage } from '@/modules/agents/integrations/n8n-checkpoint-storage';
import { APP_CHAT_INTEGRATION_TYPE } from '@/modules/agents/integrations/platforms/app-chat-integration';
import { withOpenSuspensions } from '@/modules/agents/utils/messages-envelope';

import { AppRepository } from '../app.repository';
import { AppRuntimeError } from './app-runtime.error';

const messagesQuerySchema = appAgentChatRequestSchema.pick({ sessionId: true });

type AgentBinding = Extract<AppBinding, { kind: 'agent' }>;

/** The agent the runtime may run on behalf of `namespace`, and the app it runs for. */
interface BoundAgent {
	appId: string;
	agentId: string;
	projectId: string;
	published: boolean;
}

/** A turn ready to stream: the chunks and the visitor's session the `done` event names. */
export interface AppAgentTurn {
	sessionId: string;
	stream: AsyncGenerator<StreamChunk>;
}

/**
 * Published agents bound to an app, chatting with anonymous visitors. Every check that
 * can refuse a call runs before the stream starts, so the app gets a JSON error with a
 * stable code; what fails inside the run arrives as an SSE `error` event, like the editor.
 */
@Service()
export class AppAgentRuntimeService {
	constructor(
		private readonly appRepository: AppRepository,
		private readonly agentsService: AgentsService,
		private readonly orchestrator: AgentExecutionOrchestratorService,
		private readonly agentExecutionService: AgentExecutionService,
		private readonly checkpointStorage: N8NCheckpointStorage,
		private readonly messageContextService: IntegrationMessageContextService,
	) {}

	async chat(namespace: string, key: string, body: unknown): Promise<AppAgentTurn> {
		const bound = await this.resolve(namespace, key, 'chat');
		const { message, sessionId } = parseInput(appAgentChatRequestSchema.safeParse(body));
		this.requirePublished(bound);
		const { threadId, resourceId } = this.memoryScope(bound, sessionId);

		// A parked run must be answered first; the app can read the pending card
		// back through `messages`.
		if (await this.findOpenCheckpoint(bound.agentId, threadId)) {
			throw new AppRuntimeError(
				409,
				'run_in_progress',
				'The agent is waiting for an answer in this session. Resume it before sending a new message.',
			);
		}

		// `respond` cards need a message context on the thread, like the in-app chat seeds.
		await this.messageContextService.setLatest(threadId, resourceId, {
			integrationConnectionId: APP_CHAT_INTEGRATION_TYPE,
			platform: APP_CHAT_INTEGRATION_TYPE,
			target: { type: 'dm', userId: sessionId, threadId },
			interactingUserId: sessionId,
			updatedAt: new Date().toISOString(),
		});

		return {
			sessionId,
			stream: this.orchestrator.executeForChatPublished({
				agentId: bound.agentId,
				projectId: bound.projectId,
				message,
				memory: { threadId, resourceId },
				integrationType: APP_CHAT_INTEGRATION_TYPE,
				sandboxPrincipalHash: this.principalHash(bound.projectId, threadId),
			}),
		};
	}

	/** `expectedMemory` is what stops one visitor resuming another's run: the checkpoint must sit on this session's thread. */
	async resume(
		namespace: string,
		key: string,
		body: unknown,
		abortSignal: AbortSignal,
	): Promise<AppAgentTurn> {
		const bound = await this.resolve(namespace, key, 'chat');
		const { sessionId, runId, toolCallId, resumeData } = parseInput(
			appAgentResumeRequestSchema.safeParse(body),
		);
		this.requirePublished(bound);
		const { threadId } = this.memoryScope(bound, sessionId);

		return {
			sessionId,
			stream: this.orchestrator.resumeForChat({
				agentId: bound.agentId,
				projectId: bound.projectId,
				runId,
				toolCallId,
				resumeData,
				usePublishedVersion: true,
				integrationType: APP_CHAT_INTEGRATION_TYPE,
				expectedMemory: { threadId },
				source: APP_CHAT_INTEGRATION_TYPE,
				abortSignal,
			}),
		};
	}

	/** A session nobody chatted in reads as empty, never as 404: the app must not learn which sessions exist. */
	async messages(
		namespace: string,
		key: string,
		query: unknown,
	): Promise<AgentChatMessagesResponse> {
		const bound = await this.resolve(namespace, key, 'history');
		const { sessionId } = parseInput(messagesQuerySchema.safeParse(query));
		const { threadId } = this.memoryScope(bound, sessionId);

		// `getConversationHistory` checks the thread belongs to this agent and project.
		const history = await this.orchestrator.getConversationHistory({
			threadId,
			projectId: bound.projectId,
			agentId: bound.agentId,
		});
		const checkpoint = await this.findOpenCheckpoint(bound.agentId, threadId);
		return withOpenSuspensions(history ?? [], checkpoint, {
			appendInactiveCheckpointMessages: false,
		});
	}

	/**
	 * Only `namespace`, `key` and the visitor's session id come from the caller: the agent
	 * id is the stored binding's, and the agent must still belong to the app's project,
	 * which is the identity the run uses for credentials.
	 */
	private async resolve(
		namespace: string,
		key: string,
		needed: AgentPermission,
	): Promise<BoundAgent> {
		const app = await this.appRepository.findByNamespace(namespace);
		if (!app) {
			throw new AppRuntimeError(404, 'app_not_found', `No app is served at /apps/${namespace}.`);
		}

		const binding = app.bindings.find(
			(b): b is AgentBinding => b.key === key && b.kind === 'agent',
		);
		if (!binding) {
			throw new AppRuntimeError(
				404,
				'binding_not_found',
				`App "${app.namespace}" has no agent bound as "${key}".`,
			);
		}

		if (!binding.permissions.includes(needed)) {
			throw new AppRuntimeError(
				403,
				'permission_denied',
				`The binding "${key}" does not allow ${needed} access to its agent.`,
			);
		}

		const agent = await this.agentsService.findById(binding.agentId, app.projectId);
		if (!agent) {
			throw new AppRuntimeError(
				404,
				'agent_not_found',
				'The bound agent no longer exists in the app’s project.',
			);
		}

		return {
			appId: app.id,
			agentId: agent.id,
			projectId: app.projectId,
			published: agent.activeVersionId !== null,
		};
	}

	private requirePublished(bound: BoundAgent) {
		if (bound.published) return;
		throw new AppRuntimeError(
			409,
			'agent_not_published',
			'The bound agent is not published. Publish it before the app can chat with it.',
		);
	}

	/** One thread per visitor session per app; the agent and app ids keep sessions of different apps apart. */
	private memoryScope(bound: BoundAgent, sessionId: string) {
		return {
			threadId: `${bound.agentId}:app:${bound.appId}:${sessionId}`,
			resourceId: `app:${bound.appId}:${sessionId}`,
		};
	}

	private principalHash(projectId: string, threadId: string) {
		return hashAgentSandboxPrincipal({ type: 'project-session', projectId, sessionId: threadId });
	}

	/** The execution row only rules a thread out; the checkpoint says whether a run is parked right now. */
	private async findOpenCheckpoint(agentId: string, threadId: string) {
		if (!(await this.agentExecutionService.hasSuspendedRun(threadId))) return null;
		return await this.checkpointStorage.findSuspendedForThread(agentId, threadId);
	}
}

function parseInput<T>(parsed: z.SafeParseReturnType<unknown, T>): T {
	if (parsed.success) return parsed.data;
	throw new AppRuntimeError(
		400,
		'invalid_input',
		'The request does not match the agent API.',
		parsed.error.issues.map(({ path, code }) => ({ path: path.map(String), code })),
	);
}
