import { ref } from 'vue';
import { useRootStore } from '@n8n/stores/useRootStore';
import { getAgentSchema, patchAgentSchema } from './useAgentApi';
import type { AgentSchema } from '../types';

export function useAgentSchema() {
	const rootStore = useRootStore();
	const schema = ref<AgentSchema | null>(null);
	const loading = ref(false);

	async function fetchSchema(projectId: string, agentId: string) {
		loading.value = true;
		try {
			schema.value = await getAgentSchema(rootStore.restApiContext, projectId, agentId);
		} finally {
			loading.value = false;
		}
	}

	async function updateSchema(
		projectId: string,
		agentId: string,
		fullSchema: AgentSchema,
		updatedAt: string,
	): Promise<{ code: string; updatedAt: string } | null> {
		try {
			const result = await patchAgentSchema(
				rootStore.restApiContext,
				projectId,
				agentId,
				fullSchema,
				updatedAt,
			);
			schema.value = result.schema;
			return { code: result.code, updatedAt: result.updatedAt };
		} catch (error: unknown) {
			if ((error as { httpStatusCode?: number }).httpStatusCode === 409) {
				await fetchSchema(projectId, agentId);
				return null;
			}
			throw error;
		}
	}

	return { schema, loading, fetchSchema, updateSchema };
}
