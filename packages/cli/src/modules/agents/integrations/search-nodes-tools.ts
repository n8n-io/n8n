import type { CredentialListItem, CredentialProvider } from '@n8n/agents';
import { sublimeSearch } from '@n8n/utils';
import type { INodeProperties, INodeTypeDescription } from 'n8n-workflow';

export interface NodeDescriptor {
	/** Human-readable display name, e.g. "HTTP Request" */
	displayName: string;
	/** Human-readable description, e.g. "Makes HTTP requests to any URL" */
	description: string;
	/** Node type identifier, e.g. 'n8n-nodes-base.httpRequest' */
	nodeType: string;
	/** The primary version number to use when executing this node. */
	nodeTypeVersion: number;
	/** Whether the user has at least one credential configured for this node. */
	hasCredentials: boolean;
	/** Configured credentials for this node, ready to use in run_node_tool */
	credentials: CredentialListItem[];
}

/**
 * Search keys and weights used by sublimeSearch, ordered by importance.
 * Includes codex aliases (e.g. "REST", "API") so common alternative names match.
 *
 * Inspired by the node search approach in `NodeSearchEngine` (ai-workflow-builder).
 */
const NODE_SEARCH_KEYS = [
	{ key: 'displayName', weight: 1.5 },
	{ key: 'name', weight: 1.3 },
	{ key: 'codex.alias', weight: 1.0 },
	{ key: 'description', weight: 0.7 },
];

const UI_ONLY_TYPES = new Set([
	'notice',
	'callout',
	'button',
	'hidden',
	'icon',
	'curlImport',
	'workflowSelector',
	'credentialsSelect',
	'credentials',
]);

/**
 * Returns the raw `INodeProperties[]` for a node type, filtered to remove
 * UI-only and node-setting entries that are irrelevant to an LLM agent.
 * Returns `undefined` if the node is not found or not usable as a tool.
 */
export function getNodeSchema(
	nodes: INodeTypeDescription[],
	nodeType: string,
): INodeProperties[] | undefined {
	const node = nodes.find((n) => n.usableAsTool && n.name === nodeType);
	if (!node) return undefined;
	return node.properties.filter((prop) => !UI_ONLY_TYPES.has(prop.type) && !prop.isNodeSetting);
}

function getLatestVersion(version: number | number[]): number {
	return Array.isArray(version) ? Math.max(...version) : version;
}

/**
 * Deduplicates nodes by name, keeping the highest version of each.
 */
function dedupeNodes(nodes: INodeTypeDescription[]): INodeTypeDescription[] {
	const seen = new Map<string, INodeTypeDescription>();
	for (const node of nodes) {
		const existing = seen.get(node.name);
		if (!existing || getLatestVersion(node.version) > getLatestVersion(existing.version)) {
			seen.set(node.name, node);
		}
	}
	return [...seen.values()];
}

function toDescriptor(
	node: INodeTypeDescription,
	credsByType: Map<string, CredentialListItem>,
): NodeDescriptor {
	const nodeTypeVersion = getLatestVersion(node.version);
	const credentialSlots = (node.credentials ?? []).map((credDef) => credDef.name);
	const credentials = credentialSlots.flatMap((type) => {
		const cred = credsByType.get(type);
		return cred ? [cred] : [];
	});
	return {
		displayName: node.displayName,
		description: node.description,
		nodeType: node.name,
		nodeTypeVersion,
		hasCredentials: credentials.length > 0,
		credentials,
	};
}

/**
 * Returns descriptors for all nodes flagged as `usableAsTool`, deduplicated
 * by node type (highest version wins). When a `credentialProvider` is given,
 * each descriptor is populated with the credentials the user has configured
 * for that node.
 */
export async function listNodes(
	nodes: INodeTypeDescription[],
	credentialProvider?: CredentialProvider,
): Promise<NodeDescriptor[]> {
	const availableCreds = credentialProvider ? await credentialProvider.list() : [];
	const credsByType = new Map(availableCreds.map((cred) => [cred.type, cred]));
	return dedupeNodes(nodes.filter((n) => n.usableAsTool)).map((node) =>
		toDescriptor(node, credsByType),
	);
}

/**
 * Returns node descriptors relevant to `query`, ranked by relevance and
 * trimmed to `topK`. When `query` is empty, all nodes are returned up to `topK`.
 *
 * Uses `sublimeSearch` (character-level fuzzy matching with bonuses for
 * sequential, camelCase, and separator patterns) across `displayName`, `name`,
 * `codex.alias`, and `description`. Search approach inspired by `NodeSearchEngine`
 * in the ai-workflow-builder package.
 */
export async function searchNodes(
	nodes: INodeTypeDescription[],
	query: string,
	credentialProvider?: CredentialProvider,
	{ topK = 10 }: { topK?: number; minScore?: number } = {},
): Promise<NodeDescriptor[]> {
	const availableCreds = credentialProvider ? await credentialProvider.list() : [];
	const credsByType = new Map(availableCreds.map((cred) => [cred.type, cred]));
	const usableNodes = dedupeNodes(nodes.filter((n) => n.usableAsTool));

	if (!query.trim()) {
		return usableNodes.slice(0, topK).map((node) => toDescriptor(node, credsByType));
	}

	return sublimeSearch(query, usableNodes, NODE_SEARCH_KEYS)
		.slice(0, topK)
		.map(({ item }) => toDescriptor(item, credsByType));
}
