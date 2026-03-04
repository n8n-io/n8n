import { ref } from 'vue';

import * as workflowsApi from '@/app/api/workflows';
import { useRootStore } from '@n8n/stores/useRootStore';

interface WorkflowDependent {
	id: string;
	name: string;
	projectId?: string;
}

const dependentsMap = ref<Record<string, WorkflowDependent[]>>({});

export function useResourceDependents() {
	const rootStore = useRootStore();

	async function fetchDependents(
		resourceIds: string[],
		resourceType: 'credentialId' | 'dataTableId',
	): Promise<void> {
		if (resourceIds.length === 0) return;

		try {
			const result = await workflowsApi.getResourceDependents(
				rootStore.restApiContext,
				resourceIds,
				resourceType,
			);
			for (const [id, deps] of Object.entries(result)) {
				dependentsMap.value[id] = deps;
			}
		} catch {
			// Dependents are supplementary — silently ignore errors
		}
	}

	function getDependents(resourceId: string): WorkflowDependent[] | undefined {
		return dependentsMap.value[resourceId];
	}

	function hasDependents(resourceId: string): boolean {
		const deps = dependentsMap.value[resourceId];
		return deps !== undefined && deps.length > 0;
	}

	function clearCache(): void {
		dependentsMap.value = {};
	}

	return {
		dependentsMap,
		fetchDependents,
		getDependents,
		hasDependents,
		clearCache,
	};
}
