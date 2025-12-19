import type { INodeProperties, INodeTypeDescription } from 'n8n-workflow';

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
 * Check if a version matches the given version conditions.
 * Supports both simple values (e.g., [1, 2]) and complex conditions (e.g., [{ _cnd: { gte: 2.2 } }])
 */
function checkVersionCondition(conditions: unknown[], nodeVersion: number): boolean {
	return conditions.some((condition) => {
		// Simple value match
		if (typeof condition === 'number') {
			return condition === nodeVersion;
		}

		// Complex condition with _cnd operator
		if (
			condition &&
			typeof condition === 'object' &&
			'_cnd' in condition &&
			typeof (condition as Record<string, unknown>)._cnd === 'object'
		) {
			const cnd = (condition as { _cnd: Record<string, number> })._cnd;
			const [operator, targetValue] = Object.entries(cnd)[0];

			switch (operator) {
				case 'eq':
					return nodeVersion === targetValue;
				case 'not':
					return nodeVersion !== targetValue;
				case 'gte':
					return nodeVersion >= targetValue;
				case 'lte':
					return nodeVersion <= targetValue;
				case 'gt':
					return nodeVersion > targetValue;
				case 'lt':
					return nodeVersion < targetValue;
				default:
					return false;
			}
		}

		return false;
	});
}

/**
 * Check if a property is visible for a specific node version based on @version displayOptions.
 */
function isPropertyVisibleForVersion(property: INodeProperties, nodeVersion: number): boolean {
	const displayOptions = property.displayOptions;

	if (!displayOptions) {
		return true;
	}

	const { show, hide } = displayOptions;

	// Check 'show' conditions for @version
	if (show?.['@version']) {
		const versionConditions = show['@version'];
		const matches = checkVersionCondition(versionConditions, nodeVersion);
		if (!matches) {
			return false;
		}
	}

	// Check 'hide' conditions for @version
	if (hide?.['@version']) {
		const versionConditions = hide['@version'];
		const matches = checkVersionCondition(versionConditions, nodeVersion);
		if (matches) {
			return false;
		}
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

		// Check version visibility
		if (!isPropertyVisibleForVersion(prop, nodeVersion)) {
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
 * Extract options from a property that has options type
 */
function extractOptions(property: INodeProperties): Array<{ value: string; displayName: string }> {
	if (!property.options || !Array.isArray(property.options)) {
		return [];
	}

	return property.options
		.filter(
			(opt): opt is { name: string; value: string } =>
				typeof opt === 'object' &&
				opt !== null &&
				'name' in opt &&
				'value' in opt &&
				typeof opt.value === 'string',
		)
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
 * @returns Resource/operation info, or null if the node doesn't follow the resource/operation pattern
 */
export function extractResourceOperations(
	nodeType: INodeTypeDescription,
	nodeVersion: number,
): ResourceOperationInfo | null {
	const properties = nodeType.properties;
	if (!properties || properties.length === 0) {
		return null;
	}

	// Find the resource property
	const resourceProperty = findResourceProperty(properties, nodeVersion);
	if (!resourceProperty) {
		return null;
	}

	// Extract resource options
	const resourceOptions = extractOptions(resourceProperty);
	if (resourceOptions.length === 0) {
		return null;
	}

	// For each resource, find its operations
	const resources: ResourceInfo[] = resourceOptions.map((resource) => {
		const operationProperties = findOperationProperties(properties, resource.value, nodeVersion);

		// Merge operations from all matching operation properties
		const allOperations: OperationInfo[] = [];
		const seenValues = new Set<string>();

		for (const opProp of operationProperties) {
			const ops = extractOptions(opProp);
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
