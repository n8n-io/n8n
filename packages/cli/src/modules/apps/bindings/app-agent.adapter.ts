import type {
	AgentChatMessagesResponse,
	AppAgentBinding,
	AppAgentChatRequest,
	AppAgentResumeRequest,
	AppDescribedAgentBinding,
} from '@n8n/api-types';
import { ModuleRegistry } from '@n8n/backend-common';
import {
	AppAgentPort,
	AppRuntimeError,
	type AppAgentTurn,
	type AppCallContext,
} from '@n8n/backend-module-apps';
import type { User } from '@n8n/db';
import { Container, Service } from '@n8n/di';
import { BadRequestError, ForbiddenError, NotFoundError } from '@n8n/errors';

import { toResumeJson } from '@/modules/agents/queue/agent-turn-request.types';
import { userHasScopes } from '@/permissions.ee/check-access';

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
		{ AgentAppTurnService },
		{ N8NCheckpointStorage },
		{ withOpenSuspensions },
	] = await Promise.all([
		import('@/modules/agents/agents.service.js'),
		import('@/modules/agents/agent-execution-orchestrator.service.js'),
		import('@/modules/agents/agent-app-turn.service.js'),
		import('@/modules/agents/integrations/n8n-checkpoint-storage.js'),
		import('@/modules/agents/utils/messages-envelope.js'),
	]);
	return {
		agents: Container.get(AgentsService),
		orchestrator: Container.get(AgentExecutionOrchestratorService),
		turns: Container.get(AgentAppTurnService),
		checkpoints: Container.get(N8NCheckpointStorage),
		withOpenSuspensions,
	};
}

async function agentPublishService() {
	const { AgentPublishService } = await import('@/modules/agents/agent-publish.service.js');
	return Container.get(AgentPublishService);
}

/**
 * Agent chat for app bindings. Runs act as the app project. Memory is scoped to
 * the app and the visitor, so a visitor never reads another visitor's thread.
 * Background tasks are off: a background job wake cannot reach an app visitor.
 * This adapter checks the binding and the visitor. `AgentAppTurnService` runs
 * the turn, on an agent worker in agent queue mode.
 */
@Service()
export class AppAgentAdapter extends AppAgentPort {
	constructor(private readonly moduleRegistry: ModuleRegistry) {
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

	async canPublish(user: User, projectId: string, _binding: AppAgentBinding) {
		return await userHasScopes(user, ['agent:publish'], false, { projectId });
	}

	async getPublishState(projectId: string, binding: AppAgentBinding) {
		if (!this.moduleRegistry.isActive('agents')) return null;
		const { agents } = await agentServices();
		const agent = await agents.findById(binding.agentId, projectId);
		if (!agent) return null;
		const published = agent.activeVersionId !== null;
		return {
			name: agent.name,
			published,
			hasChanges: published && agent.versionId !== agent.activeVersionId,
		};
	}

	async publish(user: User, projectId: string, binding: AppAgentBinding) {
		if (!(await this.canPublish(user, projectId, binding))) {
			throw new ForbiddenError('You do not have the permission to publish this agent.');
		}
		const publishService = await agentPublishService();
		await publishService.publishAgent(binding.agentId, projectId, user, {
			by: 'user',
			trigger: 'explicit',
		});
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

		const events = services.turns.events(
			{
				kind: 'app-chat',
				agentId: bound.agentId,
				projectId: bound.projectId,
				sessionId: request.sessionId,
				message: request.message,
				memory,
			},
			signal,
		);
		return { events };
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

		const events = services.turns.events(
			{
				kind: 'app-resume',
				agentId: bound.agentId,
				projectId: bound.projectId,
				sessionId: request.sessionId,
				runId: request.runId,
				toolCallId: request.toolCallId,
				resumeData: toResumeJson(request.resumeData),
				threadId,
			},
			signal,
		);
		return { events };
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

	/** One thread per app, visitor, and session. */
	private memoryScope(ctx: AppCallContext, bound: BoundAgent, sessionId: string) {
		const resourceId = `app:${ctx.appId}:user:${ctx.userId}`;
		return { threadId: `${bound.agentId}:${resourceId}:${sessionId}`, resourceId };
	}
}
