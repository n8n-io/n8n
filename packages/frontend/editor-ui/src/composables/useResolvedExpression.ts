import { useNDVStore } from '@/stores/ndv.store';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { isExpression as isExpressionUtil, stringifyExpressionResult } from '@/utils/expressions';

import debounce from 'lodash/debounce';
import { createResultError, createResultOk, type IDataObject, type Result } from 'n8n-workflow';
import {
	computed,
	onMounted,
	ref,
	toRef,
	toValue,
	inject,
	type MaybeRefOrGetter,
	watch,
} from 'vue';
import { useWorkflowHelpers, type ResolveParameterOptions } from './useWorkflowHelpers';
import { ExpressionLocalResolveContextSymbol } from '@/constants';
import type { ExpressionLocalResolveContext } from '@/types/expressions';

export function useResolvedExpression({
	expression,
	additionalData,
	isForCredential,
	stringifyObject,
	contextNodeName,
}: {
	expression: MaybeRefOrGetter<unknown>;
	additionalData?: MaybeRefOrGetter<IDataObject>;
	isForCredential?: MaybeRefOrGetter<boolean>;
	stringifyObject?: MaybeRefOrGetter<boolean>;
	contextNodeName?: MaybeRefOrGetter<string>;
}) {
	const ndvStore = useNDVStore();
	const workflowsStore = useWorkflowsStore();

	const { resolveExpression } = useWorkflowHelpers();

	const expressionLocalResolveCtx = inject(
		ExpressionLocalResolveContextSymbol,
		computed(() => undefined),
	);

	const resolvedExpression = ref<unknown>(null);
	const resolvedExpressionString = ref('');

	const targetItem = computed(() => ndvStore.expressionTargetItem ?? undefined);
	const activeNode = computed(() => ndvStore.activeNode);
	const hasRunData = computed(() =>
		Boolean(
			workflowsStore.workflowExecutionData?.data?.resultData?.runData[activeNode.value?.name ?? ''],
		),
	);
	const isExpression = computed(() => isExpressionUtil(toValue(expression)));

	function resolve(ctx?: ExpressionLocalResolveContext): Result<unknown, Error> {
		const expressionString = toValue(expression);

		if (!isExpression.value || typeof expressionString !== 'string') {
			return { ok: true, result: '' };
		}

		const options: ResolveParameterOptions | ExpressionLocalResolveContext = ctx ?? {
			isForCredential: toValue(isForCredential),
			additionalKeys: toValue(additionalData),
			contextNodeName: toValue(contextNodeName),
			...(contextNodeName === undefined && ndvStore.isInputParentOfActiveNode
				? {
						targetItem: targetItem.value ?? undefined,
						inputNodeName: ndvStore.ndvInputNodeName,
						inputRunIndex: ndvStore.ndvInputRunIndex,
						inputBranchIndex: ndvStore.ndvInputBranchIndex,
					}
				: {}),
		};

		try {
			const resolvedValue = resolveExpression(
				expressionString,
				undefined,
				options,
				toValue(stringifyObject) ?? true,
			) as unknown;

			return createResultOk(resolvedValue);
		} catch (error) {
			return createResultError(error);
		}
	}

	const debouncedUpdateExpression = debounce(updateExpression, 200);

	function updateExpression() {
		if (isExpression.value) {
			const resolved = resolve(expressionLocalResolveCtx.value);
			resolvedExpression.value = resolved.ok ? resolved.result : null;
			resolvedExpressionString.value = stringifyExpressionResult(resolved, hasRunData.value);
		} else {
			resolvedExpression.value = null;
			resolvedExpressionString.value = '';
		}
	}

	watch(
		[
			expressionLocalResolveCtx,
			toRef(expression),
			() => workflowsStore.getWorkflowExecution,
			() => workflowsStore.getWorkflowRunData,
			targetItem,
		],
		debouncedUpdateExpression,
	);

	onMounted(updateExpression);

	return { resolvedExpression, resolvedExpressionString, isExpression };
}
