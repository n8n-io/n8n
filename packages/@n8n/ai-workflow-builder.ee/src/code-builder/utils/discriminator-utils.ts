/**
 * Utility functions for extracting discriminator information from node types
 * Used by the search tool to show available discriminators for split type files
 */

import type {
	INodeProperties,
	INodeTypeDescription,
	IParameterBuilderHint,
	NodeConnectionType,
} from 'n8n-workflow';

/**
 * Represents a single mode option with its metadata
 */
export interface ModeInfo {
	/** The mode value (e.g., 'retrieve', 'retrieve-as-tool') */
	value: string;
	/** The display name (e.g., 'Retrieve Documents (As Tool for AI Agent)') */
	displayName: string;
	/** The output connection type if this mode creates a subnode (e.g., 'ai_tool', 'ai_vectorStore') */
	outputConnectionType?: NodeConnectionType;
	/** The description of what this mode does */
	description?: string;
	/** Hint for the AI workflow builder on when to use this mode */
	builderHint?: IParameterBuilderHint;
}

/**
 * Represents mode discriminator information
 */
export interface ModeDiscriminatorInfo {
	modes: ModeInfo[];
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

	// Find the mode property (skip modes subordinate to operation or resource)
	const modeProperty = properties.find(
		(prop) =>
			prop.name === 'mode' &&
			prop.type === 'options' &&
			isPropertyVisibleForVersion(prop, nodeVersion) &&
			!prop.displayOptions?.show?.operation &&
			!prop.displayOptions?.show?.resource,
	);

	if (!modeProperty?.options) {
		return null;
	}

	// Extract mode values with their metadata
	const modes: ModeInfo[] = modeProperty.options
		.filter(
			(
				opt,
			): opt is {
				name: string;
				value: string;
				outputConnectionType?: NodeConnectionType;
				description?: string;
				builderHint?: IParameterBuilderHint;
			} =>
				typeof opt === 'object' && opt !== null && 'value' in opt && typeof opt.value === 'string',
		)
		.map((opt) => ({
			value: opt.value,
			displayName: opt.name,
			outputConnectionType: opt.outputConnectionType,
			description: opt.description,
			builderHint: opt.builderHint,
		}));

	if (modes.length === 0) {
		return null;
	}

	return { modes };
}

/**
 * Represents a single operation option for operation-only nodes
 */
export interface OperationOnlyInfo {
	value: string;
	displayName: string;
	description?: string;
	builderHint?: IParameterBuilderHint;
}

/**
 * Represents operation-only discriminator information
 */
export interface OperationOnlyDiscriminatorInfo {
	operations: OperationOnlyInfo[];
}

/**
 * Extract operation discriminator from nodes that have operation but no resource property.
 * These nodes (e.g. Remove Duplicates) use operation as their top-level discriminator.
 */
export function extractOperationOnlyDiscriminator(
	nodeType: INodeTypeDescription,
	nodeVersion: number,
): OperationOnlyDiscriminatorInfo | null {
	const properties = nodeType.properties;
	if (!properties || properties.length === 0) {
		return null;
	}

	// Must NOT have a resource property (otherwise extractResourceOperations handles it)
	const hasResource = properties.some(
		(prop) =>
			prop.name === 'resource' &&
			prop.type === 'options' &&
			isPropertyVisibleForVersion(prop, nodeVersion),
	);
	if (hasResource) {
		return null;
	}

	// Find a standalone operation property
	const operationProperty = properties.find(
		(prop) =>
			prop.name === 'operation' &&
			prop.type === 'options' &&
			isPropertyVisibleForVersion(prop, nodeVersion),
	);

	if (!operationProperty?.options) {
		return null;
	}

	const operations: OperationOnlyInfo[] = operationProperty.options
		.filter(
			(
				opt,
			): opt is {
				name: string;
				value: string;
				description?: string;
				builderHint?: IParameterBuilderHint;
			} =>
				typeof opt === 'object' && opt !== null && 'value' in opt && typeof opt.value === 'string',
		)
		.map((opt) => ({
			value: opt.value,
			displayName: opt.name,
			description: opt.description,
			builderHint: opt.builderHint,
		}));

	if (operations.length === 0) {
		return null;
	}

	return { operations };
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
