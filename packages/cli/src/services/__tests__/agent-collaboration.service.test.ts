import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Container } from '@n8n/di';
import { Logger } from '@n8n/backend-common';
import type { User } from '@n8n/db';
import { UnexpectedError } from 'n8n-workflow';

import { AgentCollaborationService } from '../agent-collaboration.service';
import { Push } from '@/push';

describe('AgentCollaborationService', () => {
	let service: AgentCollaborationService;
	let mockPush: Push;
	let mockLogger: Logger;

	const mockUser: User = {
		id: 'user-123',
		email: 'test@example.com',
		firstName: 'Test',
		lastName: 'User',
	} as User;

	beforeEach(() => {
		// Mock dependencies
		mockPush = {
			sendToUsers: vi.fn(),
		} as unknown as Push;

		mockLogger = {
			scoped: vi.fn(() => mockLogger),
			info: vi.fn(),
			debug: vi.fn(),
			error: vi.fn(),
			warn: vi.fn(),
		} as unknown as Logger;

		// Mock Container.get
		vi.spyOn(Container, 'get').mockReturnValue(mockLogger);

		service = new AgentCollaborationService(mockPush);
	});

	describe('joinAgent', () => {
		it('should add user to agent and broadcast presence', async () => {
			const agentId = 'agent-456';
			const userName = 'Test User';

			await service.joinAgent(agentId, mockUser.id, userName);

			// Verify user is added
			expect(service.isUserActive(agentId, mockUser.id)).toBe(true);
			expect(service.getActiveUsers(agentId)).toContain(mockUser.id);

			// Verify broadcast was called
			expect(mockPush.sendToUsers).toHaveBeenCalledWith(
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

			await service.joinAgent(agentId, mockUser.id, 'User 1');
			await service.joinAgent(agentId, user2.id, 'User 2');

			expect(service.getUserCount(agentId)).toBe(2);
			expect(service.getActiveUsers(agentId)).toEqual([mockUser.id, user2.id]);
		});
	});

	describe('leaveAgent', () => {
		it('should remove user from agent and broadcast presence', async () => {
			const agentId = 'agent-456';
			const user2: User = { id: 'user-456', email: 'user2@example.com' } as User;

			// Join two users
			await service.joinAgent(agentId, mockUser.id, 'User 1');
			await service.joinAgent(agentId, user2.id, 'User 2');
			expect(service.getUserCount(agentId)).toBe(2);

			// One user leaves
			await service.leaveAgent(agentId, mockUser.id);

			// Verify user is removed
			expect(service.isUserActive(agentId, mockUser.id)).toBe(false);
			expect(service.getUserCount(agentId)).toBe(1);

			// Verify broadcast was called for remaining user
			expect(mockPush.sendToUsers).toHaveBeenCalledWith(
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
				[mockUser.id, user2.id],
			);
		});

		it('should clean up when no users remain', async () => {
			const agentId = 'agent-456';

			await service.joinAgent(agentId, mockUser.id, 'Test User');
			await service.updateCursor(agentId, mockUser.id, { x: 100, y: 200 });
			await service.leaveAgent(agentId, mockUser.id);

			// Verify cleanup
			expect(service.isUserActive(agentId, mockUser.id)).toBe(false);
			expect(service.getCursorPositions(agentId).size).toBe(0);
		});
	});

	describe('updateCursor', () => {
		it('should update cursor position and broadcast', async () => {
			const agentId = 'agent-456';
			const position = { x: 150, y: 250 };

			await service.joinAgent(agentId, mockUser.id, 'Test User');
			await service.updateCursor(agentId, mockUser.id, position);

			// Verify cursor is updated
			const cursors = service.getCursorPositions(agentId);
			expect(cursors.get(mockUser.id)).toEqual(position);

			// Verify broadcast was called
			expect(mockPush.sendToUsers).toHaveBeenCalledWith(
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

			await service.joinAgent(agentId, mockUser.id, 'User 1');
			await service.joinAgent(agentId, user2.id, 'User 2');

			const change = {
				type: 'config-update' as const,
				data: { name: 'Updated Agent' },
				userId: mockUser.id,
			};

			await service.broadcastAgentChange(agentId, change);

			// Verify broadcast to both users
			expect(mockPush.sendToUsers).toHaveBeenCalledWith(
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
			expect(mockPush.sendToUsers).not.toHaveBeenCalled();
		});
	});

	describe('handleClientMessage', () => {
		it('should handle agent collaboration messages', async () => {
			const agentId = 'agent-456';

			await service.joinAgent(agentId, mockUser.id, 'Test User');

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
			expect(mockPush.sendToUsers).toHaveBeenCalled();
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

			await service.joinAgent(agentId, mockUser.id, 'Test User');

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
	});

	describe('query methods', () => {
		it('should return correct user count', async () => {
			const agentId = 'agent-456';

			expect(service.getUserCount(agentId)).toBe(0);

			await service.joinAgent(agentId, mockUser.id, 'Test User');
			expect(service.getUserCount(agentId)).toBe(1);
		});

		it('should return active users', async () => {
			const agentId = 'agent-456';
			const user2: User = { id: 'user-456', email: 'user2@example.com' } as User;

			await service.joinAgent(agentId, mockUser.id, 'User 1');
			await service.joinAgent(agentId, user2.id, 'User 2');

			const activeUsers = service.getActiveUsers(agentId);
			expect(activeUsers).toHaveLength(2);
			expect(activeUsers).toContain(mockUser.id);
			expect(activeUsers).toContain(user2.id);
		});

		it('should return cursor positions', async () => {
			const agentId = 'agent-456';

			await service.joinAgent(agentId, mockUser.id, 'Test User');
			await service.updateCursor(agentId, mockUser.id, { x: 100, y: 200 });

			const cursors = service.getCursorPositions(agentId);
			expect(cursors.size).toBe(1);
			expect(cursors.get(mockUser.id)).toEqual({ x: 100, y: 200 });
		});
	});
});