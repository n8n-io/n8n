/**
 * Schema Helpers
 *
 * Centralized re-exports of all Zod helpers needed by generated schema files.
 * This module is used by schema-validator.ts to pass helpers to factory functions.
 */

import { z } from 'zod';

// Re-export zod
export { z };

// Re-export all Zod helpers from generate-types/zod-helpers
export {
	expressionPattern,
	expressionSchema,
	stringOrExpression,
	numberOrExpression,
	booleanOrExpression,
	resourceLocatorValueSchema,
	filterOperatorSchema,
	filterConditionSchema,
	filterValueSchema,
	assignmentSchema,
	assignmentCollectionValueSchema,
	iDataObjectSchema,
	literalUnion,
	optionsWithExpression,
	multiOptionsSchema,
} from '../generate-types/zod-helpers';

// Re-export resolveSchema and types from resolve-schema
export { resolveSchema } from './resolve-schema';
export type { ResolveSchemaConfig, ResolveSchemaFn } from './resolve-schema';

// =============================================================================
// Resource Mapper Schema
// =============================================================================

/**
 * Resource Mapper Value schema (object format)
 * Used for mapping input data to columns/fields
 */
const resourceMapperObjectSchema = z
	.object({
		mappingMode: z.string(),
		value: z.unknown().optional(),
		schema: z.array(z.unknown()).optional(),
		cachedResultName: z.string().optional(),
	})
	.passthrough();

/**
 * Resource Mapper Value schema - accepts object format OR expression
 */
export const resourceMapperValueSchema = z.union([
	resourceMapperObjectSchema,
	z.string().regex(/^={{.*}}$/s, 'Must be an n8n expression (={{...}})'),
]);

// =============================================================================
// Subnode Instance Schemas
// =============================================================================

/**
 * Base schema for a subnode instance.
 * Used for AI subnodes like language models, tools, memory, etc.
 */
export const subnodeInstanceBaseSchema = z.object({
	type: z.string(),
	version: z.number(),
	config: z.record(z.string(), z.unknown()).optional(),
});

/**
 * Language Model subnode instance (ai_languageModel)
 */
export const languageModelInstanceSchema = subnodeInstanceBaseSchema;

/**
 * Memory subnode instance (ai_memory)
 */
export const memoryInstanceSchema = subnodeInstanceBaseSchema;

/**
 * Tool subnode instance (ai_tool)
 */
export const toolInstanceSchema = subnodeInstanceBaseSchema;

/**
 * Output Parser subnode instance (ai_outputParser)
 */
export const outputParserInstanceSchema = subnodeInstanceBaseSchema;

/**
 * Embedding subnode instance (ai_embedding)
 */
export const embeddingInstanceSchema = subnodeInstanceBaseSchema;

/**
 * Vector Store subnode instance (ai_vectorStore)
 */
export const vectorStoreInstanceSchema = subnodeInstanceBaseSchema;

/**
 * Retriever subnode instance (ai_retriever)
 */
export const retrieverInstanceSchema = subnodeInstanceBaseSchema;

/**
 * Document Loader subnode instance (ai_document)
 */
export const documentLoaderInstanceSchema = subnodeInstanceBaseSchema;

/**
 * Text Splitter subnode instance (ai_textSplitter)
 */
export const textSplitterInstanceSchema = subnodeInstanceBaseSchema;

/**
 * Reranker subnode instance (ai_reranker)
 */
export const rerankerInstanceSchema = subnodeInstanceBaseSchema;
