import { skillSourceHealth } from '../utils/skill-source-health';

describe('skillSourceHealth', () => {
	it.each([
		[null, 'connected'],
		['credential_invalid', 'credential_issue'],
		['credential_missing', 'credential_issue'],
		['credential_out_of_scope', 'credential_issue'],
		['rate_limited', 'delayed'],
		['unreachable', 'unreachable'],
		['not_found', 'source_unavailable'],
		['host_blocked', 'check_failed'],
		['archive_too_large', 'check_failed'],
		['unexpected', 'check_failed'],
		['unknown_reason', 'check_failed'],
	])('shows the health for %s', (reason, expected) => {
		expect(skillSourceHealth(reason)).toBe(expected);
	});
});
