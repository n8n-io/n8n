import type { CredentialListItem, CredentialProvider } from '@n8n/agents';
import type { INodeProperties } from 'n8n-workflow';

import type { LoadNodesAndCredentials } from '@/load-nodes-and-credentials';

export interface ToolDescriptor {
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
	/** Configured credentials for this tool, ready to use in run_node_tool */
	credentials: CredentialListItem[];
}

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
export async function getNodeSchema(
	lnc: LoadNodesAndCredentials,
	nodeType: string,
): Promise<INodeProperties[] | undefined> {
	const { nodes } = await lnc.collectTypes();
	const node = nodes.find((n) => n.usableAsTool && n.name === nodeType);
	if (!node) return undefined;
	return node.properties.filter((prop) => !UI_ONLY_TYPES.has(prop.type) && !prop.isNodeSetting);
}

/**
 * Returns descriptors for all nodes flagged as `usableAsTool`, deduplicated
 * by node type. Credentials are filtered to those available via the optional
 * `credentialProvider`.
 *
 * Calls `collectTypes()` each time — types are not held in memory.
 */
export async function listTools(
	lnc: LoadNodesAndCredentials,
	credentialProvider?: CredentialProvider,
): Promise<ToolDescriptor[]> {
	const { nodes } = await lnc.collectTypes();

	const availableCreds = credentialProvider ? await credentialProvider.list() : [];

	// When a credential provider is present, build a Set of available credential types.
	// Using undefined when there is no provider signals "no filtering" to the loop below.
	const availableCredTypes = credentialProvider
		? new Set(availableCreds.map((cred) => cred.type))
		: undefined;

	const seen = new Set<string>();
	const descriptors: ToolDescriptor[] = [];

	for (const node of nodes) {
		if (!node.usableAsTool) continue;
		if (seen.has(node.name)) continue;
		seen.add(node.name);

		const credentialSlots = (node.credentials ?? []).map((credDef) => credDef.name);

		const hasCredentials =
			availableCredTypes === undefined ||
			credentialSlots.length === 0 ||
			credentialSlots.some((credType) => availableCredTypes.has(credType));

		// When a credential provider is active, hide nodes the user cannot use.
		if (credentialProvider && !hasCredentials) continue;

		const nodeTypeVersion = Array.isArray(node.version)
			? node.version[node.version.length - 1]
			: node.version;

		const credentials = availableCreds.filter((cred) => credentialSlots.includes(cred.type));

		descriptors.push({
			displayName: node.displayName,
			description: node.description,
			nodeType: node.name,
			nodeTypeVersion,
			hasCredentials,
			credentials,
		});
	}

	return descriptors;
}

const NAME_WEIGHT = 2;
const DESC_WEIGHT = 1;

/**
 * Score a tool descriptor against a query string.
 *
 * Iterates over query tokens. Each query token contributes NAME_WEIGHT if it
 * is a prefix of any displayName token, plus DESC_WEIGHT if it is a prefix of
 * any description token. This means each query token can score at most
 * NAME_WEIGHT + DESC_WEIGHT regardless of how many times the word appears in
 * the document, avoiding length bias.
 *
 * Returns a value in [0, 1] where 1 means every query token matched in both
 * fields. Returns 1 for empty queries so all tools pass the minScore filter.
 */
function scoreToolRelevance(query: string, tool: ToolDescriptor): number {
	if (!query.trim()) return 1;

	const queryTokens = [...new Set(query.toLowerCase().split(/\W+/).filter(Boolean))];
	if (queryTokens.length === 0) return 1;

	const nameTokens = tool.displayName.toLowerCase().split(/\W+/).filter(Boolean);
	const descTokens = tool.description.toLowerCase().split(/\W+/).filter(Boolean);

	let hits = 0;
	for (const qToken of queryTokens) {
		if (nameTokens.some((t) => t.startsWith(qToken))) hits += NAME_WEIGHT;
		if (descTokens.some((t) => t.startsWith(qToken))) hits += DESC_WEIGHT;
	}

	const maxScore = queryTokens.length * (NAME_WEIGHT + DESC_WEIGHT);
	return hits / maxScore;
}

/**
 * Returns tool descriptors relevant to `query`, ranked by token overlap and
 * trimmed to `topK`. When `query` is empty all tools are returned up to `topK`.
 *
 * Calls `collectTypes()` each time — types are not held in memory.
 */
export async function searchTools(
	lnc: LoadNodesAndCredentials,
	query: string,
	credentialProvider?: CredentialProvider,
	{ topK = 10, minScore = 0.1 }: { topK?: number; minScore?: number } = {},
): Promise<ToolDescriptor[]> {
	const all = await listTools(lnc, credentialProvider);
	if (!query.trim()) return all.slice(0, topK);

	return all
		.map((tool) => ({ tool, score: scoreToolRelevance(query, tool) }))
		.filter(({ score }) => score >= minScore)
		.sort((a, b) => b.score - a.score)
		.slice(0, topK)
		.map(({ tool }) => tool);
}
