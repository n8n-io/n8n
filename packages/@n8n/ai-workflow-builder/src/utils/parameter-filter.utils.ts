import type {
	INode,
	INodeParameters,
	INodeProperties,
	INodePropertyCollection,
	INodePropertyOptions,
	INodeTypeDescription,
	IParameterDependencies,
} from 'n8n-workflow';
import { displayParameter, getNodeParameters } from 'n8n-workflow';

/**
 * Get parameter dependencies from node properties
 * Adapted from n8n-workflow/src/node-helpers.ts
 */
function getParameterDependencies(nodePropertiesArray: INodeProperties[]): IParameterDependencies {
	const dependencies: IParameterDependencies = {};

	const checkParameterDependencies = (properties: INodeProperties[], basePath?: string) => {
		for (const property of properties) {
			const propertyPath = basePath ? `${basePath}.${property.name}` : property.name;

			if (property.displayOptions) {
				const dependentParameters: string[] = [];

				// Check show conditions
				if (property.displayOptions.show) {
					Object.keys(property.displayOptions.show).forEach((key) => {
						if (!key.startsWith('@')) {
							const cleanKey = key.startsWith('/') ? key.substring(1) : key;
							dependentParameters.push(cleanKey);
						}
					});
				}

				// Check hide conditions
				if (property.displayOptions.hide) {
					Object.keys(property.displayOptions.hide).forEach((key) => {
						if (!key.startsWith('@')) {
							const cleanKey = key.startsWith('/') ? key.substring(1) : key;
							dependentParameters.push(cleanKey);
						}
					});
				}

				if (dependentParameters.length > 0) {
					dependencies[propertyPath] = Array.from(new Set(dependentParameters));
				}
			}

			// Recursively check nested properties
			if (property.type === 'collection' && property.options) {
				checkParameterDependencies(property.options as INodeProperties[], propertyPath);
			} else if (property.type === 'fixedCollection' && property.options) {
				for (const option of property.options as INodePropertyCollection[]) {
					if (option.values) {
						checkParameterDependencies(option.values, `${propertyPath}.${option.name}`);
					}
				}
			}
		}
	};

	checkParameterDependencies(nodePropertiesArray);
	return dependencies;
}

/**
 * Get parameter resolution order based on dependencies
 * Adapted from n8n-workflow/src/node-helpers.ts
 */
function getParameterResolveOrder(
	nodePropertiesArray: INodeProperties[],
	parameterDependencies: IParameterDependencies,
): number[] {
	const executionOrder: number[] = [];
	const indexToResolve = Array.from({ length: nodePropertiesArray.length }, (_, i) => i);
	const resolvedParameters = new Set<string>();

	let maxIterations = nodePropertiesArray.length * 2;

	while (indexToResolve.length > 0) {
		let changed = false;

		for (let i = indexToResolve.length - 1; i >= 0; i--) {
			const parameterIndex = indexToResolve[i];
			const property = nodePropertiesArray[parameterIndex];

			// Check if all dependencies are resolved
			const dependencies = parameterDependencies[property.name] || [];
			const allDependenciesResolved = dependencies.every((dep) => resolvedParameters.has(dep));

			if (allDependenciesResolved) {
				executionOrder.push(parameterIndex);
				resolvedParameters.add(property.name);
				indexToResolve.splice(i, 1);
				changed = true;
			}
		}

		// Prevent infinite loop
		if (!changed && indexToResolve.length > 0) {
			// Add remaining parameters that might have circular dependencies
			executionOrder.push(...indexToResolve);
			break;
		}

		maxIterations--;
		if (maxIterations <= 0) {
			// Safety fallback
			executionOrder.push(...indexToResolve);
			break;
		}
	}

	return executionOrder;
}

/**
 * Options for filtering node parameters
 */
interface FilterParametersOptions {
	/** Whether to include parameters even if they're not displayed */
	includeHidden?: boolean;
	/** Whether to include parameter dependencies in the output */
	includeDependencies?: boolean;
	/** Maximum depth for nested parameters (collections, fixedCollections) */
	maxDepth?: number;
}

/**
 * Filtered parameter information
 */
