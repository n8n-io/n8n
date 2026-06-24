import { computed, ref, shallowRef, toValue, type MaybeRefOrGetter } from 'vue';
import { isTerminalExecutionStatus } from 'n8n-workflow';
import type { IWorkflowDb } from '@/Interface';
import type { IExecutionResponse } from '@/features/execution/executions/executions.types';
import { MAX_PREVIEW_EXECUTIONS_IN_MEMORY } from '@/app/constants';
import { useI18n } from '@n8n/i18n';
import { useToast } from '@/app/composables/useToast';
import { useTelemetry } from '@/app/composables/useTelemetry';
import { useExternalHooks } from '@/app/composables/useExternalHooks';
import { useWorkflowNormalization } from '@/app/composables/useWorkflowNormalization';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import {
	createExecutionPreviewDocumentId,
	createExecutionPreviewDocumentVersion,
	createWorkflowDocumentId,
	disposeWorkflowDocumentStore,
	useWorkflowDocumentStore,
	type WorkflowDocumentId,
	type WorkflowDocumentStore,
} from '@/app/stores/workflowDocument.store';
import {
	disposeWorkflowExecutionStateStore,
	useWorkflowExecutionStateStore,
} from '@/app/stores/workflowExecutionState.store';
import {
	createExecutionDataId,
	disposeExecutionDataStore,
	hasExecutionDataStore,
	useExecutionDataStore,
} from '@/app/stores/executionData.store';
import { disposeNDVStore, useNDVStore } from '@/features/ndv/shared/ndv.store';
import { getExecutionErrorToastConfiguration } from '@/features/execution/executions/executions.utils';
import { useLogsStore } from '@/app/stores/logs.store';

export interface UseExecutionPreviewDocumentOptions {
	executionId: MaybeRefOrGetter<string>;
}

/**
 * Loads an execution for read-only preview into a fully isolated set of
 * stores, keyed by the synthetic `{workflowId}@execution-preview` document id.
 *
 * This is the side-effect-free counterpart of
 * `useCanvasOperations.openExecution()` (which serves "Debug in editor" and
 * deliberately writes the editor's `{workflowId}@latest` stores): it performs
 * NO `resetWorkspace`, NO `initState`, NO `workflowsStore.setWorkflowId`, and
 * NO `uiStore.markStateClean` — loading a preview must never affect the
 * editor's (possibly dirty) state, which stays alive across the
 * editor/executions tab switch (`keepWorkflowAlive`).
 */
