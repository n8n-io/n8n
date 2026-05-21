/**
 * Node Type Parser for CodeWorkflowBuilder
 *
 * Provides utilities to work with node types for the code builder:
 * - Search nodes by name/description
 * - Get detailed node type information
 *
 * Internally holds only `LeanNodeTypeDescription` objects (see
 * `lean-node-type.ts`); the full `INodeTypeDescription`s are converted at
 * construction time and discarded so they don't remain resident.
 */

import type { INodeTypeDescription } from 'n8n-workflow';

import {
	toLeanNodeType,
	type LeanNodeTypeDescription,
	type VersionDiscriminators,
} from './lean-node-type';
import { CodeBuilderNodeSearchEngine } from './search-engine';

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
	private nodeTypes: LeanNodeTypeDescription[];
	private nodeTypeIndex: Map<string, LeanNodeTypeDescription[]>;
	private searchEngine: CodeBuilderNodeSearchEngine;

	constructor(nodeTypes: INodeTypeDescription[]) {
		this.nodeTypes = nodeTypes.map(toLeanNodeType);
		this.searchEngine = new CodeBuilderNodeSearchEngine(this.nodeTypes);
		this.nodeTypeIndex = this.buildIndex();
	}

	/**
	 * Build an index of node types by name for fast lookup
	 */
	private buildIndex(): Map<string, LeanNodeTypeDescription[]> {
		const index = new Map<string, LeanNodeTypeDescription[]>();

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
	private isTriggerNode(nodeType: LeanNodeTypeDescription): boolean {
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
	searchNodeTypes(
		query: string,
		limit: number = 5,
		nodeFilter?: (nodeId: string) => boolean,
	): ParsedNodeType[] {
		const results = this.searchEngine.searchByName(query, limit, nodeFilter);

		return results.map((result) => {
			// Find the full node type to check if it's a trigger
			const nodeType = this.getLeanNodeType(result.name, result.version);
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
	 * Get the lean node type description for a specific node.
	 * Returns the latest version if version is not specified.
	 *
	 * The returned object is a `LeanNodeTypeDescription` — it carries
	 * only the searchable fields plus pre-computed discriminator metadata.
	 * For full type information including `properties`, read from disk
	 * via the `getNodeTypes` helper.
	 */
	getLeanNodeType(nodeId: string, version?: number): LeanNodeTypeDescription | null {
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

	/**
	 * Get the pre-computed discriminator metadata for a node at a specific
	 * version, or `null` if the node has no discriminators / version unknown.
	 *
	 * Used by search-result formatting in place of running the extractors at
	 * query time. Avoids re-scanning `properties` (which the lean form does
	 * not retain).
	 */
	getVersionDiscriminators(nodeId: string, version: number): VersionDiscriminators | null {
		const node = this.getLeanNodeType(nodeId, version);
		return node?.discriminatorsByVersion.get(version) ?? null;
	}
}
