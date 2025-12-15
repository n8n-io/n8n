import type { NodeConfigurationsMap, WorkflowMetadata } from '@/types';

import {
	collectSingleNodeConfiguration,
	addNodeConfigurationToMap,
} from './node-configuration.utils';

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

/** Node types that represent conditional/branching logic (rendered as diamond shape) */
const CONDITIONAL_NODE_TYPES = new Set([
	'n8n-nodes-base.if',
	'n8n-nodes-base.switch',
	'n8n-nodes-base.filter',
]);

type WorkflowNode = WorkflowMetadata['workflow']['nodes'][number];
type WorkflowConnections = WorkflowMetadata['workflow']['connections'];

/** Default node dimensions when checking sticky overlap */
const DEFAULT_NODE_WIDTH = 100;
const DEFAULT_NODE_HEIGHT = 100;

/** Default sticky dimensions */
const DEFAULT_STICKY_WIDTH = 150;
const DEFAULT_STICKY_HEIGHT = 80;

/**
 * Represents a sticky note with its bounds and content
 */
interface StickyBounds {
	node: WorkflowNode;
	x: number;
	y: number;
	width: number;
	height: number;
	content: string;
}

/**
 * Result of categorizing sticky notes by their overlap with regular nodes
 */
interface StickyOverlapResult {
	/** Stickies that don't overlap any nodes */
	noOverlap: StickyBounds[];
	/** Map of node name to the sticky that overlaps only that node */
	singleNodeOverlap: Map<string, StickyBounds>;
	/** Stickies that overlap multiple nodes, with their overlapping node names */
	multiNodeOverlap: Array<{ sticky: StickyBounds; nodeNames: string[] }>;
}

/**
 * Check if a node's position falls within sticky bounds
 */
function isNodeWithinStickyBounds(nodeX: number, nodeY: number, sticky: StickyBounds): boolean {
	// Node center point should be within sticky bounds
	const nodeCenterX = nodeX + DEFAULT_NODE_WIDTH / 2;
	const nodeCenterY = nodeY + DEFAULT_NODE_HEIGHT / 2;

	return (
		nodeCenterX >= sticky.x &&
		nodeCenterX <= sticky.x + sticky.width &&
		nodeCenterY >= sticky.y &&
		nodeCenterY <= sticky.y + sticky.height
	);
}

/**
 * Extract sticky bounds from a sticky note node
 */
function extractStickyBounds(node: WorkflowNode): StickyBounds {
	const width =
		typeof node.parameters.width === 'number' ? node.parameters.width : DEFAULT_STICKY_WIDTH;
	const height =
		typeof node.parameters.height === 'number' ? node.parameters.height : DEFAULT_STICKY_HEIGHT;
	const content = typeof node.parameters.content === 'string' ? node.parameters.content.trim() : '';

	return {
		node,
		x: node.position[0],
		y: node.position[1],
		width,
		height,
		content,
	};
}

/**
 * Find which regular nodes overlap with each sticky note
 */
function categorizeStickyOverlaps(
	stickyNotes: WorkflowNode[],
	regularNodes: WorkflowNode[],
): StickyOverlapResult {
	const result: StickyOverlapResult = {
		noOverlap: [],
		singleNodeOverlap: new Map(),
		multiNodeOverlap: [],
	};

	for (const sticky of stickyNotes) {
		const bounds = extractStickyBounds(sticky);
		if (!bounds.content) continue; // Skip stickies without content

		const overlappingNodes = regularNodes.filter((node) =>
			isNodeWithinStickyBounds(node.position[0], node.position[1], bounds),
		);

		if (overlappingNodes.length === 0) {
			result.noOverlap.push(bounds);
		} else if (overlappingNodes.length === 1) {
			result.singleNodeOverlap.set(overlappingNodes[0].name, bounds);
		} else {
			result.multiNodeOverlap.push({
				sticky: bounds,
				nodeNames: overlappingNodes.map((n) => n.name),
			});
		}
	}

	return result;
}

