/**
 * Node Type Parser for CodeWorkflowBuilder
 *
 * Provides utilities to work with node types for the code builder:
 * - Extract node IDs for system prompt
 * - Search nodes by name/description
 * - Get detailed node type information
 */

import type { INodeTypeDescription } from 'n8n-workflow';
import { NodeSearchEngine } from '../tools/engines/node-search-engine';
import { extractResourceOperations } from './resource-operation-extractor';
import { extractModeDiscriminator, type ModeInfo } from '../tools/utils/discriminator-utils';

export interface ParsedNodeType {
	id: string;
	displayName: string;
	description: string;
	version: number;
	isTrigger: boolean;
}

/**
 * Discriminator information for a node
 * Used to indicate what parameters are needed for get_nodes
 */
export interface NodeDiscriminatorInfo {
	type: 'resource_operation' | 'mode';
	resources?: Array<{ value: string; operations: string[] }>;
	modes?: ModeInfo[];
}

/**
 * Node with discriminator information for prompt generation
 */
export interface NodeWithDiscriminators {
	id: string;
	displayName: string;
	discriminators?: NodeDiscriminatorInfo;
}

/**
 * Node Type Parser class
 * Provides efficient access to node type data for the code builder
 */
export class NodeTypeParser {
	private nodeTypes: INodeTypeDescription[];
	private nodeTypeIndex: Map<string, INodeTypeDescription[]>;
	private searchEngine: NodeSearchEngine;

	constructor(nodeTypes: INodeTypeDescription[]) {
		this.nodeTypes = nodeTypes;
		this.searchEngine = new NodeSearchEngine(nodeTypes);
		this.nodeTypeIndex = this.buildIndex();
	}

	/**
	 * Build an index of node types by name for fast lookup
	 */
	private buildIndex(): Map<string, INodeTypeDescription[]> {
		const index = new Map<string, INodeTypeDescription[]>();

		for (const nodeType of this.nodeTypes) {
			const existing = index.get(nodeType.name) || [];
			existing.push(nodeType);
			index.set(nodeType.name, existing);
		}

		return index;
	}

	/**
	 * Check if a node type is a trigger
	 */
	private isTriggerNode(nodeType: INodeTypeDescription): boolean {
		return (
			nodeType.name.toLowerCase().includes('trigger') ||
			nodeType.name.toLowerCase().includes('webhook') ||
			nodeType.name.toLowerCase().includes('schedule') ||
			nodeType.name.toLowerCase().includes('poll')
		);
	}

	/**
	 * Get all node IDs grouped by category for the system prompt
	 * Returns a structured list of common nodes organized by type
	 */
	getNodeIdsByCategory(): {
		triggers: string[];
		core: string[];
		ai: string[];
		other: string[];
	} {
		const triggers: string[] = [];
		const core: string[] = [];
		const ai: string[] = [];
		const other: string[] = [];

		// Common core nodes that should be in prompt cache
		const coreNodeNames = new Set([
			'n8n-nodes-base.httpRequest',
			'n8n-nodes-base.set',
			'n8n-nodes-base.code',
			'n8n-nodes-base.if',
			'n8n-nodes-base.switch',
			'n8n-nodes-base.merge',
			'n8n-nodes-base.splitInBatches',
			'n8n-nodes-base.function',
			'n8n-nodes-base.functionItem',
			'n8n-nodes-base.wait',
			'n8n-nodes-base.noOp',
			'n8n-nodes-base.respondToWebhook',
		]);

		// Process each unique node name (take latest version)
		const seenNodes = new Set<string>();

		for (const nodeType of this.nodeTypes) {
			// Skip if we've already seen this node name
			if (seenNodes.has(nodeType.name)) {
				continue;
			}
			seenNodes.add(nodeType.name);

			const nodeId = nodeType.name;

			// Categorize the node
			if (this.isTriggerNode(nodeType)) {
				triggers.push(nodeId);
			} else if (nodeId.startsWith('@n8n/n8n-nodes-langchain')) {
				ai.push(nodeId);
			} else if (coreNodeNames.has(nodeId)) {
				core.push(nodeId);
			} else {
				other.push(nodeId);
			}
		}

		return {
			triggers: triggers.sort(),
			core: core.sort(),
			ai: ai.sort(),
			other: other.sort(),
		};
	}

	/**
	 * Get discriminator info for a node type
	 * Returns resource/operation info, mode info, or undefined
	 */
	private getDiscriminatorInfo(nodeType: INodeTypeDescription): NodeDiscriminatorInfo | undefined {
		// Get the primary version
		const version = Array.isArray(nodeType.version) ? nodeType.version[0] : nodeType.version;

		// Check for resource/operation pattern
		const resourceOps = extractResourceOperations(nodeType, version);
		if (resourceOps && resourceOps.resources.length > 0) {
			const resources = resourceOps.resources
				.filter((r) => r.value !== '__CUSTOM_API_CALL__')
				.map((r) => ({
					value: r.value,
					operations: r.operations
						.filter((op) => op.value !== '__CUSTOM_API_CALL__')
						.map((op) => op.value),
				}));

			if (resources.length > 0) {
				return { type: 'resource_operation', resources };
			}
		}

		// Check for mode pattern
		const modeInfo = extractModeDiscriminator(nodeType, version);
		if (modeInfo && modeInfo.modes.length > 0) {
			return { type: 'mode', modes: modeInfo.modes };
		}

		return undefined;
	}

