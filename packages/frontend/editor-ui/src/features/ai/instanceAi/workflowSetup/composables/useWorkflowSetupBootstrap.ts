import { ref, type Ref } from 'vue';
import { useCredentialsStore } from '@/features/credentials/credentials.store';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';

export function useWorkflowSetupBootstrap(projectId: Ref<string | undefined>): {
	isReady: Ref<boolean>;
	bootstrap: () => Promise<void>;
} {
	const credentialsStore = useCredentialsStore();
	const nodeTypesStore = useNodeTypesStore();

	const isReady = ref(false);

	async function bootstrap() {
		isReady.value = false;
		const pid = projectId.value;
		if (!pid) {
			throw new Error('useWorkflowSetupBootstrap: projectId is required');
		}
		try {
			await Promise.all([
				credentialsStore.fetchAllCredentialsForWorkflow({ projectId: pid }),
				credentialsStore.fetchCredentialTypes(false),
				nodeTypesStore.loadNodeTypesIfNotLoaded(),
			]);
		} catch (error) {
			console.warn('[InstanceAI] Workflow setup bootstrap partial failure', error);
		} finally {
			isReady.value = true;
		}
	}

	return { isReady, bootstrap };
}
