/**
 * Utility functions for parameter updater prompts.
 */

import type { INodeTypeDescription, INodeProperties } from 'n8n-workflow';

/**
 * Analyzes node definition to determine if it has resource locator parameters.
 */
export function hasResourceLocatorParameters(nodeDefinition: INodeTypeDescription): boolean {
	if (!nodeDefinition.properties) return false;

	const checkProperties = (properties: INodeProperties[]): boolean => {
		for (const prop of properties) {
			if (prop.type === 'resourceLocator' || prop.type === 'fixedCollection') return true;
		}
		return false;
	};

	return checkProperties(nodeDefinition.properties);
}
