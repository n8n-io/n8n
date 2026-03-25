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
	type DiscriminatorTree,
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
	buildDiscriminatorTree,
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
	// Split version generation (for nodes with discriminators)
	hasDiscriminatorPattern,
	planSplitVersionFiles,
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
	// Orchestration
	orchestrateGeneration,
	type GenerationOptions,
	type GenerationResult,
} from './generate-types';

// Zod schema generation
export {
	// Types
	type SchemaGenerationResult,
	type SchemaInfo,
	// Core functions
	mapPropertyToZodSchema,
	generateSchemaPropertyLine,
	// File generation (flat versions)
	generateSingleVersionSchemaFile,
	generateSchemaIndexFile,
	// File generation (split versions with discriminators)
	generateDiscriminatorSchemaFile,
	generateResourceIndexSchemaFile,
	generateSplitVersionIndexSchemaFile,
	planSplitVersionSchemaFiles,
} from './generate-zod-schemas';

// Zod helpers (for use in generated files)
export * from './zod-helpers';
