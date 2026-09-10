import { computed, onScopeDispose, provide, toValue, watch, type MaybeRefOrGetter } from 'vue';
import { deepCopy } from 'n8n-workflow';
import type { INodeUi } from '@/Interface';
import { ExpressionLocalResolveContextSymbol, WorkflowDocumentStoreKey } from '@/app/constants';
import type { ExpressionLocalResolveContext } from '@/app/types/expressions';
import {
	createWorkflowDocumentId,
	disposeWorkflowDocumentStore,
	useWorkflowDocumentStore,
	type WorkflowDocumentId,
} from '@/app/stores/workflowDocument.store';
import { disposeNDVStore, useNDVStore } from '@/features/ndv/shared/ndv.store';

/** Give existing credential and parameter controls a disposable local document. */
export function useSetupPanelDocument(options: {
	workflowId: MaybeRefOrGetter<string | undefined>;
	itemId: MaybeRefOrGetter<string>;
	node: MaybeRefOrGetter<INodeUi | undefined>;
}) {
	const documentId = computed(() =>
		createWorkflowDocumentId(
			toValue(options.workflowId) ?? 'instance-ai-setup-panel',
			toValue(options.itemId),
		),
	);
	const document = computed(() => useWorkflowDocumentStore(documentId.value));
	watch(
		[documentId, () => toValue(options.node)],
		// setNodes normalizes node positions. Keep those mutations local to the form.
		([_id, node]) => document.value.setNodes(node ? [deepCopy(node)] : []),
		{ immediate: true, deep: true },
	);

	function dispose(id: WorkflowDocumentId) {
		disposeNDVStore(useNDVStore(id));
		disposeWorkflowDocumentStore(useWorkflowDocumentStore(id));
	}
	watch(documentId, (_id, previous) => dispose(previous));
	onScopeDispose(() => dispose(documentId.value));

	const expressionContext = computed<ExpressionLocalResolveContext | undefined>(() => {
		const node = toValue(options.node);
		return node ? { localResolve: true, nodeName: node.name, additionalKeys: {} } : undefined;
	});
	provide(ExpressionLocalResolveContextSymbol, expressionContext);
	provide(WorkflowDocumentStoreKey, document);
}
