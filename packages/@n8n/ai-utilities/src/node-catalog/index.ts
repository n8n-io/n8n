/**
 * Node-catalog helpers — plain, LangChain-free utilities for parsing,
 * searching, and describing n8n node type descriptions. Designed to be
 * imported from a leaf subpath (`@n8n/ai-utilities/node-catalog`) so callers
 * don't drag in the heavier dependencies of the main ai-utilities entry.
 *
 * The LangChain `tool()` wrappers that compose these helpers (used by the
 * workflow builder agent) live in `@n8n/ai-workflow-builder`.
 */

export { NodeTypeParser } from './node-type-parser';
export type { ParsedNodeType } from './node-type-parser';

export { CodeBuilderNodeSearchEngine, SCORE_WEIGHTS } from './search-engine';

export { searchCodeBuilderNodes, formatNodeResult } from './search';
export type {
	CodeBuilderSearchResult,
	CodeBuilderSearchToolOptions,
} from './search';

export {
	getNodeTypes,
	isValidPathComponent,
	validatePathWithinBase,
} from './get';
export type { NodeRequest, CodeBuilderGetToolOptions } from './get';

export { getSuggestedNodes, categoryList } from './suggested';

export {
	suggestedNodesData,
	type CategoryData,
	type CategorySuggestedNode,
} from './suggested-nodes-data';

export {
	extractModeDiscriminator,
	extractOperationOnlyDiscriminator,
} from './discriminator-utils';
export type {
	ModeInfo,
	ModeDiscriminatorInfo,
	OperationOnlyInfo,
	OperationOnlyDiscriminatorInfo,
} from './discriminator-utils';

export {
	extractResourceOperations,
	createResourceCacheKey,
	formatResourceOperationsForPrompt,
} from './resource-operation-extractor';
export type {
	OperationInfo,
	ResourceInfo,
	ResourceOperationInfo,
	ExtractOptions,
} from './resource-operation-extractor';

export type { SubnodeRequirement, CodeBuilderNodeSearchResult } from './types';
