import type { Ref } from 'vue';
import { computed, ref } from 'vue';
import type { NodeParameterValueType } from 'n8n-workflow';
import { NodeHelpers } from 'n8n-workflow';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import type { NodeTypeProvider } from '@/app/utils/nodeTypes/nodeTypeTransforms';
import sortBy from 'lodash/sortBy';
import type {
	BaseNode,
	NodeRequiredParameters,
	ParameterKey,
	RequiredParameterUsage,
} from '../templates.types';

/**
 * Parameter types supported in the simplified setup form.
 * Complex types like fixedCollection, resourceLocator, etc. are excluded
 * as they require the full NDV experience.
 */
const SUPPORTED_PARAMETER_TYPES = [
	'string',
	'number',
	'boolean',
	'options',
	'multiOptions',
	'dateTime',
	'color',
	'json',
	'resourceLocator',
];

/**
 * Creates a unique key for a parameter based on node name and parameter name.
 */
export const keyFromNodeAndParam = (nodeName: string, paramName: string): ParameterKey =>
	`${nodeName}-${paramName}` as ParameterKey;

/**
 * Gets the required parameters for a node that should be displayed
 * in the setup form. Filters by:
 * - required: true
 * - supported parameter types
 * - displayOptions conditions
 * - excludes credentialsSelect type
 * - excludes parameters with remote options loading
 */
export const getNodeRequiredParameters = <TNode extends BaseNode>(
	nodeTypeProvider: NodeTypeProvider,
	node: TNode,
) => {
	const nodeType = nodeTypeProvider.getNodeType(node.type, node.typeVersion);
	if (!nodeType?.properties) {
		return [];
	}

	return nodeType.properties.filter((prop) => {
		// Only required parameters and [FOR NOW] parameters that require editors
		if (!prop.required && !prop.typeOptions?.editor) return false;

		// Only supported simple types
		if (!SUPPORTED_PARAMETER_TYPES.includes(prop.type)) return false;

		// Exclude credential-related parameters
		if (prop.type === 'credentialsSelect') return false;

		// Exclude parameters with remote options loading (too complex for setup form)
		if (prop.typeOptions?.loadOptionsMethod || prop.typeOptions?.loadOptions) return false;

		// Check displayOptions - use NodeHelpers.displayParameter
		const shouldDisplay = NodeHelpers.displayParameter(
			node.parameters,
			prop,
			{ typeVersion: node.typeVersion },
			nodeType,
		);

		return shouldDisplay;
	});
};

export const useParameterSetupState = <TNode extends BaseNode>(nodes: Ref<TNode[]>) => {
	const nodeTypesStore = useNodeTypesStore();

	/**
	 * User-entered parameter values. Map from parameter key to value.
	 */
	const parameterValues = ref<Record<ParameterKey, NodeParameterValueType>>({});

	/**
	 * Gets all nodes that have required parameters, sorted by X position.
	 */
	const nodesWithRequiredParameters = computed<NodeRequiredParameters[]>(() => {
		if (!nodes.value) return [];

		const result: NodeRequiredParameters[] = [];

		for (const node of nodes.value) {
			const requiredParams = getNodeRequiredParameters(nodeTypesStore, node);

			if (requiredParams.length === 0) continue;

			const nodeType = nodeTypesStore.getNodeType(node.type, node.typeVersion);

			result.push({
				nodeName: node.name,
				nodeType: node.type,
				nodeDisplayName: nodeType?.displayName ?? node.type,
				parameters: requiredParams.map((param) => ({
					key: keyFromNodeAndParam(node.name, param.name),
					nodeName: node.name,
					nodeType: node.type,
					parameter: param,
					currentValue: node.parameters[param.name] ?? param.default,
				})),
			});
		}

		// Sort by node position (X coordinate)
		return sortBy(result, (item) => {
			const node = nodes.value.find((n) => n.name === item.nodeName);
			return node?.position[0] ?? 0;
		});
	});

	/**
	 * Flat list of all required parameter usages across all nodes.
	 */
	const allRequiredParameterUsages = computed<RequiredParameterUsage[]>(() => {
		return nodesWithRequiredParameters.value.flatMap((n) => n.parameters);
	});

	/**
	 * Count of parameters that have been filled with a value.
	 */
	const numFilledParameters = computed(() => {
		return allRequiredParameterUsages.value.filter((usage) => {
			const value = parameterValues.value[usage.key] ?? usage.currentValue;
			return value !== undefined && value !== '' && value !== null;
		}).length;
	});

	/**
	 * Total count of required parameters.
	 */
	const numTotalRequiredParameters = computed(() => {
		return allRequiredParameterUsages.value.length;
	});

	/**
	 * Sets a parameter value in the local state.
	 */
	const setParameterValue = (key: ParameterKey, value: NodeParameterValueType) => {
		parameterValues.value[key] = value;
	};

	/**
	 * Initializes parameter values from the current node parameters.
	 */
	const setInitialParameterValues = () => {
		parameterValues.value = {};
		for (const usage of allRequiredParameterUsages.value) {
			if (usage.currentValue !== undefined && usage.currentValue !== '') {
				parameterValues.value[usage.key] = usage.currentValue;
			}
		}
	};

	return {
		nodesWithRequiredParameters,
		allRequiredParameterUsages,
		parameterValues,
		numFilledParameters,
		numTotalRequiredParameters,
		setParameterValue,
		setInitialParameterValues,
	};
};
