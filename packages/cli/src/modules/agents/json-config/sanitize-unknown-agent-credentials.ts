import { MANAGED_CREDENTIAL_TOKEN } from '@n8n/api-types';

function clearUnknownCredentialId(
	credentialId: unknown,
	accessibleCredentialIds: ReadonlySet<string>,
	allowManagedCredentialToken = false,
): unknown {
	if (typeof credentialId !== 'string' || credentialId === '') {
		return credentialId;
	}

	if (allowManagedCredentialToken && credentialId === MANAGED_CREDENTIAL_TOKEN) {
		return credentialId;
	}

	return accessibleCredentialIds.has(credentialId) ? credentialId : '';
}

function isManagedEpisodicMemoryCredentialPath(path: readonly string[]): boolean {
	return path.join('.') === 'memory.episodicMemory.credential';
}

function sanitizeUnknownCredentialsInValue(
	value: unknown,
	accessibleCredentialIds: ReadonlySet<string>,
	path: readonly string[] = [],
): unknown {
	if (Array.isArray(value)) {
		return value.map((entry) =>
			sanitizeUnknownCredentialsInValue(entry, accessibleCredentialIds, path),
		);
	}

	if (typeof value !== 'object' || value === null) {
		return value;
	}

	const record = value as Record<string, unknown>;
	const sanitized: Record<string, unknown> = {};

	for (const [key, entry] of Object.entries(record)) {
		const nextPath = [...path, key];
		if (key === 'credential' && typeof entry === 'string') {
			sanitized[key] = clearUnknownCredentialId(
				entry,
				accessibleCredentialIds,
				isManagedEpisodicMemoryCredentialPath(nextPath),
			);
			continue;
		}

		if (key === 'credentialId' && typeof entry === 'string') {
			sanitized[key] = clearUnknownCredentialId(entry, accessibleCredentialIds);
			continue;
		}

		if (
			key === 'credentials' &&
			typeof entry === 'object' &&
			entry !== null &&
			!Array.isArray(entry)
		) {
			sanitized[key] = Object.fromEntries(
				Object.entries(entry as Record<string, unknown>).map(([credType, credRef]) => {
					if (typeof credRef !== 'object' || credRef === null || Array.isArray(credRef)) {
						return [credType, credRef];
					}

					const credentialRef = credRef as Record<string, unknown>;
					if (!('id' in credentialRef) || typeof credentialRef.id !== 'string') {
						return [
							credType,
							sanitizeUnknownCredentialsInValue(credentialRef, accessibleCredentialIds, [
								...nextPath,
								credType,
							]),
						];
					}

					return [
						credType,
						{
							...credentialRef,
							id: clearUnknownCredentialId(credentialRef.id, accessibleCredentialIds),
						},
					];
				}),
			);
			continue;
		}

		sanitized[key] = sanitizeUnknownCredentialsInValue(entry, accessibleCredentialIds, nextPath);
	}

	return sanitized;
}

/**
 * Replace credential IDs that are not accessible to the agent project with `""`.
 * Walks the config recursively and only targets credential-like fields:
 * `credential`, `credentialId`, and `credentials.*.id`.
 */
export function sanitizeUnknownAgentCredentials(
	raw: unknown,
	accessibleCredentialIds: ReadonlySet<string>,
): unknown {
	if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
		return raw;
	}

	return sanitizeUnknownCredentialsInValue(raw, accessibleCredentialIds);
}
