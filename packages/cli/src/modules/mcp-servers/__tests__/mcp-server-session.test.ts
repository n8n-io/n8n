import { resolveSessionId, type SessionMap } from '../mcp-server-session';

const MINUTE = 60_000;

describe('resolveSessionId', () => {
	it('should keep one id while calls are less than 30 minutes apart', () => {
		const sessions: SessionMap = new Map();
		const first = resolveSessionId(sessions, 'a', 0);
		expect(resolveSessionId(sessions, 'a', 20 * MINUTE)).toBe(first);
		// The gap counts from the last call, not from the first one.
		expect(resolveSessionId(sessions, 'a', 45 * MINUTE)).toBe(first);
	});

	it('should start a new id after a 30 minute gap', () => {
		const sessions: SessionMap = new Map();
		const first = resolveSessionId(sessions, 'a', 0);
		expect(resolveSessionId(sessions, 'a', 30 * MINUTE)).not.toBe(first);
	});

	it('should give each key its own id', () => {
		const sessions: SessionMap = new Map();
		expect(resolveSessionId(sessions, 'a', 0)).not.toBe(resolveSessionId(sessions, 'b', 0));
	});
});
