import { AI_GATEWAY_MANAGED_TAG, MANAGED_CREDENTIAL_TOKEN } from '@n8n/api-types';

const MANAGED_CREDENTIAL_IDS = new Set<string>([MANAGED_CREDENTIAL_TOKEN, AI_GATEWAY_MANAGED_TAG]);

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function addCredentialId(value: unknown, credentialIds: Set<string>): void {
	if (typeof value === 'string' && value !== '' && !MANAGED_CREDENTIAL_IDS.has(value)) {
		credentialIds.add(value);
	}
}

function collectCredentialIds(value: unknown, credentialIds: Set<string>): void {
	if (Array.isArray(value)) {
		for (const entry of value) collectCredentialIds(entry, credentialIds);
		return;
	}

	if (!isRecord(value)) return;

	for (const [key, entry] of Object.entries(value)) {
		if (key === 'credential' || key === 'credentialId') {
			addCredentialId(entry, credentialIds);
		} else if (key === 'credentials' && isRecord(entry)) {
			for (const credentialReference of Object.values(entry)) {
				if (isRecord(credentialReference)) {
					addCredentialId(credentialReference.id, credentialIds);
				}
			}
		}

		collectCredentialIds(entry, credentialIds);
	}
}

export function extractAgentCredentialIds(value: unknown): Set<string> {
	const credentialIds = new Set<string>();
	collectCredentialIds(value, credentialIds);
	return credentialIds;
}
