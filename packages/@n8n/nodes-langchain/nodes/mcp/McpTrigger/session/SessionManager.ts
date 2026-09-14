import type { Tool } from '@langchain/core/tools';
import type { Server } from '@modelcontextprotocol/sdk/server/index.js';

import type { SessionStore } from './SessionStore';
import type { McpTransport } from '../transport/Transport';

export interface SessionInfo {
	sessionId: string;
	server: Server;
	transport: McpTransport;
	/** Epoch ms of the last client request on this session; drives idle eviction. */
	lastActivityAt: number;
}

export class SessionManager {
	private sessions: Record<string, SessionInfo> = {};

	constructor(private store: SessionStore) {}

	async registerSession(
		sessionId: string,
		server: Server,
		transport: McpTransport,
		tools?: Tool[],
	): Promise<void> {
		if (!sessionId) return;
		await this.store.register(sessionId);
		this.sessions[sessionId] = { sessionId, server, transport, lastActivityAt: Date.now() };
		if (tools) {
			this.store.setTools(sessionId, tools);
		}
	}

	/** Mark a session as active. No-op for unknown sessions (never resurrects one). */
	touch(sessionId: string): void {
		const session = this.sessions[sessionId];
		if (session) {
			session.lastActivityAt = Date.now();
		}
	}

	/** Session ids that have been idle for at least `idleTtlMs`. */
	getIdleSessions(idleTtlMs: number, now: number = Date.now()): string[] {
		return Object.values(this.sessions)
			.filter((session) => now - session.lastActivityAt >= idleTtlMs)
			.map((session) => session.sessionId);
	}

	async destroySession(sessionId: string): Promise<void> {
		const session = this.sessions[sessionId];
		await this.store.unregister(sessionId);
		delete this.sessions[sessionId];
		await session?.server.close().catch(() => {});
	}

	getSession(sessionId: string): SessionInfo | undefined {
		return this.sessions[sessionId];
	}

	getTransport(sessionId: string): McpTransport | undefined {
		return this.sessions[sessionId]?.transport;
	}

	getServer(sessionId: string): Server | undefined {
		return this.sessions[sessionId]?.server;
	}

	async isSessionValid(sessionId: string): Promise<boolean> {
		return await this.store.validate(sessionId);
	}

	getTools(sessionId: string): Tool[] | undefined {
		return this.store.getTools(sessionId);
	}

	setTools(sessionId: string, tools: Tool[]): void {
		this.store.setTools(sessionId, tools);
	}

	setStore(store: SessionStore): void {
		this.store = store;
	}

	getStore(): SessionStore {
		return this.store;
	}
}
