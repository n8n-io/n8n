import type { CredentialListItem, CredentialProvider } from '@n8n/agents';
import type { INodeProperties } from 'n8n-workflow';

import type { LoadNodesAndCredentials } from '@/load-nodes-and-credentials';

export interface ToolDescriptor {
	/** Human-readable display name, e.g. "HTTP Request" */
	displayName: string;
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
	const availableCredTypes =
		availableCreds.length > 0 ? new Set(availableCreds.map((cred) => cred.type)) : undefined;

	const seen = new Set<string>();
	const descriptors: ToolDescriptor[] = [];

	for (const node of nodes) {
		if (!node.usableAsTool) continue;
		if (seen.has(node.name)) continue;
		seen.add(node.name);

		const credentialSlots = (node.credentials ?? []).map((credDef) => credDef.name);

		const hasCredentials =
			availableCredTypes === undefined
				? true
				: credentialSlots.length === 0 ||
					credentialSlots.some((credType) => availableCredTypes.has(credType));

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

/**
 * Score a tool descriptor against a query string.
 *
 * Token overlap between query tokens and displayName (weight 2×) + description
 * (weight 1×), normalised to [0, 1]. Returns 1 when the query is empty so all
 * tools pass the minScore filter.
 */
function scoreToolRelevance(query: string, tool: ToolDescriptor): number {
	if (!query.trim()) return 1;

	const queryTokens = new Set(query.toLowerCase().split(/\W+/).filter(Boolean));
	if (queryTokens.size === 0) return 1;

	const nameTokens = tool.displayName.toLowerCase().split(/\W+/).filter(Boolean);
	const descTokens = tool.description.toLowerCase().split(/\W+/).filter(Boolean);

	let hits = 0;
	for (const token of nameTokens) if (queryTokens.has(token)) hits += 2;
	for (const token of descTokens) if (queryTokens.has(token)) hits += 1;

	const maxScore = queryTokens.size * (2 + 1);
	return Math.min(hits / maxScore, 1);
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
