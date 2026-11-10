import type { SkillSourceHealth } from '@n8n/api-types';

/** Checks store reason codes. Derive health from them so existing check results also show it. */
export function skillSourceHealth(errorReason: string | null): SkillSourceHealth {
	switch (errorReason) {
		case null:
			return 'connected';
		case 'credential_invalid':
		case 'credential_missing':
		case 'credential_out_of_scope':
			return 'credential_issue';
		case 'not_found':
			return 'source_unavailable';
		case 'unreachable':
			return 'unreachable';
		case 'rate_limited':
			return 'delayed';
		default:
			return 'check_failed';
	}
}
