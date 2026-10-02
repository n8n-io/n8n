import { AI_GATEWAY_MANAGED_TAG, MANAGED_CREDENTIAL_TOKEN } from '@n8n/api-types';
import { isRecord } from '@n8n/utils/is-record';

const MANAGED_CREDENTIAL_IDS = new Set<string>([MANAGED_CREDENTIAL_TOKEN, AI_GATEWAY_MANAGED_TAG]);

const DEFAULT_ID_KEYS: ReadonlySet<string> = new Set(['credential', 'credentialId']);

/**
 * Key set for an agent config that comes from node parameters. An agent config
 * references credentials through `credential` and `credentials.*.id` only, while
 * a node parameter named `credentialId` holds an id on a remote instance — for
 * example in the n8n node. Collecting it there gives a false match.
 */
export const AGENT_CONFIG_ID_KEYS: ReadonlySet<string> = new Set(['credential']);

function addCredentialId(value: unknown, credentialIds: Set<string>): void {
	if (typeof value === 'string' && value !== '' && !MANAGED_CREDENTIAL_IDS.has(value)) {
		credentialIds.add(value);
	}
}

function collectCredentialIds(
	value: unknown,
	credentialIds: Set<string>,
	idKeys: ReadonlySet<string>,
): void {
	if (Array.isArray(value)) {
		for (const entry of value) collectCredentialIds(entry, credentialIds, idKeys);
		return;
	}

	if (!isRecord(value)) return;

	for (const [key, entry] of Object.entries(value)) {
		if (idKeys.has(key)) {
			addCredentialId(entry, credentialIds);
		} else if (key === 'credentials' && isRecord(entry)) {
			for (const credentialReference of Object.values(entry)) {
				if (isRecord(credentialReference)) {
					addCredentialId(credentialReference.id, credentialIds);
				}
			}
		}

		collectCredentialIds(entry, credentialIds, idKeys);
	}
}

export function extractAgentCredentialIds(
	value: unknown,
	idKeys: ReadonlySet<string> = DEFAULT_ID_KEYS,
): Set<string> {
	const credentialIds = new Set<string>();
	collectCredentialIds(value, credentialIds, idKeys);
	return credentialIds;
}
