import {
	AGENT_SCHEDULE_TRIGGER_TYPE,
	type AgentBuilderMessagesResponse,
	type AgentIntegrationStatusResponse,
	type AgentPersistedMessageDto,
	type AgentSkill,
	type AgentScheduleConfig,
	type AgentSseEvent,
	type ChatIntegrationDescriptor,
	AgentBuildResumeDto,
	AgentChatMessageDto,
	CreateAgentSkillDto,
	AgentIntegrationDto,
	CreateAgentDto,
	UpdateAgentSkillDto,
	UpdateAgentConfigDto,
	UpdateAgentScheduleDto,
	UpdateAgentDto,
	isAgentCredentialIntegration,
} from '@n8n/api-types';
import { AuthenticatedRequest } from '@n8n/db';
import {
	Body,
	Delete,
	Get,
	Param,
	Patch,
	Post,
	ProjectScope,
	Put,
	RestController,
} from '@n8n/decorators';
import { randomUUID } from 'crypto';
import type { Request, Response } from 'express';

import { CredentialsService } from '@/credentials/credentials.service';
import { ConflictError } from '@/errors/response-errors/conflict.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';

import { AgentsCredentialProvider } from './adapters/agents-credential-provider';
import { AgentExecutionService, threadBelongsTo } from './agent-execution.service';
import { messagesToDto } from './agent-message-mapper';
import {
	type FlushableResponse,
	initSseStream,
	pumpChunks,
	type ToolEventCallbacks,
} from './agent-sse-stream';
import { AgentsService } from './agents.service';
import { AgentsBuilderService } from './builder/agents-builder.service';
import { BUILDER_TOOLS } from './builder/builder-tool-names';
import { ChatIntegrationRegistry } from './integrations/agent-chat-integration';
import { AgentScheduleService } from './integrations/agent-schedule.service';
import { ChatIntegrationService } from './integrations/chat-integration.service';
import { AgentRepository } from './repositories/agent.repository';

/**
 * Builder side-effects: when the LLM streams arguments for `build_custom_tool`
 * we re-emit each delta as a `code-delta` event so the FE editor can render
 * incrementally; on tool completion we emit `config-updated` / `tool-updated`
 * so the FE refreshes the corresponding panel. State is local to one request:
 * `streamingToolName` tracks the tool whose arguments are currently streaming
 * (replaces the old per-message-id heuristic).
 */
function makeBuilderToolEvents(send: (e: AgentSseEvent) => void): ToolEventCallbacks {
	let streamingToolName: string | undefined;
	return {
		toolInputStart: (name) => {
			streamingToolName = name;
		},
		toolInputDelta: (_toolCallId, delta) => {
			if (streamingToolName === BUILDER_TOOLS.BUILD_CUSTOM_TOOL) {
				send({ type: 'code-delta', delta });
			}
		},
		toolResult: (name) => {
			if (name === BUILDER_TOOLS.WRITE_CONFIG || name === BUILDER_TOOLS.PATCH_CONFIG) {
				send({ type: 'config-updated' });
				streamingToolName = undefined;
			}
			if (name === BUILDER_TOOLS.CREATE_SKILL) {
				send({ type: 'config-updated' });
				streamingToolName = undefined;
			}
			if (name === BUILDER_TOOLS.BUILD_CUSTOM_TOOL) {
				send({ type: 'tool-updated' });
				streamingToolName = undefined;
			}
		},
	};
}

@RestController('/projects/:projectId/agents/v2')
export class AgentsController {
	constructor(
		private readonly agentsService: AgentsService,
		private readonly agentsBuilderService: AgentsBuilderService,
		private readonly credentialsService: CredentialsService,
		private readonly chatIntegrationService: ChatIntegrationService,
		private readonly agentScheduleService: AgentScheduleService,
		private readonly agentRepository: AgentRepository,
		private readonly agentExecutionService: AgentExecutionService,
		private readonly chatIntegrationRegistry: ChatIntegrationRegistry,
	) {}

	@Post('/')
	@ProjectScope('agent:create')
	async create(
		req: AuthenticatedRequest<{ projectId: string }>,
		_res: Response,
		@Body payload: CreateAgentDto,
	) {
		const { projectId } = req.params;

		return await this.agentsService.create(projectId, payload.name);
	}

