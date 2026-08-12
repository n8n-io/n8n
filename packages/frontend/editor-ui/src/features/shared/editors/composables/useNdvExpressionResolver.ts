import { computed, inject, toValue, type MaybeRefOrGetter } from 'vue';
import type { IDataObject } from 'n8n-workflow';
import { Expression } from 'n8n-workflow';
import { useI18n } from '@n8n/i18n';
import {
	getExpressionErrorMessage,
	usesDeprecatedExpressionFunction,
	type ExpressionResolution,
	type ExpressionResolver,
} from '@n8n/expression-editor';

import { ExpressionLocalResolveContextSymbol } from '@/app/constants';
import { useNDVStore } from '@/features/ndv/shared/ndv.store';
import { injectWorkflowDocumentStore } from '@/app/stores/workflowDocument.store';
import { injectWorkflowExecutionStateStore } from '@/app/stores/workflowExecutionState.store';
import {
	type ResolveParameterOptions,
	useWorkflowHelpers,
} from '@/app/composables/useWorkflowHelpers';
import type { TargetNodeParameterContext } from '@/Interface';
import { isCredentialsModalOpen } from '../plugins/codemirror/completions/utils';

/**
 * Resolution against the workflow the NDV is open on: run data, pinned data,
 * the input node's target item, and the local-resolve context the canvas
 * preview provides in place of a live execution.
 */
export function useNdvExpressionResolver({
	targetNodeParameterContext,
	additionalData,
}: {
	targetNodeParameterContext?: MaybeRefOrGetter<TargetNodeParameterContext>;
	additionalData?: MaybeRefOrGetter<IDataObject>;
} = {}): ExpressionResolver {
	const workflowDocumentStore = injectWorkflowDocumentStore();
	const ndvStore = computed(() => useNDVStore(workflowDocumentStore.value.documentId));
	const workflowExecutionStateStore = injectWorkflowExecutionStateStore();
	const workflowHelpers = useWorkflowHelpers();
	const i18n = useI18n();
	const expressionLocalResolveContext = inject(
		ExpressionLocalResolveContextSymbol,
		computed(() => undefined),
	);

	async function resolve(resolvable: string): Promise<ExpressionResolution> {
		const result: ExpressionResolution = { resolved: undefined, error: false, fullError: null };
		const target = ndvStore.value.expressionTargetItem;

		try {
			// Deprecated functions still resolve on the backend, but we surface them
			// as an error in the editor preview to steer users off them.
			if (usesDeprecatedExpressionFunction(resolvable)) {
				throw new Error(i18n.baseText('expressionEditor.deprecated.getPairedItem'));
			}

			if (expressionLocalResolveContext.value) {
				result.resolved = await workflowHelpers.resolveExpression('=' + resolvable, undefined, {
					...expressionLocalResolveContext.value,
					additionalKeys: toValue(additionalData) ?? {},
				});
			} else if (
				isCredentialsModalOpen() ||
				(!ndvStore.value.activeNode && toValue(targetNodeParameterContext) === undefined)
			) {
				// e.g. credential modal
				result.resolved = Expression.resolveWithoutWorkflow(resolvable, toValue(additionalData));
			} else {
				let opts: ResolveParameterOptions = {
					additionalKeys: toValue(additionalData),
					contextNodeName: toValue(targetNodeParameterContext)?.nodeName,
				};
				if (
					toValue(targetNodeParameterContext) === undefined &&
					ndvStore.value.isInputParentOfActiveNode
				) {
					opts = {
						targetItem: target ?? undefined,
						inputNodeName: ndvStore.value.ndvInputNodeName,
						inputRunIndex: ndvStore.value.ndvInputRunIndex,
						inputBranchIndex: ndvStore.value.ndvInputBranchIndex,
					};
				}
				result.resolved = await workflowHelpers.resolveExpression(
					'=' + resolvable,
					undefined,
					opts,
				);
			}
		} catch (error) {
			const hasRunData =
				!!workflowExecutionStateStore.value.activeExecutionRunData?.[
					ndvStore.value.activeNode?.name ?? ''
				];
			result.resolved = `[${getExpressionErrorMessage(error, workflowDocumentStore.value.getPinDataSnapshot(), hasRunData)}]`;
			result.error = true;
			result.fullError = error;
		}

		return result;
	}

	return {
		resolve,
		watchImmediate: () => ndvStore.value.expressionTargetItem,
		watchDebounced: () => [
			workflowExecutionStateStore.value.activeExecution,
			workflowExecutionStateStore.value.activeExecutionRunData,
		],
	};
}
