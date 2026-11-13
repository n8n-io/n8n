import { useRootStore } from '@n8n/stores/useRootStore';
import { computed, ref, type Ref } from 'vue';

import { fetchWorkflowDependencies } from '../self-healing.api';

export type SubWorkflowStatus = 'covered' | 'uncovered' | 'external';

export type SubWorkflowEntry = {
	id: string;
	name: string;
	status: SubWorkflowStatus;
};

export type SubWorkflowCoverage = {
	subWorkflows: SubWorkflowEntry[];
	uncoveredCount: number;
	externalCount: number;
	checking: boolean;
};

type CalledWorkflow = { id: string; name: string };

// The dependency endpoint accepts at most 100 workflow IDs for each request.
const BATCH_SIZE = 100;

// A fix can change only sub-workflows in this project, so the walk does not follow other projects.
export function useSubWorkflowScope(options: {
	selectedIds: Ref<string[]>;
	projectWorkflowNames: Ref<Map<string, string>>;
	includeSubWorkflows: Ref<boolean>;
}) {
	const root = useRootStore();
	const calls = ref(new Map<string, CalledWorkflow[]>());
	const pendingIds = ref(new Set<string>());
	const latestRequests = new Map<string, number>();
	let requestCount = 0;

	async function fetchCalls(workflowIds: string[]) {
		for (let start = 0; start < workflowIds.length; start += BATCH_SIZE) {
			const batch = workflowIds.slice(start, start + BATCH_SIZE);
			const request = ++requestCount;
			for (const id of batch) latestRequests.set(id, request);
			const result = await fetchWorkflowDependencies(root.restApiContext, batch);
			for (const id of batch) {
				if (latestRequests.get(id) !== request) continue;
				calls.value.set(
					id,
					(result[id]?.dependencies ?? [])
						.filter(({ type }) => type === 'workflowCall')
						.map(({ id: calledId, name }) => ({ id: calledId, name })),
				);
			}
		}
	}

	async function load(workflowIds: string[], { refresh = false } = {}) {
		const visited = new Set<string>();
		let level = workflowIds;

		while (level.length > 0) {
			for (const id of level) visited.add(id);
			const missing = level.filter((id) => refresh || !calls.value.has(id));
			for (const id of missing) pendingIds.value.add(id);
			try {
				if (missing.length > 0) await fetchCalls(missing);
			} catch {
				return;
			} finally {
				for (const id of missing) pendingIds.value.delete(id);
			}

			const next = new Set<string>();
			for (const id of level) {
				for (const { id: calledId } of calls.value.get(id) ?? []) {
					if (!visited.has(calledId) && options.projectWorkflowNames.value.has(calledId)) {
						next.add(calledId);
					}
				}
			}
			level = [...next];
		}
	}

	function statusOf(workflowId: string): SubWorkflowStatus {
		if (!options.projectWorkflowNames.value.has(workflowId)) return 'external';
		return options.includeSubWorkflows.value ? 'covered' : 'uncovered';
	}

	function subWorkflowsOf(rootId: string) {
		const entries: SubWorkflowEntry[] = [];
		const seen = new Set([rootId]);

		const walk = (parentId: string) => {
			for (const { id, name } of calls.value.get(parentId) ?? []) {
				if (seen.has(id)) continue;
				seen.add(id);
				const status = statusOf(id);
				entries.push({ id, name: options.projectWorkflowNames.value.get(id) ?? name, status });
				if (status !== 'external') walk(id);
			}
		};

		walk(rootId);
		return entries;
	}

	const coverage = computed(
		() =>
			new Map<string, SubWorkflowCoverage>(
				options.selectedIds.value.map((id) => {
					const subWorkflows = subWorkflowsOf(id);
					return [
						id,
						{
							subWorkflows,
							uncoveredCount: subWorkflows.filter(({ status }) => status === 'uncovered').length,
							externalCount: subWorkflows.filter(({ status }) => status === 'external').length,
							checking: pendingIds.value.has(id) && !calls.value.has(id),
						},
					];
				}),
			),
	);

	return { load, coverage };
}