/**
 * Format sticky content as a mermaid comment
 */
function formatStickyComment(content: string, indent: string = '    '): string {
	// Replace newlines and clean up content for single-line comment
	const cleanContent = content.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
	return `${indent}%% ${cleanContent}`;
}

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
 * Get all target node info from connections (all connection types)
 */
function getConnectionTargets(
	nodeConns: WorkflowConnections[string],
): Array<{ nodeName: string; connType: string }> {
	const targets: Array<{ nodeName: string; connType: string }> = [];
	for (const [connType, connList] of Object.entries(nodeConns)) {
		for (const connArray of connList) {
			if (!connArray) continue;
			for (const conn of connArray) {
				targets.push({ nodeName: conn.node, connType });
			}
		}
	}
	return targets;
}

/**
 * Get all target node names from main connections only (for traversal)
 */
function getMainConnectionTargets(nodeConns: WorkflowConnections[string]): string[] {
	if (!nodeConns.main) return [];
	return nodeConns.main
		.filter((connArray): connArray is NonNullable<typeof connArray> => connArray !== null)
		.flatMap((connArray) => connArray.map((conn) => conn.node));
}

/**
 * Collect node configuration if it meets size requirements
 * Uses utility function from node-configuration.utils.ts
 */
function maybeCollectNodeConfiguration(
	node: WorkflowNode,
	nodeConfigurations: NodeConfigurationsMap,
): void {
	const config = collectSingleNodeConfiguration(node);
	if (config) {
		addNodeConfigurationToMap(node.type, config, nodeConfigurations);
	}
}

/**
 * Build the node definition string (just the node part, e.g., n1["Name"] or n1{"Name"})
 */
