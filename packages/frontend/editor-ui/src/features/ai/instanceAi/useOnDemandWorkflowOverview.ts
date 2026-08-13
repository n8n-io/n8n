import type { WorkflowOverview } from '@n8n/api-types';
import { computed, ref, watch } from 'vue';
import { useRootStore } from '@n8n/stores/useRootStore';
import { generateWorkflowOverviewApi, getWorkflowOverviewApi } from './instanceAi.api';
import type { ThreadRuntime } from './instanceAi.store';

interface UseOnDemandWorkflowOverviewOptions {
	thread: ThreadRuntime;
	/** Workflow tab ids currently in the preview, first = primary. */
	workflowTabIds: () => string[];
	/** Active workflow tab id, when a workflow tab is selected. */
	activeWorkflowId: () => string | null;
}

/**
 * On-demand per-workflow overviews (stored in workflow meta) layered under the
 * thread-live sidecar overview. Display precedence:
 *   manual refresh result > thread-live overview > stored overview.
 * The manual override is cleared when a fresh thread-live update arrives.
 */
export function useOnDemandWorkflowOverview({
	thread,
	workflowTabIds,
	activeWorkflowId,
}: UseOnDemandWorkflowOverviewOptions) {
	const rootStore = useRootStore();

	const storedOverviews = ref(new Map<string, WorkflowOverview | null>());
	const fetchedWorkflowIds = new Set<string>();
	const manualOverride = ref<WorkflowOverview | null>(null);
	const isGenerating = ref(false);

	// The workflow the on-demand actions target: the selected workflow tab,
	// the last workflow tab the user had selected, or the thread's first one.
	const lastActiveWorkflowId = ref<string | null>(null);
	watch(
		() => activeWorkflowId(),
		(id) => {
			if (id) lastActiveWorkflowId.value = id;
		},
		{ immediate: true },
	);
	const targetWorkflowId = computed(
		() => activeWorkflowId() ?? lastActiveWorkflowId.value ?? workflowTabIds()[0] ?? null,
	);

	// Fetch the stored overview once per workflow id, on demand.
	watch(
		targetWorkflowId,
		(workflowId) => {
			if (!workflowId || fetchedWorkflowIds.has(workflowId)) return;
			fetchedWorkflowIds.add(workflowId);
			void getWorkflowOverviewApi(rootStore.restApiContext, workflowId)
				.then((response) => {
					storedOverviews.value.set(workflowId, response.overview);
					// Reassign for reactivity — Map mutation doesn't trigger it.
					storedOverviews.value = new Map(storedOverviews.value);
				})
				.catch(() => {
					// Missing overview / no access — the tab simply shows its empty state.
					fetchedWorkflowIds.delete(workflowId);
				});
		},
		{ immediate: true },
	);

	// A fresh thread-live update supersedes a manual refresh result.
	watch(
		() => thread.currentWorkflowOverview,
		(next, prev) => {
			if (next && next !== prev) manualOverride.value = null;
		},
	);

	const storedOverview = computed(() => {
		const workflowId = targetWorkflowId.value;
		return workflowId ? (storedOverviews.value.get(workflowId) ?? null) : null;
	});

	const displayedOverview = computed(
		() => manualOverride.value ?? thread.currentWorkflowOverview ?? storedOverview.value,
	);

	// Independent of isGenerating: the button stays mounted and shows its
	// loading spinner while a generation runs (generate() guards re-entry).
	const canGenerate = computed(() => targetWorkflowId.value !== null);

	async function generate(): Promise<boolean> {
		const workflowId = targetWorkflowId.value;
		if (!workflowId || isGenerating.value) return false;
		isGenerating.value = true;
		try {
			const response = await generateWorkflowOverviewApi(rootStore.restApiContext, workflowId);
			if (!response.overview) return false;
			storedOverviews.value.set(workflowId, response.overview);
			storedOverviews.value = new Map(storedOverviews.value);
			manualOverride.value = response.overview;
			return true;
		} catch {
			return false;
		} finally {
			isGenerating.value = false;
		}
	}

	return {
		displayedOverview,
		targetWorkflowId,
		canGenerate,
		isGenerating,
		generate,
	};
}
