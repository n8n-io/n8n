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

type CredentialVisitor = (id: string, replace: (id: string) => void) => void;

function visitCredentialId(
	record: Record<string, unknown>,
	key: string,
	visit: CredentialVisitor,
): void {
	const value = record[key];
	if (typeof value === 'string' && value !== '' && !MANAGED_CREDENTIAL_IDS.has(value)) {
		visit(value, (id) => {
			record[key] = id;
		});
	}
}

export function visitAgentCredentialIds(
	value: unknown,
	visit: CredentialVisitor,
	idKeys: ReadonlySet<string> = DEFAULT_ID_KEYS,
): void {
	if (Array.isArray(value)) {
		for (const entry of value) visitAgentCredentialIds(entry, visit, idKeys);
		return;
	}

	if (!isRecord(value)) return;

	for (const [key, entry] of Object.entries(value)) {
		if (idKeys.has(key)) {
			visitCredentialId(value, key, visit);
		} else if (key === 'credentials' && isRecord(entry)) {
			for (const credentialReference of Object.values(entry)) {
				if (isRecord(credentialReference)) {
					visitCredentialId(credentialReference, 'id', visit);
				}
			}
		}

		visitAgentCredentialIds(entry, visit, idKeys);
	}
}

export function extractAgentCredentialIds(
	value: unknown,
	idKeys: ReadonlySet<string> = DEFAULT_ID_KEYS,
): Set<string> {
	const credentialIds = new Set<string>();
	visitAgentCredentialIds(
		value,
		(id) => {
			credentialIds.add(id);
		},
		idKeys,
	);
	return credentialIds;
}