	@Get('/')
	@ProjectScope('agent:list')
	async list(req: AuthenticatedRequest<{ projectId: string }, unknown, unknown, { all?: string }>) {
		// ?all=true returns all agents for this user (cross-project, for Instance AI switcher)
		if (req.query.all === 'true') {
			return await this.agentsService.findByUser(req.user.id);
		}
		return await this.agentsService.findByProjectId(req.params.projectId);
	}

	@Get('/:agentId/config')
	@ProjectScope('agent:read')
	async getConfig(req: AuthenticatedRequest<{ projectId: string; agentId: string }>) {
		const { projectId, agentId } = req.params;
		return await this.agentsService.getConfig(agentId, projectId);
	}

	@Put('/:agentId/config')
	@ProjectScope('agent:update')
	async putConfig(
		req: AuthenticatedRequest<{ projectId: string; agentId: string }>,
		_res: Response,
		@Param('agentId') agentId: string,
		@Body payload: UpdateAgentConfigDto,
	) {
		const { projectId } = req.params;
		const { config } = payload;
		return await this.agentsService.updateConfig(agentId, projectId, config);
	}

	@Delete('/:agentId/tools/:toolId')
	@ProjectScope('agent:update')
	async deleteTool(
		req: AuthenticatedRequest<{ projectId: string; agentId: string; toolId: string }>,
		_res: Response,
		@Param('agentId') agentId: string,
		@Param('toolId') toolId: string,
	) {
		const { projectId } = req.params;
		await this.agentsService.deleteCustomTool(agentId, projectId, toolId);
		return { ok: true };
	}

	@Get('/:agentId/skills')
	@ProjectScope('agent:read')
	async listSkills(req: AuthenticatedRequest<{ projectId: string; agentId: string }>) {
		const { projectId, agentId } = req.params;
		return await this.agentsService.listSkills(agentId, projectId);
	}

	@Get('/:agentId/skills/:skillId')
	@ProjectScope('agent:read')
	async getSkill(
		req: AuthenticatedRequest<{ projectId: string; agentId: string; skillId: string }>,
		_res: Response,
		@Param('agentId') agentId: string,
		@Param('skillId') skillId: string,
	) {
		const { projectId } = req.params;
		return await this.agentsService.getSkill(agentId, projectId, skillId);
	}

	@Post('/:agentId/skills')
	@ProjectScope('agent:update')
	async createSkill(
		req: AuthenticatedRequest<{ projectId: string; agentId: string }>,
		_res: Response,
		@Param('agentId') agentId: string,
		@Body payload: CreateAgentSkillDto,
	) {
		const { projectId } = req.params;
		const skill: AgentSkill = {
			name: payload.name,
			description: payload.description,
			instructions: payload.instructions,
		};

		return await this.agentsService.createAndAttachSkill(agentId, projectId, skill);
	}

	@Patch('/:agentId/skills/:skillId')
	@ProjectScope('agent:update')
	async updateSkill(
		req: AuthenticatedRequest<{ projectId: string; agentId: string; skillId: string }>,
		_res: Response,
		@Param('agentId') agentId: string,
		@Param('skillId') skillId: string,
		@Body payload: UpdateAgentSkillDto,
	) {
		const { projectId } = req.params;
		return await this.agentsService.updateSkill(agentId, projectId, skillId, payload);
	}

	@Delete('/:agentId/skills/:skillId')
	@ProjectScope('agent:update')
	async deleteSkill(
		req: AuthenticatedRequest<{ projectId: string; agentId: string; skillId: string }>,
		_res: Response,
		@Param('agentId') agentId: string,
		@Param('skillId') skillId: string,
	) {
		const { projectId } = req.params;
		await this.agentsService.deleteSkill(agentId, projectId, skillId);
		return { ok: true };
	}

	@Get('/:agentId/credentials')
	@ProjectScope('agent:read')
	async listCredentials(req: AuthenticatedRequest<{ projectId: string; agentId: string }>) {
		const { projectId } = req.params;
		const credentialProvider = new AgentsCredentialProvider(this.credentialsService, projectId);
		return await credentialProvider.list();
	}

	@Get('/catalog/models')
	@ProjectScope('agent:read')
	async getModelCatalog() {
		const { fetchProviderCatalog } = await import('@n8n/agents');
		return await fetchProviderCatalog();
	}

	@Get('/catalog/integrations')
	@ProjectScope('agent:read')
	listIntegrations(): ChatIntegrationDescriptor[] {
		return this.agentsService.listChatIntegrations();
	}

