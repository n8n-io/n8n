/**
 * Reusable validation helper functions for execution context assertions.
 * These functions provide consistent and composable validation patterns
 * for testing execution context propagation across workflows.
 */

import type { IExecutionContext } from 'n8n-workflow';

/**
 * Validates the basic structure and required fields of an execution context.
 *
 * @param context - The execution context to validate
 * @param expectedVersion - Expected context version (default: 1)
 */
export function validateBasicContextStructure(
	context: IExecutionContext,
	expectedVersion = 1,
): void {
	expect(context).toBeDefined();
	expect(context.version).toBe(expectedVersion);
	expect(context.establishedAt).toBeDefined();
	expect(typeof context.establishedAt).toBe('number');
	expect(context.establishedAt).toBeGreaterThan(0);
}

/**
 * Validates that a context has the expected source mode.
 *
 * @param context - The execution context to validate
 * @param expectedSource - Expected execution source ('manual', 'trigger', 'integrated', 'internal')
 */
export function validateContextSource(context: IExecutionContext, expectedSource: string): void {
	expect(context.source).toBeDefined();
	expect(context.source).toBe(expectedSource);
}

/**
 * Validates that a context is a root context (no parent execution).
 * Root contexts are typically created by manual or scheduled executions.
 *
 * @param context - The execution context to validate
 * @param expectedSource - Expected execution source for the root context
 */
export function validateRootContext(context: IExecutionContext, expectedSource: string): void {
	validateBasicContextStructure(context);
	validateContextSource(context, expectedSource);
	expect(context.parentExecutionId).toBeUndefined();
}

/**
 * Validates that a context is a child context with a parent execution ID.
 *
 * @param context - The child execution context to validate
 * @param expectedParentExecutionId - Expected parent execution ID
 */
export function validateChildContextParentage(
	context: IExecutionContext,
	expectedParentExecutionId: string,
): void {
	expect(context).toBeDefined();
	expect(context.parentExecutionId).toBe(expectedParentExecutionId);
}

/**
 * Validates that a child context properly inherits credentials from its parent.
 *
 * @param childContext - The child execution context
 * @param parentContext - The parent execution context
 */
export function validateCredentialInheritance(
	childContext: IExecutionContext,
	parentContext: IExecutionContext,
): void {
	if (parentContext.credentials) {
		expect(childContext.credentials).toBe(parentContext.credentials);
	}
}

/**
 * Validates that a child context has a fresh (equal or later) establishedAt timestamp
 * compared to its parent context.
 *
 * @param childContext - The child execution context
 * @param parentContext - The parent execution context
 */
export function validateFreshTimestamp(
	childContext: IExecutionContext,
	parentContext: IExecutionContext,
): void {
	expect(childContext.establishedAt).toBeDefined();
	expect(typeof childContext.establishedAt).toBe('number');
	expect(childContext.establishedAt).toBeGreaterThanOrEqual(parentContext.establishedAt);
}

/**
 * Validates that a child context has the same version as its parent.
 *
 * @param childContext - The child execution context
 * @param parentContext - The parent execution context
 */
export function validateVersionInheritance(
	childContext: IExecutionContext,
	parentContext: IExecutionContext,
): void {
	expect(childContext.version).toBe(parentContext.version);
}

/**
 * Validates that a child context source is one of the expected sub-workflow sources.
 *
 * @param context - The execution context to validate
 * @param allowedSources - Array of allowed source modes (default: ['trigger', 'integrated', 'internal'])
 */
export function validateSubWorkflowSource(
	context: IExecutionContext,
	allowedSources = ['trigger', 'integrated', 'internal'],
): void {
	expect(context.source).toBeDefined();
	expect(allowedSources).toContain(context.source);
}

/**
 * Comprehensive validation that a child context properly inherits from its parent.
 * This combines multiple validation patterns into a single function.
 *
 * @param childContext - The child execution context
 * @param parentContext - The parent execution context
 * @param parentExecutionId - The parent execution ID
 */
export function validateChildContextInheritance(
	childContext: IExecutionContext,
	parentContext: IExecutionContext,
	parentExecutionId: string,
): void {
	validateBasicContextStructure(childContext);
	validateChildContextParentage(childContext, parentExecutionId);
	validateCredentialInheritance(childContext, parentContext);
	validateFreshTimestamp(childContext, parentContext);
	validateVersionInheritance(childContext, parentContext);
	validateSubWorkflowSource(childContext);
}

/**
 * Validates a timestamp chain across multiple execution contexts.
 * Ensures that each context in the chain has a timestamp greater than or equal
 * to the previous context's timestamp.
 *
 * @param contexts - Array of execution contexts in chronological order
 */
export function validateTimestampChain(contexts: IExecutionContext[]): void {
	for (let i = 0; i < contexts.length - 1; i++) {
		expect(contexts[i].establishedAt).toBeLessThanOrEqual(contexts[i + 1].establishedAt);
	}
}

/**
 * Validates that all provided contexts have the same version number.
 *
 * @param contexts - Array of execution contexts to validate
 */
export function validateConsistentVersions(contexts: IExecutionContext[]): void {
	const firstVersion = contexts[0].version;
	for (const context of contexts) {
		expect(context.version).toBe(firstVersion);
	}
}

/**
 * Validates a complete context inheritance chain from root to leaf.
 * This validates that each child properly inherits from its parent,
 * timestamps form a valid chain, and versions are consistent.
 *
 * @param contextChain - Array of objects containing context and parent execution ID
 *                       First element should be the root (parentExecutionId can be undefined)
 */
export function validateContextInheritanceChain(
	contextChain: Array<{
		context: IExecutionContext;
		parentExecutionId?: string;
	}>,
): void {
	// Validate root context
	const root = contextChain[0];
	validateBasicContextStructure(root.context);
	expect(root.context.parentExecutionId).toBeUndefined();

	// Validate each child in the chain
	for (let i = 1; i < contextChain.length; i++) {
		const parent = contextChain[i - 1];
		const child = contextChain[i];

		expect(child.parentExecutionId).toBeDefined();
		validateChildContextInheritance(child.context, parent.context, child.parentExecutionId!);
	}

	// Validate timestamp chain
	const contexts = contextChain.map((c) => c.context);
	validateTimestampChain(contexts);
	validateConsistentVersions(contexts);
}
