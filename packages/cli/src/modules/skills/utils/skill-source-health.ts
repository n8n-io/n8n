import type { SkillSourceHealth } from '@n8n/api-types';

type StoredSourceAccess = {
	credentialRequired: boolean;
	credentialId: string | null;
	lastErrorReason: string | null;
};

/**
 * Whether a credential can be set on the source. A source without a credential qualifies once
 * a check fails: a credential deleted before `credentialRequired` existed left a private source
 * that looks public, and a credential is the only repair that keeps its skills.
 */
export function canTakeCredential(source: StoredSourceAccess): boolean {
	return (
		source.credentialRequired || source.credentialId !== null || source.lastErrorReason !== null
	);
}

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
			return 'source_unavailable';
		case 'rate_limited':
			return 'delayed';
		default:
			return 'source_unavailable';
	}
}
