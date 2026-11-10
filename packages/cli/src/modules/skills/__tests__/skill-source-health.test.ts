import { skillSourceHealth } from '../utils/skill-source-health';

describe('skillSourceHealth', () => {
	it.each([
		[null, 'connected'],
		['credential_invalid', 'credential_expired'],
		['credential_missing', 'credential_expired'],
		['credential_out_of_scope', 'credential_expired'],
		['rate_limited', 'delayed'],
		['unreachable', 'unreachable'],
		['not_found', 'unreachable'],
		['unexpected', 'unreachable'],
	])('shows the health for %s', (reason, expected) => {
		expect(skillSourceHealth(reason)).toBe(expected);
	});
});
