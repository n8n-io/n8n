import { v4 as uuid } from 'uuid';
import type { Session, SessionInfo } from './types';

/**
 * Manages conversation sessions with Claude.
 * Each session is an independent conversation with its own history.
 *
 * NOTE: All sessions are stored in-memory. If the server restarts, all conversations are lost.
 */
export class SessionManager {
	private sessions = new Map<string, Session>();

	/**
	 * Creates a new conversation session
	 */
	createSession(workingDirectory: string): Session {
		const session: Session = {
			id: uuid(),
			messages: [],
			createdAt: new Date(),
			lastActivityAt: new Date(),
			workingDirectory,
		};

		this.sessions.set(session.id, session);
		return session;
	}

	/**
	 * Gets an existing session by ID
	 */
	getSession(id: string): Session | undefined {
		return this.sessions.get(id);
	}

	/**
	 * Updates the last activity timestamp for a session
	 */
	touchSession(id: string): void {
		const session = this.sessions.get(id);
		if (session) {
			session.lastActivityAt = new Date();
		}
	}

	/**
	 * Deletes a session and its history
	 */
	deleteSession(id: string): boolean {
		return this.sessions.delete(id);
	}

	/**
	 * Gets summary info for all active sessions
	 */
	getAllSessions(): SessionInfo[] {
		return Array.from(this.sessions.values()).map((session) => ({
			id: session.id,
			createdAt: session.createdAt,
			lastActivityAt: session.lastActivityAt,
			messageCount: session.messages.length,
			workingDirectory: session.workingDirectory,
		}));
	}

	/**
	 * Cleans up sessions that have been inactive for more than the specified duration
	 */
	cleanupInactiveSessions(maxInactiveMs: number): number {
		const now = Date.now();
		let cleaned = 0;

		for (const [id, session] of this.sessions.entries()) {
			const inactiveMs = now - session.lastActivityAt.getTime();
			if (inactiveMs > maxInactiveMs) {
				this.sessions.delete(id);
				cleaned++;
			}
		}

		return cleaned;
	}
}
