import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Response } from 'express';
import type { User } from '@n8n/db';

import { AgentCollaborationController } from '../agent-collaboration.controller';
import { AgentCollaborationService } from '@/services/agent-collaboration.service';
import { JoinAgentSessionDto, UpdateCursorDto } from '@/dto/agent-collaboration.dto';

describe('AgentCollaborationController', () => {
	let controller: AgentCollaborationController;
	let mockService: AgentCollaborationService;
	let mockUser: User;
	let mockResponse: Response;

	beforeEach(() => {
		mockService = {
			joinAgent: vi.fn(),
			leaveAgent: vi.fn(),
			getActiveUsers: vi.fn(),
			updateCursor: vi.fn(),
			getCursorPositions: vi.fn(),
			isUserActive: vi.fn(),
			getUserCount: vi.fn(),
		} as unknown as AgentCollaborationService;

		mockUser = {
			id: 'user-123',
			email: 'test@example.com',
			firstName: 'Test',
			lastName: 'User',
		} as User;

		mockResponse = {
			status: vi.fn().mockReturnThis(),
			json: vi.fn().mockReturnThis(),
		} as unknown as Response;

		controller = new AgentCollaborationController(mockService);
	});

	describe('joinAgent', () => {
		it('should join agent collaboration session', async () => {
			const agentId = 'agent-456';
			const projectId = 'project-789';
			const body = new JoinAgentSessionDto();
			body.userName = 'Test User';

			vi.mocked(mockService.joinAgent).mockResolvedValue(undefined);
			vi.mocked(mockService.getActiveUsers).mockReturnValue(['user-123', 'user-456']);

			const result = await controller.joinAgent(
				{ user: mockUser, params: { projectId, agentId } } as any,
				mockResponse,
				agentId,
				body,
			);

			expect(mockService.joinAgent).toHaveBeenCalledWith(agentId, mockUser.id, 'Test User', projectId);
			expect(result).toEqual({
				success: true,
				agentId,
				userId: mockUser.id,
				userName: 'Test User',
				activeUsers: ['user-123', 'user-456'],
			});
		});

		it('should use user name from user if not provided in body', async () => {
			const agentId = 'agent-456';
			const projectId = 'project-789';
			const body = new JoinAgentSessionDto();
			body.userName = '';

			vi.mocked(mockService.joinAgent).mockResolvedValue(undefined);
			vi.mocked(mockService.getActiveUsers).mockReturnValue(['user-123']);

			const result = await controller.joinAgent(
				{ user: mockUser, params: { projectId, agentId } } as any,
				mockResponse,
				agentId,
				body,
			);

			expect(mockService.joinAgent).toHaveBeenCalledWith(agentId, mockUser.id, 'Test', projectId);
			expect(result.userName).toBe('Test');
		});
	});

	describe('leaveAgent', () => {
		it('should leave agent collaboration session', async () => {
			const agentId = 'agent-456';
			const projectId = 'project-789';

			vi.mocked(mockService.leaveAgent).mockResolvedValue(undefined);

			const result = await controller.leaveAgent(
				{ user: mockUser, params: { projectId, agentId } } as any,
				mockResponse,
				agentId,
			);

			expect(mockService.leaveAgent).toHaveBeenCalledWith(agentId, mockUser.id, projectId);
			expect(result).toEqual({
				success: true,
				agentId,
				userId: mockUser.id,
			});
		});
	});

	describe('getActiveUsers', () => {
		it('should return active users for agent', async () => {
			const agentId = 'agent-456';
			const projectId = 'project-789';

			vi.mocked(mockService.getActiveUsers).mockReturnValue(['user-123', 'user-456']);
			vi.mocked(mockService.getUserCount).mockReturnValue(2);

			const result = await controller.getActiveUsers(
				{ user: mockUser, params: { projectId, agentId } } as any,
				mockResponse,
				agentId,
			);

			expect(mockService.getActiveUsers).toHaveBeenCalledWith(agentId);
			expect(result).toEqual({
				agentId,
				userCount: 2,
				activeUsers: ['user-123', 'user-456'],
			});
		});
	});

	describe('updateCursor', () => {
		it('should update cursor position', async () => {
			const agentId = 'agent-456';
			const projectId = 'project-789';
			const body = new UpdateCursorDto();
			body.x = 100;
			body.y = 200;

			vi.mocked(mockService.updateCursor).mockResolvedValue(undefined);

			const result = await controller.updateCursor(
				{ user: mockUser, params: { projectId, agentId } } as any,
				mockResponse,
				agentId,
				body,
			);

			expect(mockService.updateCursor).toHaveBeenCalledWith(agentId, mockUser.id, { x: 100, y: 200 }, projectId);
			expect(result).toEqual({
				success: true,
				agentId,
				userId: mockUser.id,
				position: { x: 100, y: 200 },
			});
		});
	});

	describe('getCursorPositions', () => {
		it('should return cursor positions for agent', async () => {
			const agentId = 'agent-456';
			const projectId = 'project-789';
			const cursors = new Map([
				['user-123', { x: 100, y: 200 }],
				['user-456', { x: 300, y: 400 }],
			]);

			vi.mocked(mockService.getCursorPositions).mockReturnValue(cursors);

			const result = await controller.getCursorPositions(
				{ user: mockUser, params: { projectId, agentId } } as any,
				mockResponse,
				agentId,
			);

			expect(mockService.getCursorPositions).toHaveBeenCalledWith(agentId);
			expect(result).toEqual({
				agentId,
				cursors: Object.fromEntries(cursors),
			});
		});
	});

	describe('getUserStatus', () => {
		it('should return user status for agent', async () => {
			const agentId = 'agent-456';
			const projectId = 'project-789';

			vi.mocked(mockService.isUserActive).mockReturnValue(true);
			vi.mocked(mockService.getUserCount).mockReturnValue(2);

			const result = await controller.getUserStatus(
				{ user: mockUser, params: { projectId, agentId } } as any,
				mockResponse,
				agentId,
			);

			expect(mockService.isUserActive).toHaveBeenCalledWith(agentId, mockUser.id);
			expect(mockService.getUserCount).toHaveBeenCalledWith(agentId);
			expect(result).toEqual({
				agentId,
				userId: mockUser.id,
				isActive: true,
				userCount: 2,
			});
		});
	});
});
