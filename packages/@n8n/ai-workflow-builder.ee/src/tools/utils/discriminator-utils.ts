/**
 * Utility functions for extracting discriminator information from node types
 * Used by the search tool to show available discriminators for split type files
 */

import type { INodeProperties, INodeTypeDescription } from 'n8n-workflow';

/**
 * Represents mode discriminator information
 */
export interface ModeDiscriminatorInfo {
	modes: string[];
}

/**
 * Extract mode discriminator information from a node type
 * The mode discriminator is used by nodes like Code that have different execution modes
 *
 * @param nodeType The node type description
 * @param nodeVersion The version to extract for
 * @returns Mode info or null if no mode discriminator found
 */
export function extractModeDiscriminator(
	nodeType: INodeTypeDescription,
	nodeVersion: number,
): ModeDiscriminatorInfo | null {
	const properties = nodeType.properties;
	if (!properties || properties.length === 0) {
		return null;
	}

	// Find the mode property
	const modeProperty = properties.find(
		(prop) =>
			prop.name === 'mode' &&
			prop.type === 'options' &&
			isPropertyVisibleForVersion(prop, nodeVersion),
	);

	if (!modeProperty || !modeProperty.options) {
		return null;
	}

	// Extract mode values
	const modes = modeProperty.options
		.filter(
			(opt): opt is { name: string; value: string } =>
				typeof opt === 'object' && opt !== null && 'value' in opt && typeof opt.value === 'string',
		)
		.map((opt) => opt.value);

	if (modes.length === 0) {
		return null;
	}

	return { modes };
}

/**
 * Check if a property is visible for a specific node version
 */
function isPropertyVisibleForVersion(property: INodeProperties, nodeVersion: number): boolean {
	const displayOptions = property.displayOptions;

	if (!displayOptions) {
		return true;
	}

	// Check @version in 'show' conditions
	const showVersion = displayOptions.show?.['@version'];
	if (showVersion) {
		if (Array.isArray(showVersion)) {
			if (!showVersion.includes(nodeVersion)) {
				return false;
			}
		}
	}

	// Check @version in 'hide' conditions
	const hideVersion = displayOptions.hide?.['@version'];
	if (hideVersion) {
		if (Array.isArray(hideVersion)) {
			if (hideVersion.includes(nodeVersion)) {
				return false;
			}
		}
	}

	return true;
}
