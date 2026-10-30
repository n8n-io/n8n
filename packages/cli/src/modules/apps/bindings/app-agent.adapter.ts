import type {
	AgentChatMessagesResponse,
	AgentSseEvent,
	AppAgentBinding,
	AppAgentChatRequest,
	AppAgentResumeRequest,
	AppDescribedAgentBinding,
} from '@n8n/api-types';
import { Logger, ModuleRegistry } from '@n8n/backend-common';
import {
	AppAgentPort,
	AppRuntimeError,
	type AppAgentTurn,
	type AppCallContext,
} from '@n8n/backend-module-apps';
import type { User } from '@n8n/db';
import { Container, Service } from '@n8n/di';
import { BadRequestError, NotFoundError } from '@n8n/errors';
import { UserError } from 'n8n-workflow';
import { createHash } from 'node:crypto';

import type { AgentExecutionStreamChunk } from '@/modules/agents/types/agent-steering';
import { userHasScopes } from '@/permissions.ee/check-access';

/** `integrationType` and execution `source` of turns that an app starts. */
export const APP_AGENT_INTEGRATION_TYPE = 'app';

const VISITOR_ERROR_MESSAGE = 'The agent could not answer.';

interface BoundAgent {
	agentId: string;
	projectId: string;
	published: boolean;
}

/** Lazy, so the agents module loads only when it is active. */
async function agentServices() {
	const [
		{ AgentsService },
		{ AgentExecutionOrchestratorService },
		{ N8NCheckpointStorage },
		{ hashAgentSandboxPrincipal },
		{ emitChunkEvents },
		{ withOpenSuspensions },
	] = await Promise.all([
		import('@/modules/agents/agents.service.js'),
		import('@/modules/agents/agent-execution-orchestrator.service.js'),
		import('@/modules/agents/integrations/n8n-checkpoint-storage.js'),
		import('@/modules/agents/agent-sandbox-principal.js'),
		import('@/modules/agents/agent-sse-stream.js'),
		import('@/modules/agents/utils/messages-envelope.js'),
	]);
	return {
		agents: Container.get(AgentsService),
		orchestrator: Container.get(AgentExecutionOrchestratorService),
		checkpoints: Container.get(N8NCheckpointStorage),
		hashAgentSandboxPrincipal,
		emitChunkEvents,
		withOpenSuspensions,
	};
}

/**
 * Agent chat for app bindings. Runs act as the app project. Memory is scoped to
 * the app and the visitor, so a visitor never reads another visitor's thread.
 * Background tasks are off: a background job wake cannot reach an app visitor.
 */
@Service()
export class AppAgentAdapter extends AppAgentPort {
	constructor(
		private readonly moduleRegistry: ModuleRegistry,
		private readonly logger: Logger,
	) {
		super();
	}

	async assertCanBind(user: User, projectId: string, binding: AppAgentBinding) {
		if (!this.moduleRegistry.isActive('agents')) {
			throw new BadRequestError('Agents are not enabled on this instance.');
		}
		const { agents } = await agentServices();
		const agent = await agents.findById(binding.agentId, projectId);
		if (!agent) {
			throw new NotFoundError(
				`Binding "${binding.key}": agent "${binding.agentId}" is not in the app project.`,
			);
		}
		if (!(await userHasScopes(user, ['agent:execute'], false, { projectId }))) {
			throw new NotFoundError(`Binding "${binding.key}": you cannot run agent "${agent.name}".`);
		}
	}

	async describe(
		projectId: string,
		binding: AppAgentBinding,
	): Promise<AppDescribedAgentBinding | null> {
		if (!this.moduleRegistry.isActive('agents')) return null;
		const { agents } = await agentServices();
		const agent = await agents.findById(binding.agentId, projectId);
		if (!agent) return null;
		return { ...binding, name: agent.name, published: agent.activeVersionId !== null };
	}

	async chat(
		ctx: AppCallContext,
		agentId: string,
		request: AppAgentChatRequest,
		signal: AbortSignal,
	): Promise<AppAgentTurn> {
		const services = await agentServices();
		const bound = await this.resolve(ctx, agentId);
		this.requirePublished(bound);
		const memory = this.memoryScope(ctx, bound, request.sessionId);

		// A parked run must be answered first. The app reads the pending card through `messages`.
		if (await services.checkpoints.findSuspendedForThread(bound.agentId, memory.threadId)) {
			throw new AppRuntimeError(
				409,
				'run_in_progress',
				'The agent is waiting for an answer in this session. Resume it before you send a new message.',
			);
		}

		const stream = services.orchestrator.executeForChatPublished({
			agentId: bound.agentId,
			projectId: bound.projectId,
			message: request.message,
			memory,
			integrationType: APP_AGENT_INTEGRATION_TYPE,
			allowBackgroundTasks: false,
			sandboxPrincipalHash: services.hashAgentSandboxPrincipal({
				type: 'project-session',
				projectId: bound.projectId,
				sessionId: memory.threadId,
			}),
			abortSignal: signal,
		});
		return { events: this.toEvents(stream, request.sessionId, services.emitChunkEvents) };
	}

