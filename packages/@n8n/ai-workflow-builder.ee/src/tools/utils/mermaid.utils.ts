import type { NodeConfigurationsMap, WorkflowMetadata } from '@/types';

import {
	collectSingleNodeConfiguration,
	addNodeConfigurationToMap,
} from './node-configuration.utils';

/**
 * Input type for mermaidStringify when you only have workflow data
 * without full template metadata.
 * The workflow object must have nodes and connections, name is optional.
 */
export interface MermaidWorkflowInput {
	workflow: {
		name?: string;
		nodes: WorkflowMetadata['workflow']['nodes'];
		connections: WorkflowMetadata['workflow']['connections'];
	};
}

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
	/** Include node UUID in comments for Builder/Configurator reference (default: true) */
	includeNodeId?: boolean;
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
	includeNodeId: true,
	collectNodeConfigurations: false,
};

/** Node types that represent conditional/branching logic (rendered as diamond shape) */
const CONDITIONAL_NODE_TYPES = new Set([
	'n8n-nodes-base.if',
	'n8n-nodes-base.switch',
	'n8n-nodes-base.filter',
]);

/** Node type for AI agents that should be wrapped in subgraphs */
const AGENT_NODE_TYPE = '@n8n/n8n-nodes-langchain.agent';
const STICKY_NOTE_TYPE = 'n8n-nodes-base.stickyNote';

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
	noOverlap: StickyBounds[];
	singleNodeOverlap: Map<string, StickyBounds>;
	multiNodeOverlap: Array<{ sticky: StickyBounds; nodeNames: string[] }>;
}

/**
 * Represents an agent node with its AI-connected nodes for subgraph grouping
 */
interface AgentSubgraph {
	agentNode: WorkflowNode;
	aiConnectedNodeNames: string[];
	nestedStickySubgraphs: Array<{ sticky: StickyBounds; nodeNames: string[] }>;
}

/**
 * Builder class for generating Mermaid flowchart diagrams from n8n workflows
 */
class MermaidBuilder {
	private readonly nodes: WorkflowNode[];
	private readonly connections: WorkflowConnections;
	private readonly options: Required<MermaidOptions>;
	private readonly nodeConfigurations: NodeConfigurationsMap;

	private readonly nodeIdMap: Map<string, string>;
	private readonly nodeByName: Map<string, WorkflowNode>;
	private readonly stickyOverlaps: StickyOverlapResult;
	private readonly agentSubgraphs: AgentSubgraph[];
	private readonly nodesInSubgraphs: Set<string>;

	private readonly definedNodes = new Set<string>();
	private readonly lines: string[] = [];
	private subgraphCounter = 0;

	constructor(
		nodes: WorkflowNode[],
		connections: WorkflowConnections,
		options: Required<MermaidOptions>,
		existingConfigurations?: NodeConfigurationsMap,
	) {
		const regularNodes = nodes.filter((n) => n.type !== STICKY_NOTE_TYPE);
		const stickyNotes = nodes.filter((n) => n.type === STICKY_NOTE_TYPE);

		this.nodes = regularNodes;
		this.connections = connections;
		this.options = options;
		this.nodeConfigurations = existingConfigurations ?? {};

		this.nodeIdMap = this.createNodeIdMap();
		this.nodeByName = new Map(regularNodes.map((n) => [n.name, n]));
		this.stickyOverlaps = this.categorizeStickyOverlaps(stickyNotes);

		const nodesInStickySubgraphs = new Set<string>();
		for (const { nodeNames } of this.stickyOverlaps.multiNodeOverlap) {
			for (const name of nodeNames) {
				nodesInStickySubgraphs.add(name);
			}
		}

		this.agentSubgraphs = this.findAgentSubgraphs(nodesInStickySubgraphs);

		this.nodesInSubgraphs = new Set<string>(nodesInStickySubgraphs);
		for (const { agentNode, aiConnectedNodeNames } of this.agentSubgraphs) {
			this.nodesInSubgraphs.add(agentNode.name);
			for (const name of aiConnectedNodeNames) {
				this.nodesInSubgraphs.add(name);
			}
		}
	}

