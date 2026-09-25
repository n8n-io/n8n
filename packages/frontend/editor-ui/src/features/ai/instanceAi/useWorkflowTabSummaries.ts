import chunk from 'lodash/chunk';
import { reactive, watch } from 'vue';
import { useWorkflowsListStore } from '@/app/stores/workflowsList.store';
import type { ArtifactTab } from './useCanvasPreview';

export type WorkflowTabSummary = { updatedAt: string; published: boolean };

/** `null` means the workflow was checked but has no details, e.g. it is deleted. */
export type WorkflowTabSummaryEntry = WorkflowTabSummary | null;

// The list endpoint accepts at most 50 ids for each request.
const MAX_IDS_PER_REQUEST = 50;
const SUMMARY_FIELDS = ['id', 'name', 'updatedAt', 'activeVersionId'];

/**
 * Keeps the edited time and publish status of the workflows open as tabs.
 * Uses the list endpoint with a narrow select, so the response has no nodes.
 */
export function useWorkflowTabSummaries(tabs: () => ArtifactTab[]) {
	const workflowsListStore = useWorkflowsListStore();
	const summaries = reactive(new Map<string, WorkflowTabSummaryEntry>());

	async function refresh(ids: string[]) {
		const uniqueIds = [...new Set(ids)];
		await Promise.all(
			chunk(uniqueIds, MAX_IDS_PER_REQUEST).map(async (batch) => {
				try {
					const workflows = await workflowsListStore.searchWorkflows({
						ids: batch,
						select: SUMMARY_FIELDS,
						options: { includeScopes: false },
					});
					const workflowsById = new Map(workflows.map((workflow) => [workflow.id, workflow]));
					for (const id of batch) {
						const workflow = workflowsById.get(id);
						summaries.set(
							id,
							workflow
								? { updatedAt: String(workflow.updatedAt), published: !!workflow.activeVersionId }
								: null,
						);
					}
				} catch {
					// Keep stored details. Mark unknown ids as checked, so the card
					// shows the name alone instead of placeholders.
					for (const id of batch) {
						if (!summaries.has(id)) summaries.set(id, null);
					}
				}
			}),
		);
	}

	const workflowTabs = () => tabs().filter((tab) => tab.type === 'workflow' && !tab.pending);

	// Load new tabs up front, so the first hover already has the details.
	const requestedIds = new Set<string>();
	watch(
		() => workflowTabs().map((tab) => tab.id),
		(ids) => {
			const newIds = ids.filter((id) => !requestedIds.has(id));
			if (newIds.length === 0) return;
			for (const id of newIds) requestedIds.add(id);
			void refresh(newIds);
		},
		{ immediate: true },
	);

	// A build changes the edited time, so reload a workflow when its build ends.
	watch(
		() =>
			workflowTabs()
				.filter((tab) => tab.building)
				.map((tab) => tab.id),
		(buildingIds, previousBuildingIds) => {
			const finishedIds = previousBuildingIds.filter((id) => !buildingIds.includes(id));
			if (finishedIds.length > 0) void refresh(finishedIds);
		},
	);

	return { summaries, refresh };
}
