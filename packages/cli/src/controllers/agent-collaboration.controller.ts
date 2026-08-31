import { AuthenticatedRequest } from '@n8n/db';
import {
	Delete,
	Get,
	Post,
	RestController,
	ProjectScope,
	Body,
	Param,
} from '@n8n/decorators';
import type { Response } from 'express';

import { AgentCollaborationService } from '@/services/agent-collaboration.service';
import type { JoinAgentSessionDto, UpdateCursorDto } from '@/dto/agent-collaboration.dto';

interface ProjectParams {
	projectId: string;
	agentId: string;
}

/**
 * Controller for real-time agent collaboration endpoints.
 *
 * Provides REST API for managing agent collaboration sessions:
 * - Join/leave agent editing sessions
 * - Get active users on an agent
 * - Get user presence information
 */
@RestController('/projects/:projectId/agent-collaboration')
export class AgentCollaborationController {
	constructor(private readonly agentCollaborationService: AgentCollaborationService) { }

	/**
	 * Join an agent editing session
	 * POST /projects/:projectId/agent-collaboration/:agentId/join
	 */
	@Post('/:agentId/join')
	@ProjectScope('agent:edit')
	async joinAgent(
		req: AuthenticatedRequest<ProjectParams>,
		_res: Response,
		@Param('agentId') agentId: string,
		@Body() body: JoinAgentSessionDto,
	) {
		const { projectId } = req.params;
		const user = req.user;
		const userName = (body as any).userName || user.firstName || user.email || 'Anonymous';

		await this.agentCollaborationService.joinAgent(agentId, user.id, userName, projectId);

		return {
			success: true,
			agentId,
			userId: user.id,
			userName,
			activeUsers: this.agentCollaborationService.getActiveUsers(agentId),
		};
	}

	/**
	 * Leave an agent editing session
	 * DELETE /projects/:projectId/agent-collaboration/:agentId/leave
	 */
	@Delete('/:agentId/leave')
	@ProjectScope('agent:edit')
	async leaveAgent(
		req: AuthenticatedRequest<ProjectParams>,
		_res: Response,
		@Param('agentId') agentId: string,
	) {
		const { projectId } = req.params;
		const user = req.user;

		await this.agentCollaborationService.leaveAgent(agentId, user.id, projectId);

		return {
			success: true,
			agentId,
			userId: user.id,
		};
	}

	/**
	 * Get active users on an agent
	 * GET /projects/:projectId/agent-collaboration/:agentId/users
	 */
	@Get('/:agentId/users')
	@ProjectScope('agent:read')
	async getActiveUsers(
		req: AuthenticatedRequest<ProjectParams>,
		_res: Response,
		@Param('agentId') agentId: string,
	) {
		const { projectId } = req.params;
		const activeUsers = this.agentCollaborationService.getActiveUsers(agentId);
		const userCount = this.agentCollaborationService.getUserCount(agentId);

		return {
			agentId,
			userCount,
			activeUsers,
		};
	}

	/**
	 * Update user cursor position
	 * POST /projects/:projectId/agent-collaboration/:agentId/cursor
	 */
	@Post('/:agentId/cursor')
	@ProjectScope('agent:edit')
	async updateCursor(
		req: AuthenticatedRequest<ProjectParams>,
		_res: Response,
		@Param('agentId') agentId: string,
		@Body() body: UpdateCursorDto,
	) {
		const { projectId } = req.params;
		const user = req.user;

		await this.agentCollaborationService.updateCursor(agentId, user.id, {
			x: (body as any).x,
			y: (body as any).y,
		}, projectId);

		return {
			success: true,
			agentId,
			userId: user.id,
			position: { x: (body as any).x, y: (body as any).y },
		};
	}

	/**
	 * Get cursor positions for all users on an agent
	 * GET /projects/:projectId/agent-collaboration/:agentId/cursors
	 */
	@Get('/:agentId/cursors')
	@ProjectScope('agent:read')
	async getCursorPositions(
		req: AuthenticatedRequest<ProjectParams>,
		_res: Response,
		@Param('agentId') agentId: string,
	) {
		const { projectId } = req.params;
		const cursors = this.agentCollaborationService.getCursorPositions(agentId);

		return {
			agentId,
			cursors: Object.fromEntries(cursors),
		};
	}

	/**
	 * Check if user is active on an agent
	 * GET /projects/:projectId/agent-collaboration/:agentId/status
	 */
	@Get('/:agentId/status')
	@ProjectScope('agent:read')
	async getUserStatus(
		req: AuthenticatedRequest<ProjectParams>,
		_res: Response,
		@Param('agentId') agentId: string,
	) {
		const { projectId } = req.params;
		const user = req.user;
		const isActive = this.agentCollaborationService.isUserActive(agentId, user.id);
		const userCount = this.agentCollaborationService.getUserCount(agentId);

		return {
			agentId,
			userId: user.id,
			isActive,
			userCount,
		};
	}
}