	/**
	 * Get all node IDs grouped by category with discriminator information
	 * Returns nodes with their resource/operation or mode discriminators
	 */
	getNodeIdsByCategoryWithDiscriminators(): {
		triggers: NodeWithDiscriminators[];
		core: NodeWithDiscriminators[];
		ai: NodeWithDiscriminators[];
		other: NodeWithDiscriminators[];
	} {
		const triggers: NodeWithDiscriminators[] = [];
		const core: NodeWithDiscriminators[] = [];
		const ai: NodeWithDiscriminators[] = [];
		const other: NodeWithDiscriminators[] = [];

		// Common core nodes that should be in prompt cache
		const coreNodeNames = new Set([
			'n8n-nodes-base.httpRequest',
			'n8n-nodes-base.set',
			'n8n-nodes-base.code',
			'n8n-nodes-base.if',
			'n8n-nodes-base.switch',
			'n8n-nodes-base.merge',
			'n8n-nodes-base.splitInBatches',
			'n8n-nodes-base.function',
			'n8n-nodes-base.functionItem',
			'n8n-nodes-base.wait',
			'n8n-nodes-base.noOp',
			'n8n-nodes-base.respondToWebhook',
		]);

		// Process each unique node name (take latest version)
		const seenNodes = new Set<string>();

		for (const nodeType of this.nodeTypes) {
			// Skip if we've already seen this node name
			if (seenNodes.has(nodeType.name)) {
				continue;
			}
			seenNodes.add(nodeType.name);

			const nodeId = nodeType.name;
			const discriminators = this.getDiscriminatorInfo(nodeType);

			const nodeWithDisc: NodeWithDiscriminators = {
				id: nodeId,
				displayName: nodeType.displayName,
				discriminators,
			};

			// Categorize the node
			if (this.isTriggerNode(nodeType)) {
				triggers.push(nodeWithDisc);
			} else if (nodeId.startsWith('@n8n/n8n-nodes-langchain')) {
				ai.push(nodeWithDisc);
			} else if (coreNodeNames.has(nodeId)) {
				core.push(nodeWithDisc);
			} else {
				other.push(nodeWithDisc);
			}
		}

		return {
			triggers: triggers.sort((a, b) => a.id.localeCompare(b.id)),
			core: core.sort((a, b) => a.id.localeCompare(b.id)),
			ai: ai.sort((a, b) => a.id.localeCompare(b.id)),
			other: other.sort((a, b) => a.id.localeCompare(b.id)),
		};
	}

	/**
	 * Get all node IDs as a flat list
	 */
	getAllNodeIds(): string[] {
		const categories = this.getNodeIdsByCategory();
		return [...categories.triggers, ...categories.core, ...categories.ai, ...categories.other];
	}

	/**
	 * Search for nodes by name or description
	 * Returns up to `limit` results
	 */
	searchNodeTypes(query: string, limit: number = 5): ParsedNodeType[] {
		const results = this.searchEngine.searchByName(query, limit);

		return results.map((result) => {
			// Find the full node type to check if it's a trigger
			const nodeType = this.getNodeType(result.name, result.version);
			return {
				id: result.name,
				displayName: result.displayName,
				description: result.description,
				version: result.version,
				isTrigger: nodeType ? this.isTriggerNode(nodeType) : false,
			};
		});
	}

	/**
	 * Get full node type description for a specific node
	 * Returns the latest version if version is not specified
	 */
	getNodeType(nodeId: string, version?: number): INodeTypeDescription | null {
		const versions = this.nodeTypeIndex.get(nodeId);

		if (!versions || versions.length === 0) {
			return null;
		}

		// If version specified, find match (handle both scalar and array versions)
		if (version !== undefined) {
			const match = versions.find((v) => {
				const nodeVersions = Array.isArray(v.version) ? v.version : [v.version];
				return nodeVersions.includes(version);
			});
			return match || null;
		}

		// Otherwise, return the latest version (last in array)
		return versions[versions.length - 1];
	}

	/**
	 * Get all versions of a node type
	 */
	getNodeTypeVersions(nodeId: string): number[] {
		const versions = this.nodeTypeIndex.get(nodeId);

		if (!versions || versions.length === 0) {
			return [];
		}

		// Handle version being either number or array of numbers
		const versionNumbers = versions
			.map((v) => {
				if (Array.isArray(v.version)) {
					return v.version;
				}
				return [v.version];
			})
			.flat()
			.sort((a, b) => a - b);

		return versionNumbers;
	}

	/**
	 * Get basic info about a node for display
	 */
	getNodeInfo(nodeId: string): ParsedNodeType | null {
		const nodeType = this.getNodeType(nodeId);

		if (!nodeType) {
			return null;
		}

		// Get the primary version (first if array, otherwise the version)
		const primaryVersion = Array.isArray(nodeType.version) ? nodeType.version[0] : nodeType.version;

		return {
			id: nodeType.name,
			displayName: nodeType.displayName,
			description: nodeType.description,
			version: primaryVersion,
			isTrigger: this.isTriggerNode(nodeType),
		};
	}
}
