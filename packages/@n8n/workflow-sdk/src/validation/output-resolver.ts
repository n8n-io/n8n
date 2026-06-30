import type { INodeTypes } from 'n8n-workflow';

/**
 * Resolves the number of main outputs for a node type using the provided INodeTypes.
 *
 * Returns undefined if:
 * - The node type cannot be found
 * - The outputs are expression-based (dynamic)
 * - Any error occurs during resolution
 *
 * @param nodeTypesProvider - Provider for looking up node types
 * @param nodeType - The node type identifier (e.g., 'n8n-nodes-base.if')
 * @param version - The node version number
 * @returns The number of main outputs, or undefined if cannot be determined
 */
export function resolveMainOutputCount(
	nodeTypesProvider: INodeTypes,
	nodeType: string,
	version: number,
): number | undefined {
	try {
		const nodeTypeObj = nodeTypesProvider.getByNameAndVersion(nodeType, version);
		if (!nodeTypeObj?.description?.outputs) return undefined;

		const outputs = nodeTypeObj.description.outputs;

		// Expression-based outputs (dynamic) cannot be validated statically
		if (typeof outputs === 'string') return undefined;

		// Count only main outputs
		return outputs.filter((output) => {
			if (typeof output === 'string') {
				return output === 'main';
			}
			// INodeOutputConfiguration has a 'type' property
			return output.type === 'main';
		}).length;
	} catch {
		return undefined;
	}
}
