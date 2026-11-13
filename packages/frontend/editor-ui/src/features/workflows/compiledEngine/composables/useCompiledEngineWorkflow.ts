import { computed, watch } from 'vue';

import { injectWorkflowDocumentStore } from '@/app/stores/workflowDocument.store';

import { isCompiledEngineType } from '../compiledEngine.constants';
import { useCompiledEngineStore } from '../compiledEngine.store';

/**
 * The compiled-engine state of the workflow in the current editor.
 *
 * With `{ sync: true }`, it fetches the compile result each time the saved
 * version changes. Only one component in the editor must sync.
 */
export function useCompiledEngineWorkflow(options: { sync?: boolean } = {}) {
	const documentStore = injectWorkflowDocumentStore();
	const compiledEngineStore = useCompiledEngineStore();

	const workflowId = computed(() => documentStore.value.workflowId);
	const isCompiledWorkflow = computed(
		() =>
			compiledEngineStore.isModuleActive &&
			isCompiledEngineType(documentStore.value.settings.engineType),
	);
	const status = computed(() => compiledEngineStore.getStatus(workflowId.value));
	const result = computed(() => compiledEngineStore.getResult(workflowId.value));

	if (options.sync) {
		watch(
			() => [workflowId.value, documentStore.value.versionId, isCompiledWorkflow.value] as const,
			([id, versionId, isCompiled], previous) => {
				if (!id) return;
				// A new workflow has no version until its first save.
				if (!isCompiled || !versionId) {
					compiledEngineStore.clear(id);
					return;
				}
				if (previous && previous[0] !== id && previous[0]) {
					compiledEngineStore.clear(previous[0]);
				}
				void compiledEngineStore.fetchResult(id);
			},
			{ immediate: true },
		);
	}

	return { workflowId, isCompiledWorkflow, status, result };
}