	/** `expectedMemory` stops a visitor from resuming a run on another thread. */
	async resume(
		ctx: AppCallContext,
		agentId: string,
		request: AppAgentResumeRequest,
		signal: AbortSignal,
	): Promise<AppAgentTurn> {
		const services = await agentServices();
		const bound = await this.resolve(ctx, agentId);
		this.requirePublished(bound);
		const { threadId } = this.memoryScope(ctx, bound, request.sessionId);

		const stream = services.orchestrator.resumeForChat({
			agentId: bound.agentId,
			projectId: bound.projectId,
			runId: request.runId,
			toolCallId: request.toolCallId,
			resumeData: request.resumeData,
			usePublishedVersion: true,
			integrationType: APP_AGENT_INTEGRATION_TYPE,
			allowBackgroundTasks: false,
			expectedMemory: { threadId },
			source: APP_AGENT_INTEGRATION_TYPE,
			abortSignal: signal,
		});
		return { events: this.toEvents(stream, request.sessionId, services.emitChunkEvents) };
	}

	/** An unknown session reads as empty, so the app cannot learn which sessions exist. */
	async messages(
		ctx: AppCallContext,
		agentId: string,
		sessionId: string,
	): Promise<AgentChatMessagesResponse> {
		const services = await agentServices();
		const bound = await this.resolve(ctx, agentId);
		const { threadId, resourceId } = this.memoryScope(ctx, bound, sessionId);
		const history = await services.orchestrator.getConversationHistory({
			threadId,
			projectId: bound.projectId,
			agentId: bound.agentId,
			userId: resourceId,
		});
		const checkpoint = await services.checkpoints.findSuspendedForThread(bound.agentId, threadId);
		return services.withOpenSuspensions(history?.messages ?? [], checkpoint, {
			appendInactiveCheckpointMessages: false,
		});
	}

	private async resolve(ctx: AppCallContext, agentId: string): Promise<BoundAgent> {
		if (!this.moduleRegistry.isActive('agents')) {
			throw new AppRuntimeError(404, 'agents_disabled', 'Agents are not enabled.');
		}
		const { agents } = await agentServices();
		const agent = await agents.findById(agentId, ctx.projectId);
		if (!agent) {
			throw new AppRuntimeError(
				404,
				'resource_missing',
				'The bound agent is no longer in the app project.',
			);
		}
		return {
			agentId: agent.id,
			projectId: ctx.projectId,
			published: agent.activeVersionId !== null,
		};
	}

	private requirePublished(bound: BoundAgent) {
		if (bound.published) return;
		throw new AppRuntimeError(
			409,
			'agent_not_published',
			'The bound agent is not published. Publish it so the app can chat with it.',
		);
	}

	/** One thread per app, visitor, and session. Anonymous IDs are hashed before they reach storage. */
	private memoryScope(ctx: AppCallContext, bound: BoundAgent, sessionId: string) {
		const visitor =
			ctx.visitor.type === 'user'
				? `user:${ctx.visitor.userId}`
				: `anon:${createHash('sha256').update(ctx.visitor.id).digest('hex')}`;
		const resourceId = `app:${ctx.appId}:${visitor}`;
		return { threadId: `${bound.agentId}:${resourceId}:${sessionId}`, resourceId };
	}

	private async *toEvents(
		stream: AsyncGenerator<AgentExecutionStreamChunk>,
		sessionId: string,
		emitChunkEvents: (
			chunk: AgentExecutionStreamChunk,
			send: (event: AgentSseEvent) => void,
		) => void,
	): AsyncGenerator<AgentSseEvent> {
		const pending: AgentSseEvent[] = [];
		const push = (event: AgentSseEvent) => pending.push(event);
		let suspended = false;
		try {
			for await (const chunk of stream) {
				emitChunkEvents(
					chunk.type === 'error'
						? { type: 'error', error: new Error(this.messageForVisitor(chunk.error)) }
						: chunk,
					push,
				);
				suspended ||= chunk.type === 'tool-call-suspended';
				yield* pending.splice(0);
			}
			if (!suspended) yield { type: 'done', sessionId };
		} catch (error) {
			yield { type: 'error', message: this.messageForVisitor(error) };
		}
	}

	private messageForVisitor(error: unknown): string {
		if (error instanceof UserError) return error.message;
		this.logger.error('App agent turn failed.', { error });
		return VISITOR_ERROR_MESSAGE;
	}
}
