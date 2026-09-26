import chunk from 'lodash/chunk';
import { reactive, watch } from 'vue';
import { useRootStore } from '@n8n/stores/useRootStore';
import { useWorkflowsListStore } from '@/app/stores/workflowsList.store';
import { fetchDataTablesApi } from '@/features/core/dataTable/dataTable.api';
import type { ArtifactTab } from './useCanvasPreview';

export type ArtifactTabSummary =
	| { type: 'workflow'; updatedAt: string; published: boolean }
	| { type: 'data-table'; updatedAt: string; columnCount: number };

/** `null` means the artifact was checked but has no details, e.g. it is deleted. */
export type ArtifactTabSummaryEntry = ArtifactTabSummary | null;

type SummarizedType = ArtifactTabSummary['type'];

// The workflow list endpoint accepts at most 50 ids for each request.
const MAX_IDS_PER_REQUEST = 50;
const WORKFLOW_SUMMARY_FIELDS = ['id', 'name', 'updatedAt', 'activeVersionId'];

/** Tells if the hover card of a tab shows loaded details. */
export function hasTabSummary(tab: ArtifactTab): tab is ArtifactTab & { type: SummarizedType } {
	return (tab.type === 'workflow' || tab.type === 'data-table') && !tab.pending;
}

function summaryKey(type: SummarizedType, id: string) {
	return `${type}:${id}`;
}

/**
 * Keeps the edited time and a status of the workflows and data tables open as
 * tabs. Uses list endpoints, so the responses have no nodes and no rows.
 */
export function useArtifactTabSummaries(tabs: () => ArtifactTab[]) {
	const rootStore = useRootStore();
	const workflowsListStore = useWorkflowsListStore();
	const summaries = reactive(new Map<string, ArtifactTabSummaryEntry>());

	async function loadWorkflows(ids: string[]) {
		const workflows = await workflowsListStore.searchWorkflows({
			ids,
			select: WORKFLOW_SUMMARY_FIELDS,
			options: { includeScopes: false },
		});
		return new Map(
			workflows.map((workflow): [string, ArtifactTabSummary] => [
				workflow.id,
				{
					type: 'workflow',
					updatedAt: String(workflow.updatedAt),
					published: !!workflow.activeVersionId,
				},
			]),
		);
	}

	async function loadDataTables(ids: string[]) {
		// An empty project id lists the data tables of all accessible projects.
		const { data } = await fetchDataTablesApi(
			rootStore.restApiContext,
			'',
			{ skip: 0, take: ids.length },
			{ id: ids },
		);
		return new Map(
			data.map((dataTable): [string, ArtifactTabSummary] => [
				dataTable.id,
				{
					type: 'data-table',
					updatedAt: dataTable.updatedAt,
					// Count the system id column too, like the data table cards do.
					columnCount: dataTable.columns.length + 1,
				},
			]),
		);
	}

	const loaders: Record<SummarizedType, typeof loadWorkflows> = {
		workflow: loadWorkflows,
		'data-table': loadDataTables,
	};

	async function refreshType(type: SummarizedType, ids: string[]) {
		await Promise.all(
			chunk([...new Set(ids)], MAX_IDS_PER_REQUEST).map(async (batch) => {
				try {
					const loaded = await loaders[type](batch);
					for (const id of batch) summaries.set(summaryKey(type, id), loaded.get(id) ?? null);
				} catch {
					// Keep stored details. Mark unknown ids as checked, so the card
					// shows the name alone instead of placeholders.
					for (const id of batch) {
						const key = summaryKey(type, id);
						if (!summaries.has(key)) summaries.set(key, null);
					}
				}
			}),
		);
	}

	async function refresh(tabsToRefresh: ArtifactTab[]) {
		const summarized = tabsToRefresh.filter(hasTabSummary);
		await Promise.all(
			(['workflow', 'data-table'] as const).map(async (type) => {
				const ids = summarized.filter((tab) => tab.type === type).map((tab) => tab.id);
				if (ids.length > 0) await refreshType(type, ids);
			}),
		);
	}

	function getSummary(tab: ArtifactTab): ArtifactTabSummaryEntry | undefined {
		return hasTabSummary(tab) ? summaries.get(summaryKey(tab.type, tab.id)) : undefined;
	}

	const summarizedTabs = () => tabs().filter(hasTabSummary);

	// Load new tabs up front, so the first hover already has the details.
	const requestedKeys = new Set<string>();
	watch(
		summarizedTabs,
		(currentTabs) => {
			const newTabs = currentTabs.filter((tab) => !requestedKeys.has(summaryKey(tab.type, tab.id)));
			if (newTabs.length === 0) return;
			for (const tab of newTabs) requestedKeys.add(summaryKey(tab.type, tab.id));
			void refresh(newTabs);
		},
		{ immediate: true },
	);

	// A build changes the edited time, so reload an artifact when its build ends.
	watch(
		() => summarizedTabs().filter((tab) => tab.building),
		(buildingTabs, previousBuildingTabs) => {
			const finishedTabs = previousBuildingTabs.filter(
				(previous) => !buildingTabs.some((tab) => tab.id === previous.id),
			);
			if (finishedTabs.length > 0) void refresh(finishedTabs);
		},
	);

	return { getSummary, refresh };
}
