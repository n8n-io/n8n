import type {
	AgentChatMessagesResponse,
	AgentPersistedMessageContentPart,
	AgentPersistedMessageDto,
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
import { BadRequestError, ForbiddenError, NotFoundError, UserError } from '@n8n/errors';
import { isRecord } from '@n8n/utils/is-record';

import type { AgentExecutionStreamChunk } from '@/modules/agents/types/agent-steering';
import { userHasScopes } from '@/permissions.ee/check-access';

/** `integrationType` and execution `source` of turns that an app starts. */
export const APP_AGENT_INTEGRATION_TYPE = 'app';

const VISITOR_ERROR_MESSAGE = 'The agent could not answer.';
const VISITOR_TOOL_ERROR_MESSAGE = 'Tool execution failed.';

const DELEGATE_SUB_AGENT_TOOL_NAME = 'delegate_subagent';

function isFailedDelegation(toolName: string | undefined, output: unknown): boolean {
	return (
		toolName === DELEGATE_SUB_AGENT_TOOL_NAME && isRecord(output) && output.status === 'failed'
	);
}

interface BoundAgent {
	agentId: string;
	projectId: string;
	published: boolean;
}

/** Lazy, so the agents module loads only when it is active. */
async function agentServices() {
	const [
		{ redactDeep },
		{ AgentsService },
		{ AgentExecutionOrchestratorService },
		{ N8NCheckpointStorage },
		{ hashAgentSandboxPrincipal },
		{ emitChunkEvents },
		{ withOpenSuspensions },
	] = await Promise.all([
		import('@n8n/agents'),
		import('@/modules/agents/agents.service.js'),
		import('@/modules/agents/agent-execution-orchestrator.service.js'),
		import('@/modules/agents/integrations/n8n-checkpoint-storage.js'),
		import('@/modules/agents/agent-sandbox-principal.js'),
		import('@/modules/agents/agent-sse-stream.js'),
		import('@/modules/agents/utils/messages-envelope.js'),
	]);
	const redactPayload = (payload: unknown): unknown =>
		payload === undefined ? undefined : redactDeep(payload, { redactSensitiveKeys: true }).value;
	return {
		agents: Container.get(AgentsService),
		orchestrator: Container.get(AgentExecutionOrchestratorService),
		checkpoints: Container.get(N8NCheckpointStorage),
		hashAgentSandboxPrincipal,
		emitChunkEvents,
		redactPayload,
		withOpenSuspensions,
	};
}

function toVisitorEvent(
	event: AgentSseEvent,
	redactPayload: (payload: unknown) => unknown,
): AgentSseEvent | null {
	switch (event.type) {
		case 'start-step':
		case 'finish-step':
		case 'text-start':
		case 'text-delta':
		case 'text-end':
		case 'tool-input-start':
		case 'tool-execution-start':
		case 'tool-execution-end':
			return event;
		case 'tool-call':
			return { type: 'tool-call', toolCallId: event.toolCallId, toolName: event.toolName };
		case 'tool-result': {
			const { toolCallId, toolName, canceled } = event;
			const isError = isFailedDelegation(toolName, event.output) || event.isError;
			return {
				type: 'tool-result',
				toolCallId,
				toolName,
				...(isError && { output: VISITOR_TOOL_ERROR_MESSAGE }),
				...(isError !== undefined && { isError }),
				...(canceled !== undefined && { canceled }),
			};
		}
		case 'tool-call-suspended':
			return {
				type: 'tool-call-suspended',
				payload: { ...event.payload, input: redactPayload(event.payload.input) },
			};
		case 'message': {
			const content = event.message.content.filter((part) => part.type === 'text');
			return content.length > 0
				? { type: 'message', message: { role: event.message.role, content } }
				: null;
		}
		case 'finish':
			return {
				type: 'finish',
				finishReason: event.finishReason,
				...(event.guardrail && { guardrail: event.guardrail }),
			};
		default:
			return null;
	}
}

function toVisitorPart(
	part: AgentPersistedMessageContentPart,
	redactPayload: (payload: unknown) => unknown,
): AgentPersistedMessageContentPart | null {
	if (part.type === 'text' && typeof part.text === 'string') {
		return { type: 'text', text: part.text };
	}
	if (part.type !== 'tool-call') return null;
	const { toolName, toolCallId, canceled, startTime, endTime, suspendPayload } = part;
	const failedDelegation = isFailedDelegation(toolName, part.output);
	const state = failedDelegation ? 'rejected' : part.state;
	const error = failedDelegation ? VISITOR_TOOL_ERROR_MESSAGE : part.error;
	return {
		type: 'tool-call',
		...(toolName !== undefined && { toolName }),
		...(toolCallId !== undefined && { toolCallId }),
		...(state !== undefined && { state }),
		...(canceled !== undefined && { canceled }),
		...(startTime !== undefined && { startTime }),
		...(endTime !== undefined && { endTime }),
		...(suspendPayload !== undefined && { suspendPayload: redactPayload(suspendPayload) }),
		...(error !== undefined && { error: VISITOR_TOOL_ERROR_MESSAGE }),
	};
}

function toVisitorMessages(
	response: Pick<AgentChatMessagesResponse, 'messages' | 'openSuspensions'>,
	redactPayload: (payload: unknown) => unknown,
): AgentChatMessagesResponse {
	const messages: AgentPersistedMessageDto[] = [];
	for (const message of response.messages) {
		const content = message.content
			.map((part) => toVisitorPart(part, redactPayload))
			.filter((part): part is AgentPersistedMessageContentPart => part !== null);
		const executionError = message.executionError !== undefined ? VISITOR_ERROR_MESSAGE : undefined;
		if (
			content.length === 0 &&
			executionError === undefined &&
			!message.stopReport &&
			message.executionStatus !== 'cancelled'
		) {
			continue;
		}
		const { id, role, stopReport, executionId, executionStatus, createdAt } = message;
		messages.push({
			id,
			role,
			content,
			...(stopReport && { stopReport: true }),
			...(executionId !== undefined && { executionId }),
			...(executionStatus !== undefined && { executionStatus }),
			...(executionError !== undefined && { executionError }),
			...(createdAt !== undefined && { createdAt }),
		});
	}
	return {
		messages,
		openSuspensions: response.openSuspensions.map(({ toolCallId, runId, suspendPayload }) => ({
			toolCallId,
			runId,
			...(suspendPayload !== undefined && { suspendPayload: redactPayload(suspendPayload) }),
		})),
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
		return {
			events: this.toEvents(
				stream,
				request.sessionId,
				services.emitChunkEvents,
				services.redactPayload,
			),
		};
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
		return {
			events: this.toEvents(
				stream,
				request.sessionId,
				services.emitChunkEvents,
				services.redactPayload,
			),
		};
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
		return toVisitorMessages(
			services.withOpenSuspensions(history?.messages ?? [], checkpoint, {
				appendInactiveCheckpointMessages: false,
			}),
			services.redactPayload,
		);
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

	private async *toEvents(
		stream: AsyncGenerator<AgentExecutionStreamChunk>,
		sessionId: string,
		emitChunkEvents: (
			chunk: AgentExecutionStreamChunk,
			send: (event: AgentSseEvent) => void,
		) => void,
		redactPayload: (payload: unknown) => unknown,
	): AsyncGenerator<AgentSseEvent> {
		const pending: AgentSseEvent[] = [];
		const push = (event: AgentSseEvent) => {
			const projected = toVisitorEvent(event, redactPayload);
			if (projected) pending.push(projected);
		};
		let suspended = false;
		try {
			for await (const chunk of stream) {
				if (chunk.type === 'error') {
					yield { type: 'error', message: this.messageForVisitor(chunk.error) };
					continue;
				}
				emitChunkEvents(chunk, push);
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
