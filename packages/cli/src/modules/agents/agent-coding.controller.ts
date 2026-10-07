import {
	AgentCodingActionDto,
	AgentCodingLogDto,
	AgentCodingPathDto,
	AgentCodingSessionQueryDto,
	AgentCodingCreateSessionDto,
	AgentCodingArchiveSessionDto,
	AgentCodingCreateChatDto,
} from '@n8n/api-types';
import type { AuthenticatedRequest } from '@n8n/db';
import { Body, Get, Post, ProjectScope, Query, RestController } from '@n8n/decorators';

import { AgentCodingService } from './agent-coding.service';

type CodingRequest = AuthenticatedRequest<{ projectId: string; agentId: string }>;

@RestController('/projects/:projectId/agents/v2/:agentId/coding')
export class AgentCodingController {
	constructor(private readonly codingService: AgentCodingService) {}

	@Get('/sessions')
	@ProjectScope('agent:read')
	async sessions(req: CodingRequest) {
		return await this.codingService.sessions(req.params.projectId, req.params.agentId, req.user);
	}

	@Post('/sessions')
	@ProjectScope('agent:execute')
	async createSession(req: CodingRequest, _res: unknown, @Body body: AgentCodingCreateSessionDto) {
		return await this.codingService.createSession(
			req.params.projectId,
			req.params.agentId,
			req.user,
			body,
		);
	}

	@Post('/sessions/archive')
	@ProjectScope('agent:execute')
	async archiveSession(
		req: CodingRequest,
		_res: unknown,
		@Body body: AgentCodingArchiveSessionDto,
	) {
		return await this.codingService.archiveSession(
			req.params.projectId,
			req.params.agentId,
			req.user,
			body.sessionId,
			body.archived,
		);
	}

	@Post('/chats')
	@ProjectScope('agent:execute')
	async createChat(req: CodingRequest, _res: unknown, @Body body: AgentCodingCreateChatDto) {
		return await this.codingService.createChat(
			req.params.projectId,
			req.params.agentId,
			req.user,
			body.sessionId,
		);
	}

	@Get('/status')
	@ProjectScope('agent:read')
	async status(req: CodingRequest, _res: unknown, @Query query: AgentCodingSessionQueryDto) {
		return await this.codingService.status(
			req.params.projectId,
			req.params.agentId,
			req.user,
			query.sessionId,
		);
	}

	@Get('/files')
	@ProjectScope('agent:read')
	async files(req: CodingRequest, _res: unknown, @Query query: AgentCodingPathDto) {
		return await this.codingService.files(
			req.params.projectId,
			req.params.agentId,
			req.user,
			query.path,
			query.search,
			query.sessionId,
		);
	}

	@Get('/file')
	@ProjectScope('agent:read')
	async file(req: CodingRequest, _res: unknown, @Query query: AgentCodingPathDto) {
		return await this.codingService.file(
			req.params.projectId,
			req.params.agentId,
			req.user,
			query.path,
			query.sessionId,
		);
	}

	@Get('/diff')
	@ProjectScope('agent:read')
	async diff(req: CodingRequest, _res: unknown, @Query query: AgentCodingPathDto) {
		return await this.codingService.diff(
			req.params.projectId,
			req.params.agentId,
			req.user,
			query.path,
			query.sessionId,
		);
	}

	@Get('/logs')
	@ProjectScope('agent:read')
	async logs(req: CodingRequest, _res: unknown, @Query query: AgentCodingLogDto) {
		return await this.codingService.logs(
			req.params.projectId,
			req.params.agentId,
			req.user,
			query.stream,
			query.sessionId,
		);
	}

	@Get('/preview')
	@ProjectScope('agent:execute')
	async preview(req: CodingRequest, _res: unknown, @Query query: AgentCodingSessionQueryDto) {
		return await this.codingService.preview(
			req.params.projectId,
			req.params.agentId,
			req.user,
			query.sessionId,
		);
	}

	@Post('/action')
	@ProjectScope('agent:execute')
	async action(req: CodingRequest, _res: unknown, @Body body: AgentCodingActionDto) {
		return await this.codingService.action(
			req.params.projectId,
			req.params.agentId,
			req.user,
			body,
		);
	}
}
