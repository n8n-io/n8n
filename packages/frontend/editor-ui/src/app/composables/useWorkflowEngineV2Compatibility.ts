import { useEngineV2Compatibility } from '@n8n/frontend-module-engine-v2';
import { computed, toValue, type MaybeRefOrGetter } from 'vue';

import {
	injectWorkflowDocumentStore,
	type WorkflowDocumentStore,
} from '@/app/stores/workflowDocument.store';

/**
 * The engine v2 compatibility of a workflow document: the injected one, or `documentStore`.
 * It follows every change to the document, so a paste or an import needs no extra call.
 */
export function useWorkflowEngineV2Compatibility(
	documentStore?: MaybeRefOrGetter<WorkflowDocumentStore>,
) {
	const store = documentStore
		? computed(() => toValue(documentStore))
		: injectWorkflowDocumentStore();

	return useEngineV2Compatibility({
		nodes: () => store.value.allNodes,
		connections: () => store.value.connectionsBySourceNode,
		settings: () => store.value.settings,
		// The store exposes its settings read-only, and the check takes a mutable workflow.
		settingsSnapshot: () => store.value.getSettingsSnapshot(),
	});
}
