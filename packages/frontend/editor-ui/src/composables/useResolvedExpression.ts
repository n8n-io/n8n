import { useNDVStore } from '@/stores/ndv.store';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { isExpression as isExpressionUtil, stringifyExpressionResult } from '@/utils/expressions';

import { debounce } from 'lodash-es';
import { createResultError, createResultOk, type IDataObject, type Result } from 'n8n-workflow';
import { computed, onMounted, ref, toRef, toValue, watch, type MaybeRefOrGetter } from 'vue';
import { useRouter } from 'vue-router';
import { useWorkflowHelpers, type ResolveParameterOptions } from './useWorkflowHelpers';

export function useResolvedExpression({
	expression,
	additionalData,
	isForCredential,
	stringifyObject,
}: {
	expression: MaybeRefOrGetter<unknown>;
	additionalData?: MaybeRefOrGetter<IDataObject>;
	isForCredential?: MaybeRefOrGetter<boolean>;
	stringifyObject?: MaybeRefOrGetter<boolean>;
}) {
	const ndvStore = useNDVStore();
	const workflowsStore = useWorkflowsStore();

	const router = useRouter();
	const { resolveExpression } = useWorkflowHelpers({ router });

	const resolvedExpression = ref<unknown>();
	const resolvedExpressionString = ref('');

	const targetItem = computed(() => ndvStore.expressionTargetItem ?? undefined);
	const activeNode = computed(() => ndvStore.activeNode);
	const hasRunData = computed(() =>
		Boolean(
			workflowsStore.workflowExecutionData?.data?.resultData?.runData[activeNode.value?.name ?? ''],
		),
	);
	const isExpression = computed(() => isExpressionUtil(toValue(expression)));

	function resolve(): Result<unknown, Error> {
		const expressionString = toValue(expression);

		if (!isExpression.value || typeof expressionString !== 'string') {
			return { ok: true, result: '' };
		}

		let options: ResolveParameterOptions = {
			isForCredential: toValue(isForCredential),
			additionalKeys: toValue(additionalData),
		};

		if (ndvStore.isInputParentOfActiveNode) {
			options = {
				...options,
				targetItem: targetItem.value ?? undefined,
				inputNodeName: ndvStore.ndvInputNodeName,
				inputRunIndex: ndvStore.ndvInputRunIndex,
				inputBranchIndex: ndvStore.ndvInputBranchIndex,
			};
		}

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
		const resolved = resolve();
		resolvedExpression.value = resolved.ok ? resolved.result : null;
		resolvedExpressionString.value = stringifyExpressionResult(resolved, hasRunData.value);
	}

	watch(
		[
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
