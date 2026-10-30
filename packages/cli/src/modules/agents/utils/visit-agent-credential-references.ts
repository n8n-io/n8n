import {
	AI_GATEWAY_MANAGED_TAG,
	MANAGED_CREDENTIAL_TOKEN,
	SUB_AGENT_TASK_DIFFICULTIES,
} from '@n8n/api-types';
import { isRecord } from '@n8n/utils/is-record';

interface CredentialReference {
	id: string;
	path: string[];
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
	{ path: ['mcpServers', '[]', 'credential'], managedToken: AI_GATEWAY_MANAGED_TAG },
	{ path: ['vectorStores', '[]', 'credential'] },
	{ path: ['vectorStores', '[]', 'embedding', 'credential'] },
	{ path: ['tools', '[]', 'node', 'credentials', '*', 'id'] },
];

function visitLocation(
	value: unknown,
	[key, ...rest]: string[],
	visit: CredentialVisitor,
	managedToken?: string,
	path: string[] = [],
): void {
	if (key === '[]') {
		if (Array.isArray(value)) {
			for (const [index, entry] of value.entries())
				visitLocation(entry, rest, visit, managedToken, [...path, String(index)]);
		}
		return;
	}

	if (!isRecord(value)) return;

	if (key === '*') {
		for (const [name, entry] of Object.entries(value))
			visitLocation(entry, rest, visit, managedToken, [...path, name]);
		return;
	}

	if (rest.length > 0) {
		visitLocation(value[key], rest, visit, managedToken, [...path, key]);
		return;
	}

	const id = value[key];
	if (typeof id === 'string') {
		visit({
			id,
			path: [...path, key],
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
