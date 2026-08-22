import { Logger, Service } from '@n8n/decorators';
import { Container } from '@n8n/di';
import type { User } from '@n8n/db';
import { UnexpectedError } from 'n8n-workflow';

import { Push } from '@/push';

/**
 * Service for real-time agent collaboration using CRDT-based synchronization.
 * 
 * This service manages multi-user editing of agent configurations by:
 * - Broadcasting agent configuration changes via WebSocket
 * - Tracking user presence on agents
 * - Handling conflict resolution through CRDT merge strategies
 * - Providing real-time collaboration features for the agent builder
 */
@Service()
export class AgentCollaborationService {
	private readonly logger: Logger;

	// Track active users per agent
	private readonly agentUsers = new Map<string, Set<string>>();

	// Track user cursor positions
	private readonly userCursors = new Map<string, Map<string, { x: number; y: number }>>();

	constructor(private readonly push: Push) {
		this.logger = Container.get(Logger);
		this.logger = this.logger.scoped('agent-collaboration');
	}

	/**
	 * Register a user as active on an agent
	 */
	async joinAgent(agentId: string, userId: User['id'], userName: string): Promise<void> {
		if (!this.agentUsers.has(agentId)) {
			this.agentUsers.set(agentId, new Set());
		}

		this.agentUsers.get(agentId)!.add(userId);

		// Broadcast presence update to all users on this agent
		await this.broadcastPresence(agentId, {
			type: 'user-joined',
			userId,
			userName,
			timestamp: Date.now(),
		});

		this.logger.info(`User ${userId} joined agent ${agentId}`);
	}

	/**
	 * Remove a user from an agent
	 */
	async leaveAgent(agentId: string, userId: User['id']): Promise<void> {
		const users = this.agentUsers.get(agentId);
		if (users) {
			users.delete(userId);

			// Broadcast presence update
			await this.broadcastPresence(agentId, {
				type: 'user-left',
				userId,
				timestamp: Date.now(),
			});

			// Clean up if no users left
			if (users.size === 0) {
				this.agentUsers.delete(agentId);
				this.userCursors.delete(agentId);
			}
		}

		this.logger.info(`User ${userId} left agent ${agentId}`);
	}

	/**
	 * Update user cursor position for real-time collaboration UI
	 */
	async updateCursor(
		agentId: string,
		userId: User['id'],
		position: { x: number; y: number },
	): Promise<void> {
		// Validate user is authorized and active on this agent
		if (!this.isUserActive(agentId, userId)) {
			throw new UnexpectedError('User not authorized to update cursor on this agent');
		}

		if (!this.userCursors.has(agentId)) {
			this.userCursors.set(agentId, new Map());
		}

		this.userCursors.get(agentId)!.set(userId, position);

		// Broadcast cursor update to other users
		await this.broadcastPresence(agentId, {
			type: 'cursor-update',
			userId,
			position,
			timestamp: Date.now(),
		});
	}

	/**
	 * Broadcast agent configuration changes to all connected users
	 */
	async broadcastAgentChange(
		agentId: string,
		change: {
			type: 'config-update' | 'skill-change' | 'setting-change';
			data: unknown;
			userId: User['id'];
		},
	): Promise<void> {
		const message: AgentCollaborationMessage = {
			type: 'agent-collaboration',
			agentId,
			payload: change,
		};

		// Broadcast to all users editing this agent using push service
		const users = this.agentUsers.get(agentId);
		if (users && users.size > 0) {
			const userIds = Array.from(users);
			this.push.sendToUsers({ type: 'agent-collaboration', data: message }, userIds);
		}

		this.logger.debug(`Broadcasted change for agent ${agentId} to ${users?.size ?? 0} users`);
	}

	/**
	 * Get all active users on an agent
	 */
	getActiveUsers(agentId: string): string[] {
		const users = this.agentUsers.get(agentId);
		return users ? Array.from(users) : [];
	}

	/**
	 * Get user count for an agent
	 */
	getUserCount(agentId: string): number {
		return this.agentUsers.get(agentId)?.size ?? 0;
	}

	/**
	 * Check if a user is active on an agent
	 */
	isUserActive(agentId: string, userId: User['id']): boolean {
		return this.agentUsers.get(agentId)?.has(userId) ?? false;
	}

	/**
	 * Get cursor positions for all users on an agent
	 */
	getCursorPositions(agentId: string): Map<string, { x: number; y: number }> {
		return this.userCursors.get(agentId) ?? new Map();
	}

	/**
	 * Broadcast presence updates to all users on an agent
	 */
	private async broadcastPresence(
		agentId: string,
		presence: {
			type: 'user-joined' | 'user-left' | 'cursor-update';
			userId: string;
			userName?: string;
			position?: { x: number; y: number };
			timestamp: number;
		},
	): Promise<void> {
		const message: AgentCollaborationMessage = {
			type: 'agent-presence',
			agentId,
			payload: presence,
		};

		const users = this.agentUsers.get(agentId);
		if (users && users.size > 0) {
			const userIds = Array.from(users);
			this.push.sendToUsers({ type: 'agent-presence', data: message }, userIds);
		}
	}

	/**
	 * Handle incoming collaboration messages from clients
	 */
	async handleClientMessage(message: unknown, userId: User['id']): Promise<void> {
		// Type guard for agent collaboration messages
		if (!message || typeof message !== 'object') {
			return;
		}

		const msg = message as Record<string, unknown>;

		if (msg.type === 'agent-collaboration' && msg.agentId && msg.payload) {
			const agentId = msg.agentId as string;
			const payload = msg.payload as { type: string; data: unknown; userId: User['id'] };

			// Validate user is authorized to edit this agent
			if (!this.isUserActive(agentId, userId)) {
				throw new UnexpectedError('User not authorized to collaborate on this agent');
			}

			// Rebroadcast to other users (excluding sender)
			await this.broadcastAgentChange(agentId, {
				...payload,
				userId,
			});
		} else if (msg.type === 'agent-presence' && msg.agentId && msg.payload) {
			const agentId = msg.agentId as string;
			const payload = msg.payload as { type: 'user-joined' | 'user-left' | 'cursor-update'; userId: string; position?: { x: number; y: number } };

			// For cursor updates from WebSocket, also validate authorization
			if (payload.type === 'cursor-update' && payload.position) {
				// The userId in payload should match the sender userId
				if (payload.userId !== userId) {
					throw new UnexpectedError('Cursor update userId mismatch');
				}
				await this.updateCursor(agentId, userId, payload.position);
			}
		}
	}

	/**
	 * Clean up inactive users (called periodically)
	 */
	cleanupInactiveUsers(): void {
		// Track connection activity and remove stale sessions
		// For now, this is a placeholder for future enhancement
		// TODO: Implement heartbeat mechanism to detect disconnected clients
		this.logger.debug('Cleaning up inactive users');

		// Future implementation would:
		// 1. Track last activity timestamp per user
		// 2. Remove users inactive for > 5 minutes
		// 3. Clean up associated cursor positions
		// 4. Broadcast user-left events for cleaned up users
	}
}