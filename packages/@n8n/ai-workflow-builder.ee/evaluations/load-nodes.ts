import { readFileSync, existsSync } from 'fs';
import { jsonParse, type INodeTypeDescription } from 'n8n-workflow';
import { join } from 'path';

interface NodeWithVersion extends INodeTypeDescription {
	version: number | number[];
	defaultVersion?: number;
}

// These types are ignored because they tend to cause issues when generating workflows
// Same as in ai-workflow-builder-agent.service.ts
const IGNORED_TYPES = new Set([
	'@n8n/n8n-nodes-langchain.toolVectorStore',
	'@n8n/n8n-nodes-langchain.documentGithubLoader',
	'@n8n/n8n-nodes-langchain.code',
]);

// Parse disabled nodes from environment variable (comma-separated)
function getDisabledNodes(): Set<string> {
	const disabledNodesEnv = process.env.N8N_EVALS_DISABLED_NODES ?? '';
	return new Set(
		disabledNodesEnv
			.split(',')
			.map((s) => s.trim())
			.filter(Boolean),
	);
}

/**
 * Filter node types similar to production service:
 * - Remove ignored types (hardcoded)
 * - Remove disabled types (from env var)
 * - Remove hidden nodes (except DataTable)
 * - Merge tool nodes with their non-tool counterparts
 */
function filterNodeTypes(
	nodeTypes: INodeTypeDescription[],
	disabledNodes: Set<string>,
): INodeTypeDescription[] {
	const visibleNodeTypes = nodeTypes.filter(
		(nodeType) =>
			!IGNORED_TYPES.has(nodeType.name) &&
			!disabledNodes.has(nodeType.name) &&
			// Filter out hidden nodes, except for the Data Table node which has custom hiding logic
			(nodeType.hidden !== true || nodeType.name === 'n8n-nodes-base.dataTable'),
	);

	return visibleNodeTypes.map((nodeType) => {
		// If the node type is a tool, merge it with the corresponding non-tool node type
		const isTool = nodeType.name.endsWith('Tool');
		if (!isTool) return nodeType;

		const nonToolNode = nodeTypes.find((nt) => nt.name === nodeType.name.replace('Tool', ''));
		if (!nonToolNode) return nodeType;

		return { ...nonToolNode, ...nodeType };
	});
}

export function loadNodesFromFile(): INodeTypeDescription[] {
	const nodesPath = join(__dirname, 'nodes.json');

	if (!existsSync(nodesPath)) {
		throw new Error(
			`nodes.json not found at ${nodesPath}. ` +
				'Run n8n and export node definitions to evaluations/nodes.json',
		);
	}

	const nodesData = readFileSync(nodesPath, 'utf-8');
	const allNodes = jsonParse<NodeWithVersion[]>(nodesData);

	// Group nodes by name and select latest version
	const nodesByName = new Map<string, NodeWithVersion[]>();
	for (const node of allNodes) {
		const existing = nodesByName.get(node.name) ?? [];
		existing.push(node);
		nodesByName.set(node.name, existing);
	}

	const latestNodes: INodeTypeDescription[] = [];
	for (const [, versions] of nodesByName.entries()) {
		if (versions.length > 1) {
			// Find the node that matches the default version
			const selectedNode = versions.find(
				(node) =>
					node.defaultVersion !== undefined &&
					(Array.isArray(node.version)
						? node.version.includes(node.defaultVersion)
						: node.version === node.defaultVersion),
			);
			latestNodes.push(selectedNode ?? versions[0]);
		} else {
			latestNodes.push(versions[0]);
		}
	}

	// Apply filtering (ignored types, disabled nodes, hidden nodes, tool merging)
	const disabledNodes = getDisabledNodes();
	return filterNodeTypes(latestNodes, disabledNodes);
}
