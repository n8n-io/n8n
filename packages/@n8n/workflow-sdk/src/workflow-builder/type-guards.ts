/**
 * Type guard functions for workflow builder composites and builders
 */

import type { NodeInstance } from '../types/base';

/**
 * Helper to safely access a property from an object after 'in' check
 */
function getObjectProperty<T>(obj: object, key: string): T {
	return (obj as Record<string, unknown>)[key] as T;
}

/**
 * Check if value is a SplitInBatchesBuilder or a chain (DoneChain/EachChain) from one
 */
export function isSplitInBatchesBuilder(value: unknown): boolean {
	if (value === null || typeof value !== 'object') return false;

	// Direct builder check
	if ('sibNode' in value && '_doneNodes' in value && '_eachNodes' in value) {
		return true;
	}

	// Check if it's a DoneChain or EachChain with a _parent that's a builder
	if ('_parent' in value && '_nodes' in value) {
		const parent: unknown = getObjectProperty(value, '_parent');
		return (
			parent !== null &&
			typeof parent === 'object' &&
			'sibNode' in parent &&
			'_doneNodes' in parent &&
			'_eachNodes' in parent
		);
	}

	return false;
}

/**
 * SplitInBatchesBuilder shape for extraction
 */
export interface SplitInBatchesBuilderShape {
	sibNode: NodeInstance<'n8n-nodes-base.splitInBatches', string, unknown>;
	_doneNodes: Array<NodeInstance<string, string, unknown>>;
	_eachNodes: Array<NodeInstance<string, string, unknown>>;
	_doneBatches: Array<
		NodeInstance<string, string, unknown> | Array<NodeInstance<string, string, unknown>>
	>;
	_eachBatches: Array<
		NodeInstance<string, string, unknown> | Array<NodeInstance<string, string, unknown>>
	>;
	_hasLoop: boolean;
	// Named syntax properties (optional - only present for splitInBatches(node, { done, each }))
	_doneTarget?: unknown;
	_eachTarget?: unknown;
}

/**
 * Extract the SplitInBatchesBuilder from a value (handles both direct builder and chains)
 * Precondition: value must pass isSplitInBatchesBuilder check
 */
export function extractSplitInBatchesBuilder(value: unknown): SplitInBatchesBuilderShape {
	if (value === null || typeof value !== 'object') {
		throw new Error('extractSplitInBatchesBuilder requires a non-null object');
	}

	// Direct builder - has sibNode property
	if ('sibNode' in value) {
		return value as SplitInBatchesBuilderShape;
	}

	// Chain with _parent - extract the parent builder
	if ('_parent' in value) {
		return getObjectProperty<SplitInBatchesBuilderShape>(value, '_parent');
	}

	throw new Error('extractSplitInBatchesBuilder: value is not a valid builder or chain');
}

/**
 * Check if value is a SwitchCaseComposite
 */
export function isSwitchCaseComposite(value: unknown): boolean {
	if (value === null || typeof value !== 'object') return false;
	return 'switchNode' in value && 'cases' in value;
}

/**
 * Check if value is an IfElseComposite
 */
export function isIfElseComposite(value: unknown): boolean {
	if (value === null || typeof value !== 'object') return false;
	return 'ifNode' in value && 'trueBranch' in value;
}
