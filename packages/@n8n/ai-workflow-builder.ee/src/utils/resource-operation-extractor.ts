import {
	displayParameter,
	type INodeProperties,
	type INodeTypeDescription,
	type Logger,
} from 'n8n-workflow';

/**
 * Represents an operation available for a resource
 */
export interface OperationInfo {
	value: string;
	displayName: string;
}

/**
 * Represents a resource with its available operations
 */
export interface ResourceInfo {
	value: string;
	displayName: string;
	operations: OperationInfo[];
}

/**
 * Resource/operation information extracted from a node type
 */
export interface ResourceOperationInfo {
	resources: ResourceInfo[];
}

/**
 * Check if a property is visible for a specific node version.
 * Uses the core n8n-workflow displayParameter utility which handles @version conditions.
 */
function isPropertyVisibleForVersion(
	property: INodeProperties,
	nodeVersion: number,
	nodeType: INodeTypeDescription,
): boolean {
	// Use displayParameter with empty values to check @version conditions
	return displayParameter({}, property, { typeVersion: nodeVersion }, nodeType);
}

/**
 * Find the 'resource' property in a node type (if it exists)
 */
function findResourceProperty(
	properties: INodeProperties[],
	nodeVersion: number,
	nodeType: INodeTypeDescription,
): INodeProperties | undefined {
	return properties.find(
		(prop) =>
			prop.name === 'resource' &&
			prop.type === 'options' &&
			isPropertyVisibleForVersion(prop, nodeVersion, nodeType),
	);
}

/**
 * Find 'operation' properties that match a specific resource value
 */
function findOperationProperties(
	properties: INodeProperties[],
	resourceValue: string,
	nodeVersion: number,
	nodeType: INodeTypeDescription,
): INodeProperties[] {
	return properties.filter((prop) => {
		if (prop.name !== 'operation' || prop.type !== 'options') {
			return false;
		}

		// Check version visibility using core displayParameter utility
		if (!isPropertyVisibleForVersion(prop, nodeVersion, nodeType)) {
			return false;
		}

		// Check if this operation is for the specified resource
		const displayOptions = prop.displayOptions;
		if (!displayOptions?.show?.resource) {
			// No resource condition means it applies to all resources
			return true;
		}

		const resourceCondition = displayOptions.show.resource;
		return resourceCondition.includes(resourceValue);
	});
}

/**
 * Extract options from a property that has options type.
 * Only extracts options with string values - resource/operation values
 * are always strings in n8n. Non-string values (number/boolean) are
 * used for other option types like toggles.
 */
function extractOptions(
	property: INodeProperties,
	logger?: Logger,
): Array<{ value: string; displayName: string }> {
	if (!property.options || !Array.isArray(property.options)) {
		return [];
	}

	return property.options
		.filter((opt): opt is { name: string; value: string } => {
			if (typeof opt !== 'object' || opt === null || !('name' in opt) || !('value' in opt)) {
				return false;
			}
			// Extract after guards pass - TypeScript now knows these exist
			const optName = opt.name;
			const optValue = opt.value;
			// Resource/operation values are always strings in n8n.
			// Non-string values (number/boolean) are used for other option types.
			if (typeof optValue !== 'string') {
				logger?.debug('Skipping non-string option value in resource/operation extraction', {
					propertyName: property.name,
					optionName: optName,
					valueType: typeof optValue,
				});
				return false;
			}
			return true;
		})
		.map((opt) => ({
			value: opt.value,
			displayName: opt.name,
		}));
}

/**
 * Extract resource and operation information from a node type description.
 * This is used to provide accurate resource/operation options to the configurator.
 *
 * @param nodeType - The node type description
 * @param nodeVersion - The version of the node to extract info for
 * @param logger - Optional logger for debugging extraction issues
 * @returns Resource/operation info, or null if the node doesn't follow the resource/operation pattern
 */
export function extractResourceOperations(
	nodeType: INodeTypeDescription,
	nodeVersion: number,
	logger?: Logger,
): ResourceOperationInfo | null {
	const properties = nodeType.properties;
	if (!properties || properties.length === 0) {
		logger?.debug('extractResourceOperations: No properties found', {
			nodeType: nodeType.name,
			nodeVersion,
		});
		return null;
	}

	// Find the resource property
	const resourceProperty = findResourceProperty(properties, nodeVersion, nodeType);
	if (!resourceProperty) {
		// This is expected for most nodes - they don't follow resource/operation pattern
		return null;
	}

	// Extract resource options
	const resourceOptions = extractOptions(resourceProperty, logger);
	if (resourceOptions.length === 0) {
		logger?.warn('extractResourceOperations: Resource property found but no string options', {
			nodeType: nodeType.name,
			nodeVersion,
			propertyDefault: resourceProperty.default,
		});
		return null;
	}

	// For each resource, find its operations
	const resources: ResourceInfo[] = resourceOptions.map((resource) => {
		const operationProperties = findOperationProperties(
			properties,
			resource.value,
			nodeVersion,
			nodeType,
		);

		// Merge operations from all matching operation properties
		const allOperations: OperationInfo[] = [];
		const seenValues = new Set<string>();

		for (const opProp of operationProperties) {
			const ops = extractOptions(opProp, logger);
			for (const op of ops) {
				if (!seenValues.has(op.value)) {
					seenValues.add(op.value);
					allOperations.push({
						value: op.value,
						displayName: op.displayName,
					});
				}
			}
		}

		return {
			value: resource.value,
			displayName: resource.displayName,
			operations: allOperations,
		};
	});

	return { resources };
}

/**
 * Format resource/operation info as a string for inclusion in tool output
 */
export function formatResourceOperationsForPrompt(info: ResourceOperationInfo): string {
	const parts: string[] = ['<available_resources_and_operations>'];

	for (const resource of info.resources) {
		parts.push(`  Resource: ${resource.displayName} (value: "${resource.value}")`);
		if (resource.operations.length > 0) {
			parts.push('    Operations:');
			for (const op of resource.operations) {
				parts.push(`      - ${op.displayName} (value: "${op.value}")`);
			}
		} else {
			parts.push('    Operations: none defined');
		}
	}

	parts.push('</available_resources_and_operations>');
	return parts.join('\n');
}
