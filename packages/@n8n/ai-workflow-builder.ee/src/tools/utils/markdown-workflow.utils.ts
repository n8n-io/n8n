import { MAX_NODE_EXAMPLE_CHARS } from '@/constants';
import type { NodeConfigurationsMap, WorkflowMetadata } from '@/types';

/**
 * Options for mermaid diagram generation
 */
export interface MermaidOptions {
	/** Include node type in comments (default: true) */
	includeNodeType?: boolean;
	/** Include node parameters in comments (default: true) */
	includeNodeParameters?: boolean;
	/** Include node name in node definition (default: true) */
	includeNodeName?: boolean;
	/** Collect node configurations while processing (default: false) */
	collectNodeConfigurations?: boolean;
}

/**
 * Result of mermaid stringification with optional node configurations
 */
export interface MermaidResult {
	mermaid: string;
	nodeConfigurations: NodeConfigurationsMap;
}

const DEFAULT_MERMAID_OPTIONS: Required<MermaidOptions> = {
	includeNodeType: true,
	includeNodeParameters: true,
	includeNodeName: true,
	collectNodeConfigurations: false,
};

/**
 * Result from buildMermaidLines including collected configurations
 */
interface BuildMermaidResult {
	lines: string[];
	nodeConfigurations: NodeConfigurationsMap;
}

type WorkflowNode = WorkflowMetadata['workflow']['nodes'][number];
type WorkflowConnections = WorkflowMetadata['workflow']['connections'];

/**
 * Create a mapping of node names to short IDs (n1, n2, n3...)
 */
function createNodeIdMap(nodes: WorkflowNode[]): Map<string, string> {
	const nodeIdMap = new Map<string, string>();
	nodes.forEach((node, idx) => {
		nodeIdMap.set(node.name, `n${idx + 1}`);
	});
	return nodeIdMap;
}

/**
 * Find all nodes that have incoming main connections
 */
function findNodesWithIncomingConnections(connections: WorkflowConnections): Set<string> {
	const nodesWithIncoming = new Set<string>();
	Object.values(connections)
		.filter((conn) => conn.main)
		.forEach((sourceConnections) => {
			for (const connArray of sourceConnections.main) {
				if (!connArray) {
					continue;
				}
				for (const conn of connArray) {
					nodesWithIncoming.add(conn.node);
				}
			}
		});
	return nodesWithIncoming;
}

/**
 * Format a connection line for mermaid output
 */
function formatConnectionLine(sourceId: string, targetId: string, connType: string): string {
	return connType === 'main'
		? `    ${sourceId} --> ${targetId}`
		: `    ${sourceId} -.${connType}.-> ${targetId}`;
}

/**
 * Extract all connection lines from a node's connections
 */
function extractNodeConnectionLines(
	nodeConns: WorkflowConnections[string],
	sourceId: string,
	nodeIdMap: Map<string, string>,
): string[] {
	return Object.entries(nodeConns).flatMap(([connType, connList]) =>
		connList
			.filter((connArray): connArray is NonNullable<typeof connArray> => connArray !== null)
			.flatMap((connArray) =>
				connArray
					.map((conn) => {
						const targetId = nodeIdMap.get(conn.node);
						return targetId ? formatConnectionLine(sourceId, targetId, connType) : null;
					})
					.filter((line): line is string => line !== null),
			),
	);
}

/**
 * Get all target node names from main connections
 */
function getMainConnectionTargets(nodeConns: WorkflowConnections[string]): string[] {
	if (!nodeConns.main) return [];
	return nodeConns.main
		.filter((connArray): connArray is NonNullable<typeof connArray> => connArray !== null)
		.flatMap((connArray) => connArray.map((conn) => conn.node));
}

/**
 * Build connection lines by traversing the workflow graph
 */
function buildConnectionLines(
	connections: WorkflowConnections,
	nodeIdMap: Map<string, string>,
	startNodes: WorkflowNode[],
): string[] {
	const visited = new Set<string>();
	const outputConnections: string[] = [];

	function traverse(nodeName: string) {
		if (visited.has(nodeName)) return;
		visited.add(nodeName);

		const nodeConns = connections[nodeName];
		if (!nodeConns) return;

		const sourceId = nodeIdMap.get(nodeName);
		if (!sourceId) return;

		outputConnections.push(...extractNodeConnectionLines(nodeConns, sourceId, nodeIdMap));
		getMainConnectionTargets(nodeConns).forEach((target) => traverse(target));
	}

	startNodes.forEach((node) => traverse(node.name));
	return outputConnections;
}

/**
 * Collect node configuration if it meets size requirements
 */
function maybeCollectNodeConfiguration(
	node: WorkflowNode,
	nodeConfigurations: NodeConfigurationsMap,
): void {
	const hasParams = Object.keys(node.parameters).length > 0;
	if (!hasParams) return;

	const parametersStr = JSON.stringify(node.parameters);
	if (parametersStr.length <= MAX_NODE_EXAMPLE_CHARS) {
		if (!nodeConfigurations[node.type]) {
			nodeConfigurations[node.type] = [];
		}
		nodeConfigurations[node.type].push({
			version: node.typeVersion,
			parameters: node.parameters,
		});
	}
}