	/**
	 * Build the complete mermaid diagram
	 */
	build(): { lines: string[]; nodeConfigurations: NodeConfigurationsMap } {
		// Add comments for stickies that don't overlap any nodes
		for (const sticky of this.stickyOverlaps.noOverlap) {
			this.lines.push(this.formatStickyComment(sticky.content));
		}

		// Build main flow
		this.buildMainFlow();

		// Build subgraph sections
		this.buildStickySubgraphs();
		this.buildAgentSubgraphs();

		// Build cross-subgraph connections
		this.buildConnectionsToSubgraphs();
		this.buildConnectionsFromSubgraphs();
		this.buildInterSubgraphConnections();

		return {
			lines: ['```mermaid', 'flowchart TD', ...this.lines, '```'],
			nodeConfigurations: this.nodeConfigurations,
		};
	}

	// Initialization helpers

	private createNodeIdMap(): Map<string, string> {
		const map = new Map<string, string>();
		this.nodes.forEach((node, idx) => {
			map.set(node.name, `n${idx + 1}`);
		});
		return map;
	}

	private categorizeStickyOverlaps(stickyNotes: WorkflowNode[]): StickyOverlapResult {
		const result: StickyOverlapResult = {
			noOverlap: [],
			singleNodeOverlap: new Map(),
			multiNodeOverlap: [],
		};

		for (const sticky of stickyNotes) {
			const bounds = this.extractStickyBounds(sticky);
			if (!bounds.content) continue;

			const overlappingNodes = this.nodes.filter((node) =>
				this.isNodeWithinStickyBounds(node.position[0], node.position[1], bounds),
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

	private extractStickyBounds(node: WorkflowNode): StickyBounds {
		return {
			node,
			x: node.position[0],
			y: node.position[1],
			width:
				typeof node.parameters.width === 'number' ? node.parameters.width : DEFAULT_STICKY_WIDTH,
			height:
				typeof node.parameters.height === 'number' ? node.parameters.height : DEFAULT_STICKY_HEIGHT,
			content: typeof node.parameters.content === 'string' ? node.parameters.content.trim() : '',
		};
	}

	private isNodeWithinStickyBounds(nodeX: number, nodeY: number, sticky: StickyBounds): boolean {
		const nodeCenterX = nodeX + DEFAULT_NODE_WIDTH / 2;
		const nodeCenterY = nodeY + DEFAULT_NODE_HEIGHT / 2;
		return (
			nodeCenterX >= sticky.x &&
			nodeCenterX <= sticky.x + sticky.width &&
			nodeCenterY >= sticky.y &&
			nodeCenterY <= sticky.y + sticky.height
		);
	}

	private findAgentSubgraphs(nodesInStickySubgraphs: Set<string>): AgentSubgraph[] {
		const agentSubgraphs: AgentSubgraph[] = [];
		const agentNodes = this.nodes.filter(
			(n) => n.type === AGENT_NODE_TYPE && !nodesInStickySubgraphs.has(n.name),
		);

		const reverseConnections = this.buildReverseConnectionMap();

		for (const agentNode of agentNodes) {
			const incomingConns = reverseConnections.get(agentNode.name) ?? [];

			const aiConnectedNodeNames = incomingConns
				.filter(
					({ connType, sourceName }) =>
						connType !== 'main' && !nodesInStickySubgraphs.has(sourceName),
				)
				.map(({ sourceName }) => sourceName);

			const nestedStickySubgraphs = this.findNestedStickySubgraphs(incomingConns);

			if (aiConnectedNodeNames.length > 0 || nestedStickySubgraphs.length > 0) {
				agentSubgraphs.push({ agentNode, aiConnectedNodeNames, nestedStickySubgraphs });
			}
		}

		return agentSubgraphs;
	}

	private findNestedStickySubgraphs(
		incomingConns: Array<{ sourceName: string; connType: string }>,
	): Array<{ sticky: StickyBounds; nodeNames: string[] }> {
		const nested: Array<{ sticky: StickyBounds; nodeNames: string[] }> = [];

		for (const stickySubgraph of this.stickyOverlaps.multiNodeOverlap) {
			const allNodesConnectToAgent = stickySubgraph.nodeNames.every((nodeName) =>
				incomingConns.some(
					({ sourceName, connType }) => sourceName === nodeName && connType !== 'main',
				),
			);
			if (allNodesConnectToAgent) {
				nested.push(stickySubgraph);
			}
		}

		return nested;
	}

	private buildReverseConnectionMap(): Map<
		string,
		Array<{ sourceName: string; connType: string }>
	> {
		const reverseConnections = new Map<string, Array<{ sourceName: string; connType: string }>>();

		for (const [sourceName, sourceConns] of Object.entries(this.connections)) {
			for (const { nodeName: targetName, connType } of this.getConnectionTargets(sourceConns)) {
				if (!reverseConnections.has(targetName)) {
					reverseConnections.set(targetName, []);
				}
				reverseConnections.get(targetName)!.push({ sourceName, connType });
			}
		}

		return reverseConnections;
	}

	// Connection helpers

	private getConnectionTargets(
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

	private getMainConnectionTargets(nodeConns: WorkflowConnections[string]): string[] {
		if (!nodeConns.main) return [];
		return nodeConns.main
			.filter((connArray): connArray is NonNullable<typeof connArray> => connArray !== null)
			.flatMap((connArray) => connArray.map((conn) => conn.node));
	}

	private findStartNodes(): WorkflowNode[] {
		const nodesWithIncoming = new Set<string>();
		Object.values(this.connections)
			.filter((conn) => conn.main)
			.forEach((sourceConnections) => {
				for (const connArray of sourceConnections.main) {
					if (!connArray) continue;
					for (const conn of connArray) {
						nodesWithIncoming.add(conn.node);
					}
				}
			});
		return this.nodes.filter((n) => !nodesWithIncoming.has(n.name));
	}

	// Node definition helpers

	private formatStickyComment(content: string): string {
		return `%% ${content.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim()}`;
	}

	private getNextSubgraphId(): string {
		this.subgraphCounter++;
		return `sg${this.subgraphCounter}`;
	}

	private buildNodeDefinition(node: WorkflowNode, id: string): string {
		const isConditional = CONDITIONAL_NODE_TYPES.has(node.type);
		if (this.options.includeNodeName) {
			const escapedName = node.name.replace(/"/g, "'");
			return isConditional ? `${id}{"${escapedName}"}` : `${id}["${escapedName}"]`;
		}
		return id;
	}

	private buildNodeCommentLines(node: WorkflowNode): string[] {
		const lines: string[] = [];

		if (this.options.collectNodeConfigurations) {
			const config = collectSingleNodeConfiguration(node);
			if (config) {
				addNodeConfigurationToMap(node.type, config, this.nodeConfigurations);
			}
		}

		if (
			this.options.includeNodeType ||
			this.options.includeNodeParameters ||
			this.options.includeNodeId
		) {
			const idPart = this.options.includeNodeId && node.id ? `[${node.id}] ` : '';
			const typePart = this.options.includeNodeType ? this.buildNodeTypePart(node) : '';
			const paramsPart =
				this.options.includeNodeParameters && Object.keys(node.parameters).length > 0
					? ` | ${JSON.stringify(node.parameters)}`
					: '';

			if (idPart || typePart || paramsPart) {
				lines.push(`%% ${idPart}${typePart}${paramsPart}`);
			}
		}

		return lines;
	}

	private buildNodeTypePart(node: WorkflowNode): string {
		const parts = [node.type];
		if (typeof node.parameters.resource === 'string' && node.parameters.resource) {
			parts.push(node.parameters.resource);
		}
		if (typeof node.parameters.operation === 'string' && node.parameters.operation) {
			parts.push(node.parameters.operation);
		}
		return parts.join(':');
	}

	private buildSingleNodeLines(node: WorkflowNode, id: string): string[] {
		const lines = this.buildNodeCommentLines(node);
		lines.push(this.buildNodeDefinition(node, id));
		return lines;
	}

	private defineNodeIfNeeded(nodeName: string): string {
		const node = this.nodeByName.get(nodeName);
		const id = this.nodeIdMap.get(nodeName);
		if (!node || !id) return id ?? '';

		if (!this.definedNodes.has(nodeName)) {
			this.definedNodes.add(nodeName);

			const stickyForNode = this.stickyOverlaps.singleNodeOverlap.get(nodeName);
			if (stickyForNode) {
				this.lines.push(this.formatStickyComment(stickyForNode.content));
			}

			this.lines.push(...this.buildNodeCommentLines(node));
			return this.buildNodeDefinition(node, id);
		}

		return id;
	}

	/**
	 * Defines target node if not already defined, and adds connection from source.
	 * Returns true if target was newly defined with a 'main' connection type.
	 */
	private defineTargetAndConnect(sourceId: string, targetName: string, connType: string): boolean {
		const targetId = this.nodeIdMap.get(targetName);
		if (!targetId) return false;

		if (!this.definedNodes.has(targetName)) {
			const targetNode = this.nodeByName.get(targetName);
			if (targetNode) {
				const stickyForNode = this.stickyOverlaps.singleNodeOverlap.get(targetName);
				if (stickyForNode) {
					this.lines.push(this.formatStickyComment(stickyForNode.content));
				}
				this.lines.push(...this.buildNodeCommentLines(targetNode));
				this.addConnection(sourceId, this.buildNodeDefinition(targetNode, targetId), connType);
				this.definedNodes.add(targetName);
				return connType === 'main';
			}
		} else {
			this.addConnection(sourceId, targetId, connType);
		}
		return false;
	}

	private addConnection(sourceId: string, targetDef: string, connType: string): void {
		const arrow = connType === 'main' ? '-->' : `-.${connType}.->`;
		this.lines.push(`${sourceId} ${arrow} ${targetDef}`);
	}

	// Main flow building

	private buildMainFlow(): void {
		const visited = new Set<string>();
		const startNodes = this.findStartNodes();

		const traverse = (nodeName: string) => {
			if (visited.has(nodeName)) return;
			visited.add(nodeName);

			const nodeConns = this.connections[nodeName];
			const targets = nodeConns ? this.getConnectionTargets(nodeConns) : [];

			for (const { nodeName: targetName, connType } of targets) {
				if (this.nodesInSubgraphs.has(targetName) || this.nodesInSubgraphs.has(nodeName)) continue;

				const sourceId = this.nodeIdMap.get(nodeName);
				const targetDef = this.defineNodeIfNeeded(targetName);
				if (sourceId) {
					this.addConnection(sourceId, targetDef, connType);
				}
			}

			if (nodeConns) {
				this.getMainConnectionTargets(nodeConns)
					.filter((target) => !this.nodesInSubgraphs.has(target))
					.forEach((target) => traverse(target));
			}
		};

		for (const startNode of startNodes) {
			if (this.nodesInSubgraphs.has(startNode.name)) continue;

			const id = this.nodeIdMap.get(startNode.name);
			if (id && !this.definedNodes.has(startNode.name)) {
				const stickyForNode = this.stickyOverlaps.singleNodeOverlap.get(startNode.name);
				if (stickyForNode) {
					this.lines.push(this.formatStickyComment(stickyForNode.content));
				}
				this.lines.push(...this.buildSingleNodeLines(startNode, id));
				this.definedNodes.add(startNode.name);
			}

			traverse(startNode.name);
		}
	}

	// Sticky subgraph building

	private buildStickySubgraphs(): void {
		const nestedStickyIds = this.getNestedStickyIds();

		for (const { sticky, nodeNames } of this.stickyOverlaps.multiNodeOverlap) {
			if (nestedStickyIds.has(sticky.node.id ?? '')) continue;

			this.buildSingleStickySubgraph(sticky, nodeNames);
		}
	}

	private getNestedStickyIds(): Set<string> {
		const ids = new Set<string>();
		for (const { nestedStickySubgraphs } of this.agentSubgraphs) {
			for (const { sticky } of nestedStickySubgraphs) {
				ids.add(sticky.node.id ?? '');
			}
		}
		return ids;
	}

	private buildSingleStickySubgraph(sticky: StickyBounds, nodeNames: string[]): void {
		const subgraphId = this.getNextSubgraphId();
		const subgraphLabel = sticky.content.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();

		this.lines.push(this.formatStickyComment(sticky.content));
		this.lines.push(`subgraph ${subgraphId}["${subgraphLabel.replace(/"/g, "'")}"]`);

		const subgraphNodeSet = new Set(nodeNames);
		const subgraphDefinedNodes = new Set<string>();

		// Find and define start nodes
		const startNodes = this.findSubgraphStartNodes(nodeNames, subgraphNodeSet);
		for (const startNode of startNodes) {
			const id = this.nodeIdMap.get(startNode.name);
			if (id && !subgraphDefinedNodes.has(startNode.name)) {
				this.lines.push(...this.buildSingleNodeLines(startNode, id));
				subgraphDefinedNodes.add(startNode.name);
			}
		}

		// Build internal connections
		this.buildSubgraphInternalConnections(startNodes, subgraphNodeSet, subgraphDefinedNodes);

		// Mark all as defined
		for (const name of nodeNames) {
			this.definedNodes.add(name);
		}

		this.lines.push('end');
	}

	private findSubgraphStartNodes(
		nodeNames: string[],
		subgraphNodeSet: Set<string>,
	): WorkflowNode[] {
		const nodesWithInternalIncoming = new Set<string>();

		for (const nodeName of nodeNames) {
			const nodeConns = this.connections[nodeName];
			if (!nodeConns) continue;

			for (const { nodeName: targetName } of this.getConnectionTargets(nodeConns)) {
				if (subgraphNodeSet.has(targetName)) {
					nodesWithInternalIncoming.add(targetName);
				}
			}
		}

		return nodeNames
			.filter((name) => !nodesWithInternalIncoming.has(name))
			.map((name) => this.nodeByName.get(name))
			.filter((node): node is WorkflowNode => node !== undefined);
	}

	private buildSubgraphInternalConnections(
		startNodes: WorkflowNode[],
		subgraphNodeSet: Set<string>,
		subgraphDefinedNodes: Set<string>,
	): void {
		const visited = new Set<string>();

		const traverse = (nodeName: string) => {
			if (visited.has(nodeName)) return;
			visited.add(nodeName);

			const nodeConns = this.connections[nodeName];
			if (!nodeConns) return;

			const sourceId = this.nodeIdMap.get(nodeName);
			if (!sourceId) return;

			for (const { nodeName: targetName, connType } of this.getConnectionTargets(nodeConns)) {
				if (!subgraphNodeSet.has(targetName)) continue;

				const targetId = this.nodeIdMap.get(targetName);
				const targetNode = this.nodeByName.get(targetName);
				if (!targetId || !targetNode) continue;

				const arrow = connType === 'main' ? '-->' : `-.${connType}.->`;

				if (!subgraphDefinedNodes.has(targetName)) {
					this.lines.push(...this.buildNodeCommentLines(targetNode));
					this.lines.push(`${sourceId} ${arrow} ${this.buildNodeDefinition(targetNode, targetId)}`);
					subgraphDefinedNodes.add(targetName);
				} else {
					this.lines.push(`${sourceId} ${arrow} ${targetId}`);
				}
			}

			this.getMainConnectionTargets(nodeConns)
				.filter((t) => subgraphNodeSet.has(t))
				.forEach((t) => traverse(t));
		};

		startNodes.forEach((n) => traverse(n.name));
	}

	// Agent subgraph building

	private buildAgentSubgraphs(): void {
		for (const agentSubgraph of this.agentSubgraphs) {
			this.buildSingleAgentSubgraph(agentSubgraph);
		}
	}

	private buildSingleAgentSubgraph(agentSubgraph: AgentSubgraph): void {
		const { agentNode, aiConnectedNodeNames, nestedStickySubgraphs } = agentSubgraph;
		const agentId = this.nodeIdMap.get(agentNode.name);
		if (!agentId) return;

		const subgraphId = this.getNextSubgraphId();
		this.lines.push(`subgraph ${subgraphId}["${agentNode.name.replace(/"/g, "'")}"]`);

		// Define direct AI-connected nodes
		for (const nodeName of aiConnectedNodeNames) {
			this.defineAgentConnectedNode(nodeName);
		}

		// Build nested sticky subgraphs
		for (const { sticky, nodeNames } of nestedStickySubgraphs) {
			this.buildNestedStickySubgraph(sticky, nodeNames);
		}

		// Define agent node and its connections
		this.buildAgentNodeConnections(agentNode, agentId, aiConnectedNodeNames, nestedStickySubgraphs);

		// Mark all as defined
		this.markAgentSubgraphNodesDefined(agentNode, aiConnectedNodeNames, nestedStickySubgraphs);

		this.lines.push('end');
	}

	private defineAgentConnectedNode(nodeName: string): void {
		const node = this.nodeByName.get(nodeName);
		const id = this.nodeIdMap.get(nodeName);
		if (!node || !id) return;

		const stickyForNode = this.stickyOverlaps.singleNodeOverlap.get(nodeName);
		if (stickyForNode) {
			this.lines.push(this.formatStickyComment(stickyForNode.content));
		}

		this.lines.push(...this.buildSingleNodeLines(node, id));
	}

	private buildNestedStickySubgraph(sticky: StickyBounds, nodeNames: string[]): void {
		const nestedSubgraphId = this.getNextSubgraphId();
		const label = sticky.content.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();

		this.lines.push(this.formatStickyComment(sticky.content));
		this.lines.push(`subgraph ${nestedSubgraphId}["${label.replace(/"/g, "'")}"]`);

		for (const nodeName of nodeNames) {
			const node = this.nodeByName.get(nodeName);
			const id = this.nodeIdMap.get(nodeName);
			if (node && id) {
				this.lines.push(...this.buildSingleNodeLines(node, id));
			}
		}

		this.lines.push('end');
	}

	private buildAgentNodeConnections(
		agentNode: WorkflowNode,
		agentId: string,
		aiConnectedNodeNames: string[],
		nestedStickySubgraphs: Array<{ sticky: StickyBounds; nodeNames: string[] }>,
	): void {
		const stickyForAgent = this.stickyOverlaps.singleNodeOverlap.get(agentNode.name);
		if (stickyForAgent) {
			this.lines.push(this.formatStickyComment(stickyForAgent.content));
		}
		this.lines.push(...this.buildNodeCommentLines(agentNode));

		const allAiNodeNames = [
			...aiConnectedNodeNames,
			...nestedStickySubgraphs.flatMap(({ nodeNames }) => nodeNames),
		];

		let agentDefined = false;
		for (const nodeName of allAiNodeNames) {
			const sourceId = this.nodeIdMap.get(nodeName);
			const nodeConns = this.connections[nodeName];
			if (!sourceId || !nodeConns) continue;

			for (const { nodeName: targetName, connType } of this.getConnectionTargets(nodeConns)) {
				if (targetName !== agentNode.name || connType === 'main') continue;

				const arrow = `-.${connType}.->`;
				if (!agentDefined) {
					this.lines.push(`${sourceId} ${arrow} ${this.buildNodeDefinition(agentNode, agentId)}`);
					agentDefined = true;
				} else {
					this.lines.push(`${sourceId} ${arrow} ${agentId}`);
				}
			}
		}

		if (!agentDefined) {
			this.lines.push(this.buildNodeDefinition(agentNode, agentId));
		}
	}

	private markAgentSubgraphNodesDefined(
		agentNode: WorkflowNode,
		aiConnectedNodeNames: string[],
		nestedStickySubgraphs: Array<{ sticky: StickyBounds; nodeNames: string[] }>,
	): void {
		for (const name of aiConnectedNodeNames) {
			this.definedNodes.add(name);
		}
		for (const { nodeNames } of nestedStickySubgraphs) {
			for (const name of nodeNames) {
				this.definedNodes.add(name);
			}
		}
		this.definedNodes.add(agentNode.name);
	}

	// Cross-subgraph connections

	private buildConnectionsToSubgraphs(): void {
		for (const nodeName of this.definedNodes) {
			if (this.nodesInSubgraphs.has(nodeName)) continue;

			const nodeConns = this.connections[nodeName];
			if (!nodeConns) continue;

			for (const { nodeName: targetName, connType } of this.getConnectionTargets(nodeConns)) {
				if (this.nodesInSubgraphs.has(targetName)) {
					const sourceId = this.nodeIdMap.get(nodeName);
					const targetId = this.nodeIdMap.get(targetName);
					if (sourceId && targetId) {
						this.addConnection(sourceId, targetId, connType);
					}
				}
			}
		}
	}

	private buildConnectionsFromSubgraphs(): void {
		const nodesToProcess: string[] = [];

		for (const nodeName of this.nodesInSubgraphs) {
			const nodeConns = this.connections[nodeName];
			if (!nodeConns) continue;

			const sourceId = this.nodeIdMap.get(nodeName);
			if (!sourceId) continue;

			for (const { nodeName: targetName, connType } of this.getConnectionTargets(nodeConns)) {
				if (this.nodesInSubgraphs.has(targetName)) continue;

				const wasNewMainConnection = this.defineTargetAndConnect(sourceId, targetName, connType);
				if (wasNewMainConnection) {
					nodesToProcess.push(targetName);
				}
			}
		}

		this.continueTraversalFromNodes(nodesToProcess);
	}

	private continueTraversalFromNodes(nodesToProcess: string[]): void {
		const visited = new Set<string>();

		const traverse = (nodeName: string) => {
			if (visited.has(nodeName) || this.nodesInSubgraphs.has(nodeName)) return;
			visited.add(nodeName);

			const nodeConns = this.connections[nodeName];
			if (!nodeConns) return;

			const sourceId = this.nodeIdMap.get(nodeName);
			if (!sourceId) return;

			for (const { nodeName: targetName, connType } of this.getConnectionTargets(nodeConns)) {
				if (this.nodesInSubgraphs.has(targetName)) {
					const targetId = this.nodeIdMap.get(targetName);
					if (targetId) {
						this.addConnection(sourceId, targetId, connType);
					}
					continue;
				}

				this.defineTargetAndConnect(sourceId, targetName, connType);
			}

			this.getMainConnectionTargets(nodeConns)
				.filter((t) => !this.nodesInSubgraphs.has(t))
				.forEach((t) => traverse(t));
		};

		nodesToProcess.forEach((n) => traverse(n));
	}

	private buildInterSubgraphConnections(): void {
		const nestedStickyIds = this.getNestedStickyIds();
		const outputConnections = new Set<string>();

		for (const nodeName of this.nodesInSubgraphs) {
			const nodeConns = this.connections[nodeName];
			if (!nodeConns) continue;

			for (const { nodeName: targetName, connType } of this.getConnectionTargets(nodeConns)) {
				if (!this.nodesInSubgraphs.has(targetName)) continue;

				// Skip connections involving nested stickies (handled internally)
				if (this.isInNestedSticky(nodeName, nestedStickyIds)) continue;
				if (this.isInNestedSticky(targetName, nestedStickyIds)) continue;

				const sourceSubgraphId = this.getSubgraphId(nodeName, nestedStickyIds);
				const targetSubgraphId = this.getSubgraphId(targetName, nestedStickyIds);

				// Skip if both nodes are in the same subgraph (connections already handled internally)
				if (sourceSubgraphId === targetSubgraphId) continue;

				const sourceId = this.nodeIdMap.get(nodeName);
				const targetId = this.nodeIdMap.get(targetName);
				if (!sourceId || !targetId) continue;

				const connKey = `${sourceId}-${connType}-${targetId}`;
				if (outputConnections.has(connKey)) continue;
				outputConnections.add(connKey);

				this.addConnection(sourceId, targetId, connType);
			}
		}
	}

	private isInNestedSticky(nodeName: string, nestedStickyIds: Set<string>): boolean {
		return this.stickyOverlaps.multiNodeOverlap.some(
			({ sticky, nodeNames }) =>
				nodeNames.includes(nodeName) && nestedStickyIds.has(sticky.node.id ?? ''),
		);
	}

	/**
	 * Returns a unique identifier for the subgraph a node belongs to.
	 * This allows distinguishing between different sticky subgraphs or different agent subgraphs.
	 */
	private getSubgraphId(nodeName: string, nestedStickyIds: Set<string>): string {
		// Check if in a standalone sticky subgraph
		const stickySubgraph = this.stickyOverlaps.multiNodeOverlap.find(
			({ sticky, nodeNames }) =>
				nodeNames.includes(nodeName) && !nestedStickyIds.has(sticky.node.id ?? ''),
		);
		if (stickySubgraph) {
			return `sticky:${stickySubgraph.sticky.node.id}`;
		}

		// Check if in an agent subgraph
		const agentSubgraph = this.agentSubgraphs.find(
			({ agentNode, aiConnectedNodeNames }) =>
				agentNode.name === nodeName || aiConnectedNodeNames.includes(nodeName),
		);
		if (agentSubgraph) {
			return `agent:${agentSubgraph.agentNode.id}`;
		}

		return 'none';
	}
}

// Public API

/**
 * Generates a Mermaid flowchart diagram from a workflow
 */
export function mermaidStringify(
	input: WorkflowMetadata | MermaidWorkflowInput,
	options?: MermaidOptions,
): string {
	const { workflow: wf } = input;
	const mergedOptions: Required<MermaidOptions> = {
		...DEFAULT_MERMAID_OPTIONS,
		...options,
	};
	const builder = new MermaidBuilder(wf.nodes, wf.connections, mergedOptions);
	const result = builder.build();
	return result.lines.join('\n');
}

/**
 * Process multiple workflows and generate mermaid diagrams while collecting node configurations
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

	const allConfigurations: NodeConfigurationsMap = {};

	return workflows.map((workflow) => {
		const { workflow: wf } = workflow;
		const builder = new MermaidBuilder(wf.nodes, wf.connections, mergedOptions, allConfigurations);
		const result = builder.build();
		return {
			mermaid: result.lines.join('\n'),
			nodeConfigurations: result.nodeConfigurations,
		};
	});
}
