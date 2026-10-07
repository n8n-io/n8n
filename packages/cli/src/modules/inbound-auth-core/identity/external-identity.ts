import type { Logger } from '@n8n/backend-common';
import type { ClaimMapping, ExternalIdentity, Result } from '@n8n/inbound-auth';

export function translateClaims(
	claims: Readonly<Record<string, unknown>>,
	mapping: ClaimMapping,
	logger: Logger,
): Result<ExternalIdentity> {
	throw new Error('not implemented');
}
