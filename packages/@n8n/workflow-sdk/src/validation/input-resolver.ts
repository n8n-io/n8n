import type { INodeTypes } from 'n8n-workflow';

/**
 * Resolves the number of main inputs for a node type using the provided INodeTypes.
 *
 * Returns undefined if:
 * - The node type cannot be found
 * - The inputs are expression-based (dynamic)
 * - Any error occurs during resolution
 *
 * @param nodeTypesProvider - Provider for looking up node types
 * @param nodeType - The node type identifier (e.g., 'n8n-nodes-base.aggregate')
 * @param version - The node version number
 * @returns The number of main inputs, or undefined if cannot be determined
 */
export function resolveMainInputCount(
	nodeTypesProvider: INodeTypes,
	nodeType: string,
	version: number,
): number | undefined {
	try {
		const nodeTypeObj = nodeTypesProvider.getByNameAndVersion(nodeType, version);
		if (!nodeTypeObj?.description?.inputs) return undefined;

		const inputs = nodeTypeObj.description.inputs;

		// Expression-based inputs (dynamic) cannot be validated statically
		if (typeof inputs === 'string') return undefined;

		// Count only main inputs
		return inputs.filter((input) => {
			if (typeof input === 'string') {
				return input === 'main';
			}
			// INodeInputConfiguration has a 'type' property
			return input.type === 'main';
		}).length;
	} catch {
		return undefined;
	}
}

/**
 * Resolves the number of static main outputs declared on a node type.
 *
 * Mirrors {@link resolveMainInputCount} for outputs. Returns undefined for
 * expression-based outputs (which we can't evaluate without a `Workflow`
 * instance) or unknown node types, matching the existing skip behaviour of
 * input-side validation.
 *
 * Does NOT account for the framework-level error output that
 * `NodeHelpers.getNodeOutputs` appends when `node.onError === 'continueErrorOutput'`.
 * Callers that need the effective count must add 1 themselves for that case.
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