interface FilteredParameter extends INodeProperties {
	/** Whether this parameter is currently visible */
	isVisible: boolean;
	/** Parameters that this parameter depends on */
	dependencies?: string[];
	/** Parameters that depend on this parameter */
	dependents?: string[];
}

/**
 * Result of parameter filtering
 */
interface FilteredParametersResult {
	/** Filtered parameters */
	parameters: FilteredParameter[];
	/** Map of parameter dependencies */
	dependencyMap?: Map<string, string[]>;
	/** Parameters that control visibility of others */
	controlParameters?: string[];
}

/**
 * Process a single parameter and add it to the filtered list
 */
function processParameter(
	property: INodeProperties,
	nodeValues: INodeParameters,
	node: INode,
	nodeType: INodeTypeDescription,
	options: {
		includeHidden: boolean;
		includeDependencies: boolean;
		maxDepth: number;
		dependencyMap: Map<string, string[]>;
		controlParameters: Set<string>;
	},
): FilteredParameter | null {
	const { includeHidden, includeDependencies, maxDepth, dependencyMap, controlParameters } =
		options;
	// Check if parameter should be displayed
	const isVisible = displayParameter(nodeValues, property, node, nodeType);

	// Track dependencies
	if (includeDependencies && property.displayOptions) {
		const deps = extractDependencies(property.displayOptions);
		if (deps.length > 0) {
			dependencyMap.set(property.name, deps);
			deps.forEach((dep) => controlParameters.add(dep));
		}
	}

	// Add to filtered list if visible or if we include hidden
	if (!isVisible && !includeHidden) {
		return null;
	}

	const filteredParam: FilteredParameter = {
		...property,
		isVisible,
	};

	// Add dependency information if requested
	if (includeDependencies && dependencyMap.has(property.name)) {
		filteredParam.dependencies = dependencyMap.get(property.name);
	}

	// For complex types, filter nested properties
	if (property.type === 'collection' && property.options) {
		filteredParam.options = filterNestedProperties(
			property.options as INodeProperties[],
			nodeValues[property.name] as INodeParameters,
			node,
			nodeType,
			includeHidden,
			10,
			maxDepth,
		);
	} else if (property.type === 'fixedCollection' && property.options) {
		filteredParam.options = filterFixedCollectionOptions(
			property.options as INodePropertyCollection[],
			nodeValues[property.name] as INodeParameters,
			node,
			nodeType,
			includeHidden,
			10,
			maxDepth,
		);
	}

	return filteredParam;
}

/**
 * Filters node parameters based on display conditions and current values
 * This is adapted from the getNodeParameters function in n8n-workflow
 */
export function filterNodeParameters(
	node: INode,
	nodeType: INodeTypeDescription,
	options: FilterParametersOptions = {},
): FilteredParametersResult {
	const { includeHidden = false, includeDependencies = true, maxDepth = 10 } = options;

	const nodeValues = node.parameters || {};
	const nodeProperties = nodeType.properties || [];
	const filteredParameters: FilteredParameter[] = [];
	const dependencyMap = new Map<string, string[]>();
	const controlParameters = new Set<string>();

	// Get parameter dependencies
	const parameterDependencies = includeDependencies
		? getParameterDependencies(nodeProperties)
		: undefined;

	// Get parameter resolution order
	const parameterOrder = parameterDependencies
		? getParameterResolveOrder(nodeProperties, parameterDependencies)
		: nodeProperties.map((_, index) => index);

	const nodeParameters =
		getNodeParameters(nodeProperties, nodeValues, true, false, node, nodeType) ?? {};
	console.log('🚀 ~ nodeParameters:', nodeParameters);
	// Process each parameter in the correct order
	for (const parameterIndex of parameterOrder) {
		const property = nodeProperties[parameterIndex];
		if (!property) continue;

		const filteredParam = processParameter(property, nodeParameters, node, nodeType, {
			includeHidden,
			includeDependencies,
			maxDepth,
			dependencyMap,
			controlParameters,
		});

		if (filteredParam) {
			filteredParameters.push(filteredParam);
		}
	}

	// Find dependents (reverse dependencies)
	if (includeDependencies) {
		for (const [param, deps] of dependencyMap) {
			for (const dep of deps) {
				const filteredParam = filteredParameters.find((p) => p.name === dep);
				if (filteredParam) {
					filteredParam.dependents ??= [];
					filteredParam.dependents.push(param);
				}
			}
		}
	}

	return {
		parameters: filteredParameters,
		dependencyMap: includeDependencies ? dependencyMap : undefined,
		controlParameters: includeDependencies ? Array.from(controlParameters) : undefined,
	};
}

