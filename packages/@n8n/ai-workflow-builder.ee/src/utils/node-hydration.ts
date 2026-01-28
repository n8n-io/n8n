import type { Logger } from '@n8n/backend-common';
import type { INodeTypeDescription } from 'n8n-workflow';

import {
	createResourceCacheKey,
	extractResourceOperations,
	type ResourceOperationInfo,
} from './resource-operation-extractor';
import { extractConnectionChangingParameters } from '../tools/utils/connection.utils';
import type { PlanOutput } from '../types/planner-types';

/**
 * Hydrate nodes with availableResources from node type definitions or cache.
 */
export function hydrateNodes(
	nodes: Array<{
		nodeName: string;
		version: number;
		reasoning: string;
		connectionChangingParameters: Array<{
			name: string;
			possibleValues: Array<string | boolean | number>;
		}>;
	}>,
	parsedNodeTypes: INodeTypeDescription[],
	existingCache: Record<string, ResourceOperationInfo | null>,
	logger?: Logger,
) {
	// Build lookup map for resource hydration
	const nodeTypeMap = new Map<string, INodeTypeDescription>();
	for (const nt of parsedNodeTypes) {
		const versions = Array.isArray(nt.version) ? nt.version : [nt.version];
		for (const v of versions) {
			nodeTypeMap.set(`${nt.name}:${v}`, nt);
		}
	}

	// Hydrate nodesFound with availableResources from node type definitions or cache
	return nodes.map((node) => {
		const cacheKey = createResourceCacheKey(node.nodeName, node.version);

		// Check cache first (populated by node_details tool during discovery)
		if (cacheKey in existingCache) {
			const cached = existingCache[cacheKey];
			if (cached) {
				return {
					...node,
					availableResources: cached.resources,
				};
			}
			// Cached as null means no resources for this node
			return node;
		}

		// Cache miss - extract fresh (O(1) lookup using pre-built map)
		const nodeType = nodeTypeMap.get(cacheKey);

		if (!nodeType) {
			logger?.warn('[NodeHydration] Node type not found during resource hydration', {
				nodeName: node.nodeName,
				nodeVersion: node.version,
			});
			return node;
		}

		// Extract resource/operation info
		const resourceOpInfo = extractResourceOperations(nodeType, node.version, logger);

		if (!resourceOpInfo) {
			return node;
		}

		// Add availableResources to the node
		return {
			...node,
			availableResources: resourceOpInfo.resources,
		};
	});
}

/**
 * Hydrate nodes from plan suggestions.
 * Uses STRICT matching on internal node names.
 */
export function hydrateNodesFromPlan(
	plan: PlanOutput,
	parsedNodeTypes: INodeTypeDescription[],
	logger?: Logger,
) {
	const suggestedNodes = new Set<string>();

	for (const step of plan.steps) {
		if (step.suggestedNodes) {
			step.suggestedNodes.forEach((n) => suggestedNodes.add(n));
		}
	}

	if (suggestedNodes.size === 0) {
		return {
			nodesFound: [],
			plan,
		};
	}

	// Build lookup maps for node types
	const nodeTypeByInternalName = new Map<string, INodeTypeDescription>();

	for (const nt of parsedNodeTypes) {
		const ntMaxVersion = Array.isArray(nt.version) ? Math.max(...nt.version) : nt.version;

		// Store by internal name - keep the one with highest version
		const existingByName = nodeTypeByInternalName.get(nt.name);
		if (!existingByName) {
			nodeTypeByInternalName.set(nt.name, nt);
		} else {
			const existingMaxVersion = Array.isArray(existingByName.version)
				? Math.max(...existingByName.version)
				: existingByName.version;
			if (ntMaxVersion > existingMaxVersion) {
				nodeTypeByInternalName.set(nt.name, nt);
			}
		}
	}

	// Hydrate nodesFound with actual versions, available resources, and connection-changing parameters
	const nodesFound = Array.from(suggestedNodes).map((nodeName) => {
		// STRICT MATCHING ONLY
		// 1. Exact internal name match (e.g., "n8n-nodes-base.httpRequest")
		// 2. Case-insensitive internal name match (fallback)
		let nodeType = nodeTypeByInternalName.get(nodeName);

		if (!nodeType) {
			// Try case-insensitive fallback for internal name
			// This handles slight hallucinations in casing (e.g. "n8n-nodes-base.HttpRequest")
			const nodeNameLower = nodeName.toLowerCase();
			for (const [name, nt] of nodeTypeByInternalName) {
				if (name.toLowerCase() === nodeNameLower) {
					nodeType = nt;
					logger?.debug('[NodeHydration] Case-insensitive internal name match found', {
						suggestedName: nodeName,
						matchedName: name,
					});
					break;
				}
			}
		}

		if (!nodeType) {
			// Log warning - we do NOT fuzzy match on display names anymore
			logger?.warn('[NodeHydration] Node type not found (strict match failed)', {
				nodeName,
				triedInternalName: true,
			});
			return {
				nodeName,
				version: 1, // Default to 1 if not found
				reasoning: 'Suggested in plan step',
				connectionChangingParameters: [] as Array<{
					name: string;
					possibleValues: Array<string | boolean | number>;
				}>,
			};
		}

		// Use the internal name for consistency with discovery output
		const internalName = nodeType.name;

		// Get the highest/latest version
		const versions = Array.isArray(nodeType.version) ? nodeType.version : [nodeType.version];
		const latestVersion = Math.max(...versions);

		// Extract resource/operation info
		const resourceOpInfo = extractResourceOperations(nodeType, latestVersion, logger);

		// Extract connection-changing parameters from inputs/outputs expressions
		const connectionChangingParameters = extractConnectionChangingParameters(nodeType);

		return {
			nodeName: internalName,
			version: latestVersion,
			reasoning: 'Suggested in plan step',
			connectionChangingParameters,
			...(resourceOpInfo && { availableResources: resourceOpInfo.resources }),
		};
	});

	return {
		nodesFound,
		plan,
	};
}
