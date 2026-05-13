import type { DependencyGraphResponse } from '@n8n/api-types';
import { ref } from 'vue';

import * as workflowDependenciesApi from '@/app/api/workflow-dependencies';
import { useRootStore } from '@n8n/stores/useRootStore';

const cached = ref<DependencyGraphResponse | null>(null);
const loading = ref(false);
const error = ref<string | null>(null);

export function useDependencyGraph() {
	const rootStore = useRootStore();

	async function fetchGraph(force = false): Promise<DependencyGraphResponse | null> {
		if (cached.value && !force) return cached.value;
		loading.value = true;
		error.value = null;
		try {
			const response = await workflowDependenciesApi.getDependencyGraphJson(
				rootStore.restApiContext,
			);
			cached.value = response;
			return response;
		} catch (e) {
			error.value = e instanceof Error ? e.message : String(e);
			return null;
		} finally {
			loading.value = false;
		}
	}

	function clear() {
		cached.value = null;
		error.value = null;
	}

	return {
		graph: cached,
		loading,
		error,
		fetchGraph,
		clear,
	};
}