/**
 * Filter nested properties for collection types
 */
function filterNestedProperties(
	properties: INodeProperties[],
	values: INodeParameters | undefined,
	node: INode,
	nodeType: INodeTypeDescription,
	includeHidden: boolean,
	currentDepth: number,
	maxDepth: number,
): INodeProperties[] {
	if (currentDepth >= maxDepth) {
		return properties;
	}

	return properties
		.map((prop) => {
			const nodeValuesForCheck = values ?? {};
			const isVisible = displayParameter(nodeValuesForCheck, prop, node, nodeType);

			if (!isVisible && !includeHidden) {
				return null;
			}

			const filteredProp: FilteredParameter = {
				...prop,
				isVisible,
			};

			// Recursively filter nested collections
			if (prop.type === 'collection' && prop.options) {
				filteredProp.options = filterNestedProperties(
					prop.options as INodeProperties[],
					nodeValuesForCheck[prop.name] as INodeParameters,
					node,
					nodeType,
					includeHidden,
					currentDepth + 1,
					maxDepth,
				);
			} else if (prop.type === 'fixedCollection' && prop.options) {
				filteredProp.options = filterFixedCollectionOptions(
					prop.options as INodePropertyCollection[],
					nodeValuesForCheck[prop.name] as INodeParameters,
					node,
					nodeType,
					includeHidden,
					currentDepth + 1,
					maxDepth,
				);
			}

			return filteredProp;
		})
		.filter((prop): prop is FilteredParameter => prop !== null);
}

/**
 * Filter options for fixedCollection types
 */
function filterFixedCollectionOptions(
	options: INodePropertyCollection[],
	values: INodeParameters | undefined,
	node: INode,
	nodeType: INodeTypeDescription,
	includeHidden: boolean,
	currentDepth: number,
	maxDepth: number,
): INodePropertyCollection[] {
	if (currentDepth >= maxDepth) {
		return options;
	}

	return options.map((option) => ({
		...option,
		values: filterNestedProperties(
			option.values,
			values?.[option.name] as INodeParameters,
			node,
			nodeType,
			includeHidden,
			currentDepth,
			maxDepth,
		),
	}));
}

/**
 * Extract parameter names that a property depends on from its display options
 */
function extractDependencies(displayOptions: INodeProperties['displayOptions']): string[] {
	const dependencies = new Set<string>();

	if (!displayOptions) return [];

	// Extract from show conditions
	if (displayOptions.show) {
		Object.keys(displayOptions.show).forEach((key) => {
			// Remove leading '/' for root parameters and special parameters like @version
			const cleanKey = key.startsWith('/') ? key.substring(1) : key;
			// Include @tool for tool nodes but not other @ parameters
			if (!cleanKey.startsWith('@') || cleanKey === '@tool') {
				dependencies.add(cleanKey);
			}
		});
	}

	// Extract from hide conditions
	if (displayOptions.hide) {
		Object.keys(displayOptions.hide).forEach((key) => {
			const cleanKey = key.startsWith('/') ? key.substring(1) : key;
			if (!cleanKey.startsWith('@') || cleanKey === '@tool') {
				dependencies.add(cleanKey);
			}
		});
	}

	return Array.from(dependencies);
}

interface FormattedParameter {
	name: string;
	displayName: string;
	type: string;
	description?: string;
	isVisible?: boolean;
	options?: Array<{ name: string; value: string | number | boolean; description?: string }>;
	hasNestedParameters?: boolean;
	multipleValues?: boolean;
	resourceModes?: Array<string | { name: string }>;
	hint?: string;
	default?: unknown;
	dependsOn?: string[];
	controls?: string[];
	validation?: Record<string, unknown>;
}

export interface FormattedResult {
	parameters: FormattedParameter[];
	controlParameters?: string[];
	hint?: string;
	toolNodeHint?: string;
	[key: string]: unknown; // Allow indexing for JSON.stringify
}

