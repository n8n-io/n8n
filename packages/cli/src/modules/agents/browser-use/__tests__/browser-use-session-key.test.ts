import { browserSessionKeyFor } from '../browser-use-session-key';

describe('browserSessionKeyFor', () => {
	it('returns null when the run has no resource identity', () => {
		expect(browserSessionKeyFor('agent-1', undefined)).toBeNull();
		expect(browserSessionKeyFor('agent-1', '')).toBeNull();
	});

	it('is stable for the same agent and resource', () => {
		const first = browserSessionKeyFor('agent-1', 'integration:slack:U123');
		const second = browserSessionKeyFor('agent-1', 'integration:slack:U123');

		expect(first).toEqual(second);
	});

	it('separates end users, agents, and channels', () => {
		const slackUser = browserSessionKeyFor('agent-1', 'integration:slack:U123');
		const otherSlackUser = browserSessionKeyFor('agent-1', 'integration:slack:U999');
		const otherAgent = browserSessionKeyFor('agent-2', 'integration:slack:U123');
		const previewUser = browserSessionKeyFor('agent-1', 'draft-chat:U123');

		expect(new Set([slackUser, otherSlackUser, otherAgent, previewUser]).size).toBe(4);
	});

	// The key becomes a tmpdir() path segment inside the session service, which
	// does not sanitise it.
	it('produces a key that is safe as a filesystem path segment', () => {
		const key = browserSessionKeyFor('agent-1', 'integration:slack:../../etc/passwd');

		expect(key).toMatch(/^agents-[0-9a-f]{32}$/);
	});
});
