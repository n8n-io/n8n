import { randomUUID } from 'node:crypto';

const SESSION_GAP_MS = 30 * 60_000;

export type SessionMap = Map<string, { id: string; lastSeen: number }>;

/**
 * Calls with the same key and less than 30 minutes between them are one session.
 */
// ponytail: time-gap heuristic in memory. Two agents with the same key and client
// merge, and a restart starts new sessions. Upgrade: issue an Mcp-Session-Id header
// on `initialize` and read it back.
export function resolveSessionId(sessions: SessionMap, key: string, now = Date.now()): string {
	const current = sessions.get(key);
	const id = current && now - current.lastSeen < SESSION_GAP_MS ? current.id : randomUUID();
	sessions.set(key, { id, lastSeen: now });
	return id;
}