export function useExecutionPreviewDocument(options: UseExecutionPreviewDocumentOptions) {
	const i18n = useI18n();
	const toast = useToast();
	const telemetry = useTelemetry();
	const externalHooks = useExternalHooks();
	const workflowsStore = useWorkflowsStore();
	const logsStore = useLogsStore();
	const { normalizeWorkflowData } = useWorkflowNormalization();

	/** Provide this under `WorkflowDocumentStoreKey`; null until the first load completes. */
	const documentStore = shallowRef<WorkflowDocumentStore | null>(null);
	const execution = shallowRef<IExecutionResponse | null>(null);
	const isLoading = ref(false);
	const loadError = ref<Error | null>(null);

	/**
	 * Every execution id this preview session has loaded. Per-execution data
	 * stores are keyed app-wide by bare execution id, so previously viewed
	 * executions render instantly when re-selected — they are released in
	 * `dispose()`, except ids the editor's own state store still references.
	 */
	const loadedExecutionIds = new Set<string>();

	/**
	 * Every preview document id this session has hydrated — one per distinct
	 * executed workflow version (executions of the same version share a store).
	 * All are released in `dispose()`.
	 */
	const loadedDocumentIds = new Set<WorkflowDocumentId>();
	let latestLoadRequestId = 0;

	/**
	 * The workflow id shared by every execution this session previews (all
	 * documents/executions belong to the executions-tab workflow). Captured on
	 * each successful load so `dispose()` can still resolve the editor-referenced
	 * ids to protect even after a failed load nulled `documentStore`.
	 */
	let previewWorkflowId: string | undefined;

	/**
	 * Marks an execution as most-recently-used. `Set` preserves insertion order
	 * but `add()` is a no-op for an existing key, so re-add it to move it to the
	 * tail (the front is then the least-recently-used eviction candidate).
	 */
	function touchLoadedExecution(executionId: string): void {
		loadedExecutionIds.delete(executionId);
		loadedExecutionIds.add(executionId);
	}

	/**
	 * Caps retained per-execution data stores at `MAX_PREVIEW_EXECUTIONS_IN_MEMORY`
	 * by disposing the least-recently-used ones. Never evicts the execution just
	 * loaded, nor any the editor's `{workflowId}@latest` session still references
	 * (disposing those would blank the editor's run data) — when all retained ids
	 * are protected the count simply stays above the cap.
	 */
	function evictLeastRecentlyUsedExecutions(currentExecutionId: string, workflowId: string): void {
		const protectedExecutionIds = getEditorReferencedExecutionIds(workflowId);
		protectedExecutionIds.add(currentExecutionId);

		let retainedCount = loadedExecutionIds.size;
		// Snapshot oldest-first; the loop mutates loadedExecutionIds.
		for (const candidateExecutionId of [...loadedExecutionIds]) {
			if (retainedCount <= MAX_PREVIEW_EXECUTIONS_IN_MEMORY) {
				break;
			}
			if (protectedExecutionIds.has(candidateExecutionId)) {
				continue;
			}
			disposeExecutionDataStore(useExecutionDataStore(createExecutionDataId(candidateExecutionId)));
			loadedExecutionIds.delete(candidateExecutionId);
			retainedCount -= 1;
		}
	}

	/**
	 * Production executions hide pin data and render production-only UI.
	 * Derived from the execution itself (the per-instance
	 * `useNodeHelpers().isProductionExecutionPreview` ref never reliably
	 * crossed composable instances).
	 */
	const isProductionExecutionPreview = computed(
		() => execution.value !== null && !['manual', 'evaluation'].includes(execution.value.mode),
	);

	function getReusableExecution(executionId: string): IExecutionResponse | null {
		// Only reuse executions THIS preview session loaded. Other entries in the
		// app-wide, execution-id-keyed data store belong to the editor — e.g. the
		// workflow's own last manual run — whose `workflowData` shares live node
		// references with the editor document (its snapshot exposes `allNodes` by
		// reference). An unsaved editor edit after the run (toggling a node, etc.)
		// mutates those nodes in place, so reusing that entry would render the
		// editor's current state instead of the executed snapshot. Falling through
		// to a fresh fetch yields the immutable server-side snapshot, matching the
		// iframe preview this replaced, which always re-fetched.
		if (!loadedExecutionIds.has(executionId)) {
			return null;
		}
		const executionDataId = createExecutionDataId(executionId);
		// Peek only — never instantiate here. A bare `useExecutionDataStore()`
		// would register an empty store for ids whose load never completes (the
		// request is superseded as stale, or the fetch fails), and those untracked
		// stores would escape `dispose()`.
		if (!hasExecutionDataStore(executionDataId)) {
			return null;
		}
		const snapshot = useExecutionDataStore(executionDataId).getExecutionSnapshot();
		// Only terminal executions are safe to reuse without a re-fetch —
		// waiting/running ones may have progressed since they were loaded.
		return snapshot && isTerminalExecutionStatus(snapshot.status) ? snapshot : null;
	}

	async function load(): Promise<void> {
		const executionId = toValue(options.executionId);
		const requestId = ++latestLoadRequestId;

		isLoading.value = true;
		loadError.value = null;

		try {
			const data =
				getReusableExecution(executionId) ?? (await workflowsStore.getExecution(executionId));

			// Drop stale responses if the selected execution changed mid-flight.
			if (requestId !== latestLoadRequestId) {
				return;
			}

			if (data === undefined) {
				throw new Error(`Execution with id "${executionId}" could not be found!`);
			}

			// Surface the execution's error the same way the editor canvas did when
			// the iframe loaded it: openExecution() for node-level errors, and
			// NodeView's `open:execution` handler for workflow-level errors on
			// unfinished executions (crashed / out-of-memory). The native preview no
			// longer drives the canvas event bus, so we toast both here.
			const resultData = data.data?.resultData;
			if (data.status === 'error' && resultData?.error) {
				const { title, message } = getExecutionErrorToastConfiguration({
					error: resultData.error,
					lastNodeExecuted: resultData.lastNodeExecuted,
				});
				toast.showMessage({ title, message, type: 'error', duration: 0 });
			} else if (!data.finished && resultData?.error) {
				// Skip when a node already captured the error — it shows on the node.
				const nodeErrorFound = Object.values(resultData.runData ?? {}).some((tasks) =>
					tasks.some((task) => task.error),
				);
				if (!nodeErrorFound) {
					toast.showMessage({
						title: i18n.baseText('nodeView.showError.workflowError'),
						message: resultData.error.message,
						type: 'error',
						duration: 0,
					});
				}
			}

			const workflowId = data.workflowData.id;
			previewWorkflowId = workflowId;
			// Key by the executed workflow version so executions that ran against
			// different versions (different nodes) never share — and re-shape — one
			// document store.
			const documentVersion = createExecutionPreviewDocumentVersion(data.workflowData.versionId);
			const documentId = createExecutionPreviewDocumentId(workflowId, data.workflowData.versionId);

			if (import.meta.env.DEV && documentId === createWorkflowDocumentId(workflowId)) {
				throw new Error(
					'useExecutionPreviewDocument: preview document id must never equal the editor document id',
				);
			}

			// Hydrate the scoped document from the workflow snapshot embedded in
			// the execution (the workflow as it was when it ran — not `latest`).
			// The synthetic versionId mirrors the document's version segment so it
			// satisfies hydrate()'s id/version validation, same pattern as the
			// workflow-diff feature.
			const scopedDocumentStore = useWorkflowDocumentStore(documentId);
			const { nodes, connections } = normalizeWorkflowData(data.workflowData);
			scopedDocumentStore.hydrate({
				...data.workflowData,
				nodes,
				connections,
				versionId: documentVersion,
			} as IWorkflowDb);

			useWorkflowExecutionStateStore(documentId).setWorkflowExecutionData(data);
			touchLoadedExecution(executionId);
			evictLeastRecentlyUsedExecutions(executionId, workflowId);
			loadedDocumentIds.add(documentId);

			// Production executions never show pin data (parity with openExecution)
			if (!['manual', 'evaluation'].includes(data.mode)) {
				scopedDocumentStore.setPinData({});
			}

			execution.value = data;
			documentStore.value = scopedDocumentStore;

			// Oversized executions have no run data to show, so open the logs panel to avoid an empty view
			if (data.dataTooLargeToDisplay) {
				logsStore.toggleOpen(true);
			}

			void externalHooks.run('execution.open', {
				workflowId: data.workflowData.id,
				workflowName: data.workflowData.name,
				executionId,
			});
			telemetry.track('User opened read-only execution', {
				workflow_id: data.workflowData.id,
				execution_mode: data.mode,
				execution_finished: data.finished,
			});
		} catch (error) {
			if (requestId === latestLoadRequestId) {
				loadError.value = error instanceof Error ? error : new Error(String(error));
				documentStore.value = null;
				execution.value = null;
				toast.showError(error, i18n.baseText('nodeView.showError.openExecution.title'));
			}
		} finally {
			if (requestId === latestLoadRequestId) {
				isLoading.value = false;
			}
		}
	}

	/**
	 * Execution ids the editor's `{workflowId}@latest` session still references
	 * — e.g. the user ran the workflow manually and then previewed that same
	 * execution. Releasing those would blank the editor's displayed run data.
	 */
	function getEditorReferencedExecutionIds(workflowId: string): Set<string> {
		const editorStateStore = useWorkflowExecutionStateStore(createWorkflowDocumentId(workflowId));
		const ids = new Set<string>();
		for (const id of [
			editorStateStore.activeExecutionId,
			editorStateStore.displayedExecutionId,
			editorStateStore.previousExecutionId,
			editorStateStore.lastSuccessfulExecutionId,
		]) {
			if (typeof id === 'string') {
				ids.add(id);
			}
		}
		return ids;
	}

	function dispose() {
		latestLoadRequestId += 1;

		// Every preview document shares the executions-tab workflow id. Use the
		// tracked id rather than `documentStore.value` — the latter is nulled by a
		// failed load, which would otherwise skip releasing the retained stores.
		if (previewWorkflowId !== undefined) {
			const editorReferencedIds = getEditorReferencedExecutionIds(previewWorkflowId);
			for (const executionId of loadedExecutionIds) {
				if (editorReferencedIds.has(executionId)) {
					continue;
				}
				disposeExecutionDataStore(useExecutionDataStore(createExecutionDataId(executionId)));
			}
		}

		// One document scope per executed version. NDV store first: its setup
		// instantiates the document and execution-state stores for its id, so
		// disposing it afterwards would re-create what was just removed.
		for (const documentId of loadedDocumentIds) {
			disposeNDVStore(useNDVStore(documentId));
			disposeWorkflowExecutionStateStore(useWorkflowExecutionStateStore(documentId));
			disposeWorkflowDocumentStore(useWorkflowDocumentStore(documentId));
		}

		loadedDocumentIds.clear();
		loadedExecutionIds.clear();
		previewWorkflowId = undefined;
		documentStore.value = null;
		execution.value = null;
		loadError.value = null;
		isLoading.value = false;
	}

	return {
		documentStore,
		execution,
		isLoading,
		loadError,
		isProductionExecutionPreview,
		load,
		dispose,
	};
}
