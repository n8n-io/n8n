import { skillSourceHealth } from '../utils/skill-source-health';

describe('skillSourceHealth', () => {
	it.each([
		[null, 'connected'],
		['credential_invalid', 'credential_issue'],
		['credential_missing', 'credential_issue'],
		['credential_out_of_scope', 'credential_issue'],
		['rate_limited', 'delayed'],
		['unreachable', 'source_unavailable'],
		['not_found', 'source_unavailable'],
		['host_blocked', 'source_unavailable'],
		['archive_too_large', 'source_unavailable'],
		['unexpected', 'source_unavailable'],
		['unknown_reason', 'source_unavailable'],
	])('shows the health for %s', (reason, expected) => {
		expect(skillSourceHealth(reason)).toBe(expected);
	});
});