function buildNodeDefinition(
	node: WorkflowNode,
	id: string,
	options: Required<MermaidOptions>,
): string {
	const isConditional = CONDITIONAL_NODE_TYPES.has(node.type);
	if (options.includeNodeName) {
		const escapedName = node.name.replace(/"/g, "'");
		// Use {} for conditional nodes (diamond shape), [] for regular nodes
		return isConditional ? `${id}{"${escapedName}"}` : `${id}["${escapedName}"]`;
	}
	return id;
}

/**
 * Build comment lines for a node (type and parameters)
 */
function buildNodeCommentLines(
	node: WorkflowNode,
	options: Required<MermaidOptions>,
	nodeConfigurations: NodeConfigurationsMap,
	indent: string = '    ',
): string[] {
	const lines: string[] = [];
	const hasParams = Object.keys(node.parameters).length > 0;

	if (options.collectNodeConfigurations) {
		maybeCollectNodeConfiguration(node, nodeConfigurations);
	}

	if (options.includeNodeType || options.includeNodeParameters) {
		let typePart = '';
		if (options.includeNodeType) {
			// Build type string with optional resource/operation
			const parts = [node.type];
			const resource = node.parameters.resource;
			const operation = node.parameters.operation;
			if (typeof resource === 'string' && resource) {
				parts.push(resource);
			}
			if (typeof operation === 'string' && operation) {
				parts.push(operation);
			}
			typePart = parts.join(':');
		}
		const paramsPart =
			options.includeNodeParameters && hasParams ? ` | ${JSON.stringify(node.parameters)}` : '';

		if (typePart || paramsPart) {
			lines.push(`${indent}%% ${typePart}${paramsPart}`);
		}
	}

	return lines;
}

/**
 * Build lines for a single node definition (type comment and node declaration)
 * Used for standalone node definitions (start nodes, disconnected nodes)
 */
function buildSingleNodeLines(
	node: WorkflowNode,
	id: string,
	options: Required<MermaidOptions>,
	nodeConfigurations: NodeConfigurationsMap,
	indent: string = '    ',
): string[] {
	const lines = buildNodeCommentLines(node, options, nodeConfigurations, indent);
	lines.push(`${indent}${buildNodeDefinition(node, id, options)}`);
	return lines;
}

/**
 * Context for building mermaid output with inline node definitions
 */
interface MermaidBuildContext {
	nodes: WorkflowNode[];
	nodeIdMap: Map<string, string>;
	nodeByName: Map<string, WorkflowNode>;
	options: Required<MermaidOptions>;
	nodeConfigurations: NodeConfigurationsMap;
	stickyOverlaps: StickyOverlapResult;
	nodesInSubgraphs: Set<string>;
	definedNodes: Set<string>;
	lines: string[];
}

/**
 * Add node definition lines (comments + definition) for a node if not already defined
 * Returns the node definition string for use in connections (with name only if first time)
 */
function defineNodeIfNeeded(
	nodeName: string,
	ctx: MermaidBuildContext,
	indent: string = '    ',
): string {
	const node = ctx.nodeByName.get(nodeName);
	const id = ctx.nodeIdMap.get(nodeName);
	if (!node || !id) return id ?? '';

	if (!ctx.definedNodes.has(nodeName)) {
		ctx.definedNodes.add(nodeName);

		// Check if this node has a single-node sticky overlap
		const stickyForNode = ctx.stickyOverlaps.singleNodeOverlap.get(nodeName);
		if (stickyForNode) {
			ctx.lines.push(formatStickyComment(stickyForNode.content, indent));
		}

		// Add type/params comment
		ctx.lines.push(...buildNodeCommentLines(node, ctx.options, ctx.nodeConfigurations, indent));

		// Return full node definition (with name)
		return buildNodeDefinition(node, id, ctx.options);
	}

	// Node already defined, just return the ID
	return id;
}

/**
 * Build connection line with inline target node definition
 */
function buildConnectionWithInlineTarget(
	sourceNodeName: string,
	targetNodeName: string,
	connType: string,
	ctx: MermaidBuildContext,
	indent: string = '    ',
): void {
	const sourceId = ctx.nodeIdMap.get(sourceNodeName);
	const targetId = ctx.nodeIdMap.get(targetNodeName);
	if (!sourceId || !targetId) return;

	// Get target node definition (with name if first time)
	const targetDef = defineNodeIfNeeded(targetNodeName, ctx, indent);

	// Build connection line
	const arrow = connType === 'main' ? '-->' : `-.${connType}.->`;
	ctx.lines.push(`${indent}${sourceId} ${arrow} ${targetDef}`);
}

/**
 * Build mermaid lines by traversing the workflow graph
 * Nodes are defined inline at first usage
 */
function buildInlineMermaidLines(
	_nodes: WorkflowNode[],
	connections: WorkflowConnections,
	startNodes: WorkflowNode[],
	ctx: MermaidBuildContext,
	indent: string = '    ',
): void {
	const visited = new Set<string>();

	function traverse(nodeName: string) {
		if (visited.has(nodeName)) return;
		visited.add(nodeName);

		const nodeConns = connections[nodeName];

		// Get all connection targets
		const targets = nodeConns ? getConnectionTargets(nodeConns) : [];

		// Output connections with inline target definitions
		for (const { nodeName: targetName, connType } of targets) {
			// Skip connections to/from subgraphs (handled separately)
			if (ctx.nodesInSubgraphs.has(targetName) || ctx.nodesInSubgraphs.has(nodeName)) continue;
			buildConnectionWithInlineTarget(nodeName, targetName, connType, ctx, indent);
		}

		// Continue traversal through main connections (skip subgraph nodes)
		if (nodeConns) {
			getMainConnectionTargets(nodeConns)
				.filter((target) => !ctx.nodesInSubgraphs.has(target))
				.forEach((target) => traverse(target));
		}
	}

	// Process each start node
	for (const startNode of startNodes) {
		// Skip start nodes in subgraphs
		if (ctx.nodesInSubgraphs.has(startNode.name)) continue;

		// Define the start node standalone (it has no incoming connection)
		const id = ctx.nodeIdMap.get(startNode.name);
		if (id && !ctx.definedNodes.has(startNode.name)) {
			// Check if this node has a single-node sticky overlap
			const stickyForNode = ctx.stickyOverlaps.singleNodeOverlap.get(startNode.name);
			if (stickyForNode) {
				ctx.lines.push(formatStickyComment(stickyForNode.content, indent));
			}
			ctx.lines.push(
				...buildSingleNodeLines(startNode, id, ctx.options, ctx.nodeConfigurations, indent),
			);
			ctx.definedNodes.add(startNode.name);
		}

		traverse(startNode.name);
	}
}

/**
 * Build subgraph sections for multi-node sticky overlaps
 * Only includes internal connections within the subgraph
 */
function buildSubgraphSections(connections: WorkflowConnections, ctx: MermaidBuildContext): void {
	for (const { sticky, nodeNames } of ctx.stickyOverlaps.multiNodeOverlap) {
		// Create a safe subgraph ID from sticky content
		const subgraphId = `sg_${sticky.node.id?.replace(/-/g, '_') ?? nodeNames.join('_')}`;
		const subgraphLabel = sticky.content.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();

		ctx.lines.push(formatStickyComment(sticky.content));
		ctx.lines.push(`    subgraph ${subgraphId}["${subgraphLabel.replace(/"/g, "'")}"]`);

		const subgraphNodeSet = new Set(nodeNames);

		// Find start nodes within this subgraph (nodes without incoming connections from within the subgraph)
		const nodesWithInternalIncoming = new Set<string>();
		for (const nodeName of nodeNames) {
			const nodeConns = connections[nodeName];
			if (!nodeConns) continue;
			const targets = getConnectionTargets(nodeConns);
			for (const { nodeName: targetName } of targets) {
				if (subgraphNodeSet.has(targetName)) {
					nodesWithInternalIncoming.add(targetName);
				}
			}
		}

		const subgraphStartNodes = nodeNames
			.filter((name) => !nodesWithInternalIncoming.has(name))
			.map((name) => ctx.nodeByName.get(name))
			.filter((node): node is WorkflowNode => node !== undefined);

		// Track nodes defined within this subgraph
		const subgraphDefinedNodes = new Set<string>();

		// Define start nodes in subgraph
		for (const startNode of subgraphStartNodes) {
			const id = ctx.nodeIdMap.get(startNode.name);
			if (id && !subgraphDefinedNodes.has(startNode.name)) {
				ctx.lines.push(
					...buildSingleNodeLines(startNode, id, ctx.options, ctx.nodeConfigurations, '        '),
				);
				subgraphDefinedNodes.add(startNode.name);
			}
		}

		// Build internal connections only (both source and target in subgraph)
		const visited = new Set<string>();

		function traverseSubgraph(nodeName: string) {
			if (visited.has(nodeName)) return;
			visited.add(nodeName);

			const nodeConns = connections[nodeName];
			if (!nodeConns) return;

			const sourceId = ctx.nodeIdMap.get(nodeName);
			if (!sourceId) return;

			const targets = getConnectionTargets(nodeConns);
			for (const { nodeName: targetName, connType } of targets) {
				// Only include connections where target is also in subgraph
				if (!subgraphNodeSet.has(targetName)) continue;

				const targetId = ctx.nodeIdMap.get(targetName);
				if (!targetId) continue;

				const targetNode = ctx.nodeByName.get(targetName);
				if (!targetNode) continue;

				const arrow = connType === 'main' ? '-->' : `-.${connType}.->`;

				if (!subgraphDefinedNodes.has(targetName)) {
					// Define target inline
					ctx.lines.push(
						...buildNodeCommentLines(targetNode, ctx.options, ctx.nodeConfigurations, '        '),
					);
					ctx.lines.push(
						`        ${sourceId} ${arrow} ${buildNodeDefinition(targetNode, targetId, ctx.options)}`,
					);
					subgraphDefinedNodes.add(targetName);
				} else {
					ctx.lines.push(`        ${sourceId} ${arrow} ${targetId}`);
				}
			}

			// Continue traversal
			getMainConnectionTargets(nodeConns)
				.filter((t) => subgraphNodeSet.has(t))
				.forEach((t) => traverseSubgraph(t));
		}

		subgraphStartNodes.forEach((n) => traverseSubgraph(n.name));

		// Mark all subgraph nodes as defined in main context
		for (const name of nodeNames) {
			ctx.definedNodes.add(name);
		}

		ctx.lines.push('    end');
	}
}

/**
 * Build connections from outside nodes to subgraph nodes
 */
function buildConnectionsToSubgraphs(
	connections: WorkflowConnections,
	ctx: MermaidBuildContext,
): void {
	for (const nodeName of ctx.definedNodes) {
		if (ctx.nodesInSubgraphs.has(nodeName)) continue;

		const nodeConns = connections[nodeName];
		if (!nodeConns) continue;

		const targets = getConnectionTargets(nodeConns);
		for (const { nodeName: targetName, connType } of targets) {
			if (ctx.nodesInSubgraphs.has(targetName)) {
				// Connection from outside to subgraph node
				const sourceId = ctx.nodeIdMap.get(nodeName);
				const targetId = ctx.nodeIdMap.get(targetName);
				if (sourceId && targetId) {
					const arrow = connType === 'main' ? '-->' : `-.${connType}.->`;
					ctx.lines.push(`    ${sourceId} ${arrow} ${targetId}`);
				}
			}
		}
	}
}

/**
 * Build connections from subgraph nodes to outside nodes, and continue traversal
 */
function buildConnectionsFromSubgraphs(
	connections: WorkflowConnections,
	ctx: MermaidBuildContext,
): void {
	// Queue of nodes to process (starting from subgraph exit points)
	const nodesToProcess: string[] = [];

	// First, output direct connections from subgraph nodes
	for (const nodeName of ctx.nodesInSubgraphs) {
		const nodeConns = connections[nodeName];
		if (!nodeConns) continue;

		const targets = getConnectionTargets(nodeConns);
		for (const { nodeName: targetName, connType } of targets) {
			if (!ctx.nodesInSubgraphs.has(targetName)) {
				// Connection from subgraph to outside node
				const sourceId = ctx.nodeIdMap.get(nodeName);
				const targetId = ctx.nodeIdMap.get(targetName);
				if (sourceId && targetId) {
					const arrow = connType === 'main' ? '-->' : `-.${connType}.->`;
					// Define target if needed
					if (!ctx.definedNodes.has(targetName)) {
						const targetNode = ctx.nodeByName.get(targetName);
						if (targetNode) {
							const stickyForNode = ctx.stickyOverlaps.singleNodeOverlap.get(targetName);
							if (stickyForNode) {
								ctx.lines.push(formatStickyComment(stickyForNode.content));
							}
							ctx.lines.push(
								...buildNodeCommentLines(targetNode, ctx.options, ctx.nodeConfigurations),
							);
							ctx.lines.push(
								`    ${sourceId} ${arrow} ${buildNodeDefinition(targetNode, targetId, ctx.options)}`,
							);
							ctx.definedNodes.add(targetName);
							// Add to process queue so we continue from this node
							if (connType === 'main') {
								nodesToProcess.push(targetName);
							}
						}
					} else {
						ctx.lines.push(`    ${sourceId} ${arrow} ${targetId}`);
					}
				}
			}
		}
	}

	// Continue traversing from nodes reached via subgraph exits
	const visited = new Set<string>();

	function continueTraversal(nodeName: string) {
		if (visited.has(nodeName) || ctx.nodesInSubgraphs.has(nodeName)) return;
		visited.add(nodeName);

		const nodeConns = connections[nodeName];
		if (!nodeConns) return;

		const targets = getConnectionTargets(nodeConns);
		for (const { nodeName: targetName, connType } of targets) {
			if (ctx.nodesInSubgraphs.has(targetName)) continue;

			const sourceId = ctx.nodeIdMap.get(nodeName);
			const targetId = ctx.nodeIdMap.get(targetName);
			if (!sourceId || !targetId) continue;

			const arrow = connType === 'main' ? '-->' : `-.${connType}.->`;

			if (!ctx.definedNodes.has(targetName)) {
				const targetNode = ctx.nodeByName.get(targetName);
				if (targetNode) {
					const stickyForNode = ctx.stickyOverlaps.singleNodeOverlap.get(targetName);
					if (stickyForNode) {
						ctx.lines.push(formatStickyComment(stickyForNode.content));
					}
					ctx.lines.push(...buildNodeCommentLines(targetNode, ctx.options, ctx.nodeConfigurations));
					ctx.lines.push(
						`    ${sourceId} ${arrow} ${buildNodeDefinition(targetNode, targetId, ctx.options)}`,
					);
					ctx.definedNodes.add(targetName);
				}
			} else {
				ctx.lines.push(`    ${sourceId} ${arrow} ${targetId}`);
			}
		}

		// Continue through main connections
		getMainConnectionTargets(nodeConns)
			.filter((t) => !ctx.nodesInSubgraphs.has(t))
			.forEach((t) => continueTraversal(t));
	}

	nodesToProcess.forEach((n) => continueTraversal(n));
}

/**
 * Build a Mermaid flowchart from workflow nodes and connections
 */
function buildMermaidChart(
	nodes: WorkflowMetadata['workflow']['nodes'],
	connections: WorkflowConnections,
	options: Required<MermaidOptions> = DEFAULT_MERMAID_OPTIONS,
	existingConfigurations?: NodeConfigurationsMap,
): {
	lines: string[];
	nodeConfigurations: NodeConfigurationsMap;
} {
	const regularNodes = nodes.filter((n) => n.type !== 'n8n-nodes-base.stickyNote');
	const stickyNotes = nodes.filter((n) => n.type === 'n8n-nodes-base.stickyNote');
	const nodeConfigurations: NodeConfigurationsMap = existingConfigurations ?? {};

	const nodeIdMap = createNodeIdMap(regularNodes);
	const nodeByName = new Map(regularNodes.map((n) => [n.name, n]));
	const nodesWithIncoming = findNodesWithIncomingConnections(connections);
	const startNodes = regularNodes.filter((n) => !nodesWithIncoming.has(n.name));

	// Categorize sticky notes by their overlap with regular nodes
	const stickyOverlaps = categorizeStickyOverlaps(stickyNotes, regularNodes);

	// Track which nodes are in multi-node subgraphs
	const nodesInSubgraphs = new Set<string>();
	for (const { nodeNames } of stickyOverlaps.multiNodeOverlap) {
		for (const name of nodeNames) {
			nodesInSubgraphs.add(name);
		}
	}

	// Build context for mermaid generation
	const ctx: MermaidBuildContext = {
		nodes: regularNodes,
		nodeIdMap,
		nodeByName,
		options,
		nodeConfigurations,
		stickyOverlaps,
		nodesInSubgraphs,
		definedNodes: new Set(),
		lines: [],
	};

	// Add comments for stickies that don't overlap any nodes
	for (const sticky of stickyOverlaps.noOverlap) {
		ctx.lines.push(formatStickyComment(sticky.content));
	}

	// Build main flow with inline node definitions
	buildInlineMermaidLines(regularNodes, connections, startNodes, ctx);

	// Build subgraph sections
	buildSubgraphSections(connections, ctx);

	// Build connections to/from subgraphs
	buildConnectionsToSubgraphs(connections, ctx);
	buildConnectionsFromSubgraphs(connections, ctx);

	const lines = ['```mermaid', 'flowchart TD', ...ctx.lines, '```'];

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
	const result = buildMermaidChart(wf.nodes, wf.connections, mergedOptions);
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
		const result = buildMermaidChart(wf.nodes, wf.connections, mergedOptions, allConfigurations);
		return {
			mermaid: result.lines.join('\n'),
			nodeConfigurations: result.nodeConfigurations,
		};
	});

	return results;
}
