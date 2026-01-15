import type { INode, INodeParameters, INodeTypes } from 'n8n-workflow';
import { NodeHelpers } from 'n8n-workflow';

/**
 * Minimal node information required for parameter transformation.
 */
export interface NodeForTransform {
	type: string;
	typeVersion: number;
	parameters: INodeParameters;
}

/**
 * ParameterTransformer provides conversion between stored and displayed parameters.
 *
 * - Stored parameters (in CRDT/DB): Only non-default values
 * - Displayed parameters (in UI): Full parameters with defaults applied
 *
 * This separation enables:
 * - Smaller CRDT documents (only user-set values synced)
 * - Same format in CRDT and DB (simpler save logic)
 * - Fewer false conflicts (default values can't conflict)
 * - Node type version upgrades don't create spurious changes
 */
export class ParameterTransformer {
	constructor(private nodeTypes: INodeTypes) {}

	/**
	 * Convert stored (CRDT/DB) parameters to displayed parameters.
	 * Applies defaults from node type schema and filters by displayOptions.
	 *
	 * @param node - Node with stored parameters
	 * @returns Parameters with defaults applied
	 */
	getDisplayedParameters(node: NodeForTransform): INodeParameters {
		const nodeType = this.nodeTypes.getByNameAndVersion(node.type, node.typeVersion);
		if (!nodeType) {
			// No node type found, return parameters as-is
			return node.parameters;
		}

		const displayed = NodeHelpers.getNodeParameters(
			nodeType.description.properties,
			node.parameters,
			true, // returnDefaults - include default values
			false, // returnNoneDisplayed - only return displayed parameters
			node as INode,
			nodeType.description,
		);

		return displayed ?? {};
	}

	/**
	 * Convert displayed parameters to storable format.
	 * Strips default values to minimize storage.
	 *
	 * @param node - Node with type information
	 * @param displayedParameters - Parameters with defaults
	 * @returns Parameters with defaults stripped
	 */
	getStorableParameters(
		node: Pick<NodeForTransform, 'type' | 'typeVersion'>,
		displayedParameters: INodeParameters,
	): INodeParameters {
		const nodeType = this.nodeTypes.getByNameAndVersion(node.type, node.typeVersion);
		if (!nodeType) {
			// No node type found, return parameters as-is
			return displayedParameters;
		}

		const storable = NodeHelpers.getNodeParameters(
			nodeType.description.properties,
			displayedParameters,
			false, // returnDefaults = false - strip default values
			false, // returnNoneDisplayed
			{ ...node, parameters: displayedParameters } as INode,
			nodeType.description,
		);

		return storable ?? {};
	}

	/**
	 * Check if a parameter value differs from its default.
	 * Useful for determining if a value needs to be stored.
	 *
	 * @param node - Node with type information
	 * @param parameterName - Name of the parameter to check
	 * @param value - Value to compare against default
	 * @returns true if value differs from default
	 */
	isNonDefaultValue(
		node: Pick<NodeForTransform, 'type' | 'typeVersion'>,
		parameterName: string,
		value: unknown,
	): boolean {
		const nodeType = this.nodeTypes.getByNameAndVersion(node.type, node.typeVersion);
		if (!nodeType) {
			// Can't determine default, assume non-default
			return true;
		}

		const property = nodeType.description.properties.find((p) => p.name === parameterName);
		if (!property) {
			// Property not found in schema, assume non-default
			return true;
		}

		// Deep equality check for default comparison
		return !this.deepEqual(value, property.default);
	}

	/**
	 * Deep equality check for parameter values.
	 */
	private deepEqual(a: unknown, b: unknown): boolean {
		if (a === b) return true;
		if (a === null || b === null) return false;
		if (typeof a !== typeof b) return false;

		if (typeof a === 'object') {
			if (Array.isArray(a) !== Array.isArray(b)) return false;

			if (Array.isArray(a) && Array.isArray(b)) {
				if (a.length !== b.length) return false;
				return a.every((val, idx) => this.deepEqual(val, b[idx]));
			}

			const aObj = a as Record<string, unknown>;
			const bObj = b as Record<string, unknown>;
			const aKeys = Object.keys(aObj);
			const bKeys = Object.keys(bObj);

			if (aKeys.length !== bKeys.length) return false;
			return aKeys.every((key) => this.deepEqual(aObj[key], bObj[key]));
		}

		return false;
	}
}

/**
 * Create a parameter transformer instance.
 * Convenience factory function for creating transformers.
 *
 * @param nodeTypes - Node types registry
 * @returns ParameterTransformer instance
 */
export function createParameterTransformer(nodeTypes: INodeTypes): ParameterTransformer {
	return new ParameterTransformer(nodeTypes);
}
