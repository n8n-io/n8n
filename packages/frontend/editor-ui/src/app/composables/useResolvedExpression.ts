import { useNDVStore } from '@/features/ndv/shared/ndv.store';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import {
	isExpression as isExpressionUtil,
	stringifyExpressionResult,
} from '@/app/utils/expressions';

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
import {
	ExpressionLocalResolveContextSymbol,
	CrdtExpressionResolverKey,
	CrdtNodeIdKey,
	type CrdtExpressionResolver,
} from '@/app/constants';
import type { ExpressionLocalResolveContext } from '@/app/types/expressions';

export function useResolvedExpression({
	expression,
	additionalData,
	isForCredential,
	stringifyObject,
	contextNodeName,
	nodeId,
	paramPath,
}: {
	expression: MaybeRefOrGetter<unknown>;
	additionalData?: MaybeRefOrGetter<IDataObject>;
	isForCredential?: MaybeRefOrGetter<boolean>;
	stringifyObject?: MaybeRefOrGetter<boolean>;
	contextNodeName?: MaybeRefOrGetter<string>;
	/** Node ID for CRDT-based resolution (optional) */
	nodeId?: MaybeRefOrGetter<string | undefined>;
	/** Parameter path for CRDT-based resolution (optional, e.g., "parameters.value") */
	paramPath?: MaybeRefOrGetter<string | undefined>;
}) {
	const ndvStore = useNDVStore();
	const workflowsStore = useWorkflowsStore();

	const { resolveExpression } = useWorkflowHelpers();

	const expressionLocalResolveCtx = inject(
		ExpressionLocalResolveContextSymbol,
		computed(() => undefined),
	);

	// CRDT mode: use pre-computed values from CRDT execution document
	const crdtResolver = inject<CrdtExpressionResolver | undefined>(
		CrdtExpressionResolverKey,
		undefined,
	);
	// CRDT node ID context (injected from CrdtNodeDetailsPanel)
	const crdtNodeId = inject(
		CrdtNodeIdKey,
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

	async function resolve(ctx?: ExpressionLocalResolveContext): Promise<Result<unknown, Error>> {
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

		if (!isExpression.value) {
			resolvedExpression.value = null;
			resolvedExpressionString.value = '';
			return;
		}

		// CRDT mode: use pre-computed values from CRDT execution document
		// Use provided nodeId or fall back to injected CRDT context
		const nid = toValue(nodeId) ?? crdtNodeId.value;
		const path = toValue(paramPath);
		if (crdtResolver && nid && path) {
			const crdtResolved = crdtResolver.getResolved(nid, path);
			if (crdtResolved) {
				resolvedExpression.value = crdtResolved.value;
				resolvedExpressionString.value = crdtResolved.display;
			} else {
				// No pre-computed value yet - match production behavior:
				// show empty string (hint area will be empty)
				resolvedExpression.value = null;
				resolvedExpressionString.value = '';
			}
			return;
		}

		// CRDT mode but missing context - show empty (matches production "pending" behavior)
		if (crdtResolver) {
			resolvedExpression.value = null;
			resolvedExpressionString.value = '';
			return;
		}

		// Standard mode: resolve on-demand with async support
		const resolved = await resolve(expressionLocalResolveCtx.value);

		// Discard stale results if a newer invocation has started
		if (currentInvocation !== updateExpressionInvocation) return;

		resolvedExpression.value = resolved.ok ? resolved.result : null;
		resolvedExpressionString.value = stringifyExpressionResult(resolved, hasRunData.value);
	}

	watch(
		[
			expressionLocalResolveCtx,
			toRef(expression),
			toRef(additionalData),
			() => workflowsStore.getWorkflowExecution,
			() => workflowsStore.getWorkflowRunData,
			() => workflowsStore.workflow.name,
			targetItem,
			// CRDT mode: re-resolve when resolvedParams version changes
			() => crdtResolver?.version.value,
		],
		debouncedUpdateExpression,
	);

	onMounted(updateExpression);

	return { resolvedExpression, resolvedExpressionString, isExpression };
}
