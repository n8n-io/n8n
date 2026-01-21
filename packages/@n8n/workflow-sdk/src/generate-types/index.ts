/**
 * Type Generation Utilities
 *
 * Exports functions for generating TypeScript types from node definitions.
 * Used by both the build-time script and the runtime CLI service.
 */

export {
	// Types
	type NodeProperty,
	type NodeTypeDescription,
	type DiscriminatorCombination,
	type VersionGroup,
	type OutputSchema,
	type JsonSchema,
	type ConfigTypeInfo,
	type DiscriminatedUnionResult,
	// Core functions
	mapPropertyType,
	extractDiscriminatorCombinations,
	getPropertiesForCombination,
	propertyAppliesToVersion,
	filterPropertiesForVersion,
	generateDiscriminatedUnion,
	generatePropertyJSDoc,
	generateNodeJSDoc,
	generatePropertyLine,
	groupVersionsByProperties,
	getHighestVersion,
	versionToTypeName,
	nodeNameToFileName,
	getPackageName,
	versionToFileName,
	// File generation
	generateSingleVersionTypeFile,
	generateVersionIndexFile,
	generateNodeTypeFile,
	generateIndexFile,
	// Subnode utilities
	extractOutputTypes,
	groupNodesByOutputType,
	generateSubnodeUnionTypes,
	generateSubnodesFile,
	getSubnodeOutputType,
	// Schema discovery
	discoverSchemasForNode,
	jsonSchemaToTypeScript,
	findSchemaForOperation,
	// Async utilities
	loadNodeTypes,
	generateTypes,
} from './generate-types';
