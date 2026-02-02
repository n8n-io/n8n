/**
 * CRDT Expression Resolver Composable
 *
 * Provides expression resolution via the coordinator worker for CRDT mode.
 * Used by expression editor autocomplete to resolve expressions on-demand.
 */

import { computed, type ComputedRef, type Ref } from 'vue';
import { resolveExpression } from '@/app/workers/coordinator';
import type { CrdtAutocompleteResolver } from '@/app/constants';

/**
 * Create a CRDT autocomplete resolver for a specific workflow.
 *
 * @param workflowId - The workflow ID (reactive)
 * @param activeNodeName - The currently active node name (reactive)
 * @returns A computed resolver that can be passed to the expression editor
 */
export function useCrdtExpressionResolver(
	workflowId: Ref<string> | ComputedRef<string>,
	activeNodeName: Ref<string | undefined> | ComputedRef<string | undefined>,
): ComputedRef<CrdtAutocompleteResolver | undefined> {
	return computed(() => {
		const wfId = workflowId.value;
		if (!wfId) return undefined;

		return {
			workflowId: wfId,
			async resolve(expression: string, contextNodeName?: string): Promise<unknown> {
				const nodeName = contextNodeName ?? activeNodeName.value;
				if (!nodeName) return null;

				try {
					return await resolveExpression(wfId, expression, nodeName);
				} catch {
					return null;
				}
			},
		};
	});
}