/**
 * Build node definition lines (comments and node declarations)
 */
function buildNodeDefinitionLines(
	nodes: WorkflowNode[],
	nodeIdMap: Map<string, string>,
	options: Required<MermaidOptions>,
	nodeConfigurations: NodeConfigurationsMap,
): string[] {
	const lines: string[] = [];

	for (const node of nodes) {
		const id = nodeIdMap.get(node.name);
		if (!id) continue;

		const hasParams = Object.keys(node.parameters).length > 0;

		if (options.collectNodeConfigurations) {
			maybeCollectNodeConfiguration(node, nodeConfigurations);
		}

		if (options.includeNodeType || options.includeNodeParameters) {
			const typePart = options.includeNodeType ? node.type : '';
			const paramsPart =
				options.includeNodeParameters && hasParams ? ` | ${JSON.stringify(node.parameters)}` : '';

			if (typePart || paramsPart) {
				lines.push(`    %% ${typePart}${paramsPart}`);
			}
		}

		if (options.includeNodeName) {
			lines.push(`    ${id}["${node.name.replace(/"/g, "'")}"]`);
		} else {
			lines.push(`    ${id}`);
		}
	}

	return lines;
}

/**
 * Build a Mermaid flowchart from workflow nodes and connections
 */
function buildMermaidLines(
	nodes: WorkflowMetadata['workflow']['nodes'],
	connections: WorkflowConnections,
	options: Required<MermaidOptions> = DEFAULT_MERMAID_OPTIONS,
	existingConfigurations?: NodeConfigurationsMap,
): BuildMermaidResult {
	const regularNodes = nodes.filter((n) => n.type !== 'n8n-nodes-base.stickyNote');
	const nodeConfigurations: NodeConfigurationsMap = existingConfigurations ?? {};

	const nodeIdMap = createNodeIdMap(regularNodes);
	const nodesWithIncoming = findNodesWithIncomingConnections(connections);
	const startNodes = regularNodes.filter((n) => !nodesWithIncoming.has(n.name));

	const connectionLines = buildConnectionLines(connections, nodeIdMap, startNodes);
	const nodeDefinitionLines = buildNodeDefinitionLines(
		regularNodes,
		nodeIdMap,
		options,
		nodeConfigurations,
	);

	const lines = ['```mermaid', 'flowchart TD', ...nodeDefinitionLines, ...connectionLines, '```'];

	return { lines, nodeConfigurations };
}

/**
 * Generates a Mermaid flowchart diagram from a workflow
 */
export function mermaidStringify(workflow: WorkflowMetadata, options?: MermaidOptions): string {
	const { workflow: wf } = workflow;
	const mergedOptions: Required<MermaidOptions> = {
		...DEFAULT_MERMAID_OPTIONS,
		...options,
	};
	const result = buildMermaidLines(wf.nodes, wf.connections, mergedOptions);
	return result.lines.join('\n');
}

/**
 * Process multiple workflows and generate mermaid diagrams while collecting node configurations
 * This is more efficient than calling mermaidStringify and extractNodeConfigurations separately
 */
export function processWorkflowExamples(
	workflows: WorkflowMetadata[],
	options?: Omit<MermaidOptions, 'collectNodeConfigurations'>,
): MermaidResult[] {
	const mergedOptions: Required<MermaidOptions> = {
		...DEFAULT_MERMAID_OPTIONS,
		...options,
		collectNodeConfigurations: true,
	};

	// Accumulate configurations across all workflows
	const allConfigurations: NodeConfigurationsMap = {};

	const results: MermaidResult[] = workflows.map((workflow) => {
		const { workflow: wf } = workflow;
		const result = buildMermaidLines(wf.nodes, wf.connections, mergedOptions, allConfigurations);
		return {
			mermaid: result.lines.join('\n'),
			nodeConfigurations: result.nodeConfigurations,
		};
	});

	return results;
}

/**
 * Generates sticky notes section from a workflow
 */
export function stickyNotesStringify(workflow: WorkflowMetadata): string {
	const { workflow: wf } = workflow;
	const stickyNotes = wf.nodes.filter((node) => node.type === 'n8n-nodes-base.stickyNote');

	if (stickyNotes.length === 0) {
		return '';
	}

	const lines: string[] = [];
	for (const note of stickyNotes) {
		const content = note.parameters.content;
		if (typeof content === 'string' && content) {
			// Indent continuation lines so they appear as part of the bullet
			const contentLines = content.trim().split('\n');
			const indentedContent = contentLines
				.map((line, idx) => (idx === 0 ? `- ${line}` : `  ${line}`))
				.join('\n');
			lines.push(indentedContent);
		}
	}

	return lines.join('\n');
}
