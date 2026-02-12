/**
 * Node Type Parser for CodeWorkflowBuilder
 *
 * Provides utilities to work with node types for the code builder:
 * - Search nodes by name/description
 * - Get detailed node type information
 */

import type { INodeTypeDescription } from 'n8n-workflow';

import { CodeBuilderNodeSearchEngine } from '../engines/code-builder-node-search-engine';

export interface ParsedNodeType {
	id: string;
	displayName: string;
	description: string;
	version: number;
	isTrigger: boolean;
}

/**
 * Node Type Parser class
 * Provides efficient access to node type data for the code builder
 */
export class NodeTypeParser {
	private nodeTypes: INodeTypeDescription[];
	private nodeTypeIndex: Map<string, INodeTypeDescription[]>;
	private searchEngine: CodeBuilderNodeSearchEngine;

	constructor(nodeTypes: INodeTypeDescription[]) {
		this.nodeTypes = nodeTypes;
		this.searchEngine = new CodeBuilderNodeSearchEngine(nodeTypes);
		this.nodeTypeIndex = this.buildIndex();
	}

	/**
	 * Build an index of node types by name for fast lookup
	 */
	private buildIndex(): Map<string, INodeTypeDescription[]> {
		const index = new Map<string, INodeTypeDescription[]>();

		for (const nodeType of this.nodeTypes) {
			const existing = index.get(nodeType.name) ?? [];
			existing.push(nodeType);
			index.set(nodeType.name, existing);
		}

		return index;
	}

	/**
	 * Check if a node type is a trigger
	 * Uses the 'group' property which is the reliable way to identify triggers
	 */
	private isTriggerNode(nodeType: INodeTypeDescription): boolean {
		// Primary check: use the group property (most reliable)
		if (nodeType.group.includes('trigger')) {
			return true;
		}
		// Fallback for any nodes that might not have group set correctly
		return (
			nodeType.name.toLowerCase().includes('trigger') ||
			nodeType.name.toLowerCase().includes('webhook')
		);
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
			return match ?? null;
		}

		// Otherwise, return the description with the highest max version
		return versions.reduce((latest, current) => {
			const latestMax = Array.isArray(latest.version)
				? Math.max(...latest.version)
				: latest.version;
			const currentMax = Array.isArray(current.version)
				? Math.max(...current.version)
				: current.version;
			return currentMax > latestMax ? current : latest;
		});
	}
}
