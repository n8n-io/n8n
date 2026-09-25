import { useNDVStore } from '@/features/ndv/shared/ndv.store';
import { injectWorkflowExecutionStateStore } from '@/app/stores/workflowExecutionState.store';
import {
	getExternalSecretPreview,
	isExpression as isExpressionUtil,
	isSingleResolvable,
	referencesExecutionData,
	stringifyExpressionResult,
} from '@/app/utils/expressions';

import debounce from 'lodash/debounce';
import { createResultError, createResultOk, type Result } from '@n8n/utils/result';
import { type IDataObject } from 'n8n-workflow';
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
import { injectWorkflowDocumentStore } from '@/app/stores/workflowDocument.store';
import { ExpressionLocalResolveContextSymbol } from '@/app/constants';
import type { ExpressionLocalResolveContext } from '@/app/types/expressions';
import { useRedactionHint } from '@/features/shared/editors/composables/useRedactionHint';

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
	const workflowExecutionStateStore = injectWorkflowExecutionStateStore();
	const workflowDocumentStore = injectWorkflowDocumentStore();
	const ndvStore = computed(() => useNDVStore(workflowDocumentStore.value.documentId));
	const { isRedacted: isRedactedExecution, redactedHintText } = useRedactionHint();

	const { resolveExpression } = useWorkflowHelpers();

	const expressionLocalResolveCtx = inject(
		ExpressionLocalResolveContextSymbol,
		computed(() => undefined),
	);

	const resolvedExpression = ref<unknown>(null);
	const resolvedExpressionString = ref('');
	const isRedacted = ref(false);

	const targetItem = computed(() => ndvStore.value.expressionTargetItem ?? undefined);
	const activeNode = computed(() => ndvStore.value.activeNode);
	const hasRunData = computed(() =>
		Boolean(
			workflowExecutionStateStore.value.activeExecutionRunData?.[activeNode.value?.name ?? ''],
		),
	);
	const isExpression = computed(() => isExpressionUtil(toValue(expression)));

	async function resolve(ctx?: ExpressionLocalResolveContext): Promise<Result<unknown, Error>> {
		const expressionString = toValue(expression);

		if (!isExpression.value || typeof expressionString !== 'string') {
			return { ok: true, result: '' };
		}

		const options: ResolveParameterOptions | ExpressionLocalResolveContext = ctx ?? {
			isForCredential: toValue(isForCredential),
			additionalKeys: toValue(additionalData),
			contextNodeName: toValue(contextNodeName),
			...(contextNodeName === undefined && ndvStore.value.isInputParentOfActiveNode
				? {
						targetItem: targetItem.value ?? undefined,
						inputNodeName: ndvStore.value.ndvInputNodeName,
						inputRunIndex: ndvStore.value.ndvInputRunIndex,
						inputBranchIndex: ndvStore.value.ndvInputBranchIndex,
					}
				: {}),
		};

		try {
			const resolvedValue = (await resolveExpression(
				expressionString,
				undefined,
				options,
				toValue(stringifyObject) ?? true,
			)) as unknown;

			return createResultOk(resolvedValue);
		} catch (error) {
			return createResultError(error);
		}
	}

	const debouncedUpdateExpression = debounce(updateExpression, 200);

	let updateExpressionInvocation = 0;

	async function updateExpression() {
		const currentInvocation = ++updateExpressionInvocation;

		if (isExpression.value) {
			const resolved = await resolve(expressionLocalResolveCtx.value);

			// Discard stale results if a newer invocation has started
			if (currentInvocation !== updateExpressionInvocation) return;

			resolvedExpression.value = resolved.ok ? resolved.result : null;
			const expressionString = toValue(expression);
			const secretPreview =
				resolved.ok &&
				resolved.result === undefined &&
				toValue(isForCredential) &&
				typeof expressionString === 'string'
					? getExternalSecretPreview(expressionString, toValue(additionalData)?.$secrets)
					: undefined;

			// Redaction empties the item data, so an expression that reads it resolves
			// to nothing even though the execution has a value. Show a reveal prompt
			// instead of the empty result, matching the expression editor preview.
			// A single `{{ }}` that still resolves to a value used a fallback, so show
			// that value; a mixed expression resolves to its literal text and keeps
			// the prompt.
			isRedacted.value =
				resolved.ok &&
				!secretPreview &&
				isRedactedExecution.value &&
				typeof expressionString === 'string' &&
				referencesExecutionData(expressionString) &&
				!(isSingleResolvable(expressionString) && resolved.result !== undefined);

			resolvedExpressionString.value = isRedacted.value
				? redactedHintText.value
				: (secretPreview?.text ??
					stringifyExpressionResult(
						resolved,
						workflowDocumentStore.value.getPinDataSnapshot(),
						hasRunData.value,
					));
		} else {
			resolvedExpression.value = null;
			resolvedExpressionString.value = '';
			isRedacted.value = false;
		}
	}

	watch(
		[
			expressionLocalResolveCtx,
			toRef(expression),
			toRef(additionalData),
			() => workflowExecutionStateStore.value.activeExecution,
			() => workflowExecutionStateStore.value.activeExecutionRunData,
			() => workflowDocumentStore.value.name,
			targetItem,
		],
		debouncedUpdateExpression,
	);

	onMounted(updateExpression);

	return { resolvedExpression, resolvedExpressionString, isExpression, isRedacted };
}
