import { computed, ref, type Ref } from 'vue';

import { useDependencies } from '@/app/composables/useDependencies';

/**
 * - `covered`: the configuration covers the sub-workflow.
 * - `uncovered`: it lives in this project but the configuration does not cover it.
 * - `external`: it lives in another project, so this configuration cannot cover it.
 */
export type SubWorkflowStatus = 'covered' | 'uncovered' | 'external';

export interface SubWorkflowEntry {
	id: string;
	name: string;
	/** 1 for a sub-workflow the workflow calls directly, 2 for one of its sub-workflows, and so on. */
	depth: number;
	status: SubWorkflowStatus;
}

export interface SelectedWorkflowRow {
	id: string;
	name: string;
	/** Every sub-workflow the workflow reaches, in call order. Each one shows once. */
	subWorkflows: SubWorkflowEntry[];
	/** Sub-workflows in `subWorkflows` that the configuration does not cover. */
	uncoveredCount: number;
	/** The first dependency lookup for this workflow has not returned yet. */
	checking: boolean;
}

/**
 * Resolves the sub-workflows that the selected workflows call, so the scope
 * list can summarise them and the configuration can cover them. Uses the
 * workflow dependency index, and follows sub-workflows of sub-workflows.
 */
export function useSubWorkflowScope(options: {
	selectedIds: Ref<string[]>;
	/** Workflows in this project, by id. Only these can be covered. */
	projectWorkflowNames: Ref<Map<string, string>>;
	includeSubWorkflows: Ref<boolean>;
}) {
	const { fetchDependencies, getDependencies } = useDependencies();
	const pendingIds = ref(new Set<string>());

	function calledWorkflows(workflowId: string) {
		const result = getDependencies(workflowId, 'workflow');
		return (result?.dependencies ?? []).filter((dependency) => dependency.type === 'workflowCall');
	}

	/**
	 * Fetches the sub-workflows of `workflowIds`, then theirs, until no new
	 * workflow turns up. `refresh` refetches the given ids even when cached.
	 */
	async function load(workflowIds: string[], { refresh = false } = {}) {
		const visited = new Set<string>();
		let batch = workflowIds.filter((id) => refresh || !getDependencies(id, 'workflow'));

		while (batch.length > 0) {
			for (const id of batch) {
				visited.add(id);
				pendingIds.value.add(id);
			}
			try {
				await fetchDependencies(batch, 'workflow');
			} finally {
				for (const id of batch) pendingIds.value.delete(id);
			}

			const next = new Set<string>();
			for (const id of batch) {
				for (const { id: childId } of calledWorkflows(id)) {
					if (!visited.has(childId) && !getDependencies(childId, 'workflow')) next.add(childId);
				}
			}
			batch = [...next];
		}
	}

	function statusOf(workflowId: string): SubWorkflowStatus {
		if (!options.projectWorkflowNames.value.has(workflowId)) return 'external';
		if (options.includeSubWorkflows.value || options.selectedIds.value.includes(workflowId)) {
			return 'covered';
		}
		return 'uncovered';
	}

	function subWorkflowsOf(rootId: string): SubWorkflowEntry[] {
		const entries: SubWorkflowEntry[] = [];
		const seen = new Set([rootId]);

		const walk = (parentId: string, depth: number) => {
			for (const dependency of calledWorkflows(parentId)) {
				if (seen.has(dependency.id)) continue;
				seen.add(dependency.id);
				entries.push({
					id: dependency.id,
					name: options.projectWorkflowNames.value.get(dependency.id) ?? dependency.name,
					depth,
					status: statusOf(dependency.id),
				});
				walk(dependency.id, depth + 1);
			}
		};

		walk(rootId, 1);
		return entries;
	}

	const rows = computed<SelectedWorkflowRow[]>(() =>
		options.selectedIds.value.flatMap((id) => {
			const name = options.projectWorkflowNames.value.get(id);
			if (name === undefined) return [];
			const subWorkflows = subWorkflowsOf(id);
			return [
				{
					id,
					name,
					subWorkflows,
					uncoveredCount: subWorkflows.filter((entry) => entry.status !== 'covered').length,
					checking: pendingIds.value.has(id) && !getDependencies(id, 'workflow'),
				},
			];
		}),
	);

	/** Sub-workflows in this project that the configuration covers on top of the selection. */
	const coveredSubWorkflowIds = computed(() => {
		if (!options.includeSubWorkflows.value) return [];
		const ids = new Set<string>();
		for (const row of rows.value) {
			for (const entry of row.subWorkflows) {
				if (entry.status === 'covered' && !options.selectedIds.value.includes(entry.id)) {
					ids.add(entry.id);
				}
			}
		}
		return [...ids];
	});

	return { load, rows, coveredSubWorkflowIds };
}
