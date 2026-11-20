import { AI_GATEWAY_MANAGED_TAG, MANAGED_CREDENTIAL_TOKEN } from '@n8n/api-types';

import { visitAgentCredentialReferences } from './visit-agent-credential-references';

const MANAGED_CREDENTIAL_IDS = new Set<string>([MANAGED_CREDENTIAL_TOKEN, AI_GATEWAY_MANAGED_TAG]);

export function extractAgentCredentialIds(config: unknown): Set<string> {
	const credentialIds = new Set<string>();
	visitAgentCredentialReferences(config, ({ id }) => {
		if (id !== '' && !MANAGED_CREDENTIAL_IDS.has(id)) credentialIds.add(id);
	});
	return credentialIds;
}
