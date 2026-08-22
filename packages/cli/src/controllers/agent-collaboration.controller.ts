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
import { Response } from 'express';
import { Z } from '@n8n/decorators';

import { AgentCollaborationService } from '@/services/agent-collaboration.service';
import { JoinAgentSessionDto, UpdateCursorDto } from '@/dto/agent-collaboration.dto';

/**
 * Controller for real-time agent collaboration endpoints.
 * 
 * Provides REST API for managing agent collaboration sessions:
 * - Join/leave agent editing sessions
 * - Get active users on an agent
 * - Get user presence information
 */
@RestController('/agent-collaboration')
export class AgentCollaborationController {
	constructor(private readonly agentCollaborationService: AgentCollaborationService) { }

	/**
	 * Join an agent editing session
	 * POST /agent-collaboration/:agentId/join
	 */
	@Post('/:agentId/join')
	@ProjectScope('agent:edit')
	async joinAgent(
		req: AuthenticatedRequest,
		_res: Response,
		@Param('agentId') agentId: string,
		@Body(Z(JoinAgentSessionDto)) body: JoinAgentSessionDto,
	) {
		const user = req.user;
		const userName = body.userName || user.firstName || user.email || 'Anonymous';

		await this.agentCollaborationService.joinAgent(agentId, user.id, userName);

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
	 * DELETE /agent-collaboration/:agentId/leave
	 */
	@Delete('/:agentId/leave')
	@ProjectScope('agent:edit')
	async leaveAgent(
		req: AuthenticatedRequest,
		_res: Response,
		@Param('agentId') agentId: string,
	) {
		const user = req.user;

		await this.agentCollaborationService.leaveAgent(agentId, user.id);

		return {
			success: true,
			agentId,
			userId: user.id,
		};
	}

	/**
	 * Get active users on an agent
	 * GET /agent-collaboration/:agentId/users
	 */
	@Get('/:agentId/users')
	@ProjectScope('agent:read')
	async getActiveUsers(_req: AuthenticatedRequest, _res: Response, @Param('agentId') agentId: string) {
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
	 * POST /agent-collaboration/:agentId/cursor
	 */
	@Post('/:agentId/cursor')
	@ProjectScope('agent:edit')
	async updateCursor(
		req: AuthenticatedRequest,
		_res: Response,
		@Param('agentId') agentId: string,
		@Body(Z(UpdateCursorDto)) body: UpdateCursorDto,
	) {
		const user = req.user;

		await this.agentCollaborationService.updateCursor(agentId, user.id, {
			x: body.x,
			y: body.y,
		});

		return {
			success: true,
			agentId,
			userId: user.id,
			position: { x: body.x, y: body.y },
		};
	}

	/**
	 * Get cursor positions for all users on an agent
	 * GET /agent-collaboration/:agentId/cursors
	 */
	@Get('/:agentId/cursors')
	@ProjectScope('agent:read')
	async getCursorPositions(_req: AuthenticatedRequest, _res: Response, @Param('agentId') agentId: string) {
		const cursors = this.agentCollaborationService.getCursorPositions(agentId);

		return {
			agentId,
			cursors: Object.fromEntries(cursors),
		};
	}

	/**
	 * Check if user is active on an agent
	 * GET /agent-collaboration/:agentId/status
	 */
	@Get('/:agentId/status')
	@ProjectScope('agent:read')
	async getUserStatus(
		req: AuthenticatedRequest,
		_res: Response,
		@Param('agentId') agentId: string,
	) {
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