	@Get('/threads')
	@ProjectScope('agent:read')
	async listThreads(
		req: AuthenticatedRequest<
			{ projectId: string },
			{},
			{},
			{ cursor?: string; limit?: string; agentId?: string }
		>,
	) {
		const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 100);
		return await this.agentExecutionService.getThreads(
			req.params.projectId,
			limit,
			req.query.cursor,
			req.query.agentId,
		);
	}

	@Get('/threads/:threadId')
	@ProjectScope('agent:read')
	async getThread(
		req: AuthenticatedRequest<
			{ projectId: string; threadId: string },
			{},
			{},
			{ agentId?: string }
		>,
	) {
		const result = await this.agentExecutionService.getThreadDetail(
			req.params.threadId,
			req.params.projectId,
			req.query.agentId,
		);
		if (!result) {
			throw new NotFoundError(`Thread "${req.params.threadId}" not found`);
		}
		return result;
	}

	@Delete('/threads/:threadId')
	@ProjectScope('agent:update')
	async deleteThread(req: AuthenticatedRequest<{ projectId: string; threadId: string }>) {
		const { projectId, threadId } = req.params;
		const deleted = await this.agentExecutionService.deleteThread(projectId, threadId);
		if (!deleted) {
			throw new NotFoundError(`Thread "${threadId}" not found`);
		}
		return { success: true };
	}

	@Get('/:agentId')
	@ProjectScope('agent:read')
	async get(
		req: AuthenticatedRequest<{ projectId: string }>,
		_res: Response,
		@Param('agentId') agentId: string,
	) {
		const agent = await this.agentsService.findById(agentId, req.params.projectId);

		if (!agent) {
			throw new NotFoundError(`Agent "${agentId}" not found`);
		}

		return agent;
	}

	@Patch('/:agentId')
	@ProjectScope('agent:update')
	async update(
		req: AuthenticatedRequest<{ projectId: string }>,
		_res: Response,
		@Param('agentId') agentId: string,
		@Body payload: UpdateAgentDto,
	) {
		const { name, description } = payload;
		let agent = await this.agentsService.findById(agentId, req.params.projectId);

		if (!agent) {
			throw new NotFoundError(`Agent "${agentId}" not found`);
		}

		if (name !== undefined) {
			agent = await this.agentsService.updateName(agentId, req.params.projectId, name);
		}

		if (description !== undefined && agent) {
			// Use the latest updatedAt from previous saves (name), not the original
			// request updatedAt, to avoid false optimistic-lock conflicts.
			const latestUpdatedAt =
				agent.updatedAt instanceof Date ? agent.updatedAt.toISOString() : agent.updatedAt;
			agent = await this.agentsService.updateDescription(
				agentId,
				req.params.projectId,
				description,
				latestUpdatedAt,
			);
		}

		return agent;
	}

	@Delete('/:agentId')
	@ProjectScope('agent:delete')
	async delete(
		req: AuthenticatedRequest<{ projectId: string }>,
		_res: Response,
		@Param('agentId') agentId: string,
	) {
		const deleted = await this.agentsService.delete(agentId, req.params.projectId);

		if (!deleted) {
			throw new NotFoundError(`Agent "${agentId}" not found`);
		}

		return { success: true };
	}

	@Post('/:agentId/publish')
	@ProjectScope('agent:publish')
	async publish(
		req: AuthenticatedRequest<{ projectId: string }>,
		_res: Response,
		@Param('agentId') agentId: string,
	) {
		return await this.agentsService.publishAgent(agentId, req.params.projectId, req.user.id);
	}

	@Post('/:agentId/unpublish')
	@ProjectScope('agent:unpublish')
	async unpublish(
		req: AuthenticatedRequest<{ projectId: string }>,
		_res: Response,
		@Param('agentId') agentId: string,
	) {
		return await this.agentsService.unpublishAgent(agentId, req.params.projectId);
	}

	@Post('/:agentId/revert-to-published')
	@ProjectScope('agent:update')
	async revertToPublished(
		req: AuthenticatedRequest<{ projectId: string }>,
		_res: Response,
		@Param('agentId') agentId: string,
	) {
		return await this.agentsService.revertToPublishedAgent(agentId, req.params.projectId);
	}

	@Post('/:agentId/chat', { usesTemplates: true })
	@ProjectScope('agent:execute')
	async chat(
		req: AuthenticatedRequest<{ projectId: string }>,
		res: FlushableResponse,
		@Param('agentId') agentId: string,
		@Body payload: AgentChatMessageDto,
	) {
		const { projectId } = req.params;
		const { message, sessionId } = payload;

		const credentialProvider = new AgentsCredentialProvider(this.credentialsService, projectId);

		const { send } = initSseStream(res);

		// If the client supplied a sessionId and a thread already exists under that id,
		// the thread must belong to this (project, agent). Otherwise a caller could
		// append messages to another user's thread. A non-existent id is fine —
		// executeForChat will create the thread on first persisted message.
		if (sessionId) {
			const existing = await this.agentExecutionService.findThreadById(sessionId);
			if (existing && !threadBelongsTo(existing, projectId, agentId)) {
				send({ type: 'error', message: 'Session not found' });
				res.end();
				return;
			}
		}

		const threadId = sessionId ?? randomUUID();

		const { missing } = await this.agentsService.validateAgentIsRunnable(
			agentId,
			projectId,
			credentialProvider,
		);
		if (missing.length > 0) {
			send({
				type: 'error',
				message: 'This agent is not ready to run yet.',
				errorCode: 'agent_misconfigured',
				missing,
			});
			res.end();
			return;
		}

		try {
			await pumpChunks(
				this.agentsService.executeForChat({
					agentId,
					projectId,
					message,
					userId: req.user.id,
					memory: { threadId, resourceId: req.user.id },
				}),
				send,
			);
			send({ type: 'done', sessionId: threadId });
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : 'Chat failed';
			send({ type: 'error', message: errorMessage });
		}

		res.end();
	}

	@Get('/:agentId/chat/:threadId/messages')
	@ProjectScope('agent:read')
	async getChatMessages(
		req: AuthenticatedRequest<{ projectId: string; agentId: string; threadId: string }>,
	) {
		const { projectId, agentId, threadId } = req.params;
		const agent = await this.agentsService.findById(agentId, projectId);
		if (!agent) throw new NotFoundError(`Agent "${agentId}" not found`);
		const thread = await this.agentExecutionService.findThreadById(threadId);
		if (!thread || !threadBelongsTo(thread, projectId, agentId)) {
			throw new NotFoundError(`Thread "${threadId}" not found`);
		}
		return await this.agentsService.getChatMessages(threadId);
	}

	@Get('/:agentId/build/messages')
	@ProjectScope('agent:read')
	async getBuilderMessages(
		req: AuthenticatedRequest<{ projectId: string; agentId: string }>,
	): Promise<AgentBuilderMessagesResponse> {
		const { projectId, agentId } = req.params;
		const agent = await this.agentsService.findById(agentId, projectId);
		if (!agent) throw new NotFoundError(`Agent "${agentId}" not found`);

		// Merge persisted thread memory with any open suspension's checkpoint
		// so a refresh during a suspended turn still returns the suspended
		// assistant message (the SDK only saveToMemory's on completion).
		const memory = await this.agentsBuilderService.getBuilderMessages(agentId);
		const checkpoint = await this.agentsBuilderService.findOpenCheckpoint(agentId);
		const openSuspensions = Object.values(checkpoint?.pendingToolCalls ?? {})
			.filter((tc) => tc.suspended)
			.map((tc) => ({
				toolCallId: tc.toolCallId,
				runId: tc.runId,
			}));

		let messages: AgentPersistedMessageDto[];
		if (!checkpoint) {
			messages = messagesToDto(memory);
		} else {
			const memoryIds = new Set(memory.map((m) => m.id));
			const newFromCheckpoint = checkpoint.messageList.messages.filter((m) => !memoryIds.has(m.id));
			messages = messagesToDto([...memory, ...newFromCheckpoint]);
		}

		return { messages, openSuspensions };
	}

	@Delete('/:agentId/build/messages')
	@ProjectScope('agent:update')
	async clearBuilderMessages(req: AuthenticatedRequest<{ projectId: string; agentId: string }>) {
		const { projectId, agentId } = req.params;
		const agent = await this.agentsService.findById(agentId, projectId);
		if (!agent) throw new NotFoundError(`Agent "${agentId}" not found`);
		await this.agentsBuilderService.clearBuilderMessages(agentId);
		return { ok: true };
	}

	@Get('/:agentId/chat/messages')
	@ProjectScope('agent:read')
	async getTestChatMessages(
		req: AuthenticatedRequest<{ projectId: string; agentId: string }>,
	): Promise<AgentPersistedMessageDto[]> {
		const { projectId, agentId } = req.params;
		const agent = await this.agentsService.findById(agentId, projectId);
		if (!agent) throw new NotFoundError(`Agent "${agentId}" not found`);
		const messages = await this.agentsService.getTestChatMessages(agentId, req.user.id);
		return messagesToDto(messages);
	}

	@Delete('/:agentId/chat/messages')
	@ProjectScope('agent:update')
	async clearTestChatMessages(req: AuthenticatedRequest<{ projectId: string; agentId: string }>) {
		const { projectId, agentId } = req.params;
		const agent = await this.agentsService.findById(agentId, projectId);
		if (!agent) throw new NotFoundError(`Agent "${agentId}" not found`);
		await this.agentsService.clearTestChatMessages(agentId, req.user.id);
		return { ok: true };
	}

	@Post('/:agentId/build', { usesTemplates: true })
	@ProjectScope('agent:update')
	async build(
		req: AuthenticatedRequest<{ projectId: string }>,
		res: FlushableResponse,
		@Param('agentId') agentId: string,
		@Body payload: AgentChatMessageDto,
	) {
		const { projectId } = req.params;
		const { message } = payload;

		// Validate the agent exists before opening the SSE stream so a malformed
		// id surfaces as a typed 404 instead of a generic 500 from the builder
		// service's internal lookup.
		const agent = await this.agentsService.findById(agentId, projectId);
		if (!agent) throw new NotFoundError(`Agent "${agentId}" not found`);

		const credentialProvider = new AgentsCredentialProvider(this.credentialsService, projectId);

		const { send } = initSseStream(res);

		try {
			const suspended = await pumpChunks(
				this.agentsBuilderService.buildAgent(
					agentId,
					projectId,
					message,
					credentialProvider,
					req.user,
				),
				send,
				makeBuilderToolEvents(send),
			);

			if (!suspended) {
				send({ type: 'done' });
			}
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : 'Build failed';
			const errorCode =
				error && typeof error === 'object' && 'code' in error
					? (error as { code?: unknown }).code
					: undefined;
			send({
				type: 'error',
				message: errorMessage,
				...(typeof errorCode === 'string' ? { code: errorCode } : {}),
			});
		}

		res.end();
	}

	@Post('/:agentId/build/resume', { usesTemplates: true })
	@ProjectScope('agent:update')
	async buildResume(
		req: AuthenticatedRequest<{ projectId: string }>,
		res: FlushableResponse,
		@Param('agentId') agentId: string,
		@Body payload: AgentBuildResumeDto,
	) {
		const { projectId } = req.params;
		const { runId, toolCallId, resumeData } = payload;

		// Validate the agent exists before opening the SSE stream so a malformed
		// id surfaces as a typed 404 instead of a generic 500 from the builder
		// service's internal lookup.
		const agent = await this.agentsService.findById(agentId, projectId);
		if (!agent) throw new NotFoundError(`Agent "${agentId}" not found`);

		const credentialProvider = new AgentsCredentialProvider(this.credentialsService, projectId);

		const { send } = initSseStream(res);

		try {
			const suspended = await pumpChunks(
				this.agentsBuilderService.resumeBuild(
					agentId,
					projectId,
					runId,
					toolCallId,
					resumeData,
					credentialProvider,
					req.user,
				),
				send,
				makeBuilderToolEvents(send),
			);

			if (!suspended) {
				send({ type: 'done' });
			}
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : 'Resume failed';
			send({ type: 'error', message: errorMessage });
		}

		res.end();
	}

	@Post('/:agentId/integrations/connect')
	@ProjectScope('agent:update')
	async connectIntegration(
		req: AuthenticatedRequest<{ projectId: string }>,
		_res: Response,
		@Param('agentId') agentId: string,
		@Body payload: AgentIntegrationDto,
	) {
		const { type, credentialId } = payload;
		const agent = await this.agentRepository.findByIdAndProjectId(agentId, req.params.projectId);
		if (!agent) throw new NotFoundError(`Agent "${agentId}" not found`);
		if (!agent.publishedVersion)
			throw new ConflictError(
				`Agent "${agentId}" must be published before connecting an integration`,
			);

		await this.chatIntegrationService.connect(
			agentId,
			credentialId,
			type,
			req.user.id,
			agent.projectId,
		);

		// Persist the integration reference on the agent
		const existing = agent.integrations ?? [];
		const alreadyExists = existing.some(
			(i) => isAgentCredentialIntegration(i) && i.type === type && i.credentialId === credentialId,
		);
		if (!alreadyExists) {
			const credential = await this.credentialsService.getOne(req.user, credentialId, false);
			agent.integrations = [...existing, { type, credentialId, credentialName: credential.name }];
			await this.agentRepository.save(agent);
		}

		// Notify peer mains so they connect the integration too — without this
		// step inbound webhooks load-balanced to a follower would 404.
		await this.chatIntegrationService.broadcastIntegrationChange(
			agentId,
			type,
			credentialId,
			'connect',
		);

		return { status: 'connected' };
	}

	@Post('/:agentId/integrations/disconnect')
	@ProjectScope('agent:update')
	async disconnectIntegration(
		req: AuthenticatedRequest<{ projectId: string }>,
		_res: Response,
		@Param('agentId') agentId: string,
		@Body payload: AgentIntegrationDto,
	) {
		const { type, credentialId } = payload;
		const agent = await this.agentRepository.findByIdAndProjectId(agentId, req.params.projectId);
		if (!agent) throw new NotFoundError(`Agent "${agentId}" not found`);

		await this.chatIntegrationService.disconnect(agentId, type, credentialId);

		// Remove the integration reference from the agent
		agent.integrations = (agent.integrations ?? []).filter(
			(i) => !isAgentCredentialIntegration(i) || i.type !== type || i.credentialId !== credentialId,
		);
		await this.agentRepository.save(agent);

		await this.chatIntegrationService.broadcastIntegrationChange(
			agentId,
			type,
			credentialId,
			'disconnect',
		);

		return { status: 'disconnected' };
	}

	@Get('/:agentId/integrations/schedule')
	@ProjectScope('agent:read')
	async getScheduleIntegration(
		req: AuthenticatedRequest<{ projectId: string }>,
		_res: Response,
		@Param('agentId') agentId: string,
	): Promise<AgentScheduleConfig> {
		const agent = await this.agentRepository.findByIdAndProjectId(agentId, req.params.projectId);
		if (!agent) throw new NotFoundError(`Agent "${agentId}" not found`);

		return this.agentScheduleService.getConfig(agent);
	}

	@Put('/:agentId/integrations/schedule')
	@ProjectScope('agent:update')
	async updateScheduleIntegration(
		req: AuthenticatedRequest<{ projectId: string }>,
		_res: Response,
		@Param('agentId') agentId: string,
		@Body payload: UpdateAgentScheduleDto,
	): Promise<AgentScheduleConfig> {
		const agent = await this.agentRepository.findByIdAndProjectId(agentId, req.params.projectId);
		if (!agent) throw new NotFoundError(`Agent "${agentId}" not found`);

		return await this.agentScheduleService.saveConfig(
			agent,
			payload.cronExpression,
			payload.wakeUpPrompt,
		);
	}

	@Post('/:agentId/integrations/schedule/activate')
	@ProjectScope('agent:update')
	async activateScheduleIntegration(
		req: AuthenticatedRequest<{ projectId: string }>,
		_res: Response,
		@Param('agentId') agentId: string,
	): Promise<AgentScheduleConfig> {
		const agent = await this.agentRepository.findByIdAndProjectId(agentId, req.params.projectId);
		if (!agent) throw new NotFoundError(`Agent "${agentId}" not found`);

		return await this.agentScheduleService.activate(agent);
	}

	@Post('/:agentId/integrations/schedule/deactivate')
	@ProjectScope('agent:update')
	async deactivateScheduleIntegration(
		req: AuthenticatedRequest<{ projectId: string }>,
		_res: Response,
		@Param('agentId') agentId: string,
	): Promise<AgentScheduleConfig> {
		const agent = await this.agentRepository.findByIdAndProjectId(agentId, req.params.projectId);
		if (!agent) throw new NotFoundError(`Agent "${agentId}" not found`);

		return await this.agentScheduleService.deactivate(agent);
	}

	@Get('/:agentId/integrations/status')
	@ProjectScope('agent:read')
	async integrationStatus(
		req: AuthenticatedRequest<{ projectId: string }>,
		_res: Response,
		@Param('agentId') agentId: string,
	): Promise<AgentIntegrationStatusResponse> {
		const agent = await this.agentRepository.findByIdAndProjectId(agentId, req.params.projectId);
		if (!agent) throw new NotFoundError(`Agent "${agentId}" not found`);

		const chatStatus = this.chatIntegrationService.getStatus(agentId);
		const schedule = this.agentScheduleService.getConfig(agent);
		const scheduleIntegrations = schedule.active ? [{ type: AGENT_SCHEDULE_TRIGGER_TYPE }] : [];
		const connectedIntegrations = [...chatStatus.integrations, ...scheduleIntegrations];

		return {
			status: connectedIntegrations.length > 0 ? 'connected' : 'disconnected',
			integrations: connectedIntegrations,
		};
	}

	// Third-party webhook callback: do not add @ProjectScope. Auth happens
	// via per-platform signature verification inside webhookHandler.
	@Post('/:agentId/webhooks/:platform', { skipAuth: true, allowBots: true })
	async handleWebhook(
		req: Request<{ projectId: string; agentId: string; platform: string }>,
		res: Response,
	) {
		const { agentId, platform } = req.params;
		const webhookHandler = this.chatIntegrationService.getWebhookHandler(agentId, platform);

		if (!webhookHandler) {
			// Allow platforms to respond to setup-time webhooks (e.g. Slack's
			// `url_verification` challenge) before credentials are configured,
			// so the user doesn't have to come back and re-verify URLs after
			// connecting the credential.
			const integration = this.chatIntegrationRegistry.get(platform);
			const earlyResponse = integration?.handleUnauthenticatedWebhook?.(req.body);
			if (earlyResponse) {
				res.status(earlyResponse.status).json(earlyResponse.body);
				return;
			}
			res.status(404).json({ error: `No active ${platform} integration for agent "${agentId}"` });
			return;
		}

		// Chat SDK webhook handlers accept a Web API Request and return a Web API Response.
		// Convert Express req → Web Request. We must preserve the raw body exactly as
		// received because the Slack adapter verifies the request signature against it.
		// Using JSON.stringify(req.body) would break signature verification (→ 401).
		const forwardedProto = req.headers['x-forwarded-proto'];
		const protocol =
			(Array.isArray(forwardedProto) ? forwardedProto[0] : forwardedProto) ?? req.protocol;
		const forwardedHost = req.headers['x-forwarded-host'];
		const host =
			(Array.isArray(forwardedHost) ? forwardedHost[0] : forwardedHost) ??
			req.headers.host ??
			'localhost';
		const url = `${protocol}://${host}${req.originalUrl}`;

		// Get the raw body — Express may have parsed it already.
		// If rawBody is available (from rawBodyReader middleware), use it.
		// Otherwise re-encode based on content-type.
		let requestBody: string | undefined;
		if (req.method !== 'GET' && req.method !== 'HEAD') {
			// Express augments Request with rawBody via middleware
			interface RequestWithRawBody {
				rawBody?: Buffer;
			}

			const rawBody = (req as RequestWithRawBody).rawBody;
			if (rawBody) {
				requestBody = rawBody.toString('utf-8');
			} else if (req.headers['content-type']?.includes('application/json')) {
				requestBody = JSON.stringify(req.body);
			} else if (req.headers['content-type']?.includes('application/x-www-form-urlencoded')) {
				requestBody = new URLSearchParams(req.body as Record<string, string>).toString();
			} else {
				requestBody = JSON.stringify(req.body);
			}
		}

		const sanitizedHeaders: Record<string, string> = {};
		for (const [key, value] of Object.entries(req.headers)) {
			if (typeof value === 'string') {
				sanitizedHeaders[key] = value;
			} else if (Array.isArray(value)) {
				sanitizedHeaders[key] = value.join(', ');
			}
		}

		const webRequest = new globalThis.Request(url, {
			method: req.method,
			headers: sanitizedHeaders,
			body: requestBody,
		});

		// In Express, background tasks just need to not be garbage collected.
		// We hold references to keep them alive for the lifetime of the process.
		const backgroundTasks: Array<Promise<unknown>> = [];
		const waitUntil = (task: Promise<unknown>) => {
			backgroundTasks.push(
				task.catch((error: unknown) => {
					console.warn(
						'[AgentsController] Background task failed:',
						error instanceof Error ? error.message : String(error),
					);
				}),
			);
		};

		const webResponse = await webhookHandler(webRequest, { waitUntil });

		res.status(webResponse.status);
		webResponse.headers.forEach((value, key) => {
			res.setHeader(key, value);
		});
		const body = await webResponse.text();
		res.send(body);
	}
}
