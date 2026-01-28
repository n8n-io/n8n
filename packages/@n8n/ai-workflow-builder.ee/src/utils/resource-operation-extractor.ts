import {
	checkConditions,
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
 * Check if a property is visible for a specific node version by checking @version conditions.
 * We check only @version instead of using displayParameter because displayParameter
 * checks ALL displayOptions conditions (including resource), but we only want to filter
 * by version here - resource filtering happens separately in findOperationProperties.
 */
function isPropertyVisibleForVersion(property: INodeProperties, nodeVersion: number): boolean {
	const displayOptions = property.displayOptions;

	// No displayOptions means visible for all versions
	if (!displayOptions) {
		return true;
	}

	// Check @version in 'show' conditions - ALL show conditions must match
	const showVersion = displayOptions.show?.['@version'];
	if (showVersion && !checkConditions(showVersion, [nodeVersion])) {
		return false;
	}

	// Check @version in 'hide' conditions - ANY hide condition matching means hidden
	const hideVersion = displayOptions.hide?.['@version'];
	if (hideVersion && checkConditions(hideVersion, [nodeVersion])) {
		return false;
	}

	return true;
}

/**
 * Find the 'resource' property in a node type (if it exists)
 */
function findResourceProperty(
	properties: INodeProperties[],
	nodeVersion: number,
): INodeProperties | undefined {
	return properties.find(
		(prop) =>
			prop.name === 'resource' &&
			prop.type === 'options' &&
			isPropertyVisibleForVersion(prop, nodeVersion),
	);
}

/**
 * Check if an operation is visible for a specific resource value.
 * Uses checkConditions to handle both simple arrays and complex _cnd conditions.
 */
function isOperationVisibleForResource(prop: INodeProperties, resourceValue: string): boolean {
	const displayOptions = prop.displayOptions;
	if (!displayOptions) {
		return true; // No conditions = visible for all resources
	}

	// Check show.resource - must match if specified
	const showResource = displayOptions.show?.resource;
	if (showResource && !checkConditions(showResource, [resourceValue])) {
		return false;
	}

	// Check hide.resource - must NOT match if specified
	const hideResource = displayOptions.hide?.resource;
	if (hideResource && checkConditions(hideResource, [resourceValue])) {
		return false;
	}

	return true;
}

/**
 * Find 'operation' properties that match a specific resource value
 */
function findOperationProperties(
	properties: INodeProperties[],
	resourceValue: string,
	nodeVersion: number,
): INodeProperties[] {
	return properties.filter((prop) => {
		if (prop.name !== 'operation' || prop.type !== 'options') {
			return false;
		}

		// Check version visibility (only @version conditions, not resource)
		if (!isPropertyVisibleForVersion(prop, nodeVersion)) {
			return false;
		}

		// Check resource visibility using checkConditions for proper condition handling
		return isOperationVisibleForResource(prop, resourceValue);
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
	const resourceProperty = findResourceProperty(properties, nodeVersion);
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
		const operationProperties = findOperationProperties(properties, resource.value, nodeVersion);

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
 * Create a cache key for resource/operation info lookup.
 * Format: "nodeName:version"
 */
export function createResourceCacheKey(nodeName: string, version: number): string {
	return `${nodeName}:${version}`;
}

/**
 * Format resource/operation info as a string for inclusion in tool output
 */
export function formatResourceOperationsForPrompt(info: ResourceOperationInfo): string {
	const parts: string[] = ['<available_resources_and_operations>'];

	for (const resource of info.resources) {
		// Skip __CUSTOM_API_CALL__ resources - not useful for workflow building
		if (resource.value === '__CUSTOM_API_CALL__') continue;

		parts.push(`  Resource: ${resource.displayName} (value: "${resource.value}")`);

		// Filter out __CUSTOM_API_CALL__ operations
		const filteredOps = resource.operations.filter((op) => op.value !== '__CUSTOM_API_CALL__');
		if (filteredOps.length > 0) {
			parts.push('    Operations:');
			for (const op of filteredOps) {
				parts.push(`      - ${op.displayName} (value: "${op.value}")`);
			}
		} else {
			parts.push('    Operations: none defined');
		}
	}

	parts.push('</available_resources_and_operations>');
	return parts.join('\n');
}
