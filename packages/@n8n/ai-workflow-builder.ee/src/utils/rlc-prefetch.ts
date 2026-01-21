/**
 * Utility functions for pre-fetching ResourceLocator options before configuration.
 * This allows the Configurator agent to have all necessary resource options upfront.
 */

import type { Logger } from '@n8n/backend-common';
import type {
	INode,
	INodeTypeDescription,
	INodePropertyMode,
	INodeListSearchItems,
} from 'n8n-workflow';

import { findNodeType } from '../tools/helpers/validation';
import type { ResourceLocatorCallback } from '../types/callbacks';

/**
 * Represents a ResourceLocator parameter that needs options to be fetched
 */
export interface RLCParameterInfo {
	nodeId: string;
	nodeName: string;
	nodeType: string;
	nodeTypeVersion: number;
	parameterPath: string;
	searchMethod: string;
}

/**
 * Result of pre-fetching RLC options
 */
export interface RLCPrefetchResult {
	nodeId: string;
	nodeName: string;
	parameterPath: string;
	options: INodeListSearchItems[];
	error?: string;
}

/**
 * Check if a ResourceLocator value is empty/unset
 */
function isRLCValueEmpty(value: unknown): boolean {
	if (!value) return true;
	if (typeof value !== 'object') return false;

	const rlcValue = value as { __rl?: boolean; value?: unknown };
	if (!rlcValue.__rl) return false;

	// Check if the value is empty
	return !rlcValue.value || rlcValue.value === '';
}

/**
 * Extract the searchListMethod from a resourceLocator property's modes
 */
function extractSearchMethod(nodeType: INodeTypeDescription, parameterPath: string): string | null {
	const property = nodeType.properties.find(
		(p) => p.name === parameterPath && p.type === 'resourceLocator',
	);

	if (!property?.modes) {
		return null;
	}

	// Find a mode with type='list' that has searchListMethod
	const listMode = property.modes.find(
		(mode: INodePropertyMode) => mode.type === 'list' && mode.typeOptions?.searchListMethod,
	);

	return listMode?.typeOptions?.searchListMethod ?? null;
}

/**
 * Check if a node type requires credentials to fetch RLC options
 */
function nodeTypeRequiresCredentials(nodeType: INodeTypeDescription): boolean {
	return Array.isArray(nodeType.credentials) && nodeType.credentials.length > 0;
}

/**
 * Check if a node has credentials configured
 */
function nodeHasCredentials(node: INode): boolean {
	return !!node.credentials && Object.keys(node.credentials).length > 0;
}

/**
 * Detect all required empty RLC parameters in the workflow that can be pre-fetched.
 * Only fetches the first (root) RLC parameter per node to avoid fetching dependent
 * parameters that require parent values to be set first.
 */
export function detectRLCParametersForPrefetch(
	nodes: INode[],
	nodeTypes: INodeTypeDescription[],
): RLCParameterInfo[] {
	const result: RLCParameterInfo[] = [];

	for (const node of nodes) {
		// Find the node type definition (handles array versions correctly)
		const nodeType = findNodeType(node.type, node.typeVersion, nodeTypes);
		if (!nodeType) continue;

		// Check credentials requirements:
		// - If node type requires credentials, only proceed if node has them configured
		// - If node type doesn't require credentials (internal nodes like DataTable), proceed anyway
		const requiresCredentials = nodeTypeRequiresCredentials(nodeType);
		const hasCredentials = nodeHasCredentials(node);

		if (requiresCredentials && !hasCredentials) {
			continue; // Skip - can't fetch without required credentials
		}

		// Check each property for resourceLocator type
		// Only fetch the first (root) RLC parameter per node to avoid dependent parameter issues
		// Dependent parameters (like sheetName depending on documentId) should be fetched
		// by the agent after setting the root parameter
		for (const property of nodeType.properties) {
			if (property.type !== 'resourceLocator') continue;

			// Check if this RLC parameter has a list mode with searchListMethod
			const searchMethod = extractSearchMethod(nodeType, property.name);
			if (!searchMethod) continue;

			// Check if the parameter is required
			// Note: In n8n, "required" might not always be set, so we also check
			// if the parameter appears to be a primary resource selector
			const isRequired = property.required === true;
			const isPrimaryResource =
				property.name.toLowerCase().includes('id') || property.name.toLowerCase().includes('name');

			if (!isRequired && !isPrimaryResource) continue;

			// Check if the value is empty/unset
			const currentValue = node.parameters?.[property.name];
			if (!isRLCValueEmpty(currentValue)) continue;

			result.push({
				nodeId: node.id,
				nodeName: node.name,
				nodeType: node.type,
				nodeTypeVersion: node.typeVersion,
				parameterPath: property.name,
				searchMethod,
			});
			break;
		}
	}

	return result;
}

/**
 * Pre-fetch RLC options for all detected parameters in parallel
 */
export async function prefetchRLCOptions(
	parameters: RLCParameterInfo[],
	nodes: INode[],
	resourceLocatorCallback: ResourceLocatorCallback,
	logger?: Logger,
	timeoutMs = 15000,
): Promise<RLCPrefetchResult[]> {
	if (parameters.length === 0) {
		return [];
	}

	const fetchPromises = parameters.map(async (param): Promise<RLCPrefetchResult> => {
		const node = nodes.find((n) => n.id === param.nodeId);
		if (!node) {
			return {
				nodeId: param.nodeId,
				nodeName: param.nodeName,
				parameterPath: param.parameterPath,
				options: [],
				error: 'Node not found',
			};
		}

		try {
			const result = await Promise.race([
				resourceLocatorCallback(
					param.searchMethod,
					`parameters.${param.parameterPath}`,
					{ name: param.nodeType, version: param.nodeTypeVersion },
					node.parameters ?? {},
					node.credentials,
					undefined, // no filter
				),
				new Promise<never>((_, reject) =>
					setTimeout(() => reject(new Error('Request timed out')), timeoutMs),
				),
			]);

			return {
				nodeId: param.nodeId,
				nodeName: param.nodeName,
				parameterPath: param.parameterPath,
				options: result.results,
			};
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : 'Unknown error';
			logger?.warn('Failed to prefetch RLC options', {
				nodeId: param.nodeId,
				parameterPath: param.parameterPath,
				error: errorMessage,
			});

			return {
				nodeId: param.nodeId,
				nodeName: param.nodeName,
				parameterPath: param.parameterPath,
				options: [],
				error: errorMessage,
			};
		}
	});

	// Execute all fetches in parallel
	return await Promise.all(fetchPromises);
}

/**
 * Format pre-fetched RLC options for LLM consumption
 */
export function formatPrefetchedOptionsForLLM(results: RLCPrefetchResult[]): string {
	if (results.length === 0) {
		return '';
	}

	const successfulResults = results.filter((r) => !r.error && r.options.length > 0);
	if (successfulResults.length === 0) {
		return '';
	}

	const parts: string[] = ['=== PRE-FETCHED RESOURCE LOCATOR PARAMETERS OPTIONS ==='];
	parts.push('');

	for (const result of successfulResults) {
		parts.push(`<resource_options node="${result.nodeName}" parameter="${result.parameterPath}">`);

		for (const opt of result.options) {
			parts.push('  <option>');
			parts.push(`    <display_name>${opt.name}</display_name>`);
			parts.push(`    <id>${String(opt.value)}</id>`);
			parts.push('  </option>');
		}

		parts.push('</resource_options>');
	}

	return parts.join('\n');
}
