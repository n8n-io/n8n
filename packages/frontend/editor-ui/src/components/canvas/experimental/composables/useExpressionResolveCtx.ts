import { CREDENTIAL_EDIT_MODAL_KEY, ExpressionLocalResolveContextSymbol } from '@/constants';
import useEnvironmentsStore from '@/stores/environments.ee.store';
import { useExternalSecretsStore } from '@/stores/externalSecrets.ee.store';
import { useNDVStore } from '@/stores/ndv.store';
import { useUIStore } from '@/stores/ui.store';
import { useWorkflowsStore } from '@/stores/workflows.store';
import type { ExpressionLocalResolveContext } from '@/types/expressions';
import type { Workflow } from 'n8n-workflow';
import { computed, inject, toValue, type MaybeRef } from 'vue';

function useGlobalExpressionResolveCtx() {
	const environmentsStore = useEnvironmentsStore();
	const workflowsStore = useWorkflowsStore();
	const externalSecretsStore = useExternalSecretsStore();
	const ndvStore = useNDVStore();
	const uiStore = useUIStore();

	return computed<ExpressionLocalResolveContext>(() => {
		const isForCredential = uiStore.modalsById[CREDENTIAL_EDIT_MODAL_KEY].open;
		const execution = workflowsStore.workflowExecutionData;

		function findInputNode(): ExpressionLocalResolveContext['inputNode'] {
			if (ndvStore.expressionTargetItem) {
				return ndvStore.expressionTargetItem;
			}

			if (ndvStore.input.nodeName && ndvStore.isInputParentOfActiveNode) {
				return {
					nodeName: ndvStore.input.nodeName,
					runIndex: ndvStore.input.run ?? 0,
					outputIndex: ndvStore.input.branch ?? 0,
					itemIndex: 0,
				};
			}

			return null;
		}

		return {
			envVars: environmentsStore.variablesAsObject,
			workflow: workflowsStore.workflowObject as Workflow,
			execution,
			nodeName: ndvStore.activeNodeName,
			additionalKeys: {
				...(isForCredential && externalSecretsStore.isEnterpriseExternalSecretsEnabled
					? { $secrets: externalSecretsStore.secretsAsObject }
					: {}),
			},
			inputNode: findInputNode(),
		};
	});
}

export function useExpressionResolveCtx({
	nodeName,
	parameterPath,
}: {
	nodeName?: MaybeRef<string | undefined>;
	parameterPath?: MaybeRef<string | undefined>;
} = {}) {
	const globalCtx = useGlobalExpressionResolveCtx();
	const provided = inject(ExpressionLocalResolveContextSymbol, globalCtx);

	return computed<ExpressionLocalResolveContext>(() => {
		const providedCtx = toValue(provided);
		const nodeNameValue = toValue(nodeName) ?? providedCtx.nodeName ?? null;
		const parameterPathValue = toValue(parameterPath) ?? providedCtx.parameterPath ?? null;

		if (nodeNameValue === providedCtx.nodeName) {
			return parameterPathValue === providedCtx.parameterPath
				? providedCtx
				: { ...providedCtx, parameterPath: parameterPathValue };
		}

		const runIndex = 0; // not changeable for now
		const execution = provided.value.execution;
		const itemIndex = 0; // not changeable for now

		function findInputNode(nodeName: string): ExpressionLocalResolveContext['inputNode'] {
			const taskData = (execution?.data?.resultData.runData[nodeName] ?? [])[runIndex];
			const source = taskData?.source[0];

			if (source) {
				return {
					nodeName: source.previousNode,
					outputIndex: source.previousNodeOutput ?? 0,
					runIndex: source.previousNodeRun ?? 0,
					itemIndex,
				};
			}

			const inputs = provided.value.workflow.getParentNodesByDepth(nodeName, 1);

			if (inputs.length > 0) {
				return {
					nodeName: inputs[0].name,
					outputIndex: inputs[0].indicies[0] ?? 0,
					runIndex,
					itemIndex,
				};
			}

			return null;
		}

		return {
			...provided.value,
			nodeName: nodeNameValue,
			inputNode: nodeNameValue ? findInputNode(nodeNameValue) : null,
			parameterPath: parameterPathValue,
		};
	});
}
