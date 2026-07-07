import {
	AgentBuildResumeDto,
	type AgentBuilderMessagesResponse,
	AgentChatMessageDto,
	type AgentSseEvent,
} from '@n8n/api-types';
import type { AuthenticatedRequest } from '@n8n/db';
import { Body, Delete, Get, Param, Post, ProjectScope, RestController } from '@n8n/decorators';

import { CredentialsService } from '@/credentials/credentials.service';
import { NotFoundError } from '@/errors/response-errors/not-found.error';

import { AgentsCredentialProvider } from './adapters/agents-credential-provider';
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
import { withOpenSuspensions } from './utils/messages-envelope';

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
			if (name === BUILDER_TOOLS.CREATE_TASK) {
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
export class AgentBuilderController {
	constructor(
		private readonly agentsBuilderService: AgentsBuilderService,
		private readonly credentialsService: CredentialsService,
		private readonly agentsService: AgentsService,
	) {}

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
		// Scoped to the builder thread so preview-chat suspensions don't bleed in.
		const memory = await this.agentsBuilderService.getBuilderMessages(agentId);
		const checkpoint = await this.agentsBuilderService.findOpenBuilderCheckpoint(agentId);
		return withOpenSuspensions(messagesToDto(memory), checkpoint);
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

		const credentialProvider = new AgentsCredentialProvider(
			this.credentialsService,
			projectId,
			req.user,
		);

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

		const credentialProvider = new AgentsCredentialProvider(
			this.credentialsService,
			projectId,
			req.user,
		);

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
}
