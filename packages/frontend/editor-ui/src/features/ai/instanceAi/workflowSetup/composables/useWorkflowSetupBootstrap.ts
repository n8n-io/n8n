import { ref, type Ref } from 'vue';
import { useCredentialsStore } from '@/features/credentials/credentials.store';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';

export function useWorkflowSetupBootstrap(): {
	isReady: Ref<boolean>;
	bootstrap: () => Promise<void>;
} {
	const credentialsStore = useCredentialsStore();
	const nodeTypesStore = useNodeTypesStore();

	const isReady = ref(false);

	async function bootstrap() {
		isReady.value = false;
		try {
			await Promise.all([
				credentialsStore.fetchAllCredentials(),
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
