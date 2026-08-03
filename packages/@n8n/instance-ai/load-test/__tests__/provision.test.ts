import { describe, expect, it } from 'vitest';

import { extractInviteToken, userEmail } from '../provision';

describe('extractInviteToken', () => {
	it('pulls the token out of a real-shaped invite URL', () => {
		expect(
			extractInviteToken('http://localhost:5678/signup?inviterId=abc&inviteeId=def&token=tok-123'),
		).toBe('tok-123');
	});

	it('works regardless of param order or host', () => {
		expect(extractInviteToken('https://n8n.example.com/signup?token=t1&inviterId=x')).toBe('t1');
	});

	it('returns undefined when there is no token', () => {
		expect(extractInviteToken('http://localhost:5678/signup?inviterId=abc')).toBeUndefined();
		expect(extractInviteToken('http://localhost:5678/signup?token=')).toBeUndefined();
	});

	it('returns undefined for a missing, empty or malformed URL', () => {
		expect(extractInviteToken(undefined)).toBeUndefined();
		expect(extractInviteToken('')).toBeUndefined();
		// An already-accepted invite omits inviteAcceptUrl entirely; a garbage
		// value must degrade to "no token" rather than throw mid-provision.
		expect(extractInviteToken('not a url')).toBeUndefined();
	});
});

describe('userEmail', () => {
	it('zero-pads so identities sort naturally', () => {
		expect(userEmail(0)).toBe('loadtest-u000@n8n.local');
		expect(userEmail(7)).toBe('loadtest-u007@n8n.local');
		expect(userEmail(49)).toBe('loadtest-u049@n8n.local');
	});

	it('is deterministic — this is what makes reuse-first work', () => {
		expect(userEmail(3)).toBe(userEmail(3));
	});

	it('applies a suffix for fresh identities', () => {
		expect(userEmail(3, 'abc123')).toBe('loadtest-u003-abc123@n8n.local');
	});

	it('produces distinct addresses per index', () => {
		const emails = new Set(Array.from({ length: 50 }, (_, i) => userEmail(i)));
		expect(emails.size).toBe(50);
	});
});
