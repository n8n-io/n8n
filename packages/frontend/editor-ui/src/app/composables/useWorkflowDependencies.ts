import { ref } from 'vue';

import * as workflowsApi from '@/app/api/workflows';
import { useRootStore } from '@n8n/stores/useRootStore';

interface ResolvedDependency {
	type: string;
	id: string;
	name: string;
	projectId?: string;
}

const dependenciesMap = ref<Record<string, ResolvedDependency[]>>({});

export function useWorkflowDependencies() {
	const rootStore = useRootStore();

	async function fetchDependencies(workflowIds: string[]): Promise<void> {
		if (workflowIds.length === 0) return;

		try {
			const result = await workflowsApi.getWorkflowDependencies(
				rootStore.restApiContext,
				workflowIds,
			);
			for (const [id, deps] of Object.entries(result)) {
				dependenciesMap.value[id] = deps;
			}
		} catch {
			// Dependencies are supplementary — silently ignore errors
		}
	}

	function getDependencies(workflowId: string): ResolvedDependency[] | undefined {
		return dependenciesMap.value[workflowId];
	}

	function hasDependencies(workflowId: string): boolean {
		const deps = dependenciesMap.value[workflowId];
		return deps !== undefined && deps.length > 0;
	}

	function clearCache(): void {
		dependenciesMap.value = {};
	}

	return {
		dependenciesMap,
		fetchDependencies,
		getDependencies,
		hasDependencies,
		clearCache,
	};
}
