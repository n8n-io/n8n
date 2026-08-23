import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Container } from '@n8n/di';
import { Logger } from '@n8n/backend-common';
import type { User } from '@n8n/db';
import { UnexpectedError } from 'n8n-workflow';

import { AgentCollaborationService, type CollaborationBroadcastCallback } from '../agent-collaboration.service';
import { AgentRepository } from '@/modules/agents/repositories/agent.repository';

describe('AgentCollaborationService', () => {
	let service: AgentCollaborationService;
	let mockLogger: Logger;
	let mockAgentRepository: AgentRepository;
	let mockBroadcastCallback: CollaborationBroadcastCallback;

	const mockUser: User = {
		id: 'user-123',
		email: 'test@example.com',
		firstName: 'Test',
		lastName: 'User',
	} as User;

	const mockProjectId = 'project-456';

	beforeEach(() => {
		// Mock dependencies
		mockLogger = {
			scoped: vi.fn(() => mockLogger),
			info: vi.fn(),
			debug: vi.fn(),
			error: vi.fn(),
			warn: vi.fn(),
		} as unknown as Logger;

		mockAgentRepository = {
			findByIdAndProjectId: vi.fn().mockResolvedValue({ id: 'agent-456' }),
			existsByIdAndProjectId: vi.fn().mockResolvedValue(true),
		} as unknown as AgentRepository;

		mockBroadcastCallback = vi.fn();

		// Mock Container.get
		vi.spyOn(Container, 'get').mockReturnValue(mockLogger);

		service = new AgentCollaborationService(mockAgentRepository);
		service.setBroadcastCallback(mockBroadcastCallback);
	});

	describe('joinAgent', () => {
		it('should add user to agent and broadcast presence', async () => {
			const agentId = 'agent-456';
			const userName = 'Test User';

			await service.joinAgent(agentId, mockUser.id, userName, mockProjectId);

			// Verify user is added
			expect(service.isUserActive(agentId, mockUser.id)).toBe(true);
			expect(service.getActiveUsers(agentId)).toContain(mockUser.id);

			// Verify broadcast was called
			expect(mockBroadcastCallback).toHaveBeenCalledWith(
				{
					type: 'agent-presence',
					data: {
						type: 'agent-presence',
						agentId,
						payload: {
							type: 'user-joined',
							userId: mockUser.id,
							userName,
							timestamp: expect.any(Number),
						},
					},
				},
				[mockUser.id],
			);
		});

		it('should handle multiple users on same agent', async () => {
			const agentId = 'agent-456';
			const user2: User = { id: 'user-456', email: 'user2@example.com' } as User;

			await service.joinAgent(agentId, mockUser.id, 'User 1', mockProjectId);
			await service.joinAgent(agentId, user2.id, 'User 2', mockProjectId);

			expect(service.getUserCount(agentId)).toBe(2);
			expect(service.getActiveUsers(agentId)).toEqual([mockUser.id, user2.id]);
		});
	});

	describe('leaveAgent', () => {
		it('should remove user from agent and broadcast presence', async () => {
			const agentId = 'agent-456';
			const user2: User = { id: 'user-456', email: 'user2@example.com' } as User;

			// Join two users
			await service.joinAgent(agentId, mockUser.id, 'User 1', mockProjectId);
			await service.joinAgent(agentId, user2.id, 'User 2', mockProjectId);
			expect(service.getUserCount(agentId)).toBe(2);

			// One user leaves
			await service.leaveAgent(agentId, mockUser.id, mockProjectId);

			// Verify user is removed
			expect(service.isUserActive(agentId, mockUser.id)).toBe(false);
			expect(service.getUserCount(agentId)).toBe(1);

			// Verify broadcast was called for remaining user
			expect(mockBroadcastCallback).toHaveBeenCalledWith(
				{
					type: 'agent-presence',
					data: {
						type: 'agent-presence',
						agentId,
						payload: {
							type: 'user-left',
							userId: mockUser.id,
							timestamp: expect.any(Number),
						},
					},
				},
				[user2.id],
			);
		});

		it('should clean up when no users remain', async () => {
			const agentId = 'agent-456';

			await service.joinAgent(agentId, mockUser.id, 'Test User', mockProjectId);
			await service.updateCursor(agentId, mockUser.id, { x: 100, y: 200 }, mockProjectId);
			await service.leaveAgent(agentId, mockUser.id, mockProjectId);

			// Verify cleanup
			expect(service.isUserActive(agentId, mockUser.id)).toBe(false);
			expect(service.getCursorPositions(agentId).size).toBe(0);
		});
	});

	describe('updateCursor', () => {
		it('should update cursor position and broadcast', async () => {
			const agentId = 'agent-456';
			const position = { x: 150, y: 250 };

			await service.joinAgent(agentId, mockUser.id, 'Test User', mockProjectId);
			await service.updateCursor(agentId, mockUser.id, position, mockProjectId);

			// Verify cursor is updated
			const cursors = service.getCursorPositions(agentId);
			expect(cursors.get(mockUser.id)).toEqual(position);

			// Verify broadcast was called
			expect(mockBroadcastCallback).toHaveBeenCalledWith(
				{
					type: 'agent-presence',
					data: {
						type: 'agent-presence',
						agentId,
						payload: {
							type: 'cursor-update',
							userId: mockUser.id,
							position,
							timestamp: expect.any(Number),
						},
					},
				},
				[mockUser.id],
			);
		});
	});

	describe('broadcastAgentChange', () => {
		it('should broadcast changes to all active users', async () => {
			const agentId = 'agent-456';
			const user2: User = { id: 'user-456', email: 'user2@example.com' } as User;

			await service.joinAgent(agentId, mockUser.id, 'User 1', mockProjectId);
			await service.joinAgent(agentId, user2.id, 'User 2', mockProjectId);

			const change = {
				type: 'config-update' as const,
				data: { name: 'Updated Agent' },
				userId: mockUser.id,
			};

			await service.broadcastAgentChange(agentId, change);

			// Verify broadcast to both users
			expect(mockBroadcastCallback).toHaveBeenCalledWith(
				{
					type: 'agent-collaboration',
					data: {
						type: 'agent-collaboration',
						agentId,
						payload: change,
					},
				},
				[mockUser.id, user2.id],
			);
		});

		it('should not broadcast if no active users', async () => {
			const agentId = 'agent-456';

			const change = {
				type: 'config-update' as const,
				data: { name: 'Updated Agent' },
				userId: mockUser.id,
			};

			await service.broadcastAgentChange(agentId, change);

			// Should not call sendToUsers
			expect(mockBroadcastCallback).not.toHaveBeenCalled();
		});
	});

	describe('handleClientMessage', () => {
		it('should handle agent collaboration messages', async () => {
			const agentId = 'agent-456';

			await service.joinAgent(agentId, mockUser.id, 'Test User', mockProjectId);

			const message = {
				type: 'agent-collaboration' as const,
				agentId,
				payload: {
					type: 'config-update',
					data: { name: 'Updated Agent' },
					userId: mockUser.id,
				},
			};

			await service.handleClientMessage(message, mockUser.id);

			// Verify rebroadcast
			expect(mockBroadcastCallback).toHaveBeenCalled();
		});

		it('should throw error for unauthorized user', async () => {
			const agentId = 'agent-456';

			const message = {
				type: 'agent-collaboration' as const,
				agentId,
				payload: {
					type: 'config-update',
					data: { name: 'Updated Agent' },
					userId: mockUser.id,
				},
			};

			await expect(
				service.handleClientMessage(message, mockUser.id),
			).rejects.toThrow(UnexpectedError);
		});

		it('should handle cursor update messages', async () => {
			const agentId = 'agent-456';

			await service.joinAgent(agentId, mockUser.id, 'Test User', mockProjectId);

			const message = {
				type: 'agent-presence' as const,
				agentId,
				payload: {
					type: 'cursor-update',
					userId: mockUser.id,
					position: { x: 100, y: 200 },
					timestamp: Date.now(),
				},
			};

			await service.handleClientMessage(message, mockUser.id);

			// Verify cursor is updated
			const cursors = service.getCursorPositions(agentId);
			expect(cursors.get(mockUser.id)).toEqual({ x: 100, y: 200 });
		});

		it('should remove user when project access is lost during collaboration', async () => {
			const agentId = 'agent-456';

			await service.joinAgent(agentId, mockUser.id, 'Test User', mockProjectId);

			// Simulate user losing project access
			vi.mocked(mockAgentRepository.existsByIdAndProjectId).mockResolvedValue(false);

			const message = {
				type: 'agent-collaboration' as const,
				agentId,
				payload: {
					type: 'config-update',
					data: { name: 'Updated Agent' },
					userId: mockUser.id,
				},
			};

			await service.handleClientMessage(message, mockUser.id);

			// Verify user was removed from session
			expect(service.isUserActive(agentId, mockUser.id)).toBe(false);
			expect(mockBroadcastCallback).toHaveBeenCalledWith(
				{
					type: 'agent-presence',
					data: {
						type: 'agent-presence',
						agentId,
						payload: {
							type: 'user-left',
							userId: mockUser.id,
							timestamp: expect.any(Number),
						},
					},
				},
				[mockUser.id],
			);
		});
	});

	describe('query methods', () => {
		it('should return correct user count', async () => {
			const agentId = 'agent-456';

			expect(service.getUserCount(agentId)).toBe(0);

			await service.joinAgent(agentId, mockUser.id, 'Test User', mockProjectId);
			expect(service.getUserCount(agentId)).toBe(1);
		});

		it('should return active users', async () => {
			const agentId = 'agent-456';
			const user2: User = { id: 'user-456', email: 'user2@example.com' } as User;

			await service.joinAgent(agentId, mockUser.id, 'User 1', mockProjectId);
			await service.joinAgent(agentId, user2.id, 'User 2', mockProjectId);

			const activeUsers = service.getActiveUsers(agentId);
			expect(activeUsers).toHaveLength(2);
			expect(activeUsers).toContain(mockUser.id);
			expect(activeUsers).toContain(user2.id);
		});

		it('should return cursor positions', async () => {
			const agentId = 'agent-456';

			await service.joinAgent(agentId, mockUser.id, 'Test User', mockProjectId);
			await service.updateCursor(agentId, mockUser.id, { x: 100, y: 200 }, mockProjectId);

			const cursors = service.getCursorPositions(agentId);
			expect(cursors.size).toBe(1);
			expect(cursors.get(mockUser.id)).toEqual({ x: 100, y: 200 });
		});
	});

	describe('cleanupInactiveUsers', () => {
		it('should remove inactive users and broadcast user-left events', async () => {
			const agentId = 'agent-456';
			const user2: User = { id: 'user-456', email: 'user2@example.com' } as User;

			// Join two users
			await service.joinAgent(agentId, mockUser.id, 'User 1', mockProjectId);
			await service.joinAgent(agentId, user2.id, 'User 2', mockProjectId);

			// Manually set old activity timestamp for mockUser to make them inactive
			const activityMap = (service as any).userActivity.get(agentId);
			activityMap.set(mockUser.id, Date.now() - 10 * 60 * 1000); // 10 minutes ago

			// Run cleanup
			service.cleanupInactiveUsers();

			// Verify inactive user is removed
			expect(service.isUserActive(agentId, mockUser.id)).toBe(false);
			expect(service.isUserActive(agentId, user2.id)).toBe(true);
			expect(service.getUserCount(agentId)).toBe(1);

			// Verify user-left broadcast for cleaned up user
			expect(mockBroadcastCallback).toHaveBeenCalledWith(
				{
					type: 'agent-presence',
					data: {
						type: 'agent-presence',
						agentId,
						payload: {
							type: 'user-left',
							userId: mockUser.id,
							timestamp: expect.any(Number),
						},
					},
				},
				[user2.id],
			);
		});

		it('should not remove active users', async () => {
			const agentId = 'agent-456';

			await service.joinAgent(agentId, mockUser.id, 'Test User', mockProjectId);

			// Run cleanup without modifying activity timestamp
			service.cleanupInactiveUsers();

			// Verify user is still active
			expect(service.isUserActive(agentId, mockUser.id)).toBe(true);
			expect(service.getUserCount(agentId)).toBe(1);
		});
	});
});