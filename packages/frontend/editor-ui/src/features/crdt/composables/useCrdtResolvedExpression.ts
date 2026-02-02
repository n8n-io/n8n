/**
 * CRDT Resolved Expression Composable
 *
 * Provides resolved expression values from the CRDT execution document.
 * This replaces the standard useResolvedExpression for CRDT mode.
 *
 * Key difference: Instead of resolving expressions on-demand (which requires
 * stores and execution context that don't exist in CRDT mode), this composable
 * reads pre-computed values from the CRDT execution document.
 *
 * The coordinator worker resolves expressions and stores results in:
 *   execDoc.getMap('resolvedParams').get(`${nodeId}:${paramPath}`)
 */

import { computed, inject, ref, watch, type ComputedRef, type Ref } from 'vue';
import { isExpression as isExpressionUtil } from '@/app/utils/expressions';
import type { ExecutionDocument } from '../types/executionDocument.types';
import { formatResolvedValue } from '../utils/formatting';

export interface UseCrdtResolvedExpressionOptions {
	/** The node ID to look up resolved expressions for */
	nodeId: ComputedRef<string | undefined> | Ref<string | undefined>;
	/** The parameter path (e.g., "parameters.value" or "value") */
	paramPath: ComputedRef<string> | Ref<string>;
	/** The expression value to check */
	expression: ComputedRef<unknown> | Ref<unknown>;
}

export interface UseCrdtResolvedExpressionReturn {
	/** The resolved value (or null if not resolved) */
	resolvedExpression: Ref<unknown>;
	/** The resolved value as a display string */
	resolvedExpressionString: Ref<string>;
	/** Whether the value is an expression */
	isExpression: ComputedRef<boolean>;
}

/**
 * Get resolved expression value from CRDT execution document.
 *
 * @example
 * ```ts
 * const { resolvedExpressionString, isExpression } = useCrdtResolvedExpression({
 *   nodeId: computed(() => activeNode.value?.id),
 *   paramPath: computed(() => `parameters.${props.parameter.name}`),
 *   expression: computed(() => props.modelValue),
 * });
 * ```
 */
export function useCrdtResolvedExpression(
	options: UseCrdtResolvedExpressionOptions,
): UseCrdtResolvedExpressionReturn {
	const { nodeId, paramPath, expression } = options;

	const executionDoc = inject<ExecutionDocument | null>('executionDoc', null);

	const resolvedExpression = ref<unknown>(null);
	const resolvedExpressionString = ref('');

	const isExpression = computed(() => isExpressionUtil(expression.value));

	// Build the full parameter path for CRDT lookup
	const fullParamPath = computed(() => {
		const path = paramPath.value;
		// Ensure path starts with "parameters." for consistency with coordinator
		if (path.startsWith('parameters.')) {
			return path;
		}
		return `parameters.${path}`;
	});

	/**
	 * Update the resolved expression from CRDT.
	 */
	function updateFromCrdt() {
		if (!isExpression.value) {
			resolvedExpression.value = null;
			resolvedExpressionString.value = '';
			return;
		}

		const nid = nodeId.value;
		if (!nid || !executionDoc) {
			resolvedExpression.value = null;
			resolvedExpressionString.value = '';
			return;
		}

		const resolved = executionDoc.getResolvedParam(nid, fullParamPath.value);
		if (!resolved) {
			// No resolved value yet - show pending state
			resolvedExpression.value = null;
			resolvedExpressionString.value = '';
			return;
		}

		resolvedExpression.value = resolved.resolved;
		resolvedExpressionString.value = formatResolvedValue(resolved);
	}

	// Watch for changes to inputs
	watch([nodeId, fullParamPath, expression], updateFromCrdt, { immediate: true });

	// Subscribe to CRDT changes for this parameter
	// Note: composables don't have lifecycle - the subscription will be cleaned up
	// when the execution doc is disconnected
	if (executionDoc) {
		executionDoc.onResolvedParamChange(({ nodeId: changedNodeId, paramPath: changedPath }) => {
			if (changedNodeId === nodeId.value && changedPath === fullParamPath.value) {
				updateFromCrdt();
			}
		});
	}

	return {
		resolvedExpression,
		resolvedExpressionString,
		isExpression,
	};
}
