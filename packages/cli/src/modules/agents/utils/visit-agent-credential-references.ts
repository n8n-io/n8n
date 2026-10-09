import {
	AI_GATEWAY_MANAGED_TAG,
	MANAGED_CREDENTIAL_TOKEN,
	SUB_AGENT_TASK_DIFFICULTIES,
} from '@n8n/api-types';
import { isRecord } from '@n8n/utils/is-record';

interface CredentialReference {
	id: string;
	setId: (id: string) => void;
	managedToken?: string;
}

type CredentialVisitor = (reference: CredentialReference) => void;

interface CredentialLocation {
	path: string[];
	managedToken?: string;
}

// Only these fields refer to local credentials. Tool inputs and node parameters are opaque.
const CREDENTIAL_LOCATIONS: CredentialLocation[] = [
	{ path: ['credential'], managedToken: AI_GATEWAY_MANAGED_TAG },
	{ path: ['memory', 'episodicMemory', 'credential'], managedToken: MANAGED_CREDENTIAL_TOKEN },
	{
		path: ['memory', 'observationalMemory', 'observerModel', 'credential'],
		managedToken: AI_GATEWAY_MANAGED_TAG,
	},
	{
		path: ['memory', 'observationalMemory', 'reflectorModel', 'credential'],
		managedToken: AI_GATEWAY_MANAGED_TAG,
	},
	{
		path: ['memory', 'episodicMemory', 'reflectorModel', 'credential'],
		managedToken: AI_GATEWAY_MANAGED_TAG,
	},
	...SUB_AGENT_TASK_DIFFICULTIES.map((difficulty) => ({
		path: ['subAgents', 'modelsByDifficulty', difficulty, 'credential'],
		managedToken: AI_GATEWAY_MANAGED_TAG,
	})),
	{ path: ['config', 'webSearch', 'credential'], managedToken: AI_GATEWAY_MANAGED_TAG },
	{ path: ['integrations', '[]', 'credentialId'] },
	{ path: ['mcpServers', '[]', 'credential'] },
	{ path: ['vectorStores', '[]', 'credential'] },
	{ path: ['vectorStores', '[]', 'embedding', 'credential'] },
	{ path: ['tools', '[]', 'node', 'credentials', '*', 'id'] },
];

function visitLocation(
	value: unknown,
	[key, ...rest]: string[],
	visit: CredentialVisitor,
	managedToken?: string,
): void {
	if (key === '[]') {
		if (Array.isArray(value)) {
			for (const entry of value) visitLocation(entry, rest, visit, managedToken);
		}
		return;
	}

	if (!isRecord(value)) return;

	if (key === '*') {
		for (const entry of Object.values(value)) visitLocation(entry, rest, visit, managedToken);
		return;
	}

	if (rest.length > 0) {
		visitLocation(value[key], rest, visit, managedToken);
		return;
	}

	const id = value[key];
	if (typeof id === 'string') {
		visit({
			id,
			managedToken,
			setId: (nextId) => {
				value[key] = nextId;
			},
		});
	}
}

export function visitAgentCredentialReferences(config: unknown, visit: CredentialVisitor): void {
	for (const { path, managedToken } of CREDENTIAL_LOCATIONS) {
		visitLocation(config, path, visit, managedToken);
	}
}
