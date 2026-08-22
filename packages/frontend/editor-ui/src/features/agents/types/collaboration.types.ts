/**
 * Types for real-time agent collaboration
 */

export interface AgentCollaborationState {
	agentId: string;
	isActive: boolean;
	activeUsers: string[];
	userCount: number;
	cursorPositions: Map<string, { x: number; y: number }>;
}

export interface AgentPresence {
	userId: string;
	userName: string;
	position?: { x: number; y: number };
	timestamp: number;
}

export interface AgentCollaborationMessage {
	type: 'agent-collaboration' | 'agent-presence';
	agentId: string;
	payload: unknown;
}

export interface AgentPresencePayload {
	type: 'user-joined' | 'user-left' | 'cursor-update';
	userId: string;
	userName?: string;
	position?: { x: number; y: number };
	timestamp: number;
}

export interface AgentConfigChangePayload {
	type: 'config-update' | 'skill-change' | 'setting-change';
	data: unknown;
	userId: string;
}

export interface CursorPosition {
	x: number;
	y: number;
}

export interface UserPresence {
	userId: string;
	userName: string;
	isOnline: boolean;
	lastSeen: number;
	cursor?: CursorPosition;
}