/**
 * Add type-specific information to formatted parameter
 */
function addTypeSpecificInfo(param: FilteredParameter, formattedParam: FormattedParameter): void {
	if (param.type === 'options' && param.options) {
		formattedParam.options = (param.options as INodePropertyOptions[]).map((opt) => ({
			name: opt.name,
			value: opt.value,
			description: opt.description,
		}));
	} else if (param.type === 'collection' || param.type === 'fixedCollection') {
		// For complex types, just indicate they exist
		formattedParam.hasNestedParameters = true;
		if (param.typeOptions?.multipleValues) {
			formattedParam.multipleValues = true;
		}
	} else if (param.type === 'resourceLocator') {
		// Special handling for resource locator parameters
		const modes = param.modes ?? ['id', 'url', 'name'];
		formattedParam.resourceModes = modes.map((mode) =>
			typeof mode === 'string' ? mode : mode.name,
		);
		formattedParam.hint = 'Use ResourceLocator structure with __rl, mode, and value fields';
	}
}

/**
 * Add validation rules to formatted parameter
 */
function addValidationRules(param: FilteredParameter, formattedParam: FormattedParameter): void {
	if (!param.typeOptions) return;

	const validationRules: Record<string, unknown> = {};
	if (param.typeOptions.minValue !== undefined) {
		validationRules.minValue = param.typeOptions.minValue;
	}
	if (param.typeOptions.maxValue !== undefined) {
		validationRules.maxValue = param.typeOptions.maxValue;
	}
	if (param.typeOptions.numberPrecision !== undefined) {
		validationRules.precision = param.typeOptions.numberPrecision;
	}
	if (Object.keys(validationRules).length > 0) {
		formattedParam.validation = validationRules;
	}
}

/**
 * Format a single parameter for the formatted result
 */
function formatParameter(
	param: FilteredParameter,
	includeInvisible: boolean,
): FormattedParameter | null {
	if (!param.isVisible && !includeInvisible) {
		return null;
	}

	const formattedParam: FormattedParameter = {
		name: param.name,
		displayName: param.displayName,
		type: param.type,
		description: param.description,
	};

	// Add visibility state if including invisible params
	if (includeInvisible) {
		formattedParam.isVisible = param.isVisible;
	}

	// Add type-specific information
	addTypeSpecificInfo(param, formattedParam);

	// Add default value if exists
	if (param.default !== undefined) {
		formattedParam.default = param.default;
	}

	// Add dependency information if available
	if (param.dependencies?.length) {
		formattedParam.dependsOn = param.dependencies;
	}
	// if (param.dependents?.length) {
	// 	formattedParam.controls = param.dependents;
	// }

	// Add validation rules if any
	addValidationRules(param, formattedParam);

	return formattedParam;
}

/**
 * Format filtered parameters for LLM consumption
 * This provides a cleaner, more focused view of the available parameters
 */
export function formatFilteredParameters(
	filteredResult: FilteredParametersResult,
	options: {
		includeInvisible?: boolean;
		includeMetadata?: boolean;
	} = {},
): FormattedResult {
	const { includeInvisible = false, includeMetadata = true } = options;

	const formatted: FormattedResult = {
		parameters: [],
	};

	// Add metadata if requested
	if (includeMetadata) {
		if (filteredResult.controlParameters?.length) {
			formatted.controlParameters = filteredResult.controlParameters;
			formatted.hint =
				'Some parameters control the visibility of others. Changing control parameters may reveal additional options.';
		}

		// Add special note for tool nodes
		const hasToolParameter = filteredResult.parameters.some(
			(p) =>
				(p.dependencies?.includes('@tool') ?? false) || (p.dependents?.includes('@tool') ?? false),
		);
		if (hasToolParameter) {
			formatted.toolNodeHint =
				'This is a tool node. Some parameters may only be visible when specific tools are selected.';
		}
	}

	// Format each parameter
	for (const param of filteredResult.parameters) {
		const formattedParam = formatParameter(param, includeInvisible);
		if (formattedParam) {
			formatted.parameters.push(formattedParam);
		}
	}

	return formatted;
}
