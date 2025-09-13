import { isExpression as isExpressionUtil, stringifyExpressionResult } from '@/utils/expressions';

import debounce from 'lodash/debounce';
import { createResultError, createResultOk, type Result } from 'n8n-workflow';
import { computed, onMounted, ref, toRef, toValue, type MaybeRefOrGetter, watch } from 'vue';
import { useWorkflowHelpers } from './useWorkflowHelpers';
import type { ExpressionLocalResolveContext } from '@/types/expressions';
import { useExpressionResolveCtx } from '@/components/canvas/experimental/composables/useExpressionResolveCtx';

export function useResolvedExpression({
	expression,
	stringifyObject,
}: {
	expression: MaybeRefOrGetter<unknown>;
	stringifyObject?: MaybeRefOrGetter<boolean>;
}) {
	const { resolveExpression } = useWorkflowHelpers();

	const expressionResolveCtx = useExpressionResolveCtx();

	const resolvedExpression = ref<unknown>(null);
	const resolvedExpressionString = ref('');

	const hasRunData = computed(() => {
		const ctx = expressionResolveCtx.value;

		return Boolean(ctx.nodeName && ctx.execution?.data?.resultData.runData[ctx.nodeName]);
	});
	const isExpression = computed(() => isExpressionUtil(toValue(expression)));

	function resolve(ctx: ExpressionLocalResolveContext): Result<unknown, Error> {
		const expressionString = toValue(expression);

		if (!isExpression.value || typeof expressionString !== 'string') {
			return { ok: true, result: '' };
		}

		try {
			const resolvedValue = resolveExpression(
				expressionString,
				ctx,
				undefined,
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
			const resolved = resolve(expressionResolveCtx.value);
			resolvedExpression.value = resolved.ok ? resolved.result : null;
			resolvedExpressionString.value = stringifyExpressionResult(resolved, hasRunData.value);
		} else {
			resolvedExpression.value = null;
			resolvedExpressionString.value = '';
		}
	}

	watch(
		[
			expressionResolveCtx,
			toRef(expression),
			() => expressionResolveCtx.value.execution,
			() => expressionResolveCtx.value.execution?.data?.resultData.runData,
		],
		debouncedUpdateExpression,
	);

	onMounted(updateExpression);

	return { resolvedExpression, resolvedExpressionString, isExpression };
}
